# Nafil Estates — Mobile

Role-based estate management app (React Native / Expo Router + Supabase), built for a single
client managing multiple communities — residents, security, and admin all share one app,
routed by role.

Part of the `Nafil Estates` workspace — see [`../Nafil Backend`](../Nafil%20Backend) for the
Supabase schema/migrations and [`../Nafil Docs`](../Nafil%20Docs) for planning docs.

## Stack

- Expo (SDK 57) + Expo Router (file-based navigation, role-based route groups)
- Supabase (Postgres + Auth + Row Level Security) as the backend
- TanStack Query for server state, Zustand for client state
- `expo-camera` for QR scanning, `react-native-qrcode-svg` for QR generation

> `.npmrc` sets `legacy-peer-deps=true`. expo-router 57 pulls radix/react-dom peers that
> conflict with the pinned react version; without it, `npm install` fails on ERESOLVE.

## Roles

- **resident** — carry an e-ID card, manage a household allow list, create visitor passes,
  report issues, read announcements
- **security** — scan/check in visitors, verify resident and household e-ID codes, track
  who's on-site, send emergency alerts
- **admin** — approve residents, manage the issue queue, post announcements (estate-scoped)
- **super_admin** — same as admin, across all estates (multi-community client)

Role is stored on `profiles.role` and routing is enforced client-side in
[`app/_layout.tsx`](app/_layout.tsx); real access control lives in Postgres Row Level Security
policies (`../Nafil Backend/supabase/migrations/0001_init.sql`), not in the app.

## Resident onboarding

Signing up does **not** hand a resident an account — it starts a wizard, and the resident
tabs are unreachable until an admin approves them. This wasn't the original design: the
first version let a fresh signup straight into the dashboard, which meant an unapproved,
estate-less resident sat looking at empty Visitors/Issues/Announcements tabs with nothing
to do — RLS was blocking everything, correctly, but the UI never explained why. The current
flow closes that gap:

```
signup → profile-setup (phone, photo) → join-estate (search + unit no.) → pending-approval
                                                                                  │
                                                            admin approves ───────┤
                                                                                  ▼
                                                                          resident dashboard
```

All four screens live under [`app/(onboarding)/`](app/(onboarding)/). `onboarding.tsx` is
not a screen — it's a router: on every mount it checks what's actually true in the database
(does this profile have a phone? does it have a join request, and what status?) and redirects
accordingly. That's what makes the wizard resumable — close the app mid-flow and reopening
lands you back exactly where you left off, not at square one.

The root layout ([`app/_layout.tsx`](app/_layout.tsx)) enforces this **unconditionally**: any
resident with `approved = false` is confined to `(onboarding)`, full stop, regardless of what
route they navigate to. That's the actual fix — not just adding the wizard screens, but making
sure there's no path (typed URL, deep link, stale bookmark) that lands an unapproved resident
in the resident tabs.

### The pending-approval screen isn't a bare "waiting" label

It shows the estate and unit that was actually requested, the submission date, and a
"Check status" button that re-fetches without needing to sign out and back in. If admin
rejects instead of approves, the resident sees that explicitly — with a way to correct the
estate/unit and try again — rather than being left staring at a spinner indefinitely.

### Why a join-request table instead of writing straight to `profiles`

`estate_join_requests` is a separate table, not just `estate_id`/`unit_no` columns a resident
fills in directly, and it has **no UPDATE policy for anyone, including admins** — the only way
a request's status changes is through `approve_join_request()` / `reject_join_request()`
(`Nafil Backend/supabase/migrations/0005_estate_join_requests_and_onboarding.sql`), which are
SECURITY DEFINER functions that check the caller's role internally before touching anything.
So even a compromised or buggy client can never flip a request's status directly.

This mattered more than it might look, because building this surfaced a real hole in the
existing schema: `profiles_update`'s `WITH CHECK` only verified `id = auth.uid()` — meaning
any resident could already self-UPDATE their own `role`, `approved`, or `estate_id` directly
via the REST API, before this feature existed. Adding self-service profile editing (phone,
avatar) without closing that first would have been irresponsible, so migration `0005` also
adds a trigger (`protect_profile_privileged_columns`) that silently preserves those three
columns on any UPDATE not performed by an admin/super_admin — verified with a rolled-back
transaction that a resident update setting `approved = true, role = 'admin'` on their own row
has no effect. Full name, phone, avatar, and unit number remain freely self-editable; those
were never the risk.

