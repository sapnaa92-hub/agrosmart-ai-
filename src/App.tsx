import { useCallback, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { LogOut, Sprout } from 'lucide-react'
import { isConfigured, supabase } from './lib/supabase.ts'
import { isAdminRole, ROLE_LABELS, type Profile } from './lib/types.ts'
import AuthForm from './components/AuthForm.tsx'
import StatusNotice from './components/StatusNotice.tsx'
import FarmRecords from './components/FarmRecords.tsx'
import AdminPanel from './components/AdminPanel.tsx'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(isConfigured)
  const [profileError, setProfileError] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (!data.session) setLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      if (!next) {
        setProfile(null)
        setLoading(false)
      }
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const userId = session?.user.id

  const loadProfile = useCallback(async () => {
    if (!supabase || !userId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
    setProfileError(error ? error.message : data ? null : 'Your profile could not be found.')
    setProfile((data as Profile | null) ?? null)
    setLoading(false)
  }, [userId])

  useEffect(() => {
    void loadProfile()
  }, [loadProfile])

  const signOut = async () => {
    await supabase?.auth.signOut()
  }

  if (!isConfigured) {
    return (
      <Shell>
        <div className="card narrow">
          <h2>Configuration required</h2>
          <p>
            Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> in your
            environment (or Netlify environment variables) and redeploy.
          </p>
        </div>
      </Shell>
    )
  }

  if (loading) {
    return (
      <Shell>
        <p className="muted center">Loading…</p>
      </Shell>
    )
  }

  if (!session) {
    return (
      <Shell>
        <AuthForm />
      </Shell>
    )
  }

  const header = (
    <div className="userbar">
      <div>
        <strong>{profile?.full_name || session.user.email}</strong>
        {profile && (
          <span className="badge">
            {ROLE_LABELS[profile.role]} · {profile.status}
          </span>
        )}
      </div>
      <button className="btn ghost" onClick={signOut}>
        <LogOut size={16} /> Sign out
      </button>
    </div>
  )

  if (!profile) {
    return (
      <Shell userbar={header}>
        <div className="card narrow">
          <h2>Profile unavailable</h2>
          <p className="error">{profileError}</p>
          <button className="btn" onClick={loadProfile}>
            Retry
          </button>
        </div>
      </Shell>
    )
  }

  if (profile.status !== 'approved') {
    return (
      <Shell userbar={header}>
        <StatusNotice status={profile.status} onRefresh={loadProfile} />
      </Shell>
    )
  }

  return (
    <Shell userbar={header}>
      <FarmRecords userId={profile.id} />
      {isAdminRole(profile.role) && <AdminPanel me={profile} />}
    </Shell>
  )
}

function Shell({ children, userbar }: { children: ReactNode; userbar?: ReactNode }) {
  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <Sprout size={26} />
          <span>Agrosmart AI</span>
        </div>
        {userbar}
      </header>
      <main className="content">{children}</main>
      <footer className="footer">Practical digital tools for farmers and agricultural professionals.</footer>
    </div>
  )
}
