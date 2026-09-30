# Mir & Ella — Wedding Website & RSVP

A production-ready wedding website, RSVP system and private admin dashboard for **Mir & Ella · December 19, 2026**.

- **Frontend:** React 19 + Vite + TypeScript + Tailwind CSS v4, Framer Motion, Lucide icons, Recharts
- **Backend:** Supabase (PostgreSQL, Auth, Row Level Security, RPC functions, Storage)
- **Hosting:** GitHub Pages (static) — deployed by GitHub Actions

```
GitHub Pages (static React build)
        │
        ├── Public website  (/  and  /#/rsvp)
        └── Admin website   (/#/admin …)
                 │
                 ▼
             Supabase ── Database (RLS) · Auth · Storage
```

GitHub Pages only serves the built HTML/JS/CSS. **Every RSVP, invitation and setting lives in Supabase.** Nothing is stored in GitHub files or in `localStorage`.

---

## Contents

1. [What's included](#1-whats-included)
2. [Installation](#2-installation)
3. [Environment variables](#3-environment-variables)
4. [Supabase setup](#4-supabase-setup)
5. [Admin account](#5-admin-account)
6. [Local development](#6-local-development)
7. [Deploy to GitHub Pages](#7-deploy-to-github-pages)
8. [Routing on GitHub Pages (why hash URLs)](#8-routing-on-github-pages-why-hash-urls)
9. [Security model](#9-security-model)
10. [Testing checklist](#10-testing-checklist)
11. [Production launch checklist](#11-production-launch-checklist)
12. [Project structure](#12-project-structure)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. What's included

**Public wedding page (`/`)** — hero image, couple names and date, introduction text, ceremony and reception cards with *View Location* buttons, admin-managed information sections (Dress Code, Ceremony, Reception, Unplugged Ceremony, Gifts…), a prominent RSVP button and footer. All text, links, the hero image and the sections come from Supabase.

**RSVP (`/#/rsvp`)** — Search → *Your Invitation Has Arrived* → *Open Invitation* (envelope animation; a simple fade for reduced-motion users) → RSVP form with conditional questions → *Are you sure?* modal → success page. Re-submitting updates the guest's single existing response.

**Admin (`/#/admin`)** — Supabase email/password login, dashboard with live counts, catering headcount, charts and guests' messages, invitation CRUD (including **included guests** per invitation), responses (filter, view, delete), additional-guest approvals, an **Outfit Gallery** manager, website settings (including hero image upload and section add/edit/delete/reorder/show-hide), CSV export, and an automatic activity log.

### Guests on an invitation — two kinds

| | Included guests | Guest requests |
|---|---|---|
| Added by | the couple, in *Admin → Invitations → Edit* | the invitee, on the RSVP form (₱799 each) |
| Shown to the invitee | yes — on the invitation card and at the top of the RSVP form | only what they entered |
| Approval | confirmed automatically | *Pending* until you approve or decline in *Additional Guests* |
| Limit | up to 20 per invitation | *Maximum Additional Guests* on the invitation |
| Stored as | `additional_guests.added_by = 'admin'` | `additional_guests.added_by = 'invitee'` |

If you include a name the invitee had already requested, that request becomes an included (approved) guest.

### Outfit gallery

*Admin → Outfit Gallery* manages the "Attire Inspiration" carousel shown under the wedding details (For Him / For Her). Upload photos (stored in the `wedding-assets` bucket under `outfits/`) or paste image links, add captions, reorder, hide/show or remove them, and edit the section title/description or hide the whole section. The six illustrations that ship with the site (`public/samples/outfits/`) are placeholders — hide or remove them once you've added real photos.

---

## 2. Installation

Requirements: **Node.js 20.19+** (Node 22 recommended) and npm.

```bash
npm install
```

---

## 3. Environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env.local
```

| Variable | Where to find it |
|---|---|
| `VITE_SUPABASE_URL` | Supabase Dashboard → **Project Settings → API** → *Project URL* (e.g. `https://abcd1234.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Same page → the **anon / public** key (newer projects call it the **publishable** key, `sb_publishable_…`). Either works. |

> ⚠️ **Never** use the `service_role` / **secret** key anywhere in this project — not in `.env.local`, not in GitHub secrets, not in code. Anything prefixed `VITE_` is bundled into the public JavaScript. The anon key is designed to be public; the database is protected by Row Level Security.

`.env`, `.env.local` and `.env.*.local` are already in `.gitignore`.

---

## 4. Supabase setup

1. **Open Supabase** and create (or open) your project.
2. **Open SQL Editor** → *New query*.
3. **Run `supabase/schema.sql`** — paste the whole file and click *Run*. It creates:
   - tables: `wedding_settings`, `invitations`, `rsvp_responses`, `additional_guests`, `admin_activity_logs`, `admin_users`
   - constraints, indexes, foreign keys with `ON DELETE CASCADE`
   - Row Level Security on every table + policies
   - the secure RPC functions `find_invitation`, `find_invitation_by_code`, `submit_rsvp`, `is_admin`
   - activity-log triggers
   - the public Storage bucket **`wedding-assets`** and its policies
   - the default `wedding_settings` row (names, date, church, reception, map links, the 5 default sections)

   The script is safe to run again on the same project.
   **Then run every file in `supabase/migrations/` in order**: `002_outfits_messages_included_guests.sql` (outfit gallery, message to the couple, admin-included guests) `003_deadline_mobile_entourage_motif_gift.sql` (RSVP deadline, required mobile number, entourage, motif colours, private gift QR) `004_gallery_video.sql` (couple photo gallery, prenup video) and `005_theme.sql` (Look & Feel templates).
4. **Run `supabase/seed.sql` if testing** — adds sample invitations: *Juan Dela Cruz* (Table 5, 1 guest), *Maria Santos* (VIP, 2 guests), *Pedro Reyes* (Family Table, 0 guests), *Ana Villanueva* (A1, 3 guests) and an **inactive** *Carlos Mendoza* (must not be found by search).
5. **Create the admin user** — see [section 5](#5-admin-account).
6. **Configure Storage (hero image uploads)** — already done by `schema.sql` (bucket `wedding-assets`, public read, admin-only upload). Check it exists under **Storage**. If your project didn't allow the SQL to create the bucket, create it manually: *Storage → New bucket → name `wedding-assets` → Public bucket ON*, then run `schema.sql` again so the policies are added.
7. **Recommended Auth settings** — *Authentication → Sign In / Providers*:
   - **Email** provider enabled.
   - **Allow new users to sign up: OFF.** (Only you should have an account. Even if it were on, strangers still couldn't access admin data because admin rights come from `admin_users`, not from simply having an account.)

---

## 5. Admin account

The admin password is **never** in the source code. It is stored (hashed) by Supabase Auth.

1. Supabase Dashboard → **Authentication → Users → Add user → Create new user**.
2. Enter your email and your chosen password (for example the password you planned to use), and tick **Auto Confirm User**.
3. Grant that user admin rights — SQL Editor, replace the email and run:

   ```sql
   insert into public.admin_users (user_id, email)
   select id, email from auth.users where email = 'you@example.com';
   ```

4. Visit `/#/admin/login` and sign in.

To add a second admin (e.g. Ella), repeat steps 1–3 with their email. To remove admin access:

```sql
delete from public.admin_users where email = 'someone@example.com';
```

To change a password: *Authentication → Users → (user) → Send password recovery* or *Reset password*.

---

## 6. Local development

```bash
npm run dev       # http://localhost:5173
npm run build     # type-check + production build into dist/
npm run preview   # serve the production build locally
npm run lint      # ESLint
```

Public site: `http://localhost:5173/` · RSVP: `http://localhost:5173/#/rsvp` · Admin: `http://localhost:5173/#/admin`

If the environment variables are missing the site shows a friendly "Almost ready" notice instead of crashing.

---

## 7. Deploy to GitHub Pages

The workflow `.github/workflows/deploy.yml` builds and deploys on every push to `main`.

1. **Add the secrets** — GitHub repository → **Settings → Secrets and variables → Actions → New repository secret**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
2. **Enable Pages from Actions** — **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. **Push to `main`** (or run the workflow manually from the *Actions* tab). The workflow checks out the repo, installs Node 22, installs dependencies, lints, builds with your secrets, and deploys `dist/`.
4. Your site will be at `https://<user>.github.io/<repo>/` (or your custom domain).

The Vite `base` is `./` (relative), so the same build works for both a project page (`/repo/`) and a custom domain — no path to configure.

> Tip: run `npm install` locally once and commit the generated `package-lock.json`; the workflow will then use `npm ci` for reproducible builds.

---

## 8. Routing on GitHub Pages (why hash URLs)

GitHub Pages is static hosting: it has no server-side rewrite rules. With normal browser routing, refreshing `/rsvp` or `/admin/invitations` asks GitHub for a file that doesn't exist and returns **404**. The common "404.html redirect" trick works but is fragile (flash of the 404 page, query strings mangled, breaks with some link previews).

This project uses **`HashRouter`**, so URLs look like:

```
https://<user>.github.io/<repo>/#/rsvp
https://<user>.github.io/<repo>/#/admin/invitations
```

Everything after `#` is handled in the browser, so **refreshes, bookmarks and shared links always work** with zero server config. This is the most reliable option for GitHub Pages. When sending the RSVP link to guests, use `…/#/rsvp` (or just the home page — the RSVP button is on it).

**Future invitation links** are already supported by the code: `…/#/rsvp?invite=<invitation_code>` opens that guest's invitation directly via the `find_invitation_by_code` RPC. Admins can copy a personal link from the *Edit Invitation* dialog. Guests never *need* a code — name search remains the main flow.

---

## 9. Security model

```
Public guest → searches name → find_invitation() RPC → only the matching active invitation → submit_rsvp() RPC
Admin        → Supabase Auth login → is_admin() (admin_users) → RLS policies → full management
```

- The public role (`anon`) has **no table access** except reading `wedding_settings` (public website content). `SELECT * FROM invitations` from a browser returns *permission denied*.
- `find_invitation(search_name)` is `SECURITY DEFINER`, normalises input (trim, collapse spaces, lowercase), searches **active** invitations only, requires an exact name match, and returns only `invitation_id, invitee_name, table_number, max_additional_guests, has_existing_response`. It cannot list guests.
- `submit_rsvp(...)` is the only way a guest can write. It re-validates every field server-side (same limits as the form), enforces `max_additional_guests`, upserts the single response (`unique(invitation_id)`), and reconciles additional guests (kept names keep their status, removed names are deleted, new names are inserted as `pending`).
- Admin access requires a logged-in user **listed in `admin_users`**, checked in every RLS policy via `is_admin()` — frontend route guards are only a convenience.
- Admin changes are logged automatically by database triggers into `admin_activity_logs` (invitation created/updated/deleted, RSVP deleted, guest status changed, settings changed).
- Raw database errors are never shown to users; friendly messages are displayed instead.

---

## 10. Testing checklist

Run the seed first. Use a phone (or browser dev-tools device mode) for the mobile checks.

**Public website**
- [ ] Home page loads; hero image shows (change it in Settings and refresh)
- [ ] Church and reception *View Location* buttons open the correct Google Maps links
- [ ] RSVP button (hero nav and bottom section) opens `/#/rsvp`
- [ ] Mobile layout: no sideways scrolling, text readable, buttons easy to tap
- [ ] Desktop: the *Details* link and the *Scroll* arrow in the hero glide down to the wedding details
- [ ] The *Attire Inspiration* carousel shows under the wedding details; *For Him / For Her* switch; swipe on phones, arrows on desktop; tapping a photo enlarges it

**Invitation search**
- [ ] `Juan Dela Cruz` is found (shows *Your Invitation Has Arrived*, name, *Table 5*)
- [ ] `  juan    DELA cruz ` is also found (case/spaces normalised)
- [ ] `Juan` or a misspelling → friendly "couldn't find" message, no other names revealed
- [ ] `Carlos Mendoza` (inactive) is **not** found

**RSVP**
- [ ] Open Invitation plays the envelope animation (and a simple fade with *Reduce motion* enabled in OS settings)
- [ ] *Declining* hides all other questions and saves
- [ ] *Attending*: "own vehicle = No" shows transportation-assistance options; "Yes" shows vehicle types
- [ ] "Coming from" counter shows `x / 120`; accessibility counter `x / 255`
- [ ] Selecting a 5th dish is blocked with "You can select up to 4 dishes."
- [ ] Dietary "Yes" requires the "Please specify" field
- [ ] `Pedro Reyes` (0 allowed) never sees the additional-guest question
- [ ] `Juan Dela Cruz` (1 allowed) gets one guest field and no "+" button
- [ ] `Ana Villanueva` (3 allowed) can add up to 3 guests; empty/duplicate names are rejected
- [ ] Give an invitation included guests in admin → search that name → the names appear on the invitation card and at the top of the form
- [ ] The last question for attending guests is the optional message to the couple (500 characters) → it shows on the dashboard and in the response
- [ ] *Confirm My Response* opens *Are you sure?*; *Cancel* saves nothing; *Confirm Response* shows "Saving your RSVP..." then the success page
- [ ] Searching the same name again shows "We already have your RSVP"; submitting again **updates** (Responses page still shows one row, with a new *Updated* time)

**Admin**
- [ ] `/#/admin` while logged out redirects to `/#/admin/login`
- [ ] Wrong password → friendly error; correct → dashboard
- [ ] A user who exists in Auth but not in `admin_users` is refused
- [ ] Dashboard numbers match the data; charts render on desktop and phone
- [ ] Add / edit / delete invitation (delete warns and removes its RSVP + guests)
- [ ] Changing a table number or allowed guests is reflected on the RSVP page immediately
- [ ] Delete a response → invitation shows *Pending* again
- [ ] Change an additional guest to Approved → *Expected Attendees* increases
- [ ] Edit settings/sections, reorder, hide, upload a hero image, save → home page reflects it
- [ ] *Export RSVP Data* downloads a CSV that opens in Excel/Google Sheets
- [ ] Logout returns to the login page

**Security** — open the browser console on the public site (logged out) and run:

```js
const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
const sb = createClient('YOUR_SUPABASE_URL', 'YOUR_ANON_KEY')
console.log(await sb.from('invitations').select('*'))          // expect an error (permission denied)
console.log(await sb.from('rsvp_responses').select('*'))       // expect an error
console.log(await sb.from('additional_guests').select('*'))    // expect an error
console.log(await sb.from('admin_activity_logs').select('*'))  // expect an error
console.log(await sb.from('invitations').insert({ invitee_name: 'Hacker' }))       // expect an error
console.log(await sb.from('wedding_settings').update({ couple_names: 'x' }).neq('id', '00000000-0000-0000-0000-000000000000')) // expect an error
console.log(await sb.rpc('find_invitation', { search_name: 'Juan' }))  // expect data: [] (no partial matches)
```

Also check **Supabase → Advisors → Security Advisor** shows no RLS warnings for these tables.

---

## 11. Production launch checklist

1. **Remove seed data** (SQL Editor):
   ```sql
   delete from public.invitations where invitation_code like 'sample-%';
   ```
   (Their RSVPs and additional guests are removed automatically.) Confirm with `select count(*) from public.invitations;`.
2. **Add real invitations** — *Admin → Invitations → Add Invitation*. Use each guest's full name exactly as they'll type it; set table and allowed additional guests. Two *active* invitations cannot share the same name — add a detail, e.g. "Maria Santos (Tita)".
3. **Set wedding information** — *Admin → Website Settings*: names, date, texts, church/reception names and map links, information sections.
4. **Upload the final hero image** — *Website Settings → Hero image → Upload image* → *Save changes*. (Landscape, ≥ 2000 px wide, under 10 MB.)
5. **Test an RSVP** end-to-end on a phone with a real invitation, then delete that test response in *Responses*.
6. **Test admin login/logout**, and that sign-ups are disabled in Supabase Auth.
7. **Verify RLS** with the console snippet in [section 10](#10-testing-checklist) and the Supabase Security Advisor.
8. Confirm the GitHub secrets are set and the latest *Actions* run is green; open the live URL in a private window.
9. Share `https://<user>.github.io/<repo>/` (or your domain) with guests.

---

## 12. Project structure

```
├── .github/workflows/deploy.yml    GitHub Pages build & deploy
├── supabase/
│   ├── schema.sql                  tables, RLS, policies, RPCs, triggers, storage, defaults
│   └── seed.sql                    sample invitations (testing only)
├── public/favicon.svg
├── index.html
├── src/
│   ├── App.tsx                     routes (HashRouter), lazy-loaded admin
│   ├── main.tsx, index.css         entry + Tailwind theme (ivory / charcoal / champagne)
│   ├── components/
│   │   ├── wedding/                Hero, Introduction, Venues, InfoSections, RSVPCallout, Footer…
│   │   ├── rsvp/                   SearchForm, InvitationFound, EnvelopeAnimation, RSVPForm, SuccessState
│   │   ├── admin/                  AuthProvider, ProtectedRoute, StatCard, BarChartCard, modals…
│   │   └── ui/                     Button, Modal, ConfirmDialog, fields, Choice cards, Toasts, ResponsiveTable…
│   ├── pages/                      Home, RSVP, AdminLogin, AdminDashboard, AdminInvitations,
│   │                               AdminResponses, AdminGuests, AdminSettings, NotFound
│   ├── layouts/AdminLayout.tsx     sidebar / mobile menu, loads admin data once
│   ├── lib/supabase.ts             Supabase client (anon key only)
│   ├── services/                   invitationService, rsvpService, adminService, settingsService, analyticsService
│   ├── hooks/                      useAuth, useInvitation, useWeddingSettings, useAdminData, useToast
│   ├── types/                      database.ts (row types), wedding.ts, rsvp.ts
│   └── utils/                      validation.ts, formatting.ts, csvExport.ts, errors.ts
├── vite.config.ts, tsconfig*.json, eslint.config.js
├── package.json
├── .env.example
└── .gitignore
```

To regenerate `src/types/database.ts` after changing the schema:

```bash
npx supabase gen types typescript --project-id <project-ref> > src/types/database.ts
```

(then re-add the `Tables` / `TablesInsert` / `TablesUpdate` helper exports at the bottom if the generator's version differs).

---

## 13. Troubleshooting

| Symptom | Fix |
|---|---|
| "Almost ready" page | `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` missing — add to `.env.local` (local) or GitHub secrets (deploy), then rebuild. |
| Home shows "Something went wrong" | `schema.sql` wasn't run, or the URL/key is wrong. Check the browser console (dev mode logs the technical error). |
| Login says "does not have administrator access" | Run the `insert into public.admin_users …` statement for that email. |
| "An active invitation with this name already exists" | Names must be unique among active invitations so search is unambiguous. Add a detail to one name. |
| Hero upload fails | Check the `wedding-assets` bucket exists and is public, and re-run `schema.sql` to (re)create the storage policies. |
| Blank page on GitHub Pages | Make sure *Settings → Pages → Source* is **GitHub Actions** and the workflow succeeded. |
