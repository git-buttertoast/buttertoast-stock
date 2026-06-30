'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { DEPT_DISPLAY, DOC_TYPE_LABELS, DEVICE_DEPRECIATION_DEFAULTS, depreciatedValue } from '@/lib/types'
import type {
  Employee, EmployeeProfile, EmployeeKYC,
  EmployeeCompensation, FreelancerRateCard, EmployeeDocument,
  EmployeeType, DocumentType, EmployeeDevice
} from '@/lib/types'

// ── iOS-safe date input (overlay pattern) ──
function DateInput({ value, onChange, className = 'inp' }: { value: string, onChange: (e: any) => void, className?: string }) {
  const disp = value ? new Date(value + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input type="text" className={className} readOnly value={disp} placeholder="Select date" style={{ cursor: 'pointer' }} />
      <input type="date" value={value} onChange={onChange} style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }} />
    </div>
  )
}

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
  const [page, setPage] = useState<'people' | 'onboarding' | 'documents' | 'devices' | 'settings'>('people')
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
        <div className="sidebar-top">
          <div className="sidebar-logo">
            <img src="https://ferlauhakdbfpwfapxxw.supabase.co/storage/v1/object/public/assets/branding/logo.png" alt="BT" />
          </div>
          <div className="sidebar-app-name">Stock</div>
          <div className="sidebar-app-sub">HR System</div>
        </div>
        <nav className="sidenav">
          <div className="nav-section">HR</div>
          <NavBtn active={page === 'people'} onClick={() => setPage('people')} icon={<PeopleIcon />}>People</NavBtn>
          <NavBtn active={page === 'onboarding'} onClick={() => setPage('onboarding')} icon={<OnboardingIcon />}>Onboarding</NavBtn>
          <NavBtn active={page === 'documents'} onClick={() => setPage('documents')} icon={<DocIcon />}>Documents</NavBtn>
          <NavBtn active={page === 'devices'} onClick={() => setPage('devices')} icon={<DeviceIcon />}>Devices</NavBtn>
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
        {page === 'devices' && <DevicesPage user={user} showToast={showToast} />}
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
        <div style={{marginBottom:24}}>
          <div style={{background:'var(--red)',borderRadius:8,padding:'6px 10px',display:'inline-block',lineHeight:0,marginBottom:10}}>
            <img src="https://ferlauhakdbfpwfapxxw.supabase.co/storage/v1/object/public/assets/branding/logo.png" alt="BT" style={{height:18,display:'block'}} />
          </div>
          <div style={{fontSize:18,fontWeight:700,color:'var(--text)',letterSpacing:'-0.3px'}}>Stock</div>
          <div style={{fontSize:12,color:'var(--text3)',marginTop:2}}>HR System of Record</div>
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
  const [drawerTab, setDrawerTab] = useState<'details' | 'compensation' | 'kyc' | 'documents' | 'devices'>('details')

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
  tab: 'details' | 'compensation' | 'kyc' | 'documents' | 'devices'
  onTabChange: (t: 'details' | 'compensation' | 'kyc' | 'documents' | 'devices') => void
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
        <div className="tabs" style={{ padding: '0 24px', marginBottom: 0, overflowX: 'auto', flexWrap: 'nowrap', whiteSpace: 'nowrap', WebkitOverflowScrolling: 'touch' }}>
          {(['details', 'compensation', 'kyc', 'documents', 'devices'] as const).map(t => (
            <button key={t} className={`tab-btn${tab === t ? ' active' : ''}`} onClick={() => onTabChange(t)} style={{ textTransform: 'capitalize', flexShrink: 0 }}>{t}</button>
          ))}
        </div>
        <div style={{ overflowY: 'auto', flex: 1, padding: '20px 24px' }}>
          {tab === 'details' && <PersonDetails employee={employee} onRefresh={onRefresh} showToast={showToast} />}
          {tab === 'compensation' && <PersonCompensation employee={employee} showToast={showToast} />}
          {tab === 'kyc' && <PersonKYC employee={employee} showToast={showToast} />}
          {tab === 'documents' && <PersonDocuments employee={employee} showToast={showToast} />}
          {tab === 'devices' && <PersonDevices employee={employee} showToast={showToast} />}
        </div>
      </div>
    </div>
  )
}

