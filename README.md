# Agrosmart AI — Supabase + Netlify Phase 1

A React + Vite starter for Agrosmart AI using Supabase as the backend and Netlify for frontend hosting.

## Included in this Phase 1 starter

- Email/password registration and login with Supabase Auth.
- Public registration; the database trigger always creates a `farmer` with `pending` status. Client-supplied metadata cannot choose a role or approval status.
- Account states: `pending`, `approved`, `rejected`, `suspended`.
- Roles: `farmer`, `agronomist`, `extension_officer`, `researcher`, `admin`, `super_admin`.
- Admin dashboard to review accounts and approve, reject or suspend them.
- Super Admin-only role assignment; regular Admin cannot assign privileged roles. The in-app role assignment function cannot create another Super Admin; the platform owner provisions the initial Super Admin manually.
- PostgreSQL Row Level Security (RLS) policies for profiles, farm records and private farm-media storage.
- Basic farm record creation for approved users.
- Netlify build configuration and SPA routing fallback.

## 1. Create the Supabase project

1. Sign in at <https://supabase.com/dashboard> and create a new project.
2. Choose a strong database password and keep it in a password manager.
3. Select a region suitable for your expected users and latency. You can start with a development project and move to a production project after testing.
4. In **SQL Editor**, run the complete file `supabase/migrations/202611180001_phase1_core.sql`. This migration creates the profile and farm tables, registration trigger, approval/role functions, RLS policies and private farm-media bucket.
5. In **Authentication → URL Configuration**, set the Site URL to your Netlify site URL after Netlify has deployed. Add the Netlify deploy-preview URL patterns you intend to use under Redirect URLs.
6. In **Authentication → Providers → Email**, configure email confirmation according to your launch policy. For public production registration, keep email confirmation enabled and configure reliable SMTP before launch.

## 2. Configure the frontend

A local `.env.local` file has been preconfigured for the Supabase project supplied in this conversation. For another environment, copy `.env.example` to `.env.local` and set:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
```

Find these values in Supabase **Project Settings → API** (the current dashboard may label the browser-safe key as a publishable key). The publishable key is designed for browser use when RLS is correctly enabled.

**Never put a Supabase secret key or legacy `service_role` key in this React app, a committed `.env` file, or Netlify's `VITE_` variables.** Those keys bypass RLS. Keep them only in trusted server-side environments if a future feature requires them.

Install and run:

```bash
npm install
npm run dev
```

Build check:

```bash
npm run build
```

## 3. Deploy to Netlify

1. Push this project to a private or public Git repository.
2. In Netlify, choose **Add new site → Import an existing project** and connect the repository.
3. Build command: `npm run build`; publish directory: `dist` (also defined in `netlify.toml`).
4. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` under **Site configuration → Environment variables**.
5. Trigger a fresh deploy after adding the variables.
6. Copy the deployed Netlify URL into Supabase **Authentication → URL Configuration** as the Site URL and add the required redirect URLs.

## 4. Create the first Super Admin safely

There is deliberately no public Super Admin registration path.

1. Register your own account through the deployed app and complete email confirmation.
2. In Supabase **Authentication → Users**, copy that account's user UUID.
3. In Supabase **SQL Editor**, run this once, replacing the UUID with your own account ID:

```sql
update public.profiles
set role = 'super_admin', status = 'approved', reviewed_at = now()
where id = 'REPLACE-WITH-YOUR-AUTH-USER-UUID';
```

4. Sign out and sign in again. The account should now show the administration panel.
5. Keep Super Admin access limited to a trusted platform owner. Do not share the database owner credentials.

The SQL Editor runs with database-owner privileges. Never expose those credentials to the browser or ordinary users.

## 5. Role and approval model

| Role | Intended access |
|---|---|
| Farmer | Own farm records and permitted farmer tools |
| Agronomist | To be expanded in later phases for advisory workflows |
| Extension Officer | To be expanded for extension workflows |
| Researcher | To be expanded for research datasets |
| Admin | Account review and operational administration |
| Super Admin | Admin capabilities plus role assignment |

New registrations always start as `farmer` + `pending`. Only approved users can access farm records. Admin actions are executed by database functions that check the caller's role and approval status. RLS enforces data access in PostgreSQL rather than relying only on frontend hiding.

## 6. Before public production launch

This is a Phase 1 starter, not a completed security audit or full agricultural product. Complete these items before broad public use:

- Configure custom SMTP, email verification, password reset and account recovery.
- Add MFA for administrators and Super Admins.
- Add immutable audit events for registration review, role changes and sensitive admin actions.
- Add rate limits / abuse controls and monitoring; test Supabase Auth limits and configure CAPTCHA if needed.
- Review RLS and storage policies with independent security testing, including attempts to access another user's data.
- Configure backups and test restoration; review Supabase plan limits, data residency and privacy obligations.
- Add a user-facing privacy notice, terms and support contact.
- Add the real agronomy AI service separately. No crop disease diagnosis or AI recommendation engine is implemented in this Phase 1 starter.
- Build and test Android integration against the same Supabase project after the web workflow is stable.

## 7. Important notes

- Phone and location are collected as optional registration metadata and copied into the profile by the database trigger.
- Supabase Auth email confirmation can mean the user has to confirm email before a session is issued. The profile is still created as pending at signup.
- The UI is a working scaffold for authentication, approval and basic farm records. It is not yet a complete agricultural marketplace, advisory system, AI diagnostic service or mobile app.
- Review the SQL migration and test it in a new development Supabase project before applying it to production.
