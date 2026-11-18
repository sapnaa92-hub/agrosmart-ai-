# Deployment checklist

## Supabase
- [ ] Create project and save DB credentials securely.
- [ ] Run `supabase/migrations/202611180001_phase1_core.sql` in SQL Editor.
- [ ] Confirm `profiles`, `farms`, enums, functions and RLS policies exist.
- [ ] Set email confirmation and SMTP.
- [ ] Deploy frontend, then configure Site URL and redirect URLs.
- [ ] Register owner account and promote its UUID to `super_admin` using the documented SQL.
- [ ] Test pending user cannot read/write farm records.
- [ ] Test approved farmer can create and read only own farm records.
- [ ] Test Admin can review accounts but cannot assign roles.
- [ ] Test Super Admin can assign roles.
- [ ] Test one user cannot read another user's profile or private storage objects.

## Netlify
- [ ] Connect Git repository.
- [ ] Set build command `npm run build` and publish directory `dist`.
- [ ] Add only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` as frontend variables.
- [ ] Deploy and test registration, email confirmation, login and logout.
- [ ] Add custom domain later if/when purchased.

## Production readiness
- [ ] MFA for privileged accounts.
- [ ] Audit trail, rate limits, monitoring and incident process.
- [ ] Backup and restore test.
- [ ] Independent security review and privacy review.
