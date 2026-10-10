import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { resolveAccess } from '@/lib/apiAuth'

export const dynamic = 'force-dynamic'

// Server-side proxy to the Google Apps Script that files documents in Drive.
//
// Until now Stock's browser called the Apps Script directly, so its URL shipped in the
// page and anyone holding it could create folders and upload files into the company
// Drive. This route lets the browser go through Stock instead:
//
//   1. Vercel env NEXT_PUBLIC_DRIVE_URL = /api/drive  (the page's two Drive calls,
//      create_folder and upload_file, then come here; no page change needed).
//   2. Vercel env DRIVE_URL = the Apps Script URL with ?k=<secret> appended (server
//      only; generate-pdf already reads DRIVE_URL for its own uploads).
//   3. The Apps Script refuses any request whose k does not match.
//
// Inert until step 1 is set: with no env change nothing calls this route. Safe before
// step 3: the script ignores the extra k parameter until it is told to check it.
//
// Who may call: a signed-in Stock user (edit, manage, admin or legacy HR). The page
// sends no Authorization header on these calls, so the session is read from the
// bt-auth cookie, which a cross-site POST never carries (SameSite=Lax). No CORS
// headers: same-origin only.

const FALLBACK_DRIVE_URL = 'https://script.google.com/macros/s/AKfycbyVbz5RdpIuwkkyqrvccttilVhxKB71BXWblIC7jrLa4k8G6pqJLMSVWzdE11iq17yvaA/exec'
const FOLDER_ID = /^[A-Za-z0-9_-]{10,100}$/
const MAX_BASE64 = 6 * 1024 * 1024

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function fail(status: number, error: string) {
  return NextResponse.json({ error }, { status })
}

export async function POST(req: NextRequest) {
  let acc
  try {
    acc = await resolveAccess(req, supabase, { allowCookie: true })
  } catch {
    return fail(503, 'Could not verify your session. Try again.')
  }
  if (!acc.ok) return fail(acc.status, acc.error)
  if (!acc.stock) return fail(403, 'No Stock access')

  let body: any
  try { body = await req.json() } catch { return fail(400, 'Bad request') }

  // Forward only the two actions Stock's page uses, with only their fields.
  let payload: Record<string, unknown>
  if (body?.action === 'create_folder') {
    const folderName = typeof body.folderName === 'string' ? body.folderName.trim().slice(0, 120) : ''
    if (!folderName || body.parentFolder !== 'Employees') return fail(400, 'Bad folder request')
    payload = { action: 'create_folder', folderName, parentFolder: 'Employees' }
  } else if (body?.action === 'upload_file') {
    const { folderId, fileName, base64, mimeType } = body
    if (typeof folderId !== 'string' || !FOLDER_ID.test(folderId)) return fail(400, 'Bad folder id')
    if (typeof fileName !== 'string' || !fileName.trim() || fileName.length > 200) return fail(400, 'Bad file name')
    if (typeof base64 !== 'string' || !base64 || base64.length > MAX_BASE64) return fail(400, 'File missing or too large')
    payload = { action: 'upload_file', folderId, fileName: fileName.trim(), base64, mimeType: typeof mimeType === 'string' ? mimeType : 'application/octet-stream' }
  } else {
    return fail(400, 'Unknown action')
  }

  try {
    const r = await fetch(process.env.DRIVE_URL || FALLBACK_DRIVE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await r.json().catch(() => null)
    if (!data) return fail(502, 'Drive did not answer')
    return NextResponse.json(data)
  } catch {
    return fail(502, 'Drive did not answer')
  }
}
