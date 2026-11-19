import { useCallback, useEffect, useMemo, useState } from 'react'
import { Ban, Check, ShieldCheck, X } from 'lucide-react'
import { getSupabase } from '../lib/supabase.ts'
import {
  isAdminRole,
  ROLE_LABELS,
  ROLES,
  STATUSES,
  type Profile,
  type Role,
  type Status,
} from '../lib/types.ts'

type Filter = Status | 'all'

export default function AdminPanel({ me }: { me: Profile }) {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [filter, setFilter] = useState<Filter>('pending')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const isSuper = me.role === 'super_admin'

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await getSupabase()
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setProfiles((data as Profile[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const visible = useMemo(
    () => (filter === 'all' ? profiles : profiles.filter((p) => p.status === filter)),
    [profiles, filter],
  )

  const run = async (id: string, fn: string, args: Record<string, string>) => {
    setBusyId(id)
    setError(null)
    const { error } = await getSupabase().rpc(fn, { target_id: id, ...args })
    if (error) setError(error.message)
    else await load()
    setBusyId(null)
  }

  const setStatus = (id: string, status: Status) => run(id, 'admin_set_status', { new_status: status })
  const setRole = (id: string, role: Role) => run(id, 'super_admin_set_role', { new_role: role })

  return (
    <section className="card">
      <h2 className="section-title">
        <ShieldCheck size={20} /> Account administration
      </h2>

      <div className="filters">
        {(['pending', 'approved', 'rejected', 'suspended', 'all'] as Filter[]).map((f) => (
          <button key={f} className={filter === f ? 'chip active' : 'chip'} onClick={() => setFilter(f)}>
            {f} ({f === 'all' ? profiles.length : profiles.filter((p) => p.status === f).length})
          </button>
        ))}
      </div>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p className="muted">Loading accounts…</p>
      ) : visible.length === 0 ? (
        <p className="muted">No accounts in this view.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Contact</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => {
                const self = p.id === me.id
                const protectedTarget = isAdminRole(p.role) && !isSuper
                const disabled = self || protectedTarget || busyId === p.id
                return (
                  <tr key={p.id}>
                    <td>
                      <strong>{p.full_name || '—'}</strong>
                      <div className="muted small">{p.email}</div>
                    </td>
                    <td className="small">
                      {p.phone || '—'}
                      <div className="muted">{p.location || ''}</div>
                    </td>
                    <td>
                      {isSuper && !self ? (
                        <select
                          value={p.role}
                          disabled={busyId === p.id}
                          onChange={(e) => setRole(p.id, e.target.value as Role)}
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABELS[r]}
                            </option>
                          ))}
                        </select>
                      ) : (
                        ROLE_LABELS[p.role]
                      )}
                    </td>
                    <td>
                      <span className={`status ${p.status}`}>{p.status}</span>
                    </td>
                    <td className="actions">
                      {self ? (
                        <span className="muted small">You</span>
                      ) : (
                        STATUSES.filter((s) => s !== p.status && s !== 'pending').map((s) => (
                          <button
                            key={s}
                            className={`btn small ${s === 'approved' ? '' : 'ghost'}`}
                            disabled={disabled}
                            onClick={() => setStatus(p.id, s)}
                          >
                            {s === 'approved' ? <Check size={14} /> : s === 'rejected' ? <X size={14} /> : <Ban size={14} />}
                            {s === 'approved' ? 'Approve' : s === 'rejected' ? 'Reject' : 'Suspend'}
                          </button>
                        ))
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {!isSuper && (
        <p className="muted small">Only a Super Admin can assign roles or change administrator accounts.</p>
      )}
    </section>
  )
}
