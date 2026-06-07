'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { DEPT_DISPLAY, DOC_TYPE_LABELS } from '@/lib/types'
import type {
  Employee, EmployeeProfile, EmployeeKYC,
  EmployeeCompensation, FreelancerRateCard, EmployeeDocument,
  EmployeeType, DocumentType
} from '@/lib/types'

// ── Helpers ────────────────────────────────────────────────────────────────
function ini(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}
function fmtDate(d: string | null) {
  if (!d) return '--'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
function fmtMoney(amount: number | null, currency = 'INR') {
  if (!amount) return '--'
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
}
function mask(val: string | null, show = 4) {
  if (!val) return '--'
  return val.slice(0, show).padEnd(val.length, '*')
}

// ── Toast ──────────────────────────────────────────────────────────────────
type Toast = { id: number; msg: string; type: 'ok' | 'fail' }
let toastId = 0

// ── Main Component ─────────────────────────────────────────────────────────
export default function StockApp() {
  const [user, setUser] = useState<{ id: string; full_name: string; role: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState<'people' | 'onboarding' | 'documents' | 'settings'>('people')
  const [toasts, setToasts] = useState<Toast[]>([])

  function showToast(msg: string, type: 'ok' | 'fail' = 'ok') {
    const id = ++toastId
    setToasts(t => [...t, { id, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500)
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { setLoading(false); return }
      const { data: profile } = await supabase.from('profiles').select('id,full_name').eq('id', session.user.id).single()
      const { data: urRows } = await supabase.from('user_roles').select('roles(name)').eq('user_id', session.user.id).limit(10)
      const role = (urRows as any)?.[0]?.roles?.name || 'viewer'
      if (!['admin', 'hr'].includes(role)) { setLoading(false); return }
      setUser({ id: session.user.id, full_name: profile?.full_name || '', role })
      setLoading(false)
    })
  }, [])

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { showToast(error.message, 'fail'); return }
    window.location.reload()
  }

  async function signOut() {
    await supabase.auth.signOut()
    window.location.reload()
  }

  if (loading) return <div className="loading-screen"><div className="spinner"/><span>Loading Stock...</span></div>
  if (!user) return <AuthScreen onSignIn={signIn} />

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div style={{background:'#E03F2A',borderRadius:6,padding:'4px 7px',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <img src="https://ferlauhakdbfpwfapxxw.supabase.co/storage/v1/object/public/assets/branding/logo.png" alt="" style={{height:16,filter:'brightness(0) invert(1)'}} />
          </div>
          <div>
            <div className="sidebar-app-name">Stock</div>
            <div className="sidebar-app-sub">HR System</div>
          </div>
        </div>
        <nav className="sidenav">
          <div className="nav-section">HR</div>
          <NavBtn active={page === 'people'} onClick={() => setPage('people')} icon={<PeopleIcon />}>People</NavBtn>
          <NavBtn active={page === 'onboarding'} onClick={() => setPage('onboarding')} icon={<OnboardingIcon />}>Onboarding</NavBtn>
          <NavBtn active={page === 'documents'} onClick={() => setPage('documents')} icon={<DocIcon />}>Documents</NavBtn>
          <div className="nav-section">Admin</div>
          <NavBtn active={page === 'settings'} onClick={() => setPage('settings')} icon={<SettingsIcon />}>Settings</NavBtn>
          <div className="nav-section">Quick Links</div>
          <a className="nav-btn" href="https://kitchentools.buttertoast.co" target="_blank" rel="noreferrer">
            <HomeIcon /><span>Hub</span>
          </a>
          <a className="nav-btn" href="https://scout.buttertoast.co" target="_blank" rel="noreferrer">
            <ScoutIcon /><span>Scout</span>
          </a>
          <a className="nav-btn" href="https://roster.buttertoast.co" target="_blank" rel="noreferrer">
            <RosterIcon /><span>Roster</span>
          </a>
        </nav>
        <div className="sidebar-foot">
          <div className="sidebar-user">
            <div className="sidebar-user-name">{user.full_name}</div>
            <div className="sidebar-user-role">{user.role}</div>
          </div>
          <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center' }} onClick={signOut}>Sign out</button>
        </div>
      </aside>

      {/* Main content */}
      <main className="main">
        {page === 'people' && <PeoplePage user={user} showToast={showToast} />}
        {page === 'onboarding' && <OnboardingPage user={user} showToast={showToast} />}
        {page === 'documents' && <DocumentsPage user={user} showToast={showToast} />}
        {page === 'settings' && <SettingsPage showToast={showToast} />}
      </main>

      {/* Toasts */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast${t.type === 'fail' ? ' toast-error' : ''}`}>{t.msg}</div>
        ))}
      </div>
    </div>
  )
}

// ── NavBtn ──────────────────────────────────────────────────────────────────
function NavBtn({ active, onClick, icon, children, badge }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode; badge?: number }) {
  return (
    <button className={`nav-btn${active ? ' active' : ''}`} onClick={onClick}>
      {icon}<span>{children}</span>
      {badge ? <span className="nav-badge">{badge}</span> : null}
    </button>
  )
}

// ── Auth Screen ─────────────────────────────────────────────────────────────
function AuthScreen({ onSignIn }: { onSignIn: (e: string, p: string) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-logo">
          <img src="https://ferlauhakdbfpwfapxxw.supabase.co/storage/v1/object/public/assets/branding/logo.png" alt="" style={{ height: 28 }} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Stock</div>
            <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>HR System</div>
          </div>
        </div>
        <div className="auth-title">Sign in</div>
        <div className="auth-sub">Admin and HR access only.</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="field"><label>Email</label><input className="inp" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@buttertoast.co" /></div>
          <div className="field"><label>Password</label><input className="inp" type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && !loading && (setLoading(true), onSignIn(email, password))} /></div>
          <button className="btn btn-primary" style={{ marginTop: 6, justifyContent: 'center' }} disabled={loading} onClick={() => { setLoading(true); onSignIn(email, password) }}>
            {loading ? <><div className="spinner" /><span>Signing in...</span></> : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── People Page ─────────────────────────────────────────────────────────────
function PeoplePage({ user, showToast }: { user: { id: string; full_name: string; role: string }; showToast: (m: string, t?: 'ok' | 'fail') => void }) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('active')
  const [selected, setSelected] = useState<Employee | null>(null)
  const [drawerTab, setDrawerTab] = useState<'details' | 'compensation' | 'kyc' | 'documents'>('details')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('*, employee_profiles(*)').eq('is_active', true).order('full_name')
    setEmployees((data || []) as Employee[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = employees.filter(e => {
    const ep = e.employee_profiles as EmployeeProfile | null
    if (typeFilter && ep?.employee_type !== typeFilter) return false
    if (statusFilter && ep?.status !== statusFilter) return false
    if (search && !e.full_name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">People</div>
          <div className="page-sub">{employees.length} employees</div>
        </div>
      </div>
      <div className="page-body">
        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <input className="inp" style={{ width: 220 }} placeholder="Search by name..." value={search} onChange={e => setSearch(e.target.value)} />
          <select className="inp" style={{ width: 160 }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="">All types</option>
            <option value="permanent">Permanent</option>
            <option value="intern">Intern</option>
            <option value="freelancer">Freelancer</option>
          </select>
          <select className="inp" style={{ width: 160 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="active">Active</option>
            <option value="onboarding">Onboarding</option>
            <option value="exited">Exited</option>
            <option value="">All</option>
          </select>
        </div>
        {loading ? (
          <div className="empty-state"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state"><div className="empty-state-title">No people found</div></div>
        ) : (
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Department</th>
                    <th>Type</th>
                    <th>Designation</th>
                    <th>Joined</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(emp => {
                    const ep = emp.employee_profiles as EmployeeProfile | null
                    return (
                      <tr key={emp.id} onClick={() => { setSelected(emp); setDrawerTab('details') }}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div className="avatar">{ini(emp.full_name)}</div>
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13 }}>{emp.full_name}</div>
                              <div style={{ fontSize: 11, color: 'var(--text3)' }}>{emp.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>{ep?.department ? DEPT_DISPLAY[ep.department] || ep.department : '--'}</td>
                        <td><TypeBadge type={ep?.employee_type} /></td>
                        <td>{ep?.designation || '--'}</td>
                        <td>{fmtDate(ep?.joining_date || null)}</td>
                        <td><StatusBadge status={ep?.status} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {selected && (
        <PersonDrawer
          employee={selected}
          tab={drawerTab}
          onTabChange={setDrawerTab}
          onClose={() => setSelected(null)}
          onRefresh={load}
          showToast={showToast}
        />
      )}
    </>
  )
}

// ── Person Drawer ───────────────────────────────────────────────────────────
function PersonDrawer({ employee, tab, onTabChange, onClose, onRefresh, showToast }: {
  employee: Employee
  tab: 'details' | 'compensation' | 'kyc' | 'documents'
  onTabChange: (t: 'details' | 'compensation' | 'kyc' | 'documents') => void
  onClose: () => void
  onRefresh: () => void
  showToast: (m: string, t?: 'ok' | 'fail') => void
}) {
  const ep = employee.employee_profiles as EmployeeProfile | null

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 680 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="avatar avatar-lg">{ini(employee.full_name)}</div>
            <div>
              <div className="modal-title">{employee.full_name}</div>
              <div className="modal-sub">{ep?.designation || ep?.role || ''} {ep?.department ? '· ' + (DEPT_DISPLAY[ep.department] || ep.department) : ''}</div>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        <div className="tabs" style={{ padding: '0 24px', marginBottom: 0 }}>
          {(['details', 'compensation', 'kyc', 'documents'] as const).map(t => (
            <button key={t} className={`tab-btn${tab === t ? ' active' : ''}`} onClick={() => onTabChange(t)} style={{ textTransform: 'capitalize' }}>{t}</button>
          ))}
        </div>
        <div style={{ overflowY: 'auto', flex: 1, padding: '20px 24px' }}>
          {tab === 'details' && <PersonDetails employee={employee} onRefresh={onRefresh} showToast={showToast} />}
          {tab === 'compensation' && <PersonCompensation employee={employee} showToast={showToast} />}
          {tab === 'kyc' && <PersonKYC employee={employee} showToast={showToast} />}
          {tab === 'documents' && <PersonDocuments employee={employee} showToast={showToast} />}
        </div>
      </div>
    </div>
  )
}

// ── Person Details Tab ──────────────────────────────────────────────────────
function PersonDetails({ employee, onRefresh, showToast }: { employee: Employee; onRefresh: () => void; showToast: (m: string, t?: 'ok' | 'fail') => void }) {
  const ep = employee.employee_profiles as EmployeeProfile | null
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    employee_id: ep?.employee_id || '',
    employee_type: ep?.employee_type || 'permanent',
    department: ep?.department || '',
    role: ep?.role || '',
    seniority: ep?.seniority || '',
    joining_date: ep?.joining_date || '',
    reports_to_name: '',
    status: ep?.status || 'active',
    phone: employee.phone || '',
  })
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    const { error } = await supabase.from('employee_profiles').update({
      employee_id: form.employee_id || null,
      employee_type: form.employee_type,
      department: form.department || null,
      role: form.role || null,
      joining_date: form.joining_date || null,
      status: form.status,
    }).eq('id', ep?.id || '')
    if (form.phone !== employee.phone) {
      await supabase.from('profiles').update({ phone: form.phone || null }).eq('id', employee.id)
    }
    setSaving(false)
    if (error) { showToast('Failed to save.', 'fail'); return }
    showToast('Details saved.')
    setEditing(false)
    onRefresh()
  }

  const rows: [string, string][] = [
    ['Employee ID', ep?.employee_id || '--'],
    ['Type', ep?.employee_type || '--'],
    ['Department', ep?.department ? (DEPT_DISPLAY[ep.department] || ep.department) : '--'],
    ['Role', ep?.role || '--'],
    ['Seniority', ep?.seniority || '--'],
    ['Designation', ep?.designation || '--'],
    ['Joining Date', fmtDate(ep?.joining_date || null)],
    ['Status', ep?.status || '--'],
    ['Email', employee.email],
    ['Phone', employee.phone || '--'],
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        {editing ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>Cancel</button>
            <button className="btn btn-primary btn-sm" disabled={saving} onClick={save}>{saving ? 'Saving...' : 'Save'}</button>
          </div>
        ) : (
          <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>Edit</button>
        )}
      </div>
      {!editing ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {rows.map(([label, val]) => (
            <div key={label} style={{ background: 'var(--bg3)', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500, textTransform: label === 'Type' || label === 'Status' ? 'capitalize' : undefined }}>{val}</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="field-row">
            <div className="field"><label>Employee ID</label><input className="inp" value={form.employee_id} onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))} /></div>
            <div className="field"><label>Type</label>
              <select className="inp" value={form.employee_type} onChange={e => setForm(f => ({ ...f, employee_type: e.target.value as EmployeeType }))}>
                <option value="permanent">Permanent</option>
                <option value="intern">Intern</option>
                <option value="freelancer">Freelancer</option>
              </select>
            </div>
          </div>
          <div className="field-row">
            <div className="field"><label>Department</label>
              <select className="inp" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}>
                <option value="">Select...</option>
                {Object.entries(DEPT_DISPLAY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="field"><label>Role</label><input className="inp" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} /></div>
          </div>
          <div className="field-row">
            <div className="field"><label>Joining Date</label><input className="inp" type="date" value={form.joining_date} onChange={e => setForm(f => ({ ...f, joining_date: e.target.value }))} /></div>
            <div className="field"><label>Status</label>
              <select className="inp" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))}>
                <option value="onboarding">Onboarding</option>
                <option value="active">Active</option>
                <option value="exited">Exited</option>
              </select>
            </div>
          </div>
          <div className="field"><label>Phone</label><input className="inp" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
        </div>
      )}
    </div>
  )
}

// ── Person Compensation Tab ─────────────────────────────────────────────────
function PersonCompensation({ employee, showToast }: { employee: Employee; showToast: (m: string, t?: 'ok' | 'fail') => void }) {
  const ep = employee.employee_profiles as EmployeeProfile | null
  const isFreelancer = ep?.employee_type === 'freelancer'
  const [records, setRecords] = useState<(EmployeeCompensation | FreelancerRateCard)[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ amount: '', frequency: 'monthly', effective_from: new Date().toISOString().split('T')[0], notes: '', rate_type: 'monthly_retainer', scope_notes: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const table = isFreelancer ? 'freelancer_rate_cards' : 'employee_compensation'
    ;(supabase.from(table as any) as any).select('*').eq('profile_id', employee.id).order('effective_from', { ascending: false }).then(({ data }: any) => {
      setRecords(data || [])
      setLoading(false)
    })
  }, [employee.id, isFreelancer])

  async function save() {
    if (!form.amount) { showToast('Amount required.', 'fail'); return }
    setSaving(true)
    const table = isFreelancer ? 'freelancer_rate_cards' : 'employee_compensation'
    const payload = isFreelancer ? {
      profile_id: employee.id,
      rate_type: form.rate_type,
      amount: parseFloat(form.amount),
      scope_notes: form.scope_notes || null,
      effective_from: form.effective_from,
    } : {
      profile_id: employee.id,
      compensation_type: ep?.employee_type === 'intern' ? 'stipend' : 'ctc',
      amount: parseFloat(form.amount),
      frequency: form.frequency,
      effective_from: form.effective_from,
      notes: form.notes || null,
    }
    const { error } = await supabase.from(table as any).insert(payload as any)
    setSaving(false)
    if (error) { showToast('Failed to save.', 'fail'); return }
    showToast('Saved.')
    setAdding(false)
    const { data } = await supabase.from(table as any).select('*').eq('profile_id', employee.id).order('effective_from', { ascending: false })
    setRecords(data || [])
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div className="section-title">{isFreelancer ? 'Rate Cards' : 'Compensation History'}</div>
        <button className="btn btn-ghost btn-sm" onClick={() => setAdding(!adding)}>+ Add</button>
      </div>
      {adding && (
        <div className="card" style={{ padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {isFreelancer ? (
              <>
                <div className="field-row">
                  <div className="field"><label>Rate Type</label>
                    <select className="inp" value={form.rate_type} onChange={e => setForm(f => ({ ...f, rate_type: e.target.value }))}>
                      <option value="monthly_retainer">Monthly Retainer</option>
                      <option value="daily">Daily Rate</option>
                      <option value="project">Project Rate</option>
                    </select>
                  </div>
                  <div className="field"><label>Amount (INR)</label><input className="inp" type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="e.g. 25000" /></div>
                </div>
                <div className="field"><label>Scope Notes</label><input className="inp" value={form.scope_notes} onChange={e => setForm(f => ({ ...f, scope_notes: e.target.value }))} placeholder="What's included in this rate" /></div>
              </>
            ) : (
              <>
                <div className="field-row">
                  <div className="field"><label>Amount (INR per annum)</label><input className="inp" type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="e.g. 480000" /></div>
                  <div className="field"><label>Frequency</label>
                    <select className="inp" value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}>
                      <option value="monthly">Monthly</option>
                      <option value="annual">Annual</option>
                    </select>
                  </div>
                </div>
                <div className="field"><label>Notes</label><input className="inp" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="e.g. Post-appraisal revision" /></div>
              </>
            )}
            <div className="field"><label>Effective From</label><input className="inp" type="date" value={form.effective_from} onChange={e => setForm(f => ({ ...f, effective_from: e.target.value }))} /></div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setAdding(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" disabled={saving} onClick={save}>{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
      {loading ? <div className="empty-state"><div className="spinner" /></div> : records.length === 0 ? (
        <div className="empty-state"><div className="empty-state-title">No records yet</div><div className="empty-state-sub">Add the first entry above.</div></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {records.map((r: any, i) => (
            <div key={r.id} className="card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{fmtMoney(r.amount)}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                  {isFreelancer ? (r.rate_type?.replace(/_/g, ' ') || '') : (r.frequency || '')} &nbsp;&bull;&nbsp; From {fmtDate(r.effective_from)}
                  {(r.notes || r.scope_notes) && <> &nbsp;&bull;&nbsp; {r.notes || r.scope_notes}</>}
                </div>
              </div>
              {i === 0 && <span className="badge badge-active">Current</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Person KYC Tab ──────────────────────────────────────────────────────────
function PersonKYC({ employee, showToast }: { employee: Employee; showToast: (m: string, t?: 'ok' | 'fail') => void }) {
  const [kyc, setKyc] = useState<EmployeeKYC | null>(null)
  const [form, setForm] = useState({
    aadhaar_number: '', pan_number: '', bank_name: '', account_number: '', ifsc_code: '',
    date_of_birth: '', blood_group: '', personal_email: '', personal_phone: '',
    permanent_address: '', emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relation: '',
  })
  const [saving, setSaving] = useState(false)
  const [reveal, setReveal] = useState({ aadhaar: false, pan: false, account: false })

  useEffect(() => {
    supabase.from('employee_kyc').select('*').eq('profile_id', employee.id).maybeSingle().then(({ data }) => {
      if (data) { setKyc(data); setForm({ ...data }) }
    })
  }, [employee.id])

  async function save() {
    setSaving(true)
    const payload = { ...form, profile_id: employee.id, updated_at: new Date().toISOString() }
    const r = kyc
      ? await supabase.from('employee_kyc').update(payload).eq('id', kyc.id)
      : await supabase.from('employee_kyc').insert(payload)
    setSaving(false)
    if (r.error) { showToast('Failed to save.', 'fail'); return }
    showToast('KYC saved.')
    const { data } = await supabase.from('employee_kyc').select('*').eq('profile_id', employee.id).single()
    if (data) setKyc(data)
  }

  const f = (key: keyof typeof form, label: string, type = 'text', placeholder = '') => (
    <div className="field">
      <label>{label}</label>
      <input className="inp" type={type} value={(form as any)[key] || ''} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} placeholder={placeholder} />
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div className="section-title" style={{ marginBottom: 10 }}>Identification</div>
        <div className="field-row">
          {f('aadhaar_number', 'Aadhaar Number', 'text', '1234 5678 9012')}
          {f('pan_number', 'PAN Number', 'text', 'ABCDE1234F')}
        </div>
      </div>
      <div>
        <div className="section-title" style={{ marginBottom: 10 }}>Bank Details</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="field-row">
            {f('bank_name', 'Bank Name', 'text', 'HDFC Bank')}
            {f('account_number', 'Account Number', 'text', '0123456789')}
          </div>
          {f('ifsc_code', 'IFSC Code', 'text', 'HDFC0001234')}
        </div>
      </div>
      <div>
        <div className="section-title" style={{ marginBottom: 10 }}>Personal Details</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="field-row">
            {f('date_of_birth', 'Date of Birth', 'date')}
            {f('blood_group', 'Blood Group', 'text', 'B+')}
          </div>
          <div className="field-row">
            {f('personal_email', 'Personal Email', 'email', 'personal@gmail.com')}
            {f('personal_phone', 'Personal Phone', 'tel', '+91 98765 43210')}
          </div>
          <div className="field"><label>Permanent Address</label><textarea className="inp" value={form.permanent_address} onChange={e => setForm(p => ({ ...p, permanent_address: e.target.value }))} placeholder="Full address" rows={2} /></div>
        </div>
      </div>
      <div>
        <div className="section-title" style={{ marginBottom: 10 }}>Emergency Contact</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="field-row">
            {f('emergency_contact_name', 'Name', 'text', 'Full name')}
            {f('emergency_contact_relation', 'Relationship', 'text', 'Father / Spouse')}
          </div>
          {f('emergency_contact_phone', 'Phone', 'tel', '+91 98765 43210')}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" disabled={saving} onClick={save}>{saving ? 'Saving...' : 'Save KYC Details'}</button>
      </div>
    </div>
  )
}

// ── Person Documents Tab ────────────────────────────────────────────────────
function PersonDocuments({ employee, showToast }: { employee: Employee; showToast: (m: string, t?: 'ok' | 'fail') => void }) {
  const [docs, setDocs] = useState<EmployeeDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [uploadForm, setUploadForm] = useState({ document_type: 'other' as DocumentType, label: '', file: null as File | null })

  useEffect(() => {
    supabase.from('employee_documents').select('*').eq('profile_id', employee.id).order('created_at', { ascending: false }).then(({ data }) => {
      setDocs(data || [])
      setLoading(false)
    })
  }, [employee.id])

  async function uploadDoc() {
    if (!uploadForm.file) { showToast('Select a file first.', 'fail'); return }
    setUploading(true)
    // Convert file to base64 for Drive upload
    const reader = new FileReader()
    reader.onload = async (e) => {
      const b64 = (e.target?.result as string).split(',')[1]
      const ext = uploadForm.file!.name.split('.').pop()
      const fname = `${uploadForm.document_type}-${employee.full_name.replace(/\s+/g,'-').toLowerCase()}-${Date.now()}.${ext}`
      let driveLink: string | null = null
      // Try Drive upload if employee has a folder
      const { data: obData } = await supabase.from('scout_onboarding').select('drive_folder_url').eq('employee_id', employee.id).maybeSingle()
      const folderMatch = obData?.drive_folder_url ? obData.drive_folder_url.match(/folders\/([a-zA-Z0-9_-]+)/) : null
      const folderId = folderMatch ? folderMatch[1] : null
      if (folderId) {
        try {
          const dr = await fetch('https://script.google.com/macros/s/AKfycbyVbz5RdpIuwkkyqrvccttilVhxKB71BXWblIC7jrLa4k8G6pqJLMSVWzdE11iq17yvaA/exec', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'upload_file', folderId, fileName: fname, base64: b64, mimeType: uploadForm.file!.type || 'application/octet-stream' })
          })
          const drData = await dr.json()
          if (drData?.fileLink) driveLink = drData.fileLink
        } catch { /* Drive upload failed, continue without */ }
      }
      await supabase.from('employee_documents').insert({
        profile_id: employee.id,
        document_type: uploadForm.document_type,
        label: uploadForm.label || null,
        status: 'signed',
        signed_copy_url: driveLink,
        is_current: true,
      })
      showToast(driveLink ? 'Uploaded to Drive.' : 'Saved. No Drive folder linked for this employee.')
      setUploading(false)
      setShowUpload(false)
      const { data } = await supabase.from('employee_documents').select('*').eq('profile_id', employee.id).order('created_at', { ascending: false })
      setDocs(data || [])
    }
    reader.readAsDataURL(uploadForm.file)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div className="section-title">Documents</div>
        <button className="btn btn-ghost btn-sm" onClick={() => setShowUpload(!showUpload)}>+ Upload</button>
      </div>
      {showUpload && (
        <div className="card" style={{ padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="field-row">
              <div className="field"><label>Document Type</label>
                <select className="inp" value={uploadForm.document_type} onChange={e => setUploadForm(f => ({ ...f, document_type: e.target.value as DocumentType }))}>
                  {Object.entries(DOC_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="field"><label>Label (if Other)</label><input className="inp" value={uploadForm.label} onChange={e => setUploadForm(f => ({ ...f, label: e.target.value }))} placeholder="e.g. NDA" /></div>
            </div>
            <div className="field"><label>File</label><input className="inp" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setUploadForm(f => ({ ...f, file: e.target.files?.[0] || null }))} /></div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowUpload(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" disabled={uploading} onClick={uploadDoc}>{uploading ? 'Uploading...' : 'Upload'}</button>
            </div>
          </div>
        </div>
      )}
      {loading ? <div className="empty-state"><div className="spinner" /></div> : docs.length === 0 ? (
        <div className="empty-state"><div className="empty-state-title">No documents yet</div><div className="empty-state-sub">Upload manually or generate from the Documents section.</div></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {docs.map(d => (
            <div key={d.id} className="card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{d.label || DOC_TYPE_LABELS[d.document_type] || d.document_type}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                  v{d.version} &nbsp;&bull;&nbsp; {new Date(d.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {d.status === 'signed' && <> &nbsp;&bull;&nbsp; <span style={{ color: 'var(--green)' }}>Signed</span></>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {d.file_url && <a className="btn btn-ghost btn-sm" href={d.file_url} target="_blank" rel="noreferrer">View</a>}
                {d.signed_copy_url && <a className="btn btn-ghost btn-sm" href={d.signed_copy_url} target="_blank" rel="noreferrer">Signed copy</a>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Onboarding Page ─────────────────────────────────────────────────────────
function OnboardingPage({ user, showToast }: { user: { id: string; full_name: string; role: string }; showToast: (m: string, t?: 'ok' | 'fail') => void }) {
  const [entries, setEntries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('scout_onboarding').select('*, scout_onboarding_checklist(*)').in('status', ['pending', 'in_progress', 'complete']).order('created_at', { ascending: false }).then(({ data }) => {
      setEntries(data || [])
      setLoading(false)
    })
  }, [])

  const active = entries.filter(e => e.status !== 'complete')
  const completed = entries.filter(e => e.status === 'complete')

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Onboarding</div>
          <div className="page-sub">Managed in Scout &bull; Read-only view</div>
        </div>
        <a className="btn btn-ghost" href="https://scout.buttertoast.co" target="_blank" rel="noreferrer">Open Scout</a>
      </div>
      <div className="page-body">
        {loading ? <div className="empty-state"><div className="spinner" /></div> : (
          <>
            {active.length === 0 && <div className="empty-state"><div className="empty-state-title">No active onboarding entries</div><div className="empty-state-sub">Entries are created in Scout when a candidate reaches Confirmed.</div></div>}
            {active.length > 0 && (
              <>
                <div className="section-title" style={{ marginBottom: 12 }}>Active ({active.length})</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 12, marginBottom: 28 }}>
                  {active.map(ob => <OnboardingCard key={ob.id} ob={ob} />)}
                </div>
              </>
            )}
            {completed.length > 0 && (
              <>
                <div className="section-title" style={{ marginBottom: 12 }}>Completed ({completed.length})</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 12 }}>
                  {completed.map(ob => <OnboardingCard key={ob.id} ob={ob} />)}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </>
  )
}

function OnboardingCard({ ob }: { ob: any }) {
  const items = ob.scout_onboarding_checklist || []
  const done = items.filter((i: any) => i.completed).length
  const total = items.length
  const pct = total > 0 ? Math.round(done / total * 100) : 0
  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{ob.role_title || 'Unknown role'}</div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{ob.department ? (DEPT_DISPLAY[ob.department] || ob.department) : ''} &bull; {ob.employment_type || ''}</div>
        </div>
        <span className={`badge ${ob.status === 'complete' ? 'badge-active' : ob.status === 'in_progress' ? 'badge-onboarding' : 'badge-exited'}`}>{ob.status.replace('_', ' ')}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: 'var(--text3)' }}>{done} / {total} steps</span>
        <span style={{ fontSize: 11, color: 'var(--text3)' }}>{pct}%</span>
      </div>
      <div style={{ height: 4, background: 'var(--bg3)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: ob.status === 'complete' ? 'var(--green)' : 'var(--amber)', borderRadius: 2 }} />
      </div>
      {ob.joining_date && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>Joining: {fmtDate(ob.joining_date)}</div>}
      <div style={{ marginTop: 10 }}>
        <a className="btn btn-ghost btn-sm" href="https://scout.buttertoast.co" target="_blank" rel="noreferrer" style={{ fontSize: 11 }}>Manage in Scout</a>
      </div>
    </div>
  )
}

// ── Documents Page ──────────────────────────────────────────────────────────
function DocumentsPage({ user, showToast }: { user: { id: string; full_name: string; role: string }; showToast: (m: string, t?: 'ok' | 'fail') => void }) {
  const [docs, setDocs] = useState<EmployeeDocument[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [showGenerate, setShowGenerate] = useState(false)
  const [expRequests, setExpRequests] = useState<any[]>([])

  useEffect(() => {
    Promise.all([
      supabase.from('employee_documents').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*, employee_profiles(*)').eq('is_active', true).order('full_name'),
      supabase.from('experience_letter_requests').select('*, profiles(full_name)').eq('status', 'pending'),
    ]).then(([d, e, r]) => {
      setDocs(d.data || [])
      setEmployees((e.data || []) as Employee[])
      setExpRequests(r.data || [])
      setLoading(false)
    })
  }, [])

  const filtered = docs.filter(d => {
    if (typeFilter && d.document_type !== typeFilter) return false
    if (search) return (d.label || '').toLowerCase().includes(search.toLowerCase()) || d.document_type.includes(search.toLowerCase())
    return true
  })

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Documents</div>
          <div className="page-sub">{docs.length} total documents</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowGenerate(true)}>+ Generate Document</button>
      </div>
      <div className="page-body">
        {/* Pending requests */}
        {expRequests.length > 0 && (
          <div className="card" style={{ padding: 16, marginBottom: 20, borderColor: 'rgba(224,63,42,0.3)' }}>
            <div className="section-title" style={{ marginBottom: 10, color: 'var(--red)' }}>Pending Experience Letter Requests ({expRequests.length})</div>
            {expRequests.map((r: any) => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{r.profiles?.full_name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>{r.reason || 'No reason provided'} &bull; {new Date(r.requested_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => setShowGenerate(true)}>Generate</button>
              </div>
            ))}
          </div>
        )}
        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <input className="inp" style={{ width: 220 }} placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
          <select className="inp" style={{ width: 200 }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="">All types</option>
            {Object.entries(DOC_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        {loading ? <div className="empty-state"><div className="spinner" /></div> : filtered.length === 0 ? (
          <div className="empty-state"><div className="empty-state-title">No documents</div></div>
        ) : (
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Document</th><th>Type</th><th>Version</th><th>Status</th><th>Date</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {filtered.map(d => (
                    <tr key={d.id} onClick={e => e.stopPropagation()}>
                      <td style={{ fontWeight: 600, color: 'var(--text)' }}>{d.label || DOC_TYPE_LABELS[d.document_type] || d.document_type}</td>
                      <td style={{ fontSize: 11, textTransform: 'capitalize' }}>{d.document_type.replace(/_/g, ' ')}</td>
                      <td>v{d.version}</td>
                      <td><span className={`badge ${d.status === 'signed' ? 'badge-active' : d.status === 'superseded' ? 'badge-exited' : 'badge-onboarding'}`}>{d.status}</span></td>
                      <td>{new Date(d.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                      <td onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {d.file_url && <a className="btn btn-ghost btn-sm" href={d.file_url} target="_blank" rel="noreferrer">View</a>}
                          {d.signed_copy_url && <a className="btn btn-ghost btn-sm" href={d.signed_copy_url} target="_blank" rel="noreferrer">Signed</a>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      {showGenerate && (
        <GenerateDocModal
          employees={employees}
          onClose={() => setShowGenerate(false)}
          showToast={showToast}
          onDone={async () => {
            const { data } = await supabase.from('employee_documents').select('*').order('created_at', { ascending: false })
            setDocs(data || [])
            setShowGenerate(false)
          }}
        />
      )}
    </>
  )
}

// ── Generate Doc Modal ──────────────────────────────────────────────────────
function GenerateDocModal({ employees, onClose, showToast, onDone }: { employees: Employee[]; onClose: () => void; showToast: (m: string, t?: 'ok' | 'fail') => void; onDone: () => void }) {
  const [form, setForm] = useState({
    profile_id: '',
    document_type: 'appointment_letter' as DocumentType,
    label: '',
    signatory: 'aakash',
    effective_date: new Date().toISOString().split('T')[0],
    notes: '',
  })
  const [generating, setGenerating] = useState(false)

  async function generate() {
    if (!form.profile_id) { showToast('Select an employee.', 'fail'); return }
    setGenerating(true)
    const emp = employees.find(e => e.id === form.profile_id)
    const ep = emp?.employee_profiles as EmployeeProfile | null
    // Get employee's drive folder from onboarding record
    const { data: obData } = await supabase.from('scout_onboarding').select('drive_folder_url').eq('employee_id', form.profile_id).maybeSingle()
    // Also check candidate onboarding
    const { data: obData2 } = !obData ? await supabase.from('scout_onboarding').select('drive_folder_url,candidate_id').maybeSingle() : { data: null }
    const driveFolderUrl = obData?.drive_folder_url || obData2?.drive_folder_url || null
    // Extract folder ID from URL if available
    const driveFolderIdMatch = driveFolderUrl ? driveFolderUrl.match(/folders\/([a-zA-Z0-9_-]+)/) : null
    const driveFolderId = driveFolderIdMatch ? driveFolderIdMatch[1] : null

    const res = await fetch('/api/generate-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        document_type: form.document_type,
        profile_id: form.profile_id,
        employee_name: emp?.full_name || '',
        role_title: ep?.designation || ep?.role || '',
        department: ep?.department ? (DEPT_DISPLAY[ep.department] || ep.department) : '',
        joining_date: ep?.joining_date || '',
        signatory: form.signatory,
        effective_date: form.effective_date,
        notes: form.notes,
        label: form.label,
        drive_folder_id: driveFolderId,
      })
    })
    const data = await res.json()
    setGenerating(false)
    if (!data.html) { showToast('Generation failed.', 'fail'); return }
    // Trigger HTML download -- user opens in browser and prints to PDF
    const a = document.createElement('a')
    a.href = data.html
    a.download = data.filename || 'document.html'
    a.click()
    if (data.driveLink) {
      showToast('Generated, saved to Drive and downloaded.')
    } else {
      showToast('Generated and downloaded. Open in browser, print to PDF.')
    }
    onDone()
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <div><div className="modal-title">Generate Document</div></div>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <div className="field"><label>Employee *</label>
            <select className="inp" value={form.profile_id} onChange={e => setForm(f => ({ ...f, profile_id: e.target.value }))}>
              <option value="">Select employee...</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
            </select>
          </div>
          <div className="field"><label>Document Type *</label>
            <select className="inp" value={form.document_type} onChange={e => setForm(f => ({ ...f, document_type: e.target.value as DocumentType }))}>
              <option value="appointment_letter">Appointment Letter</option>
              <option value="freelance_agreement">Freelance Agreement</option>
              <option value="appraisal">Appraisal Letter</option>
              <option value="probation_confirmation">Probation Confirmation</option>
              <option value="salary_revision">Salary Revision Letter</option>
              <option value="experience_letter">Experience Letter</option>
              <option value="internship_completion">Internship Completion Certificate</option>
              <option value="relieving_letter">Relieving Letter</option>
              <option value="warning_letter">Warning Letter</option>
            </select>
          </div>
          <div className="field-row">
            <div className="field"><label>Effective Date</label><input className="inp" type="date" value={form.effective_date} onChange={e => setForm(f => ({ ...f, effective_date: e.target.value }))} /></div>
            <div className="field"><label>Signatory</label>
              <select className="inp" value={form.signatory} onChange={e => setForm(f => ({ ...f, signatory: e.target.value }))}>
                <option value="aakash">Aakash Rathi, Founder</option>
                <option value="niki">Niki A. Rathi, Director</option>
              </select>
            </div>
          </div>
          <div className="field"><label>Notes (optional)</label><textarea className="inp" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any specific details to include..." rows={2} /></div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={generating} onClick={generate}>{generating ? <><div className="spinner" /><span>Generating...</span></> : 'Generate & Download'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Settings Page ───────────────────────────────────────────────────────────
function SettingsPage({ showToast }: { showToast: (m: string, t?: 'ok' | 'fail') => void }) {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('stock_settings').select('key,value').then(({ data }) => {
      const s: Record<string, string> = {}
      data?.forEach(r => { s[r.key] = r.value })
      setSettings(s)
      setLoading(false)
    })
  }, [])

  async function save() {
    setSaving(true)
    const rows = Object.entries(settings).map(([key, value]) => ({ key, value }))
    for (const row of rows) {
      await supabase.from('stock_settings').upsert(row, { onConflict: 'key' })
    }
    setSaving(false)
    showToast('Settings saved.')
  }

  const s = (key: string, label: string, placeholder = '') => (
    <div className="field">
      <label>{label}</label>
      <input className="inp" value={settings[key] || ''} onChange={e => setSettings(p => ({ ...p, [key]: e.target.value }))} placeholder={placeholder} />
    </div>
  )

  return (
    <>
      <div className="page-header">
        <div><div className="page-title">Settings</div><div className="page-sub">Letterhead, signatory, and company details</div></div>
      </div>
      <div className="page-body">
        {loading ? <div className="empty-state"><div className="spinner" /></div> : (
          <div style={{ maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div className="card" style={{ padding: 20 }}>
              <div className="section-title" style={{ marginBottom: 14 }}>Company Details</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {s('company_name', 'Company Name', 'Butter Toast')}
                {s('company_parent', 'Parent Brand', 'A HATCHX INDIA Brand')}
                {s('company_gst', 'GST Number')}
                {s('company_address', 'Address')}
              </div>
            </div>
            <div className="card" style={{ padding: 20 }}>
              <div className="section-title" style={{ marginBottom: 14 }}>Default Signatory</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {s('default_signatory_name', 'Name', 'Aakash Rathi')}
                {s('default_signatory_designation', 'Designation', 'Founder')}
              </div>
            </div>
            <div className="card" style={{ padding: 20 }}>
              <div className="section-title" style={{ marginBottom: 14 }}>Letterhead Margins (mm)</div>
              <div className="field-row">
                {s('lh_top_margin_mm', 'Top', '38')}
                {s('lh_bottom_margin_mm', 'Bottom', '20')}
              </div>
              <div className="field-row" style={{ marginTop: 12 }}>
                {s('lh_left_margin_mm', 'Left', '20')}
                {s('lh_right_margin_mm', 'Right', '20')}
              </div>
              <div className="field" style={{ marginTop: 12 }}>
                <label>Letterhead PDF URL</label>
                <input className="inp" value={settings.lh_url || ''} onChange={e => setSettings(p => ({ ...p, lh_url: e.target.value }))} />
              </div>
            </div>
            <div className="card" style={{ padding: 20 }}>
              <div className="section-title" style={{ marginBottom: 14 }}>Signature URLs</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {s('sign_aakash_url', 'Aakash Rathi Signature')}
                {s('sign_niki_url', 'Niki A. Rathi Signature')}
              </div>
            </div>
            <button className="btn btn-primary" disabled={saving} onClick={save} style={{ alignSelf: 'flex-end' }}>{saving ? 'Saving...' : 'Save Settings'}</button>
          </div>
        )}
      </div>
    </>
  )
}

// ── Badges ──────────────────────────────────────────────────────────────────
function TypeBadge({ type }: { type?: EmployeeType }) {
  if (!type) return <span style={{ color: 'var(--text3)' }}>--</span>
  const cls = { permanent: 'badge-permanent', intern: 'badge-intern', freelancer: 'badge-freelancer' }[type] || ''
  return <span className={`badge ${cls}`} style={{ textTransform: 'capitalize' }}>{type}</span>
}

function StatusBadge({ status }: { status?: string }) {
  if (!status) return <span style={{ color: 'var(--text3)' }}>--</span>
  const cls = { active: 'badge-active', onboarding: 'badge-onboarding', exited: 'badge-exited' }[status] || ''
  return <span className={`badge ${cls}`} style={{ textTransform: 'capitalize' }}>{status}</span>
}

// ── Icons ───────────────────────────────────────────────────────────────────
const PeopleIcon = () => <svg viewBox="0 0 16 16" fill="none"><circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.5"/><path d="M1 13c0-2.761 2.239-4 5-4s5 1.239 5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="12" cy="5" r="2" stroke="currentColor" strokeWidth="1.5"/><path d="M12 9c1.5 0 3 .8 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
const OnboardingIcon = () => <svg viewBox="0 0 16 16" fill="none"><path d="M8 2L2 7v7h4v-4h4v4h4V7L8 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>
const DocIcon = () => <svg viewBox="0 0 16 16" fill="none"><rect x="3" y="1" width="10" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><path d="M6 5h4M6 8h4M6 11h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
const SettingsIcon = () => <svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
const HomeIcon = () => <svg viewBox="0 0 16 16" fill="none"><path d="M2 7l6-5 6 5v7H2V7z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M6 14v-4h4v4" stroke="currentColor" strokeWidth="1.5"/></svg>
const ScoutIcon = () => <svg viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5"/><path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
const RosterIcon = () => <svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M2 13c0-3.314 2.686-5 6-5s6 1.686 6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