### The estate picker searches real rows, not free text

[`components/onboarding/EstatePicker.tsx`](components/onboarding/EstatePicker.tsx) is a
type-ahead over the actual `estates` table (debounced `ilike` search), not a text field. A
resident typing "victoria gardns" and an admin having to guess which real estate they meant
is worse for everyone than picking from an unambiguous row — the join request always
references a real `estate_id`. This required relaxing `estates_select` to let any signed-in
user browse the directory (previously scoped to your own estate only) — not a confidentiality
concern here, since every user of this app belongs to the same client.

### A second RLS gap this surfaced, found by testing live

The admin approval queue initially rendered every applicant as "Unnamed" — `profiles_select`
only let an admin read a profile once `estate_id` matched their own, but `estate_id` is
exactly what's *pending* for an applicant. Chicken-and-egg. Fixed in migration `0006` by
adding a clause: an admin may also read a profile that has a pending join request targeting
their own estate, regardless of that profile's `estate_id`. Re-verified with a rolled-back
transaction that this doesn't over-grant — an admin at a *different* estate still sees nothing.

### Avatars

`components/ui/Avatar.tsx` renders the photo if `avatar_url` is set, otherwise initials on a
tinted background — there's no broken-image or empty-circle state. Upload goes through
[`lib/avatar.ts`](lib/avatar.ts) to a public `avatars` Storage bucket at
`{user_id}/avatar.<ext>`; Storage RLS restricts writes to a user's own folder
(`avatar_insert_own`/`avatar_update_own`/`avatar_delete_own` in migration `0005`). The photo
step is skippable — phone is the only required field, since it's the one piece of contact
info a guard or admin might actually need to reach someone about a visitor or issue.

## Setup

The Supabase project (**"Nafil DB"**, ref `itfepppqjtodmizbglze`, eu-west-1) is already
provisioned, migrations applied, and test data seeded. `.env` is populated and gitignored.

```bash
npm run web       # browser at http://localhost:8081
npm run start     # QR code for Expo Go on a real phone
```

`npm run web` is the quickest way to click through the app — no Xcode or Android Studio
needed. Use your browser's device toolbar (⌥⌘M in Chrome) to view it at phone width.

### What differs on web

| Feature | Web | Phone |
|---|---|---|
| Login, passes, issues, announcements, approvals | ✅ | ✅ |
| QR code **generation** | ✅ | ✅ |
| QR code **scanning** (security) | ➖ manual code entry instead | ✅ camera |
| Sharing a pass | Web Share API, else copies to clipboard | Native share sheet |

Camera scanning needs a real device, so the security screen shows manual code entry on web —
which is the same fallback a guard uses when a visitor's screen is cracked or too dim.
Enter `NAF001` or `NAF002` to check a seeded visitor in.

If you're setting up a fresh machine, recreate `.env` from `.env.example` with the project
URL and publishable key from the Supabase dashboard.

### Auth flow

Six screens under `app/(auth)/`: `login`, `role-select`, `signup`, `staff-access`,
`forgot-password`, `check-email` — plus the branded splash at
[`app/index.tsx`](app/index.tsx) (solid navy field, animated lockup) shown while the
session resolves.

All share [`AuthShell`](components/auth/AuthShell.tsx): white background, centred brand
lockup, left-aligned heading, then the form, the whole block vertically centred in the
viewport rather than top-anchored. Fields are white with a soft shadow rather than a grey
fill — that's what gives the screens their airy feel.

Placeholders double as labels, matching the agreed design. Every field still passes a real
`label` through to `accessibilityLabel`, so screen readers announce it even though it isn't
drawn; `showLabel` renders it visually where a form needs it.

Auth errors render as inline [`Notice`](components/ui/Notice.tsx) banners, **not**
`Alert.alert` — react-native-web doesn't implement Alert, so alert-based errors are
invisible in the browser. Supabase's terse messages are mapped to actionable copy in
[`lib/auth-errors.ts`](lib/auth-errors.ts).

One deliberate omission: on a failed sign-in we say "that email and password don't match"
rather than "no account with that email". Supabase doesn't distinguish the two, and neither
should we — the latter lets anyone enumerate which addresses are registered.

