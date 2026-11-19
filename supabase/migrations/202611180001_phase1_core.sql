-- Agrosmart AI — Phase 1 core schema
-- Run this whole file once in the Supabase SQL Editor of a new project.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.user_role as enum (
  'farmer', 'agronomist', 'extension_officer', 'researcher', 'admin', 'super_admin'
);

create type public.account_status as enum ('pending', 'approved', 'rejected', 'suspended');

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  phone text,
  location text,
  role public.user_role not null default 'farmer',
  status public.account_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null
);

alter table public.profiles enable row level security;

-- New auth users always become a pending farmer. Client metadata is only used
-- for descriptive fields and can never choose a role or status.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, phone, location, role, status)
  values (
    new.id,
    new.email,
    nullif(left(trim(new.raw_user_meta_data ->> 'full_name'), 200), ''),
    nullif(left(trim(new.raw_user_meta_data ->> 'phone'), 50), ''),
    nullif(left(trim(new.raw_user_meta_data ->> 'location'), 200), ''),
    'farmer',
    'pending'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Helper functions (security definer so RLS policies can call them safely)
-- ---------------------------------------------------------------------------
create or replace function public.is_approved()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and status = 'approved'
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and status = 'approved'
      and role in ('admin', 'super_admin')
  );
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and status = 'approved'
      and role = 'super_admin'
  );
$$;

-- Profiles: users read their own; approved admins read all.
-- There are no insert/update/delete policies: the trigger creates rows and the
-- admin functions below perform all changes.
create policy "profiles_select_own_or_admin" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

-- Users may edit only their own descriptive fields.
create or replace function public.update_own_profile(
  p_full_name text, p_phone text, p_location text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  update public.profiles
     set full_name = nullif(left(trim(p_full_name), 200), ''),
         phone = nullif(left(trim(p_phone), 50), ''),
         location = nullif(left(trim(p_location), 200), ''),
         updated_at = now()
   where id = auth.uid();
end;
$$;

-- Admin: change account status.
create or replace function public.admin_set_status(
  target_id uuid, new_status public.account_status
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_role public.user_role;
begin
  if not public.is_admin() then
    raise exception 'Only approved administrators can review accounts';
  end if;
  if target_id = auth.uid() then
    raise exception 'You cannot change your own account status';
  end if;

  select role into target_role from public.profiles where id = target_id;
  if not found then
    raise exception 'Account not found';
  end if;

  if target_role in ('admin', 'super_admin') and not public.is_super_admin() then
    raise exception 'Only a Super Admin can change the status of an administrator';
  end if;

  update public.profiles
     set status = new_status,
         reviewed_at = now(),
         reviewed_by = auth.uid(),
         updated_at = now()
   where id = target_id;
end;
$$;

-- Super Admin: assign roles.
create or replace function public.super_admin_set_role(
  target_id uuid, new_role public.user_role
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_super_admin() then
    raise exception 'Only a Super Admin can assign roles';
  end if;
  if target_id = auth.uid() then
    raise exception 'You cannot change your own role';
  end if;

  update public.profiles
     set role = new_role,
         reviewed_at = now(),
         reviewed_by = auth.uid(),
         updated_at = now()
   where id = target_id;

  if not found then
    raise exception 'Account not found';
  end if;
end;
$$;

revoke all on function public.update_own_profile(text, text, text) from public, anon;
revoke all on function public.admin_set_status(uuid, public.account_status) from public, anon;
revoke all on function public.super_admin_set_role(uuid, public.user_role) from public, anon;
grant execute on function public.update_own_profile(text, text, text) to authenticated;
grant execute on function public.admin_set_status(uuid, public.account_status) to authenticated;
grant execute on function public.super_admin_set_role(uuid, public.user_role) to authenticated;

-- ---------------------------------------------------------------------------
-- Farm records
-- ---------------------------------------------------------------------------
create table public.farm_records (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  farm_name text not null check (char_length(farm_name) between 1 and 200),
  location text check (char_length(location) <= 200),
  crop text check (char_length(crop) <= 120),
  area_hectares numeric(10, 2) check (area_hectares is null or area_hectares >= 0),
  notes text check (char_length(notes) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index farm_records_owner_idx on public.farm_records (owner_id);

alter table public.farm_records enable row level security;

create policy "farm_records_select_own" on public.farm_records
  for select to authenticated
  using (owner_id = auth.uid() and public.is_approved());

create policy "farm_records_insert_own" on public.farm_records
  for insert to authenticated
  with check (owner_id = auth.uid() and public.is_approved());

create policy "farm_records_update_own" on public.farm_records
  for update to authenticated
  using (owner_id = auth.uid() and public.is_approved())
  with check (owner_id = auth.uid() and public.is_approved());

create policy "farm_records_delete_own" on public.farm_records
  for delete to authenticated
  using (owner_id = auth.uid() and public.is_approved());

-- ---------------------------------------------------------------------------
-- Private farm-media storage
-- Files must be stored under "<user id>/<file name>".
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('farm-media', 'farm-media', false)
on conflict (id) do nothing;

create policy "farm_media_select_own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'farm-media'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_approved()
  );

create policy "farm_media_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'farm-media'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_approved()
  );

create policy "farm_media_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'farm-media'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_approved()
  );

create policy "farm_media_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'farm-media'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_approved()
  );
