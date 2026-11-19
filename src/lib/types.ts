export const ROLES = [
  'farmer',
  'agronomist',
  'extension_officer',
  'researcher',
  'admin',
  'super_admin',
] as const
export type Role = (typeof ROLES)[number]

export const STATUSES = ['pending', 'approved', 'rejected', 'suspended'] as const
export type Status = (typeof STATUSES)[number]

export interface Profile {
  id: string
  email: string | null
  full_name: string | null
  phone: string | null
  location: string | null
  role: Role
  status: Status
  created_at: string
  reviewed_at: string | null
}

export interface FarmRecord {
  id: string
  owner_id: string
  farm_name: string
  location: string | null
  crop: string | null
  area_hectares: number | null
  notes: string | null
  created_at: string
}

export const ROLE_LABELS: Record<Role, string> = {
  farmer: 'Farmer',
  agronomist: 'Agronomist',
  extension_officer: 'Extension Officer',
  researcher: 'Researcher',
  admin: 'Admin',
  super_admin: 'Super Admin',
}

export const isAdminRole = (role: Role) => role === 'admin' || role === 'super_admin'