> **Email flows can't be tested with the seeded accounts.** Supabase refuses to send to
> `.test` addresses (a reserved, non-deliverable TLD), so signup confirmation and password
> reset will error with "that email address can't receive mail". Sign-in works fine — it
> sends no mail. To exercise the email flows, sign up with a real address you can access.

### Who can sign up — and who can't

`login` → **Sign up** goes to [`role-select`](app/(auth)/role-select.tsx), not straight to a
form. Only **resident** leads to an actual open signup ([`signup.tsx`](app/(auth)/signup.tsx))
— **security & staff** leads to [`staff-access.tsx`](app/(auth)/staff-access.tsx), which offers
no form of its own, only an entry point into the invite-code flow below.

This is deliberate, not a missing feature. A resident self-declaring where they live is
low-risk and admin-checkable against the unit register after the fact. A stranger
self-declaring "I'm security" is not — if an admin approves that claim on trust, they've
handed a stranger live gate-verification access before any real vetting happened. So:

- **Resident** — self-signup, pending admin approval (as built).
- **Security/staff** — provisioned by their employer via an access code, not self-registered
  (see "Staff invite flow" below).
- **Admin** — never self-serve, and not on the role-select screen at all. The first admin is
  bootstrapped directly against the database (see "Creating accounts from scratch" below);
  every admin after that is created by an existing admin.

### Social sign-in

One provider — **Google only**, per product decision; no Facebook/Twitter. The button is
built and wired but **disabled by default** (`GOOGLE_OAUTH_ENABLED = false` in
[`constants/auth-config.ts`](constants/auth-config.ts)). Tapping it shows "Google sign-in
isn't set up yet" rather than attempting it.

That gate is a declared flag, not a runtime check, and it has to be. `signInWithOAuth` with
`skipBrowserRedirect` builds the authorize URL **client-side with no server call**, so the
app genuinely cannot tell an enabled provider from a disabled one — the failure only
surfaces after navigating, as a raw JSON error page with no route back into the app. Ask
first, navigate second.

To enable it:

1. Supabase dashboard → Authentication → Providers → Google → enable, paste the OAuth
   client ID/secret from Google Cloud Console.
2. Add `https://itfepppqjtodmizbglze.supabase.co/auth/v1/callback` as an authorised redirect
   URI in the Google Cloud OAuth client.
3. Flip `GOOGLE_OAUTH_ENABLED` to `true`.

### Password reset landing

[`set-password.tsx`](app/(auth)/set-password.tsx) is where a password-reset link lands —
Supabase hands the app a valid session, and this screen just asks for a new password. Three
states: checking the link, the form, or "this link has expired" if no session shows up
within 3.5 seconds.

(Staff invites do **not** use this screen or a magic link at all — see "Staff invite flow"
below for why an access code turned out to be the better fit, and how confirmation gets
handled without one.)

**Web** relies on `detectSessionInUrl: true` ([`lib/supabase.ts`](lib/supabase.ts)) — the
Supabase client auto-parses the token from the URL when the page loads from the emailed
link. **Native** has no such URL to auto-parse; a tapped email link arrives as a raw string
via `Linking`, so [`lib/auth-session.ts`](lib/auth-session.ts)'s `establishSessionFromUrl`
extracts the tokens by hand (same logic Google OAuth already needed on native — factored out
of [`lib/oauth.ts`](lib/oauth.ts) rather than duplicated).

The root layout carves out an explicit exception for this one route
(`AUTH_GROUP_EXCEPTIONS` in [`app/_layout.tsx`](app/_layout.tsx)): normally any session
inside the `(auth)` group gets redirected straight to the user's role home, which would
otherwise fire the instant a reset/invite link establishes a session — before they'd had a
chance to actually set a password.

**Verified end-to-end**, not just rendered: logged in, submitted a real password change
through the screen, signed out, and logged back in with the *new* password to confirm
`supabase.auth.updateUser` actually took effect — then reverted the seeded account's
password back to `NafilTest123!` afterward so the credentials table above stays accurate.
What's *not* verified is a real emailed link on either platform, since the seeded accounts'
`@nafil.test` addresses can't receive mail (see above) — the "ready" and "invalid" states
were exercised directly (an active session, and no session, respectively) rather than via
an actual link click.

> ⚠️ **Needs a Supabase dashboard step before it works with a real email.** The redirect
> URLs this screen relies on —
> `https://itfepppqjtodmizbglze.supabase.co` origin paths for web and
> `nafil-estates://set-password` for native — must be added to
> **Authentication → URL Configuration → Redirect URLs** in the dashboard, or Supabase
> silently falls back to the project's default Site URL instead of `/set-password`. Not
> something available via this session's tooling; needs doing by hand.

