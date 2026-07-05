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

const STARTER = `<div class="doc-title">New Document</div>
<p>Dear <strong>{{f.employee_name}}</strong>,</p>
<p>Write the body of this letter here. Use Insert field to add details like name or CTC, and Insert signature to place a signature block.</p>
{{sig.company_both}}`

function slugify(s: string): string {
  const base = (s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 50)
  return base || ('doc_' + Date.now())
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const action = body.action as string

    if (action === 'list') {
      const { data, error } = await supabase
        .from('document_templates')
        .select('id, key, name, is_builtin, is_one_time, sort_order, deleted_at, document_template_versions(version_number, is_active)')
        .order('sort_order', { ascending: true })
      if (error) throw error
      const rows = (data || []).map((t: any) => {
        const versions = (t.document_template_versions || [])
        const active = versions.find((v: any) => v.is_active) || null
        return {
          id: t.id, key: t.key, name: t.name,
          is_builtin: t.is_builtin, is_one_time: t.is_one_time,
          sort_order: t.sort_order, deleted_at: t.deleted_at,
          version_count: versions.length,
          active_version_number: active ? active.version_number : null,
        }
      })
      return NextResponse.json({ templates: rows }, { headers: CORS })
    }

    if (action === 'get') {
      const { data: t, error } = await supabase
        .from('document_templates')
        .select('id, key, name, is_builtin, is_one_time, sort_order, deleted_at')
        .eq('id', body.id).single()
      if (error) throw error
      const { data: versions } = await supabase
        .from('document_template_versions')
        .select('id, version_number, body_html, note, is_active, created_at')
        .eq('template_id', body.id)
        .order('version_number', { ascending: false })
      return NextResponse.json({ template: t, versions: versions || [] }, { headers: CORS })
    }

    if (action === 'create') {
      const name = (body.name || '').trim()
      if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400, headers: CORS })
      let key = slugify(body.key || name)
      const { data: existing } = await supabase.from('document_templates').select('id').eq('key', key).maybeSingle()
      if (existing) key = key + '_' + Date.now().toString().slice(-4)
      const { data: t, error } = await supabase.from('document_templates')
        .insert({ key, name, is_builtin: false, is_one_time: !!body.is_one_time, sort_order: 500, created_by: body.created_by || null })
        .select('id, key').single()
      if (error) throw error
      const { data: v, error: ve } = await supabase.from('document_template_versions')
        .insert({ template_id: t.id, version_number: 1, body_html: (typeof body.body_html === 'string' && body.body_html.trim()) ? body.body_html : STARTER, note: 'Initial version', is_active: true, created_by: body.created_by || null })
        .select('id').single()
      if (ve) throw ve
      return NextResponse.json({ template_id: t.id, key: t.key, version_id: v.id }, { headers: CORS })
    }

    if (action === 'save_version') {
      const template_id = body.template_id
      if (!template_id || typeof body.body_html !== 'string') {
        return NextResponse.json({ error: 'template_id and body_html are required' }, { status: 400, headers: CORS })
      }
      const { data: maxRow } = await supabase.from('document_template_versions')
        .select('version_number').eq('template_id', template_id)
        .order('version_number', { ascending: false }).limit(1).maybeSingle()
      const next = (((maxRow as any) && (maxRow as any).version_number) || 0) + 1
      // Unset the current active version first: a partial unique index allows
      // only one active version per template, so we clear before we set.
      await supabase.from('document_template_versions').update({ is_active: false }).eq('template_id', template_id).eq('is_active', true)
      const { data: v, error } = await supabase.from('document_template_versions')
        .insert({ template_id, version_number: next, body_html: body.body_html, note: (body.note || '').trim() || null, is_active: true, created_by: body.created_by || null })
        .select('id, version_number').single()
      if (error) throw error
      return NextResponse.json({ version_id: v.id, version_number: v.version_number }, { headers: CORS })
    }

    if (action === 'set_active') {
      const { template_id, version_id } = body
      if (!template_id || !version_id) return NextResponse.json({ error: 'template_id and version_id are required' }, { status: 400, headers: CORS })
      await supabase.from('document_template_versions').update({ is_active: false }).eq('template_id', template_id).eq('is_active', true)
      const { error } = await supabase.from('document_template_versions').update({ is_active: true }).eq('id', version_id)
      if (error) throw error
      return NextResponse.json({ ok: true }, { headers: CORS })
    }

    if (action === 'soft_delete') {
      const { error } = await supabase.from('document_templates')
        .update({ deleted_at: new Date().toISOString(), deleted_by: body.deleted_by || null }).eq('id', body.id)
      if (error) throw error
      return NextResponse.json({ ok: true }, { headers: CORS })
    }

    if (action === 'restore') {
      const { error } = await supabase.from('document_templates')
        .update({ deleted_at: null, deleted_by: null }).eq('id', body.id)
      if (error) throw error
      return NextResponse.json({ ok: true }, { headers: CORS })
    }

    return NextResponse.json({ error: 'Unknown action: ' + action }, { status: 400, headers: CORS })
  } catch (err: any) {
    console.error('templates api error:', err)
    return NextResponse.json({ error: err.message || String(err) }, { status: 500, headers: CORS })
  }
}