// ── Person Details Tab ──────────────────────────────────────────────────────
function PersonDetails({ employee, onRefresh, showToast }: { employee: Employee; onRefresh: () => void; showToast: (m: string, t?: 'ok' | 'fail') => void }) {
  const ep = employee.employee_profiles as EmployeeProfile | null
  const [editing, setEditing] = useState(false)
  const [allEmployees, setAllEmployees] = useState<{id: string; full_name: string}[]>([])
  const [form, setForm] = useState({
    employee_id: ep?.employee_id || '',
    employee_type: ep?.employee_type || 'permanent',
    department: ep?.department || '',
    role: ep?.role || '',
    seniority: ep?.seniority || '',
    joining_date: ep?.joining_date || '',
    reports_to: ep?.reports_to || '',
    last_day: ep?.last_day || '',
    status: ep?.status || 'active',
    phone: employee.phone || '',
  })
  const [saving, setSaving] = useState(false)
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [driveFolderUrl, setDriveFolderUrl] = useState(ep?.drive_folder_url || '')

  useEffect(() => {
    supabase.from('profiles').select('id,full_name').eq('is_active', true).order('full_name')
      .then(({ data }) => setAllEmployees((data || []).filter(e => e.id !== employee.id)))
  }, [employee.id])

  async function createDriveFolder() {
    setCreatingFolder(true)
    try {
      const res = await fetch('https://script.google.com/macros/s/AKfycbyVbz5RdpIuwkkyqrvccttilVhxKB71BXWblIC7jrLa4k8G6pqJLMSVWzdE11iq17yvaA/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_folder', folderName: employee.full_name, parentFolder: 'Employees' })
      })
      const data = await res.json()
      if (data?.folderLink) {
        await supabase.from('employee_profiles').update({ drive_folder_url: data.folderLink }).eq('id', ep?.id || '')
        setDriveFolderUrl(data.folderLink)
        showToast('Drive folder created.')
        onRefresh()
      } else {
        showToast('Drive folder creation failed.', 'fail')
      }
    } catch {
      showToast('Drive API error.', 'fail')
    }
    setCreatingFolder(false)
  }

  async function save() {
    setSaving(true)
    const { error } = await supabase.from('employee_profiles').update({
      employee_id: form.employee_id || null,
      employee_type: form.employee_type,
      department: form.department || null,
      role: form.role || null,
      joining_date: form.joining_date || null,
      status: form.status,
      reports_to: form.reports_to || null,
      last_day: (form as any).last_day || null,
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

  // Resolve reports_to name for display
  const reportsToName = allEmployees.find(e => e.id === (ep?.reports_to || form.reports_to))?.full_name || '--'

  const rows: [string, string][] = [
    ['Employee ID', ep?.employee_id || '--'],
    ['Type', ep?.employee_type || '--'],
    ['Department', ep?.department ? (DEPT_DISPLAY[ep.department] || ep.department) : '--'],
    ['Role', ep?.role || '--'],
    ['Seniority', ep?.seniority || '--'],
    ['Designation', ep?.designation || '--'],
    ['Joining Date', fmtDate(ep?.joining_date || null)],
    ['Reports To', reportsToName],
    ['Status', ep?.status || '--'],
    ['Email', employee.email],
    ['Phone', employee.phone || '--'],
  ]
  const hasDriveFolder = !!(driveFolderUrl || ep?.drive_folder_url)

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
        <>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {rows.map(([label, val]) => (
            <div key={label} style={{ background: 'var(--bg3)', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500, textTransform: label === 'Type' || label === 'Status' ? 'capitalize' : undefined }}>{val}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12, padding: '12px 14px', background: 'var(--bg3)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 3 }}>Drive Folder</div>
            {hasDriveFolder
              ? <a href={driveFolderUrl || ep?.drive_folder_url || '#'} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: 'var(--red)', textDecoration: 'none' }}>Open folder</a>
              : <div style={{ fontSize: 13, color: 'var(--text3)' }}>No folder linked</div>
            }
          </div>
          {!hasDriveFolder && (
            <button className="btn btn-ghost btn-sm" disabled={creatingFolder} onClick={createDriveFolder}>
              {creatingFolder ? 'Creating...' : 'Create Drive folder'}
            </button>
          )}
        </div>
        {ep?.employee_type === 'intern' && (
          <InternshipAmendments employee={employee} showToast={showToast} />
        )}
        </>
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
            <div className="field"><label>Joining Date</label><DateInput value={form.joining_date} onChange={e => setForm(f => ({ ...f, joining_date: e.target.value }))} /></div>
            <div className="field"><label>Status</label>
              <select className="inp" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))}>
                <option value="onboarding">Onboarding</option>
                <option value="active">Active</option>
                <option value="exited">Exited</option>
              </select>
            </div>
          </div>
          <div className="field-row">
            <div className="field"><label>Phone</label><input className="inp" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
            <div className="field"><label>Last Working Day</label><DateInput value={(form as any).last_day || ''} onChange={e => setForm(f => ({ ...f, last_day: e.target.value } as any))} /></div>
          </div>
          <div className="field"><label>Reports To</label>
            <select className="inp" value={form.reports_to} onChange={e => setForm(f => ({ ...f, reports_to: e.target.value }))}>
              <option value="">None</option>
              {allEmployees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
            </select>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Internship Amendments ─────────────────────────────────────────────────────
function InternshipAmendments({ employee, showToast }: { employee: Employee; showToast: (m: string, t?: 'ok' | 'fail') => void }) {
  const ep = employee.employee_profiles as EmployeeProfile | null
  const [amendments, setAmendments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ extended_to: '', reason: '' })

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('internship_amendments').select('*')
      .eq('profile_id', employee.id).order('created_at', { ascending: false })
    setAmendments(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [employee.id])

  async function save() {
    if (!form.extended_to) { showToast('New end date required.', 'fail'); return }
    setSaving(true)
    // Get current end date -- last amendment extended_to or joining_date + internship months
    const latestEnd = amendments[0]?.extended_to || ep?.joining_date || null
    const { error } = await supabase.from('internship_amendments').insert({
      profile_id: employee.id,
      original_end: latestEnd,
      extended_to: form.extended_to,
      reason: form.reason || null,
    })
    setSaving(false)
    if (error) { showToast('Failed to save.', 'fail'); return }
    showToast('Internship extended.')
    setAdding(false)
    setForm({ extended_to: '', reason: '' })
    load()
  }

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Internship Extensions</div>
        <button className="btn btn-ghost btn-sm" onClick={() => setAdding(!adding)}>+ Extend</button>
      </div>
      {adding && (
        <div className="card" style={{ padding: 14, marginBottom: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="field">
              <label>New End Date *</label>
              <DateInput value={form.extended_to} onChange={e => setForm(f => ({ ...f, extended_to: e.target.value }))} />
            </div>
            <div className="field">
              <label>Reason</label>
              <input className="inp" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="e.g. Project extended, performance review pending" />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setAdding(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" disabled={saving} onClick={save}>{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
      {loading ? <div className="empty-state"><div className="spinner" /></div>
        : amendments.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--text3)', padding: '8px 0' }}>No extensions recorded.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {amendments.map((a: any) => (
              <div key={a.id} style={{ background: 'var(--bg3)', borderRadius: 8, padding: '10px 12px', fontSize: 12 }}>
                <div style={{ fontWeight: 600, color: 'var(--text)' }}>
                  Extended to {fmtDate(a.extended_to)}
                </div>
                <div style={{ color: 'var(--text3)', marginTop: 2 }}>
                  From {fmtDate(a.original_end)}
                  {a.reason && <> &bull; {a.reason}</>}
                  &bull; {new Date(a.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>
            ))}
          </div>
        )
      }
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
  const [form, setForm] = useState({ amount: '', frequency: 'annual', effective_from: new Date().toISOString().split('T')[0], notes: '', rate_type: 'monthly_retainer', scope_notes: '' })
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
    if (!form.effective_from) { showToast('Effective-from date required.', 'fail'); return }
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
      frequency: 'annual',
      effective_from: form.effective_from,
      notes: form.notes || null,
    }
    // Close off the previous record's effective_to before inserting new one
    if (records.length > 0) {
      const prev = records[0] as any
      if (prev && !prev.effective_to) {
        const dayBefore = new Date(form.effective_from)
        dayBefore.setDate(dayBefore.getDate() - 1)
        await supabase.from(table as any).update({ effective_to: dayBefore.toISOString().split('T')[0] }).eq('id', prev.id)
      }
    }
    const { error } = await supabase.from(table as any).insert(payload as any)
    setSaving(false)
    if (error) { showToast('Failed to save: ' + error.message, 'fail'); return }
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
                <div className="field"><label>Annual CTC (INR per annum)</label><input className="inp" type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="e.g. 480000" /></div>
                {form.amount && !isNaN(parseFloat(form.amount)) && (
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: -4 }}>
                    ≈ {fmtMoney(Math.round(parseFloat(form.amount) / 12))} / month
                  </div>
                )}
                <div className="field"><label>Notes</label><input className="inp" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="e.g. Post-appraisal revision" /></div>
              </>
            )}
            <div className="field"><label>Effective From</label><DateInput value={form.effective_from} onChange={e => setForm(f => ({ ...f, effective_from: e.target.value }))} /></div>
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
          {(() => {
            // "Current" = the record whose effective range contains today, not simply
            // the newest effective_from (a future-dated raise must not show as current).
            const today = new Date().toISOString().split('T')[0]
            let currentId: string | null = null
            for (const r of records) {
              const startsOk = !r.effective_from || r.effective_from <= today
              const endsOk = !r.effective_to || r.effective_to >= today
              if (startsOk && endsOk) { currentId = r.id; break }
            }
            // Fallback: if nothing matches today (e.g. all future-dated), mark the
            // earliest upcoming record so something is highlighted.
            if (!currentId && records.length) {
              const upcoming = [...records].filter((r: any) => r.effective_from && r.effective_from > today)
                .sort((a: any, b: any) => a.effective_from.localeCompare(b.effective_from))[0]
              currentId = upcoming ? upcoming.id : records[records.length - 1].id
            }
            return records.map((r: any) => {
              const isFuture = r.effective_from && r.effective_from > today
              return (
                <div key={r.id} className="card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: (r.id !== currentId && isFuture) ? 0.6 : 1 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{fmtMoney(r.amount)}{!isFreelancer && r.amount ? <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text3)' }}> / yr &nbsp;&bull;&nbsp; {fmtMoney(Math.round(r.amount / 12))} / mo</span> : null}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                      {isFreelancer ? (r.rate_type?.replace(/_/g, ' ') || '') : 'Annual CTC'} &nbsp;&bull;&nbsp; From {fmtDate(r.effective_from)}
                      {r.effective_to && <> &nbsp;to&nbsp; {fmtDate(r.effective_to)}</>}
                      {(r.notes || r.scope_notes) && <> &nbsp;&bull;&nbsp; {r.notes || r.scope_notes}</>}
                    </div>
                  </div>
                  {r.id === currentId
                    ? <span className="badge badge-active">Current</span>
                    : isFuture
                      ? <span className="badge" style={{ background: 'var(--bg3)', color: 'var(--text3)' }}>Upcoming</span>
                      : <span className="badge" style={{ background: 'var(--bg3)', color: 'var(--text3)' }}>Past</span>}
                </div>
              )
            })
          })()}
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
      if (data) {
        setKyc(data)
        setForm({
          aadhaar_number: data.aadhaar_number || '', pan_number: data.pan_number || '',
          bank_name: data.bank_name || '', account_number: data.account_number || '', ifsc_code: data.ifsc_code || '',
          date_of_birth: data.date_of_birth || '', blood_group: data.blood_group || '',
          personal_email: data.personal_email || '', personal_phone: data.personal_phone || '',
          permanent_address: data.permanent_address || '',
          emergency_contact_name: data.emergency_contact_name || '',
          emergency_contact_phone: data.emergency_contact_phone || '',
          emergency_contact_relation: data.emergency_contact_relation || '',
        })
      }
    })
  }, [employee.id])

  async function save() {
    setSaving(true)
    // Coerce empty strings to null so date/optional columns don't reject ""
    const clean: any = {}
    for (const k of Object.keys(form)) {
      const v = (form as any)[k]
      clean[k] = (typeof v === 'string' && v.trim() === '') ? null : v
    }
    const payload = { ...clean, profile_id: employee.id, updated_at: new Date().toISOString() }
    const r = kyc
      ? await supabase.from('employee_kyc').update(payload).eq('id', kyc.id)
      : await supabase.from('employee_kyc').insert(payload)
    setSaving(false)
    if (r.error) { showToast('Failed to save: ' + r.error.message, 'fail'); return }
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
  const [expandedTypes, setExpandedTypes] = useState<Record<string, boolean>>({})

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
      // Check employee_profiles first, then onboarding record
      const { data: epData } = await supabase.from('employee_profiles').select('drive_folder_url').eq('id', employee.id).maybeSingle()
      const { data: obData } = !epData?.drive_folder_url ? await supabase.from('scout_onboarding').select('drive_folder_url').eq('employee_id', employee.id).maybeSingle() : { data: null }
      const folderUrl = epData?.drive_folder_url || obData?.drive_folder_url || null
      const folderMatch = folderUrl ? folderUrl.match(/folders\/([a-zA-Z0-9_-]+)/) : null
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
      ) : (() => {
        // Split current vs superseded. Superseded are grouped by document_type
        // and shown under a collapsible "Previous versions" section.
        const current = docs.filter(d => d.is_current !== false)
        const superseded = docs.filter(d => d.is_current === false)
        const supBytype: Record<string, EmployeeDocument[]> = {}
        superseded.forEach(d => { (supBytype[d.document_type] = supBytype[d.document_type] || []).push(d) })

        const docRow = (d: EmployeeDocument, faded?: boolean) => (
          <div key={d.id} className="card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: faded ? 0.6 : 1 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                {d.label || DOC_TYPE_LABELS[d.document_type] || d.document_type}
                {faded && <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--text3)', marginLeft: 8, padding: '1px 6px', border: '1px solid var(--border)', borderRadius: 10 }}>archived</span>}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                v{d.version} &nbsp;&bull;&nbsp; {new Date(d.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                {d.status === 'signed' && <> &nbsp;&bull;&nbsp; <span style={{ color: 'var(--green)' }}>Signed</span></>}
                {(d.metadata as any)?.supersede_reason && <> &nbsp;&bull;&nbsp; <span style={{ fontStyle: 'italic' }}>{(d.metadata as any).supersede_reason}</span></>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {d.file_url && <a className="btn btn-ghost btn-sm" href={d.file_url} target="_blank" rel="noreferrer">View</a>}
              {d.signed_copy_url && <a className="btn btn-ghost btn-sm" href={d.signed_copy_url} target="_blank" rel="noreferrer">Signed copy</a>}
            </div>
          </div>
        )

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {current.map(d => docRow(d, false))}
            {Object.entries(supBytype).map(([type, list]) => (
              <div key={type} style={{ marginTop: 4 }}>
                <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, color: 'var(--text3)' }}
                  onClick={() => setExpandedTypes(p => ({ ...p, [type]: !p[type] }))}>
                  {expandedTypes[type] ? '▾' : '▸'} Previous versions of {DOC_TYPE_LABELS[type] || type.replace(/_/g, ' ')} ({list.length})
                </button>
                {expandedTypes[type] && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                    {list.map(d => docRow(d, true))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      })()}
    </div>
  )
}

// ── Person Devices Tab ──────────────────────────────────────────────────────
const DEVICE_TYPES = ['laptop','desktop','phone','tablet','monitor','other'] as const
const DEVICE_STATUS_LABELS: Record<string,string> = {
  assigned: 'Assigned', unassigned: 'In pool', returned: 'Returned',
  lost: 'Lost', damaged: 'Damaged', retired: 'Retired',
}
const DEVICE_STATUS_COLOR: Record<string,string> = {
  assigned: 'var(--green)', returned: 'var(--text3)', unassigned: 'var(--text3)',
  lost: 'var(--red)', damaged: '#d98324', retired: 'var(--text3)',
}

function inr(n: number | null | undefined) {
  if (n == null) return '—'
  return '₹' + Number(n).toLocaleString('en-IN')
}

function PersonDevices({ employee, showToast }: { employee: Employee; showToast: (m: string, t?: 'ok' | 'fail') => void }) {
  const [devices, setDevices] = useState<EmployeeDevice[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<EmployeeDevice | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [generating, setGenerating] = useState<string | null>(null)
  const [reassign, setReassign] = useState<EmployeeDevice | null>(null)
  const [allEmployees, setAllEmployees] = useState<{ id: string; full_name: string }[]>([])

  const blank = {
    ownership: 'company', device_type: 'laptop', make: '', model: '', serial_number: '',
    imei: '', color: '', specs: '', accessories: '', purchase_value: '', purchase_date: '',
    date_added: new Date().toISOString().split('T')[0], depreciation_rate: '0.20',
    condition_at_handover: 'good', condition_notes: '', status: 'assigned',
    assigned_date: new Date().toISOString().split('T')[0], notes: '',
  }
  const [form, setForm] = useState<Record<string, string>>(blank)

  const load = useCallback(() => {
    setLoading(true)
    supabase.from('employee_devices').select('*').eq('profile_id', employee.id)
      .order('created_at', { ascending: false }).then(({ data }) => {
        setDevices((data as EmployeeDevice[]) || [])
        setLoading(false)
      })
  }, [employee.id])
  useEffect(() => { load() }, [load])
  useEffect(() => {
    supabase.from('profiles').select('id, full_name').eq('is_active', true).order('full_name')
      .then(({ data }) => setAllEmployees((data as any[]) || []))
  }, [])

  function defaultRate(type: string) { return String(DEVICE_DEPRECIATION_DEFAULTS[type] ?? 0.20) }

  function openAdd() { setEditing(null); setForm({ ...blank }); setShowForm(true) }
  function openEdit(d: EmployeeDevice) {
    setEditing(d)
    setForm({
      ownership: d.ownership, device_type: d.device_type, make: d.make || '', model: d.model || '',
      serial_number: d.serial_number || '', imei: d.imei || '', color: d.color || '',
      specs: d.specs || '', accessories: d.accessories || '',
      purchase_value: d.purchase_value != null ? String(d.purchase_value) : '',
      purchase_date: d.purchase_date || '', date_added: d.date_added || '',
      depreciation_rate: d.depreciation_rate != null ? String(d.depreciation_rate) : '0.20',
      condition_at_handover: d.condition_at_handover || 'good',
      condition_notes: d.condition_notes || '', status: d.status,
      assigned_date: d.assigned_date || '', notes: d.notes || '',
    })
    setShowForm(true)
  }

  async function save() {
    if (!form.make && !form.model) { showToast('Add at least a make or model.', 'fail'); return }
    const payload: Record<string, any> = {
      profile_id: employee.id,
      ownership: form.ownership,
      device_type: form.device_type,
      make: form.make.trim() || null,
      model: form.model.trim() || null,
      serial_number: form.serial_number.trim() || null,
      imei: form.imei.trim() || null,
      color: form.color.trim() || null,
      specs: form.specs.trim() || null,
      accessories: form.accessories.trim() || null,
      purchase_value: form.purchase_value ? parseFloat(form.purchase_value) : null,
      purchase_date: form.purchase_date || null,
      date_added: form.date_added || null,
      depreciation_rate: form.depreciation_rate ? parseFloat(form.depreciation_rate) : 0.20,
      condition_at_handover: form.condition_at_handover,
      condition_notes: form.condition_notes.trim() || null,
      status: form.status,
      assigned_date: form.assigned_date || null,
      notes: form.notes.trim() || null,
    }
    let deviceId = editing?.id
    if (editing) {
      const res = await supabase.from('employee_devices').update(payload).eq('id', editing.id)
      if (res.error) { showToast('Could not save device: ' + res.error.message, 'fail'); return }
    } else {
      const res = await supabase.from('employee_devices').insert(payload).select('id').single()
      if (res.error || !res.data) { showToast('Could not save device: ' + (res.error?.message || 'unknown'), 'fail'); return }
      deviceId = res.data.id
    }
    if (deviceId) {
      await supabase.from('device_history').insert({
        device_id: deviceId, profile_id: employee.id,
        event: editing ? 'condition_change' : 'assigned',
        detail: editing ? 'Device record updated' : `${form.make} ${form.model}`.trim() + ' assigned',
        condition: form.condition_at_handover,
      })
    }
    showToast(editing ? 'Device updated.' : 'Device added.')
    setShowForm(false)
    load()
  }

  async function setStatus(d: EmployeeDevice, status: string, extra?: Record<string, any>) {
    const patch: Record<string, any> = { status, ...(extra || {}) }
    const res = await supabase.from('employee_devices').update(patch).eq('id', d.id)
    if (res.error) { showToast('Could not update status.', 'fail'); return }
    await supabase.from('device_history').insert({
      device_id: d.id, profile_id: employee.id, event: status,
      detail: `Marked ${DEVICE_STATUS_LABELS[status] || status}`,
    })
    showToast(`Marked ${DEVICE_STATUS_LABELS[status] || status}.`)
    load()
  }

  // Return to pool: device leaves this holder, becomes unassigned/in-pool.
  async function returnToPool(d: EmployeeDevice) {
    const today = new Date().toISOString().split('T')[0]
    const res = await supabase.from('employee_devices')
      .update({ status: 'unassigned', profile_id: null, returned_date: today }).eq('id', d.id)
    if (res.error) { showToast('Could not return to pool.', 'fail'); return }
    await supabase.from('device_history').insert({
      device_id: d.id, profile_id: employee.id, event: 'returned',
      detail: 'Returned to pool', condition: d.condition_at_handover, event_date: today,
    })
    showToast('Returned to pool.')
    load()
  }

  // Generate the device handover & liability agreement for a company device.
  async function generateHandover(d: EmployeeDevice) {
    if (d.ownership !== 'company') { showToast('Liability agreements are only for company devices.', 'fail'); return }
    setGenerating(d.id)
    const { data: epFolder } = await supabase.from('employee_profiles').select('drive_folder_url').eq('id', employee.id).maybeSingle()
    const { data: obFolder } = !epFolder?.drive_folder_url
      ? await supabase.from('scout_onboarding').select('drive_folder_url').eq('employee_id', employee.id).maybeSingle()
      : { data: null }
    const folderUrl = epFolder?.drive_folder_url || obFolder?.drive_folder_url || null
    const fMatch = folderUrl ? folderUrl.match(/folders\/([a-zA-Z0-9_-]+)/) : null
    const driveFolderId = fMatch ? fMatch[1] : null
    // Live depreciated value passed to the agreement.
    const depVal = depreciatedValue(d.purchase_value, d.depreciation_rate, d.date_added)
    const res = await fetch('/api/generate-pdf', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        document_type: 'device_handover',
        profile_id: employee.id,
        employee_name: employee.full_name,
        effective_date: new Date().toISOString().split('T')[0],
        signatory: 'aakash',
        drive_folder_id: driveFolderId,
        label: `${d.make || ''} ${d.model || ''}`.trim() || 'Device',
        device: { ...d, current_value: depVal },
      })
    })
    const data = await res.json()
    setGenerating(null)
    if (!data.html) { showToast(data.error || 'Generation failed.', 'fail'); return }
    const { data: docRow } = await supabase.from('employee_documents')
      .select('id').eq('profile_id', employee.id).eq('document_type', 'device_handover')
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (docRow?.id) await supabase.from('employee_devices').update({ liability_document_id: docRow.id }).eq('id', d.id)
    sessionStorage.setItem('bt_print_html', data.html)
    window.location.href = '/print'
  }

  const fld = (key: string, label: string, type = 'text', ph = '') => (
    <div className="field"><label>{label}</label>
      <input className="inp" type={type} value={form[key] || ''} placeholder={ph}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} /></div>
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div className="section-title">Devices</div>
        <button className="btn btn-ghost btn-sm" onClick={openAdd}>+ Add device</button>
      </div>

      {showForm && (
        <div className="card" style={{ padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="field-row">
              <div className="field"><label>Ownership</label>
                <select className="inp" value={form.ownership} onChange={e => setForm(f => ({ ...f, ownership: e.target.value }))}>
                  <option value="company">Company-provided</option>
                  <option value="personal">Personal (BYOD)</option>
                </select>
              </div>
              <div className="field"><label>Type</label>
                <select className="inp" value={form.device_type}
                  onChange={e => { const t = e.target.value; setForm(f => ({ ...f, device_type: t, depreciation_rate: defaultRate(t) })) }}>
                  {DEVICE_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>
            </div>
            <div className="field-row">{fld('make', 'Make', 'text', 'e.g. Apple')}{fld('model', 'Model', 'text', 'e.g. MacBook Air M2')}</div>
            <div className="field-row">{fld('serial_number', 'Serial number')}{fld('imei', 'IMEI (phones/tablets)')}</div>
            <div className="field-row">{fld('color', 'Colour')}{fld('specs', 'Specs', 'text', 'RAM / storage / CPU')}</div>
            {fld('accessories', 'Bundled accessories', 'text', 'charger, case, dongle (came with device)')}
            {form.ownership === 'company' && (
              <>
                <div className="field-row">{fld('purchase_value', 'Value incl. GST (₹)', 'number', 'e.g. 95000')}{fld('date_added', 'Date added to company', 'date')}</div>
                <div className="field-row">
                  <div className="field"><label>Depreciation rate / yr</label>
                    <input className="inp" type="number" step="0.01" min="0" max="1" value={form.depreciation_rate}
                      onChange={e => setForm(f => ({ ...f, depreciation_rate: e.target.value }))} />
                  </div>
                  <div className="field"><label>&nbsp;</label>
                    <div style={{ fontSize: 11, color: 'var(--text3)', padding: '9px 0' }}>
                      {form.purchase_value && form.date_added
                        ? `Current value ≈ ${inr(depreciatedValue(parseFloat(form.purchase_value), parseFloat(form.depreciation_rate || '0.2'), form.date_added))}`
                        : 'Reducing balance, computed live'}
                    </div>
                  </div>
                </div>
              </>
            )}
            <div className="field-row">
              <div className="field"><label>Condition at handover</label>
                <select className="inp" value={form.condition_at_handover} onChange={e => setForm(f => ({ ...f, condition_at_handover: e.target.value }))}>
                  <option value="new">New</option><option value="good">Good</option>
                  <option value="fair">Fair</option><option value="poor">Poor</option>
                </select>
              </div>
              <div className="field"><label>Status</label>
                <select className="inp" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  {Object.entries(DEVICE_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
            {fld('condition_notes', 'Condition notes', 'text', 'e.g. small scratch on lid')}
            {fld('assigned_date', 'Date assigned to this person', 'date')}
            {fld('notes', 'Admin notes')}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={save}>{editing ? 'Save changes' : 'Add device'}</button>
            </div>
          </div>
        </div>
      )}

      {loading ? <div className="empty-state"><div className="spinner" /></div> : devices.length === 0 ? (
        <div className="empty-state"><div className="empty-state-title">No devices recorded</div><div className="empty-state-sub">Add a company-provided or personal device.</div></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {devices.map(d => {
            const depVal = depreciatedValue(d.purchase_value, d.depreciation_rate, d.date_added)
            return (
              <div key={d.id} className="card" style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                      {[d.make, d.model].filter(Boolean).join(' ') || (d.device_type.charAt(0).toUpperCase() + d.device_type.slice(1))}
                      <span style={{ fontSize: 10, fontWeight: 500, marginLeft: 8, padding: '1px 7px', borderRadius: 10, border: '1px solid var(--border)', color: 'var(--text3)' }}>
                        {d.ownership === 'company' ? 'Company' : 'Personal'}
                      </span>
                      <span style={{ fontSize: 10, fontWeight: 600, marginLeft: 6, color: DEVICE_STATUS_COLOR[d.status] || 'var(--text3)' }}>
                        {DEVICE_STATUS_LABELS[d.status] || d.status}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3, lineHeight: 1.5 }}>
                      {d.device_type}{d.serial_number ? ` · SN ${d.serial_number}` : ''}{d.imei ? ` · IMEI ${d.imei}` : ''}
                      {d.accessories ? ` · incl. ${d.accessories}` : ''}
                    </div>
                    {d.ownership === 'company' && d.purchase_value != null && (
                      <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 3 }}>
                        {inr(d.purchase_value)} incl. GST · <strong>now ≈ {inr(depVal)}</strong>
                        <span style={{ color: 'var(--text3)' }}> ({Math.round((d.depreciation_rate || 0.2) * 100)}%/yr)</span>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {d.ownership === 'company' && (
                      <button className="btn btn-ghost btn-sm" disabled={generating === d.id} onClick={() => generateHandover(d)}>
                        {generating === d.id ? 'Generating...' : (d.liability_document_id ? 'Re-generate agreement' : 'Generate agreement')}
                      </button>
                    )}
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(d)}>Edit</button>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                  <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => setReassign(d)}>Reassign</button>
                  {d.status === 'assigned' && <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => returnToPool(d)}>Return to pool</button>}
                  {d.status !== 'damaged' && <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => setStatus(d, 'damaged')}>Mark damaged</button>}
                  {d.status !== 'lost' && <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => setStatus(d, 'lost')}>Mark lost</button>}
                  {d.status !== 'retired' && <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => setStatus(d, 'retired')}>Retire</button>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {reassign && (
        <ReassignModal device={reassign} fromName={employee.full_name} employees={allEmployees}
          onClose={() => setReassign(null)} onDone={() => { setReassign(null); load() }} showToast={showToast} />
      )}
    </div>
  )
}

// ── Reassign device modal ───────────────────────────────────────────────────
// Records the return from the current holder (with return condition — their
// liability agreement stays valid until this point), then the handover to the
// new holder (new condition baseline). Writes both history events.
function ReassignModal({ device, fromName, employees, onClose, onDone, showToast }: {
  device: EmployeeDevice
  fromName: string
  employees: { id: string; full_name: string }[]
  onClose: () => void
  onDone: () => void
  showToast: (m: string, t?: 'ok' | 'fail') => void
}) {
  const [toId, setToId] = useState('')
  const [returnCondition, setReturnCondition] = useState<string>(device.condition_at_handover || 'good')
  const [returnNotes, setReturnNotes] = useState('')
  const [newCondition, setNewCondition] = useState<string>(device.condition_at_handover || 'good')
  const [newNotes, setNewNotes] = useState('')
  const [saving, setSaving] = useState(false)

  async function doReassign() {
    if (!toId) { showToast('Select who it is moving to.', 'fail'); return }
    setSaving(true)
    const today = new Date().toISOString().split('T')[0]
    // 1. Record return from old holder (their agreement was valid until this point).
    await supabase.from('device_history').insert({
      device_id: device.id, profile_id: device.profile_id, event: 'returned',
      detail: `Returned by ${fromName}` + (returnNotes ? ` — ${returnNotes}` : ''),
      condition: returnCondition, event_date: today,
    })
    // 2. Move device to new holder with new condition baseline. Clear the old
    //    liability link so a fresh agreement is generated for the new holder.
    const res = await supabase.from('employee_devices').update({
      profile_id: toId, status: 'assigned', assigned_date: today, returned_date: null,
      condition_at_handover: newCondition, condition_notes: newNotes || null,
      liability_document_id: null,
    }).eq('id', device.id)
    if (res.error) { setSaving(false); showToast('Reassign failed: ' + res.error.message, 'fail'); return }
    // 3. Record handover to new holder.
    await supabase.from('device_history').insert({
      device_id: device.id, profile_id: toId, event: 'reassigned',
      detail: `Reassigned to new holder` + (newNotes ? ` — ${newNotes}` : ''),
      condition: newCondition, event_date: today,
    })
    setSaving(false)
    showToast('Device reassigned. Generate a new agreement for the new holder.')
    onDone()
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()} style={{ zIndex: 300 }}>
      <div className="modal" style={{ maxWidth: 460 }}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Reassign device</div>
            <div className="modal-sub">{[device.make, device.model].filter(Boolean).join(' ')} — currently with {fromName}</div>
          </div>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: 12, color: 'var(--text-soft)', marginBottom: 4, lineHeight: 1.5 }}>
            {fromName}&apos;s liability agreement remains valid until this handover is recorded. Capture the condition it came back in before it moves on.
          </p>
          <div className="field"><label>Return condition (from {fromName})</label>
            <select className="inp" value={returnCondition} onChange={e => setReturnCondition(e.target.value)}>
              <option value="new">New</option><option value="good">Good</option>
              <option value="fair">Fair</option><option value="poor">Poor</option>
            </select>
          </div>
          <div className="field"><label>Return notes (any new damage?)</label>
            <input className="inp" value={returnNotes} onChange={e => setReturnNotes(e.target.value)} placeholder="e.g. dent on lid corner — pre-existing or new?" />
          </div>
          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '6px 0' }} />
          <div className="field"><label>Reassign to</label>
            <select className="inp" value={toId} onChange={e => setToId(e.target.value)}>
              <option value="">Select employee...</option>
              {employees.filter(e => e.id !== device.profile_id).map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
            </select>
          </div>
          <div className="field"><label>Condition handed to new holder</label>
            <select className="inp" value={newCondition} onChange={e => setNewCondition(e.target.value)}>
              <option value="new">New</option><option value="good">Good</option>
              <option value="fair">Fair</option><option value="poor">Poor</option>
            </select>
          </div>
          <div className="field"><label>Handover notes (new baseline)</label>
            <input className="inp" value={newNotes} onChange={e => setNewNotes(e.target.value)} placeholder="condition the new holder receives it in" />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={saving || !toId} onClick={doReassign}>
            {saving ? <><div className="spinner" /><span>Reassigning...</span></> : 'Reassign'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Onboarding Page ─────────────────────────────────────────────────────────
function OnboardingPage({ user, showToast }: { user: { id: string; full_name: string; role: string }; showToast: (m: string, t?: 'ok' | 'fail') => void }) {
  const [entries, setEntries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('scout_onboarding').select('*, scout_onboarding_checklist(*)').in('status', ['pending', 'in_progress']).order('created_at', { ascending: false }).then(({ data }) => {
      setEntries(data || [])
      setLoading(false)
    })
  }, [])

  const active = entries.filter(e => e.status !== 'complete')

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
function GenerateDocModal({ employees, onClose, showToast, onDone }: {
  employees: Employee[]
  onClose: () => void
  showToast: (m: string, t?: 'ok' | 'fail') => void
  onDone: () => void
}) {
  const [form, setForm] = useState({
    profile_id: '',
    document_type: 'appointment_letter' as string,
    label: '',
    signatory: 'aakash',
    effective_date: new Date().toISOString().split('T')[0],
    notes: '',
    gender: 'neutral',
    // offer letter
    probation_months: '3',
    probation_ctc: '',
    confirmed_ctc: '',
    reports_to_name: '',
    // internship
    stipend: '',
    internship_end_date: '',
    internship_months: '',
    // appointment
    monthly_ctc: '',
    duties: '',
    probation_end_date: '',
    // appraisal / salary revision
    old_ctc: '',
    new_ctc: '',
    // experience / relieving
    last_working_date: '',
    // rate card
    rate: '',
    rate_type: 'monthly_retainer',
  })
  const [generating, setGenerating] = useState(false)
  const [loadingComp, setLoadingComp] = useState(false)
  const [duties, setDuties] = useState('')
  // Versioning guard modals
  const [supersedePrompt, setSupersedePrompt] = useState<{ existing: any } | null>(null)
  const [supersedeReason, setSupersedeReason] = useState('')
  const [appraisalWarn, setAppraisalWarn] = useState<{ monthsAgo: number; lastDate: string } | null>(null)

  const dt = form.document_type
  const emp = employees.find(e => e.id === form.profile_id)
  const ep = emp?.employee_profiles as any

  // When employee changes -- auto-fill from profile + fetch compensation
  useEffect(() => {
    if (!form.profile_id) return
    const ep2 = emp?.employee_profiles as any
    if (!ep2) return
    // Auto-fill reports_to
    if (ep2.reports_to) {
      supabase.from('profiles').select('full_name').eq('id', ep2.reports_to).single()
        .then(({ data }) => { if (data) setForm(f => ({ ...f, reports_to_name: data.full_name })) })
    }
    // Auto-fill joining date driven fields
    if (ep2.joining_date) {
      // probation end = 3 months from joining
      const jd = new Date(ep2.joining_date + 'T00:00:00')
      jd.setMonth(jd.getMonth() + 3)
      const probEnd = jd.toISOString().split('T')[0]
      setForm(f => ({ ...f, probation_end_date: f.probation_end_date || probEnd }))
    }
    // Auto-fill compensation
    setLoadingComp(true)
    Promise.all([
      supabase.from('employee_compensation').select('amount').eq('profile_id', form.profile_id)
        .order('effective_from', { ascending: false }).limit(2),
      supabase.from('freelancer_rate_cards').select('amount,rate_type').eq('profile_id', form.profile_id)
        .order('effective_from', { ascending: false }).limit(1),
    ]).then(([comp, rate]) => {
      const latest = comp.data?.[0]?.amount
      const prev   = comp.data?.[1]?.amount
      const rc     = rate.data?.[0]
      setForm(f => ({
        ...f,
        monthly_ctc: f.monthly_ctc || (latest ? String(latest) : ''),
        old_ctc:     f.old_ctc     || (prev   ? String(prev)   : latest ? String(latest) : ''),
        new_ctc:     f.new_ctc     || (latest ? String(latest) : ''),
        rate:        f.rate        || (rc?.amount ? String(rc.amount) : ''),
        rate_type:   rc?.rate_type || f.rate_type,
      }))
      setLoadingComp(false)
    })
    // Try to fetch duties from JD template
    if (['appointment_letter','internship_appointment'].includes(form.document_type)) {
      supabase.from('scout_candidates').select('role_id').eq('id', form.profile_id).maybeSingle()
        .then(async ({ data: cand }) => {
          if (!cand?.role_id) return
          const { data: role } = await supabase.from('scout_roles').select('jd_template_id').eq('id', cand.role_id).single()
          if (!role?.jd_template_id) return
          const { data: jd } = await supabase.from('scout_jd_templates').select('content').eq('id', role.jd_template_id).single()
          if (!jd?.content) return
          // Extract duties section
          const content = jd.content as string
          const match = content.match(/WHAT YOU'LL BE DOING[^\n]*\n([\s\S]*?)(?:\n[A-Z][A-Z\s]{3,}|\n$|$)/)
          if (match) {
            const extracted = match[1].trim()
            setDuties(extracted)
            setForm(f => ({ ...f, duties: f.duties || extracted }))
          }
        })
    }
  }, [form.profile_id])

  const ONE_TIME_TYPES = ['offer_letter', 'internship_offer', 'appointment_letter', 'internship_appointment']

  // Entry point: run versioning guards, then either open a modal or generate.
  async function generate() {
    if (!form.profile_id) { showToast('Select an employee.', 'fail'); return }
    if (dt === 'warning_letter' && !form.notes.trim()) {
      showToast('Warning letter requires details in the Notes field.', 'fail'); return
    }

    // One-time docs: if a current copy already exists, ask WHY before replacing.
    if (ONE_TIME_TYPES.includes(dt)) {
      const { data: existing } = await supabase.from('employee_documents')
        .select('id, version, generated_at')
        .eq('document_type', dt)
        .eq('is_current', true)
        .eq('profile_id', form.profile_id)
        .limit(1)
      if (existing && existing.length) {
        setSupersedeReason('')
        setSupersedePrompt({ existing: existing[0] })
        return // wait for the reason modal
      }
    }

    // Appraisal: if the last one was under 6 months ago, soft-confirm first.
    if (dt === 'appraisal') {
      const { data: lastApp } = await supabase.from('employee_documents')
        .select('generated_at')
        .eq('document_type', 'appraisal')
        .eq('profile_id', form.profile_id)
        .order('generated_at', { ascending: false })
        .limit(1)
      const last = lastApp?.[0]?.generated_at
      if (last) {
        const monthsAgo = (Date.now() - new Date(last).getTime()) / (1000 * 60 * 60 * 24 * 30.44)
        if (monthsAgo < 6) {
          setAppraisalWarn({ monthsAgo: Math.round(monthsAgo * 10) / 10, lastDate: last })
          return // wait for the confirm modal
        }
      }
    }

    doGenerate('')
  }

  // The actual generation + API call. `reason` is the supersede reason (one-time docs).
  async function doGenerate(reason: string) {
    setSupersedePrompt(null)
    setAppraisalWarn(null)
    setGenerating(true)
    // Get drive folder
    const { data: epFolder } = await supabase.from('employee_profiles').select('drive_folder_url').eq('id', form.profile_id).maybeSingle()
    const { data: obFolder } = !epFolder?.drive_folder_url
      ? await supabase.from('scout_onboarding').select('drive_folder_url').eq('employee_id', form.profile_id).maybeSingle()
      : { data: null }
    const driveFolderUrl = epFolder?.drive_folder_url || obFolder?.drive_folder_url || null
    const driveFolderIdMatch = driveFolderUrl ? driveFolderUrl.match(/folders\/([a-zA-Z0-9_-]+)/) : null
    const driveFolderId = driveFolderIdMatch ? driveFolderIdMatch[1] : null

    const res = await fetch('/api/generate-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, duties: form.duties || duties, drive_folder_id: driveFolderId,
        supersede_reason: reason || null,
        probation_ctc:  form.probation_ctc  ? parseFloat(form.probation_ctc)  : null,
        confirmed_ctc:  form.confirmed_ctc  ? parseFloat(form.confirmed_ctc)  : null,
        monthly_ctc:    form.monthly_ctc    ? parseFloat(form.monthly_ctc)    : null,
        old_ctc:        form.old_ctc        ? parseFloat(form.old_ctc)        : null,
        new_ctc:        form.new_ctc        ? parseFloat(form.new_ctc)        : null,
        stipend:        form.stipend        ? parseFloat(form.stipend)        : null,
        rate:           form.rate           ? parseFloat(form.rate)           : null,
      })
    })
    const data = await res.json()
    setGenerating(false)
    if (!data.html) { showToast(data.error || 'Generation failed.', 'fail'); return }
    // Store HTML in sessionStorage then navigate -- no popup blocker, no size limit
    sessionStorage.setItem('bt_print_html', data.html)
    window.location.href = '/print'
    showToast(data.driveLink ? 'Generated and saved to Drive. Opening document...' : 'Document ready. Opening...')
    onDone()
  }

  const f = (key: keyof typeof form, label: string, type = 'text', placeholder = '') => (
    <div className="field">
      <label>{label}</label>
      <input className="inp" type={type} value={(form as any)[key] || ''}
        onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} placeholder={placeholder} />
    </div>
  )
  const fMoney = (key: keyof typeof form, label: string, placeholder = 'e.g. 25000') =>
    f(key, label + (loadingComp ? ' (loading...)' : ''), 'number', placeholder)

  // Dynamic extra fields based on document type
  const extraFields = () => {
    if (dt === 'offer_letter') return (
      <>
        <div className="field-row">
          {fMoney('probation_ctc', 'Probation CTC (in-hand / month)')}
          {fMoney('confirmed_ctc', 'Confirmed CTC (in-hand / month)')}
        </div>
        <div className="field-row">
          {f('probation_months', 'Probation months', 'number', '3')}
          {f('reports_to_name', 'Reporting to', 'text', 'Auto-filled')}
        </div>
      </>
    )
    if (dt === 'internship_offer') return (
      <>
        {fMoney('stipend', 'Monthly Stipend')}
        <div className="field-row">
          {f('internship_months', 'Duration (months)', 'number', '3')}
          {f('internship_end_date', 'End Date (or leave blank)', 'date')}
        </div>
        {f('reports_to_name', 'Reporting to', 'text', 'Auto-filled')}
      </>
    )
    if (dt === 'appointment_letter') return (
      <>
        {fMoney('monthly_ctc', 'Annual CTC (gross)')}
        {fMoney('confirmed_ctc', 'Post-confirmation Annual CTC (if different)')}
        <div className="field-row">
          {f('probation_end_date', 'Probation End Date', 'date')}
          {f('reports_to_name', 'Reporting to', 'text', 'Auto-filled')}
        </div>
        <div className="field">
          <label>Duties {duties ? '(auto-filled from JD)' : '(one per line)'}</label>
          <textarea className="inp" rows={4} value={form.duties || duties}
            onChange={e => setForm(p => ({ ...p, duties: e.target.value }))}
            placeholder="- Create visual assets for campaigns&#10;- Collaborate with strategists..." />
        </div>
      </>
    )
    if (dt === 'internship_appointment') return (
      <>
        {fMoney('stipend', 'Monthly Stipend')}
        <div className="field-row">
          {f('internship_end_date', 'Internship End Date', 'date')}
          {f('reports_to_name', 'Reporting to', 'text', 'Auto-filled')}
        </div>
        <div className="field">
          <label>Duties {duties ? '(auto-filled from JD)' : '(one per line)'}</label>
          <textarea className="inp" rows={4} value={form.duties || duties}
            onChange={e => setForm(p => ({ ...p, duties: e.target.value }))}
            placeholder="- Create visual assets for campaigns..." />
        </div>
      </>
    )
    if (dt === 'freelance_agreement') return (
      <>
        <div className="field-row">
          {fMoney('rate', 'Rate (INR)')}
          <div className="field"><label>Rate Type</label>
            <select className="inp" value={form.rate_type} onChange={e => setForm(f => ({ ...f, rate_type: e.target.value }))}>
              <option value="monthly_retainer">Monthly Retainer</option>
              <option value="daily">Daily Rate</option>
              <option value="project">Project Rate</option>
            </select>
          </div>
        </div>
      </>
    )
    if (dt === 'appraisal' || dt === 'salary_revision') return (
      <div className="field-row">
        {fMoney('old_ctc', 'Previous Annual CTC')}
        {fMoney('new_ctc', 'Revised Annual CTC')}
      </div>
    )
    if (dt === 'experience_letter') return (
      f('last_working_date', 'Last Working Date (leave blank if still employed)', 'date')
    )
    if (dt === 'internship_completion') return (
      f('internship_end_date', 'Internship End Date', 'date')
    )
    return null
  }

  // Show gender for docs that use pronouns
  const needsGender = ['experience_letter','internship_completion','relieving_letter'].includes(dt)
  // Show signatory for docs that use single sig (not offer/internship offer/appointment which always use both)
  const showSignatory = !['offer_letter','internship_offer','appointment_letter','internship_appointment'].includes(dt)

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Generate Document</div>
            <div className="modal-sub">Opens in browser -- print to PDF</div>
          </div>
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
            <select className="inp" value={form.document_type} onChange={e => setForm(f => ({ ...f, document_type: e.target.value }))}>
              <optgroup label="Offer">
                <option value="offer_letter">Offer Letter</option>
                <option value="internship_offer">Internship Offer Letter</option>
              </optgroup>
              <optgroup label="Appointment">
                <option value="appointment_letter">Appointment Letter</option>
                <option value="internship_appointment">Internship Appointment Letter</option>
                <option value="freelance_agreement">Freelance Agreement</option>
              </optgroup>
              <optgroup label="During Employment">
                <option value="appraisal">Appraisal Letter</option>
                <option value="salary_revision">Salary Revision Letter</option>
                <option value="probation_confirmation">Probation Confirmation</option>
                <option value="warning_letter">Warning Letter</option>
              </optgroup>
              <optgroup label="Exit">
                <option value="experience_letter">Experience Letter</option>
                <option value="internship_completion">Internship Completion Certificate</option>
                <option value="relieving_letter">Relieving Letter</option>
              </optgroup>
            </select>
          </div>
          {extraFields()}
          <div className="field"><label>Effective / Issue Date</label>
            <DateInput value={form.effective_date}
              onChange={e => setForm(f => ({ ...f, effective_date: e.target.value }))} />
          </div>
          {showSignatory && (
            <div className="field"><label>Signatory</label>
              <select className="inp" value={form.signatory} onChange={e => setForm(f => ({ ...f, signatory: e.target.value }))}>
                <option value="aakash">Aakash Rathi, Founder</option>
                <option value="niki">Niki A. Rathi, Proprietor</option>
              </select>
            </div>
          )}
          {needsGender && (
            <div className="field"><label>Gender</label>
              <select className="inp" value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
                <option value="neutral">Prefer not to say / Neutral (they/them)</option>
                <option value="female">Female (she/her)</option>
                <option value="male">Male (he/him)</option>
              </select>
            </div>
          )}
          <div className="field"><label>Additional Notes (optional)</label>
            <textarea className="inp" value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Any specific details, achievements, or clauses to include..." rows={2} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={generating} onClick={generate}>
            {generating ? <><div className="spinner" /><span>Generating...</span></> : 'Generate & Download'}
          </button>
        </div>
      </div>

      {/* Supersede-reason modal (one-time docs being replaced) */}
      {supersedePrompt && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setSupersedePrompt(null)} style={{ zIndex: 300 }}>
          <div className="modal" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <div>
                <div className="modal-title">Replace existing document?</div>
                <div className="modal-sub">A current {DOC_TYPE_LABELS[dt] || dt.replace(/_/g, ' ')} already exists for this employee.</div>
              </div>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 13, color: 'var(--text-soft)', marginBottom: 14, lineHeight: 1.5 }}>
                Generating a new one will archive the existing version (kept in history) and make this the current copy. Please note why it's being replaced.
              </p>
              <div className="field">
                <label>Reason for replacement</label>
                <textarea className="inp" value={supersedeReason}
                  onChange={e => setSupersedeReason(e.target.value)} rows={3}
                  placeholder="e.g. Corrected joining date / revised CTC / fixed typo in designation" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setSupersedePrompt(null)}>Cancel</button>
              <button className="btn btn-primary" disabled={!supersedeReason.trim() || generating}
                onClick={() => doGenerate(supersedeReason.trim())}>
                {generating ? <><div className="spinner" /><span>Generating...</span></> : 'Replace & Generate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Appraisal recency soft-warning */}
      {appraisalWarn && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setAppraisalWarn(null)} style={{ zIndex: 300 }}>
          <div className="modal" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <div>
                <div className="modal-title">Recent appraisal on file</div>
                <div className="modal-sub">Last appraisal was {appraisalWarn.monthsAgo} month{appraisalWarn.monthsAgo === 1 ? '' : 's'} ago.</div>
              </div>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 13, color: 'var(--text-soft)', lineHeight: 1.5 }}>
                This employee was last appraised on{' '}
                <strong>{new Date(appraisalWarn.lastDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>,
                which is under 6 months ago. Appraisals are usually spaced further apart. Generate another one anyway?
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setAppraisalWarn(null)}>Cancel</button>
              <button className="btn btn-primary" disabled={generating} onClick={() => doGenerate('')}>
                {generating ? <><div className="spinner" /><span>Generating...</span></> : 'Generate Anyway'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Devices Page (fleet) ────────────────────────────────────────────────────
// ── Add device modal (fleet-level) ──────────────────────────────────────────
function AddDeviceModal({ employees, onClose, onAdded, showToast, editDevice }: {
  employees: { id: string; full_name: string }[]
  onClose: () => void
  onAdded: () => void
  showToast: (m: string, t?: 'ok' | 'fail') => void
  editDevice?: (EmployeeDevice & { holder?: { full_name: string } | null }) | null
}) {
  const today = new Date().toISOString().split('T')[0]
  const blank = {
    ownership: 'company', device_type: 'laptop', make: '', model: '', serial_number: '',
    imei: '', color: '', specs: '', accessories: '', purchase_value: '', purchase_date: '',
    date_added: today, depreciation_rate: '0.20',
    condition_at_handover: 'good', condition_notes: '', notes: '',
  }
  const [form, setForm] = useState<Record<string, string>>(editDevice ? {
    ownership: editDevice.ownership, device_type: editDevice.device_type,
    make: editDevice.make || '', model: editDevice.model || '', serial_number: editDevice.serial_number || '',
    imei: editDevice.imei || '', color: editDevice.color || '', specs: editDevice.specs || '',
    accessories: editDevice.accessories || '',
    purchase_value: editDevice.purchase_value != null ? String(editDevice.purchase_value) : '',
    purchase_date: editDevice.purchase_date || '', date_added: editDevice.date_added || today,
    depreciation_rate: editDevice.depreciation_rate != null ? String(editDevice.depreciation_rate) : '0.20',
    condition_at_handover: editDevice.condition_at_handover || 'good',
    condition_notes: editDevice.condition_notes || '', notes: editDevice.notes || '',
  } : blank)
  const [holder, setHolder] = useState(editDevice?.profile_id || '')
  const empOptions = editDevice?.profile_id && editDevice.holder?.full_name && !employees.some(e => e.id === editDevice.profile_id)
    ? [{ id: editDevice.profile_id, full_name: editDevice.holder.full_name + ' (inactive)' }, ...employees]
    : employees
  const [saving, setSaving] = useState(false)
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))
  const fld = (key: string, label: string, type = 'text', ph = '') => (
    <div className="field"><label>{label}</label>
      <input className="inp" type={type} value={form[key] || ''} placeholder={ph}
        onChange={e => set(key, e.target.value)} /></div>
  )
  function defaultRate(type: string) { return String(DEVICE_DEPRECIATION_DEFAULTS[type] ?? 0.20) }

  async function save() {
    if (!form.make && !form.model) { showToast('Add at least a make or model.', 'fail'); return }
    setSaving(true)
    const holderId = holder || null
    const attrs: Record<string, any> = {
      ownership: form.ownership,
      device_type: form.device_type,
      make: form.make.trim() || null,
      model: form.model.trim() || null,
      serial_number: form.serial_number.trim() || null,
      imei: form.imei.trim() || null,
      color: form.color.trim() || null,
      specs: form.specs.trim() || null,
      accessories: form.accessories.trim() || null,
      purchase_value: form.purchase_value ? parseFloat(form.purchase_value) : null,
      purchase_date: form.purchase_date || null,
      date_added: form.date_added || null,
      depreciation_rate: form.depreciation_rate ? parseFloat(form.depreciation_rate) : 0.20,
      condition_at_handover: form.condition_at_handover,
      condition_notes: form.condition_notes.trim() || null,
      notes: form.notes.trim() || null,
    }

    if (editDevice) {
      const oldHolder = editDevice.profile_id || null
      const holderChanged = holderId !== oldHolder
      const keepFrozen = (editDevice.status === 'retired' || editDevice.status === 'lost') && !holderChanged
      const status = keepFrozen ? editDevice.status : (holderId ? 'assigned' : 'unassigned')
      const payload: Record<string, any> = { ...attrs, profile_id: holderId, status }
      if (holderChanged) {
        payload.assigned_date = holderId ? today : null
        payload.returned_date = holderId ? null : today
        payload.liability_document_id = null
      }
      if (holderChanged && oldHolder) {
        await supabase.from('device_history').insert({
          device_id: editDevice.id, profile_id: oldHolder, event: 'returned',
          detail: `Returned by ${editDevice.holder?.full_name || 'previous holder'}`,
          condition: form.condition_at_handover, event_date: today,
        })
      }
      const res = await supabase.from('employee_devices').update(payload).eq('id', editDevice.id)
      if (res.error) { setSaving(false); showToast('Could not save device: ' + res.error.message, 'fail'); return }
      if (holderChanged && holderId) {
        await supabase.from('device_history').insert({
          device_id: editDevice.id, profile_id: holderId, event: 'reassigned',
          detail: 'Reassigned to new holder', condition: form.condition_at_handover, event_date: today,
        })
      } else if (!holderChanged) {
        await supabase.from('device_history').insert({
          device_id: editDevice.id, profile_id: holderId, event: 'condition_change',
          detail: 'Device record updated', condition: form.condition_at_handover,
        })
      }
      setSaving(false)
      showToast(holderChanged ? 'Device updated & reassigned. Generate a new agreement for the new holder.' : 'Device updated.')
      onAdded(); onClose(); return
    }

    const status = holderId ? 'assigned' : 'unassigned'
    const payload: Record<string, any> = { ...attrs, profile_id: holderId, status, assigned_date: holderId ? today : null }
    const res = await supabase.from('employee_devices').insert(payload).select('id').single()
    if (res.error || !res.data) { setSaving(false); showToast('Could not add device: ' + (res.error?.message || 'unknown'), 'fail'); return }
    if (holderId) {
      await supabase.from('device_history').insert({
        device_id: res.data.id, profile_id: holderId, event: 'assigned',
        detail: `${form.make} ${form.model}`.trim() + ' assigned', condition: form.condition_at_handover,
      })
    }
    setSaving(false)
    showToast('Device added.')
    onAdded()
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()} style={{ zIndex: 300 }}>
      <div className="modal" style={{ maxWidth: 680 }}>
        <div className="modal-header">
          <div>
            <div className="modal-title">{editDevice ? 'Edit device' : 'Add device'}</div>
            <div className="modal-sub">{editDevice ? 'Update details or reassign the holder' : 'Add to the pool or assign to someone directly'}</div>
          </div>
        </div>
        <div className="modal-body">
          <div className="field"><label>Holder</label>
            <select className="inp" value={holder} onChange={e => setHolder(e.target.value)}>
              <option value="">In pool (unassigned)</option>
              {empOptions.map(emp => <option key={emp.id} value={emp.id}>{emp.full_name}</option>)}
            </select>
          </div>
          <div className="field-row">
            <div className="field"><label>Ownership</label>
              <select className="inp" value={form.ownership} onChange={e => set('ownership', e.target.value)}>
                <option value="company">Company-provided</option>
                <option value="personal">Personal (BYOD)</option>
              </select>
            </div>
            <div className="field"><label>Type</label>
              <select className="inp" value={form.device_type}
                onChange={e => { const t = e.target.value; setForm(f => ({ ...f, device_type: t, depreciation_rate: defaultRate(t) })) }}>
                {DEVICE_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div className="field-row">{fld('make', 'Make', 'text', 'e.g. Apple')}{fld('model', 'Model', 'text', 'e.g. MacBook Air M2')}</div>
          <div className="field-row">{fld('serial_number', 'Serial number')}{fld('imei', 'IMEI (phones/tablets)')}</div>
          <div className="field-row">{fld('color', 'Colour')}{fld('specs', 'Specs', 'text', 'RAM / storage / CPU')}</div>
          {fld('accessories', 'Bundled accessories', 'text', 'charger, case, dongle (came with device)')}
          {form.ownership === 'company' && (
            <>
              <div className="field-row">
                {fld('purchase_value', 'Value incl. GST (₹)', 'number', 'e.g. 95000')}
                <div className="field"><label>Date added to company</label>
                  <DateInput value={form.date_added} onChange={e => set('date_added', e.target.value)} />
                </div>
              </div>
              <div className="field-row">
                <div className="field"><label>Depreciation rate / yr</label>
                  <input className="inp" type="number" step="0.01" min="0" max="1" value={form.depreciation_rate}
                    onChange={e => set('depreciation_rate', e.target.value)} />
                </div>
                <div className="field"><label>&nbsp;</label>
                  <div style={{ fontSize: 11, color: 'var(--text3)', padding: '9px 0' }}>
                    {form.purchase_value && form.date_added
                      ? `Current value ≈ ${inr(depreciatedValue(parseFloat(form.purchase_value), parseFloat(form.depreciation_rate || '0.2'), form.date_added))}`
                      : 'Reducing balance, computed live'}
                  </div>
                </div>
              </div>
            </>
          )}
          <div className="field"><label>Condition</label>
            <select className="inp" value={form.condition_at_handover} onChange={e => set('condition_at_handover', e.target.value)}>
              <option value="new">New</option><option value="good">Good</option>
              <option value="fair">Fair</option><option value="poor">Poor</option>
            </select>
          </div>
          {fld('condition_notes', 'Condition notes', 'text', 'e.g. small scratch on lid')}
          {fld('notes', 'Admin notes')}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={saving} onClick={save}>
            {saving ? <><div className="spinner" /><span>Saving...</span></> : (editDevice ? 'Save changes' : 'Add device')}
          </button>
        </div>
      </div>
    </div>
  )
}

