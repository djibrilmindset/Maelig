import { createClient } from "@supabase/supabase-js"
import type { Database } from "./database.types"

// Service-role client. NEVER expose to the browser.
let _admin: ReturnType<typeof createClient<Database>> | null = null
export function supabaseAdmin() {
  if (_admin) return _admin
  if (typeof window !== "undefined") {
    throw new Error("supabaseAdmin() must not run in the browser")
  }
  _admin = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  )
  return _admin
}
