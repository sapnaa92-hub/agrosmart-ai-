import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export type AppRole = 'farmer' | 'agronomist' | 'extension_officer' | 'researcher' | 'admin' | 'super_admin'
export type AccountStatus = 'pending' | 'approved' | 'rejected' | 'suspended'

export interface Profile {
  id: string
  email: string | null
  full_name: string | null
  phone: string | null
  location: string | null
  role: AppRole
  status: AccountStatus
  created_at: string
  reviewed_at: string | null
}

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

export const isSupabaseConfigured = Boolean(url && key)

export const supabase: SupabaseClient | null = isSupabaseConfigured ? createClient(url!, key!) : null