function DevicesPage({ user, showToast }: { user: { id: string; full_name: string; role: string }; showToast: (m: string, t?: 'ok' | 'fail') => void }) {
  const [devices, setDevices] = useState<(EmployeeDevice & { holder?: { full_name: string } | null })[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [ownershipFilter, setOwnershipFilter] = useState('')

  const [showAdd, setShowAdd] = useState(false)
  const [editDevice, setEditDevice] = useState<(EmployeeDevice & { holder?: { full_name: string } | null }) | null>(null)
  const [employees, setEmployees] = useState<{ id: string; full_name: string }[]>([])
  useEffect(() => {
    supabase.from('profiles').select('id, full_name').eq('is_active', true).order('full_name')
      .then(({ data }) => setEmployees((data as any[]) || []))
  }, [])

  const load = useCallback(() => {
    setLoading(true)
    supabase.from('employee_devices')
      .select('*, holder:profiles!employee_devices_profile_id_fkey(full_name)')
      .order('created_at', { ascending: false })
      .then(({ data }) => { setDevices((data as any) || []); setLoading(false) })
  }, [])
  useEffect(() => { load() }, [load])

  const filtered = devices.filter(d => {
    if (statusFilter && d.status !== statusFilter) return false
    if (ownershipFilter && d.ownership !== ownershipFilter) return false
    if (search) {
      const hay = [d.make, d.model, d.serial_number, d.imei, d.holder?.full_name].filter(Boolean).join(' ').toLowerCase()
      return hay.includes(search.toLowerCase())
    }
    return true
  })

  const inService = devices.filter(d => d.ownership === 'company' && !['lost', 'retired'].includes(d.status))
  const fleetCurrent = inService.reduce((sum, d) => sum + (depreciatedValue(d.purchase_value, d.depreciation_rate, d.date_added) || 0), 0)
  const fleetOriginal = inService.reduce((sum, d) => sum + (d.purchase_value || 0), 0)

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Devices</div>
          <div className="page-sub">{devices.length} device{devices.length === 1 ? '' : 's'} &bull; fleet value now ≈ {inr(fleetCurrent)} (of {inr(fleetOriginal)} original)</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add device</button>
      </div>
      <div className="page-body">
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <input className="inp" style={{ width: 220, flexShrink: 0 }} placeholder="Search make, model, serial, holder..." value={search} onChange={e => setSearch(e.target.value)} />
          <select className="inp" style={{ width: 150, flexShrink: 0 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            {Object.entries(DEVICE_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select className="inp" style={{ width: 150, flexShrink: 0 }} value={ownershipFilter} onChange={e => setOwnershipFilter(e.target.value)}>
            <option value="">All ownership</option>
            <option value="company">Company</option>
            <option value="personal">Personal</option>
          </select>
        </div>

        {loading ? <div className="empty-state"><div className="spinner" /></div> : filtered.length === 0 ? (
          <div className="empty-state"><div className="empty-state-title">No devices</div><div className="empty-state-sub">{devices.length === 0 ? 'Add a device with the button above, or from an employee\u2019s Devices tab.' : 'No devices match these filters.'}</div></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Device</th><th>Holder</th><th>Status</th><th>Condition</th>
                  <th style={{ textAlign: 'right' }}>Value (incl GST)</th><th style={{ textAlign: 'right' }}>Now ≈</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(d => {
                  const depVal = depreciatedValue(d.purchase_value, d.depreciation_rate, d.date_added)
                  return (
                    <tr key={d.id} onClick={() => setEditDevice(d)} style={{ cursor: 'pointer' }}>
                      <td>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{[d.make, d.model].filter(Boolean).join(' ') || d.device_type}</div>
                        <div style={{ fontSize: 10.5, color: 'var(--text3)' }}>
                          {d.device_type}{d.serial_number ? ` · SN ${d.serial_number}` : ''}{d.imei ? ` · IMEI ${d.imei}` : ''}
                          <span style={{ marginLeft: 6, padding: '0 6px', borderRadius: 8, border: '1px solid var(--border)' }}>{d.ownership === 'company' ? 'Company' : 'Personal'}</span>
                        </div>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text2)' }}>{d.holder?.full_name || <span style={{ color: 'var(--text3)' }}>In pool</span>}</td>
                      <td><span style={{ fontSize: 11, fontWeight: 600, color: DEVICE_STATUS_COLOR[d.status] || 'var(--text3)' }}>{DEVICE_STATUS_LABELS[d.status] || d.status}</span></td>
                      <td style={{ fontSize: 11.5, color: 'var(--text2)', textTransform: 'capitalize' }}>{d.condition_at_handover || '—'}</td>
                      <td style={{ textAlign: 'right', fontSize: 12, color: 'var(--text2)' }}>{d.ownership === 'company' ? inr(d.purchase_value) : '—'}</td>
                      <td style={{ textAlign: 'right', fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{d.ownership === 'company' ? inr(depVal) : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {showAdd && <AddDeviceModal employees={employees} onClose={() => setShowAdd(false)} onAdded={load} showToast={showToast} />}
      {editDevice && <AddDeviceModal employees={employees} editDevice={editDevice} onClose={() => setEditDevice(null)} onAdded={load} showToast={showToast} />}
    </>
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
const DeviceIcon = () => <svg viewBox="0 0 16 16" fill="none"><rect x="2.5" y="3" width="11" height="7.5" rx="1" stroke="currentColor" strokeWidth="1.5"/><path d="M1 13h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
const SettingsIcon = () => <svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
const HomeIcon = () => <svg viewBox="0 0 16 16" fill="none"><path d="M2 7l6-5 6 5v7H2V7z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M6 14v-4h4v4" stroke="currentColor" strokeWidth="1.5"/></svg>
const ScoutIcon = () => <svg viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5"/><path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
const RosterIcon = () => <svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M2 13c0-3.314 2.686-5 6-5s6 1.686 6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
