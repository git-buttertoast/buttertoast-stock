import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { resolveAccess } from '@/lib/apiAuth'

// Identity guard for /api/generate-pdf and /api/templates.
//
// Both routes run on the SERVICE ROLE key, which bypasses RLS entirely, with
// Access-Control-Allow-Origin '*' and no authentication of their own.
//
// WHY THIS LIVES HERE AND NOT INSIDE THE ROUTES. app/api/generate-pdf/route.ts is a
// 566 KB file whose largest single line is 195,900 characters of base64 letterhead
// artwork, with the signature images alongside it. Rewriting that file through
// anything other than a real git push risks silently corrupting the artwork on
// every letter the company issues. A guard in front of the route is equivalent
// protection and touches none of it. The templates route is guarded the same way
// so both rules sit in one place.
//
// THE RULES:
//
//   GET ?asset=letterhead   Passes through untouched. The letter editor loads it
//                           as a CSS background-image, and a background-image
//                           request cannot carry an Authorization header. It returns
//                           blank company stationery and reads nothing.
//
//   OPTIONS                 Passes through to the routes' own CORS preflight.
//
//   generate-pdf POST       Stock access: everything. Candidate stage (candidate_id
//                           present, profile_id absent, no action field): Stock
//                           access or Scout manage. No session: refused. Until
//                           2026-10-11 candidate stage was accepted WITHOUT a session
//                           because Scout sends none; that let anyone print signed
//                           letters on company letterhead. Scout's letter buttons
//                           therefore stop working until Scout is rebuilt in Kitchen;
//                           HR makes candidate letters from Stock meanwhile.
//
//   templates POST          list and get: Stock access. create, save_version,
//                           set_active, soft_delete, restore: Stock manage (or admin),
//                           because a template change alters every future letter.
//                           Stock's Templates page already sends the session.
//
//   Anything else           Refused.

export const config = { matcher: ['/api/generate-pdf', '/api/templates'] }

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, authorization, apikey',
}

const TEMPLATE_READS = ['list', 'get']

function deny(status: number, error: string) {
  return new NextResponse(JSON.stringify({ error }), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

export async function middleware(req: NextRequest) {
  if (req.method !== 'POST') return NextResponse.next()

  // Read a COPY of the body. The original stream must reach the route untouched;
  // verified against Next 15.5.18 before the first version shipped.
  let body: any = {}
  try {
    body = await req.clone().json()
  } catch {
    body = {}
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  let acc
  try {
    acc = await resolveAccess(req, supabase)
  } catch (e: any) {
    // Fail closed, but say so plainly rather than returning a bare 500.
    return deny(503, 'Could not verify your session. Try again.')
  }
  if (!acc.ok) return deny(acc.status, acc.error)

  if (req.nextUrl.pathname.startsWith('/api/templates')) {
    const action = String(body?.action || '')
    if (TEMPLATE_READS.includes(action)) {
      if (!acc.stock) return deny(403, 'No Stock access')
    } else if (!acc.stockManage) {
      return deny(403, 'Changing letter templates needs Stock manage')
    }
    return NextResponse.next()
  }

  // /api/generate-pdf
  const candidateStage = !!body?.candidate_id && !body?.profile_id && !body?.action
  if (candidateStage) {
    if (!acc.stock && !acc.scout) return deny(403, 'No Stock or Scout access')
    return NextResponse.next()
  }
  if (!acc.stock) return deny(403, 'No Stock access')
  return NextResponse.next()
}
