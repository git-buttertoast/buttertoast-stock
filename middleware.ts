import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { resolveAccess } from '@/lib/apiAuth'

// Identity guard for /api/generate-pdf.
//
// That route runs on the SERVICE ROLE key, which bypasses RLS entirely, with
// Access-Control-Allow-Origin '*' and no authentication of its own. Anyone who
// knew the URL could read a saved letter's metadata, salary included, or generate
// new letters against real employees.
//
// WHY THIS LIVES HERE AND NOT INSIDE THE ROUTE. app/api/generate-pdf/route.ts is a
// 566 KB file whose largest single line is 195,900 characters of base64 letterhead
// artwork, with the signature images alongside it. Rewriting that file through
// anything other than a real git push risks silently corrupting the artwork on
// every letter the company issues. A guard in front of the route is equivalent
// protection and touches none of it.
//
// THE RULES, matched to what the route actually does:
//
//   GET ?asset=letterhead   Passes through untouched. The letter editor loads it
//                           as a CSS background-image, and a background-image
//                           request cannot carry an Authorization header, so
//                           guarding it would silently strip the letterhead out of
//                           the preview. It returns blank company stationery and
//                           reads nothing from the database.
//
//   OPTIONS                 Passes through to the route's own CORS preflight.
//
//   POST, Stock access      Everything. This is Stock's own UI, which already
//                           sends the caller's session on all six call sites.
//
//   POST, candidate stage   Allowed. candidate_id present, profile_id absent, no
//                           action field. That is exactly and only what Scout
//                           sends for an offer letter, internship offer or
//                           appointment letter, verified against all three of its
//                           call sites. Scout users hold Scout access and no Stock
//                           access, which is why a single Stock-access check was
//                           wrong and got reverted on 2026-09-17.
//
//   Anything else           Refused.
//
// INTERIM, AND DELIBERATE. Scout does not yet send its session, so a candidate
// stage request is currently accepted without a signed-in caller. That is a
// knowingly incomplete step taken because it is strictly better than the status
// quo: it closes 'reconstruct', which reads any saved letter's metadata including
// compensation, and closes every generation carrying a profile_id, which is a real
// employee. What stays open is generating a candidate letter for a candidate id
// someone already knows. WHEN SCOUT SENDS ITS SESSION, delete the candidateStage
// early return below and let resolveAccess decide, allowing acc.scout for this
// branch. The Scout change is written and waiting.

export const config = { matcher: ['/api/generate-pdf'] }

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, authorization, apikey',
}

function deny(status: number, error: string) {
  return new NextResponse(JSON.stringify({ error }), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

export async function middleware(req: NextRequest) {
  if (req.method !== 'POST') return NextResponse.next()

  // Read a COPY of the body. The original stream must reach the route untouched;
  // verified against Next 15.5.18 before this shipped.
  let body: any = {}
  try {
    body = await req.clone().json()
  } catch {
    body = {}
  }

  const candidateStage = !!body?.candidate_id && !body?.profile_id && !body?.action
  if (candidateStage) return NextResponse.next()

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
  if (!acc.stock) return deny(403, 'No Stock access')
  return NextResponse.next()
}