### Staff invite flow

An admin taps **+ Invite staff** on the Residents screen
([`components/admin/InviteStaffForm.tsx`](components/admin/InviteStaffForm.tsx)), enters an
email, and gets back an 8-character code good for 7 days — shared through whatever channel
the admin already uses (WhatsApp, SMS, in person), the same way visitor pass codes are shared.
No email gets sent automatically; that would need a real email provider and a backend
endpoint, neither of which exist yet. This isn't a stopgap so much as the same cost/complexity
tradeoff made for visitor passes earlier in the project — manual sharing over automated
messaging.

The staff member enters that code at **Security & Staff → I have an invite code**, which
opens [`staff-invite.tsx`](app/(auth)/staff-invite.tsx) — one screen, three internal steps
(code → profile → password), not three routes. That's deliberate: **this project requires
email confirmation before a session exists** (confirmed empirically — `signUp` never returns
a session immediately), so no account exists until the very last step, and there's nowhere
for inter-screen navigation state to safely live in the meantime.

That confirmation requirement is also why the profile step (first name, last name, phone,
photo) happens **before** the account does. There's no user id yet to attach a profile to, so
those details get saved onto the invite row itself
(`save_staff_invite_profile`, callable while signed out) — including the photo, which
uploads to a special `pending/{code}/avatar.<ext>` Storage path scoped to anon by a narrow
policy checking the code has a live pending invite. Everything gets copied onto the real
profile only once an actual session exists.

That happens automatically, not via a dedicated confirmation-landing screen. The onboarding
router ([`app/(onboarding)/onboarding.tsx`](app/(onboarding)/onboarding.tsx)) calls
`accept_staff_invite_by_email()` as the very first thing it does, before any resident-wizard
logic — matching by the caller's own verified email rather than the code, since the code's
job ended at the profile step and threading it through the confirmation-email redirect
afterward would be one more fragile hop. It's a harmless no-op for every genuine resident,
who has no matching invite. Whether that first real session comes from clicking the
confirmation link directly or from a completely ordinary later login (confirm on one device,
log in on another — both work identically), the same router call finalizes it: sets
`role`/`estate_id`/`approved` and copies over the saved name/phone/photo, in one atomic
server-side step.

Making that self-elevation possible required deliberately punching one hole in the
self-escalation protection described earlier (under "Why a join-request table") —
`accept_staff_invite_by_email()` runs as the
invitee themselves, whose own role is still `resident` at that moment. A transaction-local
GUC flag lets that one function announce "this specific update is sanctioned" without
weakening the trigger for anyone else. **Testing this took two tries**: the first version
left the flag set for the rest of whatever transaction was open, which a SQL-editor test
happened to catch because it ran several calls in one shared transaction (PostgREST wouldn't
have — one transaction per request — but relying on that alone felt like the wrong place to
stop). The function now turns the flag back off immediately after the one UPDATE it's meant
to guard, re-verified with a harsher test than any real request could produce: a direct
self-escalation attempt checked in the *same* transaction as a legitimate accept, right after
it, and still blocked.

**Verified end-to-end for real**, not just at the SQL level: created a live invite through
the admin form, walked the full code → profile → password flow through the actual app,
confirmed the resulting account's email via SQL (standing in for clicking the real link,
since the seeded/test addresses used here can't receive mail), then logged in through the
ordinary login screen and landed directly in the security dashboard — with `role`,
`estate_id`, `full_name`, and `phone` all correctly populated from what was entered during
the anonymous steps.

Not yet built: automatic email *delivery* of the invite. The code has to be shared manually
today (see above) — sending it would need a real email provider and a backend endpoint,
neither of which exist yet.

### Theming

`ThemeProvider` ([`context/theme-context.tsx`](context/theme-context.tsx)) resolves tokens;
the mode itself lives in a persisted zustand store
([`store/theme-store.ts`](store/theme-store.ts)) and **defaults to `light`**, not `system` —
the brand is designed light-first, so following the OS would mean the client's first launch
looks different depending on their phone settings. `system` and `dark` remain selectable via
`setMode`.

Elevation tokens are declared per-platform: web gets `boxShadow`, native gets the
`shadow*` props plus `elevation`. react-native-web deprecated the shadow props and warns on
every render otherwise.

