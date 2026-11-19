import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Plus, Trash2, Tractor } from 'lucide-react'
import { getSupabase } from '../lib/supabase.ts'
import type { FarmRecord } from '../lib/types.ts'

const empty = { farm_name: '', location: '', crop: '', area_hectares: '', notes: '' }

export default function FarmRecords({ userId }: { userId: string }) {
  const [records, setRecords] = useState<FarmRecord[]>([])
  const [form, setForm] = useState(empty)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await getSupabase()
      .from('farm_records')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setRecords((data as FarmRecord[]) ?? [])
    setLoading(false)
  }, [userId])

  useEffect(() => {
    void load()
  }, [load])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const area = form.area_hectares.trim() === '' ? null : Number(form.area_hectares)
    const { error } = await getSupabase()
      .from('farm_records')
      .insert({
        owner_id: userId,
        farm_name: form.farm_name.trim(),
        location: form.location.trim() || null,
        crop: form.crop.trim() || null,
        area_hectares: area,
        notes: form.notes.trim() || null,
      })
    if (error) setError(error.message)
    else {
      setForm(empty)
      await load()
    }
    setBusy(false)
  }

  const remove = async (id: string) => {
    if (!window.confirm('Delete this farm record?')) return
    const { error } = await getSupabase().from('farm_records').delete().eq('id', id)
    if (error) setError(error.message)
    else setRecords((prev) => prev.filter((r) => r.id !== id))
  }

  const set = (key: keyof typeof empty) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  return (
    <section className="card">
      <h2 className="section-title">
        <Tractor size={20} /> My farm records
      </h2>

      <form onSubmit={submit} className="form grid">
        <label>
          Farm name
          <input value={form.farm_name} onChange={set('farm_name')} required maxLength={200} />
        </label>
        <label>
          Location
          <input value={form.location} onChange={set('location')} maxLength={200} />
        </label>
        <label>
          Main crop
          <input value={form.crop} onChange={set('crop')} maxLength={120} />
        </label>
        <label>
          Area (hectares)
          <input type="number" min="0" step="0.01" value={form.area_hectares} onChange={set('area_hectares')} />
        </label>
        <label className="span-2">
          Notes
          <textarea value={form.notes} onChange={set('notes')} rows={3} maxLength={4000} />
        </label>
        <div className="span-2">
          <button className="btn" type="submit" disabled={busy}>
            <Plus size={16} /> {busy ? 'Saving…' : 'Add record'}
          </button>
        </div>
      </form>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p className="muted">Loading records…</p>
      ) : records.length === 0 ? (
        <p className="muted">No farm records yet. Add your first one above.</p>
      ) : (
        <ul className="records">
          {records.map((r) => (
            <li key={r.id}>
              <div>
                <strong>{r.farm_name}</strong>
                <div className="muted small">
                  {[r.crop, r.location, r.area_hectares != null ? `${r.area_hectares} ha` : null]
                    .filter(Boolean)
                    .join(' · ') || 'No details'}
                </div>
                {r.notes && <p className="small">{r.notes}</p>}
              </div>
              <button className="icon-btn" onClick={() => remove(r.id)} aria-label="Delete record">
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
