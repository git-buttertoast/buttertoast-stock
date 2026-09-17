// Shared auth guard for Stock's API routes.
//
// Both routes run on the SERVICE ROLE key, which bypasses RLS entirely. They shipped
// with Access-Control-Allow-Origin '*' and no identity check, so anyone who knew the
// URL could soft delete, overwrite or regenerate any employee document, including
// salary letters. This verifies the caller's Supabase session and confirms they
// actually hold Stock access before anything runs.
export async function requireStockAccess(req: Request, supabase: any): Promise<{ ok: true, userId: string } | { ok: false, status: number, error: string }> {
  const auth = req.headers.get('authorization') || ''
  const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : ''
  if (!token) return { ok: false, status: 401, error: 'Sign in required' }

  const { data: u, error: ue } = await supabase.auth.getUser(token)
  if (ue || !u?.user?.id) return { ok: false, status: 401, error: 'Invalid or expired session' }
  const userId = u.user.id as string

  // Platform admin, or stock edit/manage through their Chef profile or an override.
  const { data: ua } = await supabase.from('user_access')
    .select('profile_id, access_profiles(is_platform_admin)').eq('user_id', userId).maybeSingle()
  if (ua?.access_profiles?.is_platform_admin) return { ok: true, userId }

  const { data: ovr } = await supabase.from('user_app_overrides')
    .select('level').eq('user_id', userId).eq('app', 'stock').maybeSingle()
  if (ovr?.level && ['edit', 'manage'].includes(ovr.level)) return { ok: true, userId }
  if (ovr?.level === 'none') return { ok: false, status: 403, error: 'No Stock access' }

  if (ua?.profile_id) {
    const { data: paa } = await supabase.from('profile_app_access')
      .select('level').eq('profile_id', ua.profile_id).eq('app', 'stock').maybeSingle()
    if (paa?.level && ['edit', 'manage'].includes(paa.level)) return { ok: true, userId }
  }

  // Legacy roles, kept so nothing that works today stops working.
  const { data: lr } = await supabase.from('user_roles')
    .select('roles(name)').eq('user_id', userId)
  if ((lr || []).some((r: any) => ['admin', 'hr'].includes(r?.roles?.name))) return { ok: true, userId }

  return { ok: false, status: 403, error: 'No Stock access' }
}