### Test accounts

Test data is **already seeded**. Password for every account: `NafilTest123!`

| Email | Role | Who | Sees |
|---|---|---|---|
| `resident@nafil.test` | resident | Amaka Obi, unit B12 | Own 2 passes, own 2 issues, 3 announcements |
| `resident2@nafil.test` | resident | Tunde Bakare, unit A04 | Own passes/issues only |
| `security@nafil.test` | security | Musa Danjuma | All estate passes + gate logs, **no issues** |
| `admin@nafil.test` | admin | Chidinma Eze | Estate residents, issue queue, announcements, **onboarding queue** |
| `superadmin@nafil.test` | super_admin | Ibrahim Yusuf | **Both** estates |
| `pending@nafil.test` | resident | Ngozi Okafor | Profile complete, pending request → `pending-approval` |
| `heights@nafil.test` | resident | Fatima Bello (Estate B) | Only Nafil Heights — proves isolation |
| `newresident@nafil.test` | resident | Blessing Chukwu | No phone, no request → lands on `profile-setup` |
| `rejected@nafil.test` | resident | Kelechi Uba | Last request declined → `join-estate` with a notice |

Two estates are seeded: **Nafil Gardens** (Lagos) and **Nafil Heights** (Abuja).

Worth trying, since it's what the whole design rests on: sign in as `security@nafil.test`
and note the Issues tab is empty — security is estate-scoped but *not* issue-scoped. Then
sign in as `heights@nafil.test` and note you see one announcement, not Nafil Gardens' three.

For the onboarding flow specifically: sign in as `newresident@nafil.test` and walk the whole
wizard start to finish, then sign in as `admin@nafil.test` and approve the request you just
created — the resident lands in the real dashboard on their very next sign-in, no further
action needed. `pending@nafil.test` and `rejected@nafil.test` let you check either
in-progress state without walking the wizard yourself.

To reset or re-seed, re-run [`../Nafil Backend/supabase/seed.sql`](../Nafil%20Backend/supabase/seed.sql) —
it cleans up its own rows first, so it's safe to run repeatedly.

### Creating accounts from scratch

If you drop the seed, bootstrap manually: create an estate, sign up through the app (the
`handle_new_user` trigger creates the `profiles` row — unapproved, `resident`, no estate),
then promote it:

```sql
update profiles
   set estate_id = (select id from estates limit 1),
       role = 'admin',
       approved = true
 where id = '<the-user-uuid>';
```

## Structure

```
app/
  _layout.tsx          # providers + role-based redirect
  index.tsx             # branded splash, redirects by role once session resolves
  (auth)/
    login.tsx
    role-select.tsx     # "sign up as" fork: resident vs security & staff
    signup.tsx           # resident only
    staff-access.tsx     # entry point into the invite-code flow, no form of its own
    staff-invite.tsx      # code → profile → password, one screen/three steps
    forgot-password.tsx
    check-email.tsx
    set-password.tsx     # lands password-reset links only (not staff invites)
  (onboarding)/
    onboarding.tsx       # router: staff-invite finalize → resident wizard step
    profile-setup.tsx
    join-estate.tsx
    pending-approval.tsx
  resident/             # resident tab group (Home, ID Card, Visitors, Issues, Announcements)
  security/             # security tab group
  admin/                # admin tab group (also used by super_admin for now)
components/
  admin/
    InviteStaffForm.tsx  # generates a code, share sheet
  auth/                 # AuthShell, RoleCard, SocialAuthRow (Google), icons
  onboarding/
    EstatePicker.tsx     # type-ahead over the estates directory
  resident/
    AddHouseholdMemberForm.tsx  # create → optional photo, mirrors InviteStaffForm's shape
  ui/                   # themed primitives: Button, Input, Card, Avatar, Notice
    IDCardView.tsx       # shared e-ID card: photo, name, subtitle, estate, QR + code
  AnnouncementsFeed.tsx
  SignOutButton.tsx
context/
  theme-context.tsx     # resolves light/dark → token set, exposes useTheme()
store/
  auth-store.ts         # Zustand: session + profile
  theme-store.ts        # Zustand + AsyncStorage: persisted theme mode, defaults to light
constants/
  colors.ts             # brand palette (#084DA5), light + dark token sets
  theme.ts              # spacing, radius, typography, elevation
  auth-config.ts         # GOOGLE_OAUTH_ENABLED flag
lib/
  supabase.ts           # Supabase client (detectSessionInUrl: web only)
  auth-errors.ts         # maps Supabase error text → user-facing copy
  auth-session.ts         # redirect URL builder + native token-from-URL parsing
  oauth.ts               # Google sign-in (web + native)
  validation.ts           # email/password/confirmation validators
  avatar.ts               # photo picker + upload (own account, and pending-invite variant)
  staff-invite.ts         # thin RPC wrappers for the invite-code flow
  share-text.ts           # OS share sheet / clipboard fallback, generic
  share-pass.ts           # visitor pass share message (built on share-text)
  share-staff-invite.ts   # invite code share message (built on share-text)
  share-id-card.ts        # household member card share message (built on share-text)
types/database.ts       # types mirroring the Postgres schema
```

