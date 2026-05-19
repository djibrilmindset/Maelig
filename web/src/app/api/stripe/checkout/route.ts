import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { getStripe, PRICE_IDS, STRIPE_TRIAL_DAYS } from "@/lib/stripe/server"
import { limitStripe, checkLimits, tooManyRequests } from "@/lib/ratelimit"

export const runtime = "nodejs"

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { data: profile } = await supabase.from("profiles").select("org_id, role").eq("id", user.id).maybeSingle()
  if (!profile?.org_id) return NextResponse.json({ error: "no_org" }, { status: 403 })
  if (profile.role !== "owner" && profile.role !== "admin_dep") {
    return NextResponse.json({ error: "forbidden_only_owner" }, { status: 403 })
  }

  // Rate limit : 10 / heure / user
  const rl = await checkLimits({ ratelimit: limitStripe, key: user.id })
  if (!rl.success) return tooManyRequests(rl)

  const body = await req.json().catch(() => ({})) as { slave_seats?: number; mode?: "subscribe" | "portal" }

  const { data: org } = await supabase
    .from("orgs").select("id, nom, email, stripe_customer_id")
    .eq("id", profile.org_id).maybeSingle()
  if (!org) return NextResponse.json({ error: "org_missing" }, { status: 404 })

  const stripe = getStripe()
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin

  // Ensure Stripe customer
  let customerId = org.stripe_customer_id
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: org.email ?? user.email ?? undefined,
      name: org.nom,
      metadata: { org_id: org.id, app: "DEP" },
    })
    customerId = customer.id
    await supabaseAdmin().from("orgs").update({ stripe_customer_id: customerId }).eq("id", org.id)
  }

  if (body.mode === "portal") {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${baseUrl}/app/parametres/abonnement`,
    })
    return NextResponse.json({ url: session.url })
  }

  if (!PRICE_IDS.main) {
    return NextResponse.json({ error: "stripe_prices_missing", hint: "Set STRIPE_PRICE_MAIN env var" }, { status: 500 })
  }

  const slaveSeats = Math.max(0, Math.floor(Number(body.slave_seats || 0)))
  const lineItems: { price: string; quantity: number }[] = [
    { price: PRICE_IDS.main, quantity: 1 },
  ]
  if (slaveSeats > 0 && PRICE_IDS.slave) {
    lineItems.push({ price: PRICE_IDS.slave, quantity: slaveSeats })
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: lineItems,
    subscription_data: {
      trial_period_days: STRIPE_TRIAL_DAYS,
      metadata: { org_id: org.id },
    },
    allow_promotion_codes: true,
    success_url: `${baseUrl}/app/parametres/abonnement?success=1`,
    cancel_url: `${baseUrl}/app/parametres/abonnement?canceled=1`,
    locale: "fr",
  })

  return NextResponse.json({ url: session.url })
}
