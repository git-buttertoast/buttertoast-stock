import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const action = body.action as string

    if (action === 'soft_delete') {
      if (!body.id) return NextResponse.json({ error: 'id is required' }, { status: 400, headers: CORS })
      const { error } = await supabase.from('employee_documents')
        .update({ deleted_at: new Date().toISOString(), deleted_by: body.deleted_by || null }).eq('id', body.id)
      if (error) throw error
      return NextResponse.json({ ok: true }, { headers: CORS })
    }

    if (action === 'restore') {
      if (!body.id) return NextResponse.json({ error: 'id is required' }, { status: 400, headers: CORS })
      const { error } = await supabase.from('employee_documents')
        .update({ deleted_at: null, deleted_by: null }).eq('id', body.id)
      if (error) throw error
      return NextResponse.json({ ok: true }, { headers: CORS })
    }

    if (action === 'update_content') {
      if (!body.id) return NextResponse.json({ error: 'id is required' }, { status: 400, headers: CORS })
      const { error } = await supabase.from('employee_documents')
        .update({ content_html: body.content_html ?? null }).eq('id', body.id)
      if (error) throw error
      return NextResponse.json({ ok: true }, { headers: CORS })
    }

    if (action === 'save_version') {
      if (!body.id) return NextResponse.json({ error: 'id is required' }, { status: 400, headers: CORS })
      const { data: cur, error: e0 } = await supabase.from('employee_documents').select('*').eq('id', body.id).single()
      if (e0 || !cur) return NextResponse.json({ error: 'Letter not found' }, { status: 404, headers: CORS })
      // Link versions of THIS specific letter with a chain id kept in metadata,
      // so repeatable types (multiple independent copies per person) stay separate.
      const chainId = (cur.metadata && cur.metadata.chain_id) ? cur.metadata.chain_id : cur.id
      const meta = { ...(cur.metadata || {}), chain_id: chainId }
      // Keep the old copy as a previous version (is_current=false), tag it, then
      // insert the edit as the new current version.
      const { error: e1 } = await supabase.from('employee_documents')
        .update({ is_current: false, metadata: meta }).eq('id', cur.id)
      if (e1) throw e1
      const { data: ins, error: e2 } = await supabase.from('employee_documents').insert({
        profile_id: cur.profile_id, candidate_id: cur.candidate_id, document_type: cur.document_type,
        label: cur.label, version: (cur.version || 1) + 1, status: 'generated', is_current: true,
        content_html: body.content_html ?? cur.content_html, template_version_id: cur.template_version_id,
        metadata: meta, generated_at: new Date().toISOString(),
      }).select('id').single()
      if (e2) throw e2
      return NextResponse.json({ ok: true, id: ins?.id }, { headers: CORS })
    }

    return NextResponse.json({ error: 'Unknown action: ' + action }, { status: 400, headers: CORS })
  } catch (err: any) {
    console.error('documents api error:', err)
    return NextResponse.json({ error: err.message || String(err) }, { status: 500, headers: CORS })
  }
}