Schema + RLS policies live in `../Nafil Backend/supabase/migrations/`.

## Theme

Primary is `#084DA5`. Components read tokens via `useTheme()` rather than hardcoding hex, so
dark mode and any rebrand are a single-file change in `constants/colors.ts`.

```tsx
const { colors, spacing, typography } = useTheme();
<View style={{ backgroundColor: colors.background, padding: spacing.xl }} />
```

Theme mode (`light` / `dark` / `system`) persists via `useThemeStore` — **defaults to
`light`**, not `system`. The brand is designed light-first; following the OS would mean
the client's first launch looks different depending on their phone's setting. `setMode`
still switches to `dark`/`system` on request.

## State management

| Concern | Tool |
|---|---|
| Server data (passes, issues, announcements) | TanStack Query |
| Session + profile | Zustand (`store/auth-store.ts`) |
| Theme preference | Zustand + AsyncStorage persist |

Don't put server data in Zustand — if it comes from Postgres, it belongs in Query.

## Resident e-ID cards & household allow list

A fifth resident tab, ID Card ([`app/resident/id-card.tsx`](app/resident/id-card.tsx)), gives
every resident a permanent, revocable credential instead of forcing everything through a
single-use visitor pass — useful for the resident's own identity, and for people who come
constantly (spouse, kids, a live-in nanny, a regular driver) who shouldn't need a fresh code
generated for them every day.

Two standing credentials, both random 6-character codes (same shape as an existing visitor
pass code):

- `profiles.resident_code` — the resident's own e-ID. Backfilled for every existing profile by
  the migration's column default; new profiles get one the same way. Self-service regenerate
  (`regenerate_resident_code()` RPC, behind a `ConfirmDialog`) lets a resident invalidate a
  leaked or over-shared code without an admin in the loop — the same self-service spirit as
  revoking a visitor pass.
- `household_members` — the resident's allow list. Each entry (name, relationship, optional
  phone/photo) gets its own code and card, added via
  [`AddHouseholdMemberForm`](components/resident/AddHouseholdMemberForm.tsx) and revoked (not
  deleted — kept for the record) the same way a visitor pass is cancelled.

Both render through the same [`IDCardView`](components/ui/IDCardView.tsx): photo, name, a
subtitle line (unit no. for the resident, relationship for a household member), the estate
name, and a QR encoding the code.

**The actual anti-forgery property, and why this isn't just a fancy photo ID:** the printed
name and photo are for the security guard's own eyes — they are never what's actually
checked. What's checked is the code the QR encodes, looked up against the estate's live
database at the gate. A forged card — a copied photo, a made-up code, or a genuinely revoked
one — fails that lookup exactly the way a forged or expired visitor pass code already does.
The card is a convenience for carrying the code; the database is the source of truth.

### Security's scan flow now checks three credential types

