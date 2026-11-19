import { Clock, RefreshCw, ShieldAlert, XCircle } from 'lucide-react'
import type { Status } from '../lib/types.ts'

const COPY: Record<Exclude<Status, 'approved'>, { title: string; body: string }> = {
  pending: {
    title: 'Account pending review',
    body: 'Thanks for registering. An administrator will review your account shortly. You will be able to use farm tools once approved.',
  },
  rejected: {
    title: 'Registration not approved',
    body: 'Your registration was not approved. Please contact support if you believe this is a mistake.',
  },
  suspended: {
    title: 'Account suspended',
    body: 'Your account has been suspended. Please contact support for more information.',
  },
}

export default function StatusNotice({ status, onRefresh }: { status: Status; onRefresh: () => void }) {
  if (status === 'approved') return null
  const { title, body } = COPY[status]
  const Icon = status === 'pending' ? Clock : status === 'rejected' ? XCircle : ShieldAlert
  return (
    <div className={`card narrow notice ${status}`}>
      <Icon size={36} />
      <h2>{title}</h2>
      <p>{body}</p>
      <button className="btn ghost" onClick={onRefresh}>
        <RefreshCw size={16} /> Check again
      </button>
    </div>
  )
}
