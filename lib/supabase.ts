import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Shared-cookie session so one login works across every *.buttertoast.co app.
// Guarded for SSR: with no document (server) it is a harmless no-op.
const cookieStorage = {
  getItem(key: string): string | null {
    if (typeof document === 'undefined') return null
    const all: Record<string, string> = {}
    ;(document.cookie || '').split('; ').forEach(p => { if (!p) return; const i = p.indexOf('='); if (i < 0) return; all[p.slice(0, i)] = p.slice(i + 1) })
    if (all[key] !== undefined) return decodeURIComponent(all[key])
    if (all[key + '.0'] === undefined) return null
    let i = 0; const parts: string[] = []; while (all[key + '.' + i] !== undefined) { parts.push(all[key + '.' + i]); i++ }
    return decodeURIComponent(parts.join(''))
  },
  setItem(key: string, value: string): void {
    if (typeof document === 'undefined') return
    cookieStorage.removeItem(key)
    const enc = encodeURIComponent(value); const MAX = 3200
    const write = (n: string, v: string, a: number) => { document.cookie = n + '=' + v + ';path=/;domain=.buttertoast.co;secure;samesite=lax;max-age=' + a }
    if (enc.length <= MAX) { write(key, enc, 31536000); return }
    let i = 0, off = 0; while (off < enc.length) { write(key + '.' + i, enc.slice(off, off + MAX), 31536000); off += MAX; i++ }
  },
  removeItem(key: string): void {
    if (typeof document === 'undefined') return
    const all: Record<string, string> = {}
    ;(document.cookie || '').split('; ').forEach(p => { if (!p) return; const i = p.indexOf('='); if (i < 0) return; all[p.slice(0, i)] = p.slice(i + 1) })
    const del = (n: string) => { document.cookie = n + '=;path=/;domain=.buttertoast.co;secure;samesite=lax;max-age=0' }
    del(key)
    let i = 0; while (all[key + '.' + i] !== undefined) { del(key + '.' + i); i++ }
  },
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { storageKey: 'bt-auth', storage: cookieStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
})