[`app/security/index.tsx`](app/security/index.tsx)'s `checkInByCode` tries, in order:
`profiles.resident_code`, then `household_members.code`, then falls back to the existing
`visitor_passes.code` check-in flow unchanged. The first two are **verify-only** — no
`visitor_logs` row gets written. That was a deliberate scope cut, not an oversight: writing
one would mean every resident coming home shows up in the "Active visitors" screen
([`app/security/active.tsx`](app/security/active.tsx)) expecting a checkout action, which
conflates two different concerns (verifying an identity vs. logging a visitor's stay). A
resident/household match just shows a pass/fail message; a visitor pass match still logs and
tracks on-site status as before.

RLS-wise, `household_members` mirrors the existing `visitor_passes` shape exactly: the
resident owns their list end-to-end (`household_members_resident_all`), while
security/admin/super_admin get read-only `SELECT` within their estate
(`household_members_staff_select`) — enough to verify a code, not to revoke one themselves.
Verified directly against Postgres (impersonating the security role in a rolled-back
transaction): the lookup succeeds, and an attempted `UPDATE` from that same role is silently
blocked by RLS, exactly as intended.

**Known limitation carried over from the existing gap:** `app/security/index.tsx` still uses
`Alert.alert` for its result messages, which — as documented above — is a no-op on web. The
resident-side UI (ID card, add/revoke, ConfirmDialog) uses `Notice`/`ConfirmDialog` and is
fully verified visually in the browser; the security-side scan result for these two new
credential types was verified by replicating security's exact query directly against
Postgres rather than by screenshot, for the same reason the existing visitor-pass alerts on
that screen aren't visually verifiable on web either.

## Resident dashboard

Four tabs under `app/resident/`: Home, Visitors, Issues, Announcements. Home
(`app/resident/index.tsx`) is a real dashboard, not a placeholder — avatar/name/unit header,
two stat tiles (active passes, open issues), two quick-action buttons, and the latest
announcement. All four tabs share a small component library under `components/ui/`:
`StatusBadge` (colored pill for pass/issue/invite status), `EmptyState` (icon + title +
message for empty lists), `StatCard` (tappable stat tile), and `icons.tsx` (simple line
icons — no icon font dependency).

### Visitor pass expiry wasn't actually enforced

`visitor_passes.status` only flips to `'expired'` via a scheduled job
(`expire_stale_visitor_passes`) that was scaffolded in the old FastAPI backend but never
deployed here — so a pass past its `valid_until` still reads `status = 'pending'` in the
database. That gap had a real security consequence, not just a cosmetic one:
[`app/security/index.tsx`](app/security/index.tsx)'s `checkInByCode` originally only checked
`status !== 'pending'` before letting a visitor in, meaning an expired pass could still be
scanned and accepted at the gate hours or days after it lapsed. Fixed by adding explicit
`valid_from`/`valid_until` window checks directly in the check-in flow — the correct
enforcement point regardless of whether the cron job ever gets deployed.

The same `status`-alone-isn't-enough gap showed up twice more, both fixed client-side:

- The resident dashboard's "active passes" count now excludes lapsed-but-still-`pending`
  passes (`.gt('valid_until', new Date().toISOString())`), so the number stays honest.
- The Visitors tab computes an `isLapsed` flag per pass rather than trusting `status`, and
  shows an "EXPIRED" badge (hiding the Share/Cancel actions) instead of a contradictory
  "PENDING · Expired 2d ago".

### `Alert.alert` is a no-op on web

Discovered while building the "cancel pass" confirmation: `react-native-web`'s `Alert` is
`class Alert { static alert() {} }` — no `window.confirm` fallback, nothing. Any code path
that depends on `Alert.alert` (a confirmation, an error message) is silently unreachable in
the browser, with no error thrown to hint why.

Fixed with two patterns, both already used elsewhere in the app and now extended here:

- **Destructive confirmations** → [`components/ui/ConfirmDialog.tsx`](components/ui/ConfirmDialog.tsx),
  built for this. Uses RN's `Modal`, which — unlike `Alert` — actually renders on web (via
  `createPortal`). Used by the Visitors tab's "Cancel pass" flow (`pendingRevoke` state holds
  the pass awaiting confirmation).
- **Error/success messages** → the existing inline [`Notice`](components/ui/Notice.tsx)
  banner pattern, already used in the auth screens. Replaced the `Alert.alert` calls in
  `visitor-pass.tsx` (create/revoke errors) and `issues.tsx` (submit errors).

**Not yet fixed**: `app/admin/index.tsx` and `app/security/index.tsx` still call
`Alert.alert` for their error/success messages — functional on native, silently broken on
web. Flagged as a follow-up, out of scope for the resident-tabs work this covers.

## What's next (not in this MVP scaffold)

- Phase 2: billing/dues + payment gateway (Paystack/Flutterwave), amenities booking
- Phase 3: utility (electricity) vending, marketplace, analytics/reporting
- Push notifications for announcements/emergency alerts (Expo push tokens)
- Estate switcher UI for `super_admin`
- Photo upload for issue reports (Supabase Storage)
