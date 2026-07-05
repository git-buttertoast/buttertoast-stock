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

    return NextResponse.json({ error: 'Unknown action: ' + action }, { status: 400, headers: CORS })
  } catch (err: any) {
    console.error('documents api error:', err)
    return NextResponse.json({ error: err.message || String(err) }, { status: 500, headers: CORS })
  }
}
