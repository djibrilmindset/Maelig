import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(toSet) {
          for (const { name, value } of toSet) {
            request.cookies.set(name, value)
          }
          response = NextResponse.next({ request: { headers: request.headers } })
          for (const { name, value, options } of toSet) {
            response.cookies.set(name, value, options)
          }
        },
      },
    }
  )

  // Refresh session
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const isAuthRoute = path.startsWith("/connexion") || path.startsWith("/inscription") || path.startsWith("/oubli")
  const isAppRoute = path.startsWith("/app")

  if (isAppRoute && !user) {
    const url = request.nextUrl.clone()
    url.pathname = "/connexion"
    url.searchParams.set("redirect_to", path)
    return NextResponse.redirect(url)
  }

  if (isAuthRoute && user) {
    const url = request.nextUrl.clone()
    url.pathname = "/app"
    return NextResponse.redirect(url)
  }

  // Security headers
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  response.headers.set("X-DNS-Prefetch-Control", "off")
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(self), geolocation=(), interest-cohort=()"
  )

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|dep-logo|api/public).*)",
  ],
}
