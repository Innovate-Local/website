// Sign out (POST only — a navigable GET would let other sites log a user out
// via a stray link/image). Clears the Supabase session cookies, returns to /login.
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  await supabase.auth.signOut()
  return NextResponse.redirect(`${request.nextUrl.origin}/login`, { status: 303 })
}
