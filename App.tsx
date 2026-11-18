import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Sprout, LogOut, ShieldCheck, Users, Leaf, Clock3, CheckCircle2, XCircle, PauseCircle, RefreshCw } from 'lucide-react'
import { isSupabaseConfigured, supabase, type Profile, type AccountStatus, type AppRole } from './lib/supabase'

const roles: AppRole[] = ['farmer','agronomist','extension_officer','researcher','admin','super_admin']
const roleLabel = (r: string) => r.replaceAll('_',' ').replace(/\b\w/g, c => c.toUpperCase())

export default function App() {
  const [session, setSession] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [mode, setMode] = useState<'login'|'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [location, setLocation] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [users, setUsers] = useState<Profile[]>([])
  const [filter, setFilter] = useState<'all'|AccountStatus>('pending')
  const [farmCount, setFarmCount] = useState(0)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!supabase || !session?.user) { setProfile(null); return }
    let live = true
    supabase.from('profiles').select('*').eq('id', session.user.id).single().then(({ data }) => { if (live) setProfile(data as Profile | null) })
    return () => { live = false }
  }, [session])

  useEffect(() => {
    if (!supabase || profile?.status !== 'approved') return
    supabase.from('farms').select('id', { count: 'exact', head: true }).then(({ count }) => setFarmCount(count ?? 0))
    if (profile.role === 'admin' || profile.role === 'super_admin') loadUsers()
  }, [profile, filter])

  async function loadUsers() {
    if (!supabase) return
    let q = supabase.from('profiles').select('*').order('created_at', { ascending: false })
    if (filter !== 'all') q = q.eq('status', filter)
    const { data, error } = await q
    if (error) setMessage(error.message); else setUsers((data ?? []) as Profile[])
  }

  async function submitAuth(e: FormEvent) {
    e.preventDefault(); if (!supabase) return
    setBusy(true); setMessage('')
    try {
      if (mode === 'register') {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName, phone, location } } })
        if (error) throw error
        if (data.session) setMessage('Registration received. Your account is awaiting administrator approval.')
        else setMessage('Check your email to confirm your address. Your account will remain pending until an administrator approves it.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (err) { setMessage(err instanceof Error ? err.message : 'Something went wrong') }
    finally { setBusy(false) }
  }

  async function review(id: string, decision: 'approved'|'rejected'|'suspended') {
    if (!supabase) return
    const { error } = await supabase.rpc('review_account', { target_user: id, decision })
    if (error) setMessage(error.message); else { setMessage(`Account ${decision}.`); loadUsers() }
  }
  async function assignRole(id: string, role: AppRole) {
    if (!supabase) return
    const { error } = await supabase.rpc('assign_user_role', { target_user: id, new_role: role })
    if (error) setMessage(error.message); else { setMessage('User role updated.'); loadUsers() }
  }
  async function saveFarm(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!supabase || !session?.user) return
    const formElement = e.currentTarget
    const form = new FormData(formElement)
    const { error } = await supabase.from('farms').insert({ owner_id: session.user.id, name: String(form.get('name')), location: String(form.get('location') || ''), primary_crop: String(form.get('crop') || ''), area_hectares: form.get('area') ? Number(form.get('area')) : null })
    if (error) setMessage(error.message); else { setMessage('Farm record saved.'); formElement.reset(); setFarmCount(v => v + 1) }
  }

  if (!isSupabaseConfigured) return <main className="center-page"><section className="panel setup"><div className="brand-mark"><Sprout size={30}/></div><h1>Agrosmart AI</h1><p className="muted">Your agricultural intelligence platform</p><h2>Connect your Supabase project</h2><p>Add your Supabase Project URL and publishable key to a local <code>.env</code> file. See <code>README.md</code> for setup instructions.</p><div className="notice">Do not put a Supabase secret or service-role key in this frontend.</div></section></main>

  if (!session) return <main className="center-page"><section className="panel auth-panel"><div className="brand"><div className="brand-mark"><Sprout/></div><div><h1>Agrosmart AI</h1><span className="muted">Smarter agriculture. Better harvests.</span></div></div><h2>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2><p className="muted">{mode === 'login' ? 'Sign in to continue to your agricultural workspace.' : 'Join Agrosmart AI. New registrations start as pending Farmer accounts.'}</p><form onSubmit={submitAuth} className="stack">{mode === 'register' && <><label>Full name<input required value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Your full name"/></label><label>Phone number<input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Phone number (optional)"/></label><label>Location<input value={location} onChange={e=>setLocation(e.target.value)} placeholder="Town, state"/></label></>}<label>Email address<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label><label>Password<input type="password" required minLength={8} value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 8 characters"/></label><button className="primary" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button></form>{message && <p className="message">{message}</p>}<p className="switch">{mode === 'login' ? 'New to Agrosmart AI?' : 'Already registered?'} <button className="link" onClick={()=>{setMode(mode==='login'?'register':'login');setMessage('')}}>{mode === 'login' ? 'Create an account' : 'Sign in'}</button></p></section></main>

  return <div className="app-shell"><aside className="sidebar"><div className="brand"><div className="brand-mark"><Sprout/></div><div><strong>Agrosmart AI</strong><small>Agriculture intelligence</small></div></div><div className="side-label">WORKSPACE</div><div className="nav-item active"><Leaf size={18}/> Overview</div>{(profile?.role === 'admin' || profile?.role === 'super_admin') && <div className="nav-item"><Users size={18}/> User management</div>}<div className="sidebar-bottom"><ShieldCheck size={17}/><span>Secure agricultural platform</span></div></aside><main className="main"><header className="topbar"><div><span className="muted">AGRICULTURE / WORKSPACE</span><h2>Dashboard</h2></div><button className="ghost" onClick={()=>supabase?.auth.signOut()}><LogOut size={16}/> Sign out</button></header><div className="content"><div className="welcome"><div><span className="eyebrow">WELCOME TO AGROSMART AI</span><h1>Hello, {profile?.full_name || session.user.email?.split('@')[0]} 👋</h1><p>Here is your agricultural workspace overview.</p></div><div className="status-pill"><span className="dot"/>{profile?.status?.toUpperCase()}</div></div>{message && <div className="message banner">{message}</div>}
  {profile?.status !== 'approved' ? <section className="panel pending"><div className="pending-icon"><Clock3 size={28}/></div><h2>{profile?.status === 'pending' ? 'Your account is awaiting approval' : profile?.status === 'rejected' ? 'Your registration was not approved' : 'Your account is currently suspended'}</h2><p>{profile?.status === 'pending' ? 'Thank you for registering. An Agrosmart AI administrator must review and approve your account before you can access farm tools and protected features.' : 'Please contact the platform administrator if you believe this status is incorrect.'}</p><div className="profile-meta"><span>{roleLabel(profile?.role ?? 'farmer')}</span><span>{profile?.email}</span></div></section> : <><div className="stats"><article className="stat-card"><span>YOUR ROLE</span><strong>{roleLabel(profile.role)}</strong><small>Assigned platform access</small></article><article className="stat-card"><span>FARM RECORDS</span><strong>{farmCount}</strong><small>Records available to your account</small></article><article className="stat-card"><span>ACCOUNT STATUS</span><strong className="green">Approved</strong><small>Access is enabled</small></article></div><section className="panel"><div className="section-heading"><div><h2><Leaf size={19}/> Farm records</h2><p className="muted">Create a basic record for one of your farms.</p></div></div><form className="farm-form" onSubmit={saveFarm}><label>Farm name<input name="name" required placeholder="e.g. Northern maize farm"/></label><label>Location<input name="location" placeholder="Community, state"/></label><label>Primary crop<input name="crop" placeholder="Maize, rice, tomato…"/></label><label>Area (hectares)<input name="area" type="number" min="0" step="0.01" placeholder="e.g. 2.5"/></label><button className="primary">Save farm record</button></form></section></>}
  {(profile?.role === 'admin' || profile?.role === 'super_admin') && profile.status === 'approved' && <section className="panel admin-panel"><div className="section-heading"><div><h2><Users size={19}/> Administration</h2><p className="muted">Review registrations and manage platform access.</p></div><button className="ghost" onClick={loadUsers}><RefreshCw size={15}/> Refresh</button></div><div className="filters">{(['pending','approved','rejected','suspended','all'] as const).map(x=><button key={x} className={filter===x?'filter active-filter':'filter'} onClick={()=>setFilter(x)}>{roleLabel(x)}</button>)}</div><div className="table-wrap"><table><thead><tr><th>USER</th><th>ROLE</th><th>STATUS</th><th>REGISTERED</th><th>ACTIONS</th></tr></thead><tbody>{users.map(u=><tr key={u.id}><td><strong>{u.full_name || 'No name'}</strong><small>{u.email}</small></td><td>{roleLabel(u.role)}</td><td><span className={`tag ${u.status}`}>{u.status}</span></td><td>{new Date(u.created_at).toLocaleDateString()}</td><td><div className="actions">{u.status!=='approved' && <button title="Approve" className="icon-btn approve" onClick={()=>review(u.id,'approved')}><CheckCircle2 size={17}/></button>}{u.status!=='rejected' && <button title="Reject" className="icon-btn reject" onClick={()=>review(u.id,'rejected')}><XCircle size={17}/></button>}{u.status!=='suspended' && <button title="Suspend" className="icon-btn" onClick={()=>review(u.id,'suspended')}><PauseCircle size={17}/></button>}</div>{profile.role==='super_admin' && <select aria-label="Assign role" value={u.role} onChange={e=>assignRole(u.id,e.target.value as AppRole)}>{roles.map(r=><option key={r} value={r}>{roleLabel(r)}</option>)}</select>}</td></tr>)}</tbody></table>{users.length===0 && <p className="muted empty">No accounts in this filter.</p>}</div></section>}
  <footer>Agrosmart AI · Phase 1 · Secure access enabled</footer></div></main></div>
}
