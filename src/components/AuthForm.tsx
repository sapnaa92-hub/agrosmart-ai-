import { useState, type FormEvent } from 'react'
import { LogIn, UserPlus } from 'lucide-react'
import { getSupabase } from '../lib/supabase.ts'

type Mode = 'login' | 'register'

export default function AuthForm() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [location, setLocation] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setMessage(null)
    const supabase = getSupabase()

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    } else {
      // Only descriptive metadata is sent. Role and status are always set by the
      // database trigger (farmer + pending).
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { full_name: fullName, phone, location },
        },
      })
      if (error) setError(error.message)
      else if (!data.session)
        setMessage(
          'Registration received. Check your email to confirm your address, then sign in. An administrator will review your account.',
        )
    }
    setBusy(false)
  }

  const switchMode = (next: Mode) => {
    setMode(next)
    setError(null)
    setMessage(null)
  }

  return (
    <div className="card narrow">
      <div className="tabs">
        <button className={mode === 'login' ? 'tab active' : 'tab'} onClick={() => switchMode('login')}>
          Sign in
        </button>
        <button
          className={mode === 'register' ? 'tab active' : 'tab'}
          onClick={() => switchMode('register')}
        >
          Register
        </button>
      </div>

      <form onSubmit={submit} className="form">
        {mode === 'register' && (
          <label>
            Full name
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} required maxLength={200} />
          </label>
        )}
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={mode === 'register' ? 8 : undefined}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
        </label>
        {mode === 'register' && (
          <>
            <label>
              Phone <span className="muted">(optional)</span>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={50} />
            </label>
            <label>
              Location <span className="muted">(optional)</span>
              <input value={location} onChange={(e) => setLocation(e.target.value)} maxLength={200} />
            </label>
            <p className="muted small">
              New accounts start as Farmer and must be approved by an administrator.
            </p>
          </>
        )}

        {error && <p className="error">{error}</p>}
        {message && <p className="success">{message}</p>}

        <button className="btn" type="submit" disabled={busy}>
          {mode === 'login' ? <LogIn size={16} /> : <UserPlus size={16} />}
          {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
        </button>
      </form>
    </div>
  )
}
