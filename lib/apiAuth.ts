// Shared auth guard for Stock's API routes.
//
// Both routes run on the SERVICE ROLE key, which bypasses RLS entirely. They shipped
// with Access-Control-Allow-Origin '*' and no identity check at all, so anyone who
// knew the URL could soft delete, overwrite or regenerate any employee document,
// salary letters included. Every POST now has to carry the caller's Supabase session.
//
// THERE ARE TWO CALLERS AND THEY ARE NOT THE SAME. Stock's own UI, whose users hold
// Stock access and may do everything here. And Scout, which calls generate-pdf to
// produce CANDIDATE offer letters; its users hold Scout access and usually no Stock
// access at all. That is why the first version of this guard was reverted on
// 2026-09-17: it demanded Stock access, and Scout sent no header whatsoever.
//
// So this resolves CAPABILITIES and lets each route decide what it needs.
export type AccessResult =
  | { ok: true; userId: string; stock: boolean; scout: boolean }
  | { ok: false; status: number; error: string }

export async function resolveAccess(req: Request, supabase: any): Promise<AccessResult> {
  const auth = req.headers.get('authorization') || ''
  const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : ''
  if (!token) return { ok: false, status: 401, error: 'Sign in required' }

  const { data: u, error: ue } = await supabase.auth.getUser(token)
  const userId: string = u?.user?.id || ''
  if (ue || !userId) return { ok: false, status: 401, error: 'Invalid or expired session' }

  // Their Chef profile, if they are on one.
  const { data: ua } = await supabase.from('user_access')
    .select('profile_id').eq('user_id', userId).maybeSingle()
  const profileId: string | null = (ua as any)?.profile_id || null

  let isAdmin = false
  if (profileId) {
    const { data: ap } = await supabase.from('access_profiles')
      .select('is_platform_admin').eq('id', profileId).maybeSingle()
    isAdmin = !!(ap as any)?.is_platform_admin
  }

  // Per app levels. A personal override beats the profile, and an explicit
  // override of 'none' is a denial that nothing below can undo.
  const overrides: Record<string, string> = {}
  const { data: ovrRows } = await supabase.from('user_app_overrides')
    .select('app, level').eq('user_id', userId)
  ;(ovrRows || []).forEach((r: any) => { if (r?.app) overrides[r.app] = r.level })

  const profileLevels: Record<string, string> = {}
  if (profileId) {
    const { data: paaRows } = await supabase.from('profile_app_access')
      .select('app, level').eq('profile_id', profileId)
    ;(paaRows || []).forEach((r: any) => { if (r?.app) profileLevels[r.app] = r.level })
  }

  // Legacy roles, kept so anyone not yet on a Chef profile does not lose access.
  // The embed can come back as an object or a one element array depending on how
  // PostgREST resolves the relationship, so handle both rather than assume.
  const { data: lr } = await supabase.from('user_roles').select('roles(name)').eq('user_id', userId)
  const legacyHr = (lr || []).some((r: any) => {
    const n = Array.isArray(r?.roles) ? r.roles[0]?.name : r?.roles?.name
    return n === 'admin' || n === 'hr'
  })

  const levelOf = (app: string): string => overrides[app] || profileLevels[app] || 'none'
  const denied = (app: string): boolean => overrides[app] === 'none'

  const stock = isAdmin || (!denied('stock') && (['edit', 'manage'].includes(levelOf('stock')) || legacyHr))
  // Scout's own front door admits 'manage' only (it maps manage to admin and refuses
  // edit), so match that exactly here rather than inventing a second rule.
  const scout = isAdmin || (!denied('scout') && (levelOf('scout') === 'manage' || legacyHr))

  if (!stock && !scout) return { ok: false, status: 403, error: 'No Stock or Scout access' }
  return { ok: true, userId, stock, scout }
}
