import { NextResponse } from "next/server"
import type Stripe from "stripe"
import { getStripe } from "@/lib/stripe/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const maxDuration = 15

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature")
  if (!sig) return NextResponse.json({ error: "no_signature" }, { status: 400 })
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) return NextResponse.json({ error: "no_webhook_secret" }, { status: 500 })

  const buf = Buffer.from(await req.arrayBuffer())
  const stripe = getStripe()
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(buf, sig, secret)
  } catch (e) {
    return NextResponse.json({ error: "signature_invalid", detail: String(e) }, { status: 400 })
  }

  const admin = supabaseAdmin()

  // Idempotency : si on a déjà traité cet event, return early.
  // Stripe retry les webhooks → sans ça on double-process (double crédit, double mail).
  const { data: dedup, error: dedupErr } = await admin
    .from("stripe_events")
    .insert({
      id: event.id,
      type: event.type,
      livemode: event.livemode,
      payload: event.data.object as never,
    } as never)
    .select("id")
    .single()
  if (dedupErr || !dedup) {
    // Code 23505 = unique_violation → déjà reçu
    if ((dedupErr as { code?: string } | null)?.code === "23505") {
      return NextResponse.json({ received: true, idempotent_skip: true })
    }
    // Erreur autre → on continue quand même (mieux vaut double process que rien)
    console.warn("[stripe.webhook] dedup insert failed:", dedupErr?.message)
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const obj = event.data.object as Stripe.Subscription | Stripe.Checkout.Session
      // Find subscription
      let subId: string | null = null
      let customerId: string | null = null
      let status: string | null = null
      let priceId: string | null = null
      let trialEnd: number | null = null
      let periodEnd: number | null = null

      if ("subscription" in obj && obj.subscription) {
        const subResult = await stripe.subscriptions.retrieve(typeof obj.subscription === "string" ? obj.subscription : obj.subscription.id)
        subId = subResult.id
        customerId = typeof subResult.customer === "string" ? subResult.customer : subResult.customer.id
        status = subResult.status
        priceId = subResult.items.data[0]?.price.id ?? null
        trialEnd = subResult.trial_end ?? null
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        periodEnd = (subResult as any).current_period_end ?? null
      } else if ((obj as Stripe.Subscription).id?.startsWith("sub_")) {
        const sub = obj as Stripe.Subscription
        subId = sub.id
        customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id
        status = sub.status
        priceId = sub.items?.data?.[0]?.price.id ?? null
        trialEnd = sub.trial_end ?? null
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        periodEnd = (sub as any).current_period_end ?? null
      }

      if (customerId) {
        await admin.from("orgs").update({
          stripe_subscription_id: subId,
          stripe_price_id: priceId,
          subscription_status: status as never,
          trial_ends_at: trialEnd ? new Date(trialEnd * 1000).toISOString() : null,
          current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
        }).eq("stripe_customer_id", customerId)
      }
      break
    }
    case "invoice.payment_failed": {
      const inv = event.data.object as Stripe.Invoice
      const cId = typeof inv.customer === "string" ? inv.customer : inv.customer?.id ?? null
      if (cId) {
        await admin.from("orgs").update({ subscription_status: "past_due" }).eq("stripe_customer_id", cId)
      }
      break
    }
    default:
      // ignore other events
      break
  }

  return NextResponse.json({ received: true })
}
