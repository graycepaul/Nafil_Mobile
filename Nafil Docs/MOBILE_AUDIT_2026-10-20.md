# Nafil Mobile audit, 2026-10-20

Scope: `Nafil Mobile` at the current working tree (includes uncommitted edits in
signup, role-select, household-invite, access-revoked, HouseholdAccessSection,
share-household-invite). App version 1.0.5, Expo SDK 57.

Method: typecheck, lint and tests run; every screen and lib file read except the
ones listed under "Coverage gaps"; server-side claims checked read-only against
the production VPS database and the backend migrations. Nothing was changed.

Baseline: `tsc --noEmit` clean, `eslint` clean, `jest` 11 tests pass (2 suites,
covering only `format` and `share-pass`).

Status key: **Confirmed** (seen in code and, where noted, in live data),
**Verify on device** (follows from the code but needs a phone to be certain).

Fix type key: **JS** = ships over EAS Update (runtimeVersion policy is
`appVersion`, so an update only reaches builds of the same version), **Build** =
needs a new store build, **Backend** = migration or API change, **Infra** = server
config.

---

## Summary

| Severity | Count |
|---|---|
| High | 6 |
| Medium | 18 |
| Low | 20 |

Most urgent: H1 (a revoked household member exists in production right now and
would verify as a resident at the gate), H2 (gate check-in can double-admit and
silently skip the audit log), H5 (password reset is broken for every user).

---

## High

### H1. Revoked household members still verify as residents at the gate
- **Where:** `app/security/index.tsx:56-90` (resident lookup), migration `0056_household_access.sql`.
- **What:** The scan looks up `profiles` by `resident_code` with only `role = 'resident'` and the estate. Revoking a household member sets `household_access_level = 'revoked'` but leaves them `approved`, `role = 'resident'` and with their code. They get "Resident verified" and a visitor log entry.
- **Evidence:** Production has 1 household profile and it is revoked (read-only query).
- **Fix:** In the scan query exclude `household_access_level = 'revoked'` (and `approved = false`). Better: also null the `resident_code` on revoke in a migration so an old card cannot work anywhere.
- **Type:** JS + Backend. **Status:** Confirmed.

### H2. Visitor pass check-in is not atomic and ignores failures
- **Where:** `app/security/index.tsx:209-239`.
- **What:** The pass is read, then updated to `used` with `.eq('id')` only, then a log row is inserted. The update does not check that a row changed. RLS (`visitor_passes_update` requires `status = 'pending'`) makes a lost race update 0 rows with no error, so the guard still sees "Checked in" and a duplicate log row is written. Same for a pass the resident revokes mid-scan. The log insert errors are also ignored on all three branches (resident, household, pass), so a failed insert still shows success and leaves no audit trail.
- **Fix:** Use `.update(...).eq('id').eq('status','pending').select('id')` and require exactly one row. Check the log insert result and show an error. Ideally move the whole check-in into one RPC (pass update plus log in one transaction, validity window enforced server-side).
- **Type:** JS (+ Backend for the RPC). **Status:** Confirmed.

### H3. Staff invite can be taken over by anyone who knows the invited email
- **Where:** `app/(onboarding)/onboarding.tsx:36`, `lib/staff-invite.ts:57`, migration `0061` comment.
- **What:** Staff acceptance matches on the session email only, and the auth server auto-confirms sign-ups, so the email is unverified. Migration 0061 narrowed this to a 24 hour window after the real invitee saves their profile but states that closing it fully needs a client release that binds acceptance to the invite code (as household invites already do).
- **Fix:** Add an `accept_staff_invite(code)` RPC and call it from the staff invite flow right after sign-up; stop using the email-only path.
- **Type:** JS + Backend. **Status:** Confirmed (documented as a known residual risk).

### H4. No server-side limits on money amounts
- **Where:** Database (`transfers`, `dues`, `wallet_transactions`, `orders`, `listings`).
- **What:** The only CHECK constraint on those tables is on `scheduled_visits.status`. Amounts of 0 or negative are accepted by the database. The app prevents negatives in its keypad inputs, but anyone calling the API directly is not stopped, and the wallet top-up screen can submit 0 (see M12).
- **Fix:** Migration adding `CHECK (amount > 0)` (and sensible maximums) on those columns, after checking existing rows.
- **Type:** Backend. **Status:** Confirmed (constraints listed from the live database). Exploitability of negative values through the confirm RPCs not tested.

### H5. Password reset does not work for anyone, and the app shows `{}`
- **Where:** `~/supabase/docker/.env` on the VPS (`SMTP_HOST=supabase-mail`, sender `fake_sender`); `app/(auth)/forgot-password.tsx`, `lib/auth-errors.ts`.
- **What:** No mail server is configured, so every reset request returns a 500 ("Error sending recovery email"). The app has no friendly mapping for this and showed an error box containing `{}`. Email confirmation is also dead, hidden only because sign-ups auto-confirm.
- **Fix:** Configure SMTP (Resend, Postmark or SES) in the Supabase stack and restart `auth`; map 500/unknown auth errors to a clear message in the app.
- **Type:** Infra + JS. **Status:** Confirmed.

### H6. "Assign to all residents" charges dependants too
- **Where:** `app/admin/dues-new.tsx:63-77, 106-116`.
- **What:** The recipient list is every `approved` profile with `role = 'resident'`. Household members (dependants) are exactly that, so a household of four is billed four times for one unit. There is also no confirmation step before bulk-charging an entire estate.
- **Fix:** Exclude profiles with a `household_access_level`; add a confirm dialog showing count and total.
- **Type:** JS. **Status:** Confirmed in code (production currently has only 1 household profile, so no duplicate dues exist yet).

---

## Medium

### M1. The QR scanner can lock up until the screen is reopened
`app/security/index.tsx:32-46, 310-315`. The scan lock is only released when a result dialog is closed. If `checkInByCode` returns early (`processing` already true, or no estate) or throws (there is no try/finally), no dialog appears and `scanLockRef`/`processing` stay set. **Fix:** wrap in try/finally and always release; surface an error result. **JS. Confirmed.**

### M2. Residents and household members pile up in "Active visitors"
`app/security/index.tsx:65-75, 137-146`, `app/security/active.tsx`. Resident and household scans insert a `visitor_logs` row with no checkout, and "Active visitors" lists every row with `checked_out_at is null`, so they stay on-site forever until a guard manually checks each out. **Fix:** do not write open logs for standing credentials (or log them as already checked out / a separate event type). **JS (+ Backend if log type changes). Confirmed.**

### M3. Scan result dialog may render off-screen on small phones
`app/security/index.tsx:325-328` and `components/ui/Overlay.tsx`. `Overlay` is an absolute view sized to its nearest positioned parent; `ScanResultModal` is rendered inside the `ScrollView`, so it is sized to the scroll content, not the viewport. If the content is taller than the screen, the centered dialog can sit below the fold while scanning is paused. **Fix:** render the modal outside the ScrollView. **JS. Verify on device.**

### M4. Signing out does not stop push notifications or clear cached data
`store/auth-store.ts:98-101`, `lib/push-notifications.ts`. Sign-out never removes the device's row in `push_tokens`, so the phone keeps receiving the previous user's notifications (including emergency alerts) until someone else signs in. The React Query cache is not cleared either, so the next account on the device briefly sees cached lists that are not keyed by profile id (announcements, listings, visitor logs). **Fix:** call an unregister RPC before sign-out; `queryClient.clear()` on sign-out. **JS + Backend (RPC). Confirmed.**

### M5. Pending residents never get the "approved/rejected" push
`app/_layout.tsx:123-139`. Push registration requires `estate_id`, which a pending resident does not have until approval, so no token exists when the approval or rejection notification is sent. They must open the app and tap "Check status". **Fix:** register for push once signed in (a null-estate token is harmless; the server can already target by profile). **JS. Confirmed.**

### M6. A failed profile fetch leaves the app stuck; auth callback can deadlock
`store/auth-store.ts:18-21, 39-42`. `fetchProfile` swallows errors and returns null, so with a valid session but a flaky network the root layout waits on `profile` forever with no retry or message. Separately, `onAuthStateChange` awaits another Supabase call inside its callback, which Supabase documents as a deadlock risk. **Fix:** retry/show an error state; defer the fetch out of the callback (`setTimeout` / separate effect). **JS. Confirmed (deadlock is documented behavior, not reproduced).**

### M7. Delete account problems
`app/settings.tsx:46-64`. (a) On failure the error is set, then the user is signed out anyway, so the message is never seen. (b) `super_admin` can self-delete, leaving an estate with no owner (NAF Valley Estates already has none). (c) A revoked household member cannot reach Settings (they are pinned to `access-revoked`), so they have no way to delete their account, which is an App Store account-deletion expectation. **Fix:** keep the user signed in on a real failure; block or require transfer for estate owners; add delete to the revoked screen. **JS + Backend. Confirmed.**

### M8. Android back button does not close dialogs
`components/ui/Overlay.tsx` (no `BackHandler` anywhere in the app). Pressing back with a confirm dialog or sheet open navigates away or exits instead of closing it. Overlays also do not mark themselves modal for screen readers. **Fix:** BackHandler in `Overlay`; `accessibilityViewIsModal`. **JS. Confirmed.**

### M9. Profile and avatar photo upload is broken on the web build
`lib/avatar.ts:60-64, 76-81, 96-104, 117-124`. The storage path extension is taken from the URI. On web the picker returns `blob:`/`data:` URIs with no extension, producing an invalid path. The other upload helpers already derive it from the mime type. **Fix:** same approach as `listing-photos.ts`. **JS. Confirmed.**

### M10. Auth deep link can sign the user into an attacker's session
`app/_layout.tsx:80-98`, `lib/auth-session.ts:81-84`. Any `nafil-estates://...` link containing `access_token=` and `refresh_token=` is applied via `setSession`. A crafted link (web page, message) can log the victim into an attacker-controlled account, which then receives whatever they enter. **Fix:** only accept links of the expected shape (path `set-password`, `type=recovery|invite`), prefer PKCE/`verifyOtp`, and confirm with the user before replacing an existing session. **JS. Confirmed (needs a valid attacker token, so impact is login-CSRF, not account takeover).**

### M11. Marketplace order flow gaps
`components/resident/MarketplaceCheckoutFlow.tsx`, `app/resident/marketplace-listing.tsx`, `app/resident/store.tsx`, migration `0022`. (a) Placing an order reserves a good immediately ("sold") with no payment proof, and there is no way for buyer or seller to cancel the order, so a non-paying buyer locks the item until the seller manually relists. The migration's "if a transfer is rejected the listing goes back to active" does not apply to marketplace orders, which bypass `transfers`. (b) The service-listing WhatsApp link uses the raw typed number (`marketplace-listing.tsx:108`) instead of `normalizePhoneForWhatsApp`, so local-format numbers produce a dead link. (c) `MarketplaceCheckoutFlow.tsx:160-164` falls back to an empty account number if payout details are missing. **JS + Backend (cancel). Confirmed.**

### M12. Wallet top-up accepts an empty or zero amount
`app/resident/wallet.tsx:209-232`, `components/resident/PaymentMethodSheet.tsx:207`. The amount comes from free text; empty becomes 0 and the sheet's confirm button does not check `amount > 0`, so a ₦0 transfer record can be created (see H4). No minimum or maximum. **Fix:** validate in the sheet and on the form. **JS. Confirmed.**

### M13. Bank account numbers are not validated
`app/admin/payment-settings.tsx:97-100, 241`, `app/resident/marketplace-new.tsx:121, 448`. Digits only, but any length. A typo sends money to the wrong account. **Fix:** require 10 digits (NUBAN) and show the resolved bank/name if a lookup is added later. **JS. Confirmed.**

### M14. Emergency alerts send with no confirmation
`app/admin/announcements.tsx:142-238`. One tap on "Send emergency alert" pushes to every resident's phone (priority channel, can bypass Do Not Disturb). There is no "are you sure" step and no undo. **Fix:** confirm dialog stating the audience size. **JS. Confirmed.**

### M15. Data does not refresh on app resume or reconnect
`app/_layout.tsx:30` (`new QueryClient()` with defaults). React Query is not wired to AppState or network state (no `focusManager`/`onlineManager`), so on native nothing refetches when the app returns to the foreground or the connection comes back, and offline requests retry through the default backoff with no offline indicator. Relevant on unreliable mobile data. **Fix:** wire `focusManager` to AppState and `onlineManager` to NetInfo; sensible `staleTime`. **Build (NetInfo is a native module) or JS-only with AppState alone. Confirmed.**

### M16. The new `dev_admin` role crashes the mobile app if it ever signs in
`types/database.ts:1`, `app/_layout.tsx:32-38, 300-301`, `components/EmergencyAlertModal.tsx:12`. `ROLE_HOME[profile.role]` is undefined for `dev_admin`, then `.slice(1)` throws. **Fix:** add the role, route it to a "use the web dashboard" screen. **JS. Confirmed.**

### M17. Copy promises emails that are never sent
`app/(auth)/check-email.tsx`, `app/(auth)/staff-invite.tsx:150-161, 270`, `components/admin/InviteStaffForm.tsx:133`. "We've sent a confirmation link", "Your estate admin sent this to your email" and a "Send invite" button, but no email is sent (accounts auto-confirm; invites are code-share only). **Fix:** make copy match reality (or send real email once SMTP exists). **JS. Confirmed.**

### M18. Almost no automated test coverage
2 test files (11 tests) cover `format` and `share-pass` only. None of the money, gate, auth or invite logic is tested. **Fix:** tests for the scan decision logic, phone normalization, validation, notification routing, and the invite flows (extract pure functions first). **JS. Confirmed.**

---

## Low

- **L1.** `app/(auth)/login.tsx:68` uses the email keyboard for a field that also takes phone numbers (dependants log in with phone), so digits and `+` are awkward on iOS. Use a default keyboard.
- **L2.** Raw database error text is shown to users in `join-estate.tsx:121`, `InviteStaffForm.tsx:82`, `marketplace-new.tsx:205`, `resident/issues.tsx:140`, `admin/announcements.tsx:153,174`, upload helpers' `err.message`. Route through `friendlyDbError`.
- **L3.** Leftover debug logging: `components/auth/SocialAuthRow.tsx:31,34`; `lib/oauth.ts:78,84,93` logs the whole Apple credential object when the token is missing.
- **L4.** Phone numbers are stored in whatever shape was typed (`profile-setup`, `staff-invite`, `AddHouseholdMemberForm`, visitor passes) while invites and login use normalized `+234...`. Normalize on write.
- **L5.** `lib/phone.ts` turns `+234 (0)803...` into an invalid number (trunk 0 not stripped after a `+234` prefix).
- **L6.** `join-estate.tsx`: the submit button is disabled until valid, so the inline validation messages never show; a failed submit leaves the uploaded ID photo orphaned in storage and each retry uploads again.
- **L7.** `components/ui/Toast.tsx:43-47`: the dismiss timer depends on `onDismiss`, which callers pass inline, so it restarts on every parent render.
- **L8.** `components/ui/RemoteImage.tsx`: load status is not reset when `uri` changes, so after one failed load a new valid URL can stay stuck on the placeholder.
- **L9.** Several lists are unbounded, and PostgREST silently caps at 1000 rows (residents, transfers, dues, join requests); notifications are capped at 50 with no paging.
- **L10.** `app/admin/staff.tsx`: invites past `expires_at` still appear as "Pending".
- **L11.** `AddHouseholdMemberForm.tsx:123-126` ignores a failed avatar update, recreating the "member with no photo" state the form was built to prevent.
- **L12.** Stale comments claim the visitor-pass expiry job is not deployed (`resident/index.tsx`, `visitor-pass.tsx`, `security/index.tsx`); it is deployed and working (2 passes expired in production).
- **L13.** `ScheduleVisitForm.tsx`: native time picker has no minimum, so a past time today can be scheduled; web time has no minimum either.
- **L14.** `app/admin/financials.tsx:83`: if the RPC errors or returns no rows, the screen shows skeletons forever with no message.
- **L15.** `app/_layout.tsx`: tapping a push while the app is fully closed does not route (only the warm-start listener exists, no last-notification-response check).
- **L16.** `lib/api.ts`: no request timeout; a stalled connection hangs the action indefinitely.
- **L17.** Admin dashboard resident count and "All residents" list include household members, including revoked ones.
- **L18.** `profiles_select` lets admin, security and finance in an estate read every resident's `resident_code` (the gate credential); finance has no need for it.
- **L19.** `app/(auth)/set-password.tsx:63-65`: a 3.5 second timer can flash "This link has expired" on a slow connection before the session arrives (it recovers, but the flash is alarming).
- **L20.** Accessibility: icon-only Pressables lack labels in several screens, overlays do not trap focus, radio groups use `checkbox` role in `join-estate.tsx`.

---

## Checked and fine

- Secrets: `credentials.json` and the Firebase admin key are git-ignored and were never committed; `google-services.json` is public config.
- Supabase session storage uses SecureStore with chunking; refresh is tied to AppState.
- Account deletion is enforced server-side for staff roles (backend change shipped).
- Visitor pass expiry enforced at the gate and by a working server job.
- Photo uploads re-wrap blobs with the right content type; private buckets use signed URLs.
- Sign-up no longer reveals whether an email exists.

## Coverage gaps (skimmed by pattern search, not read line by line)

`app/admin/announcement-detail.tsx`, `admin/issues.tsx`, `admin/marketplace.tsx`,
`admin/marketplace-listing.tsx`, `admin/notifications.tsx`,
`resident/announcements.tsx`, `resident/announcement-detail.tsx`,
`resident/issue-detail.tsx`, `resident/marketplace.tsx`,
`resident/notifications.tsx`, `resident/visitor-pass-history.tsx`,
`resident/wallet-transactions.tsx`, `security/logs.tsx`, `security/_layout.tsx`,
`components/AnnouncementsFeed.tsx`, `components/issues/*` (except the feedback
thread header), `components/ui/*` other than Overlay, Toast, Button,
RemoteImage, ConfirmDialog, Avatar, Notice; `components/auth/*` other than
what the auth screens use. Nothing in the pattern searches pointed at problems
there, but they have not had a full review.

## Suggested fix order

1. **Gate and access (H1, H2, M1, M2, M3):** one change set in the security
   scan flow, plus a small migration for H1.
2. **Money correctness (H4, H6, M12, M13, M14, M11):** constraints migration, dues
   recipients and confirmations, amount and account validation.
3. **Auth and account safety (H3, H5, M4, M5, M6, M7, M10, M16):** SMTP,
   staff-invite-by-code, sign-out cleanup, deep-link hardening.
4. **Resilience (M8, M9, M15, L15, L16):** back handler, web avatar path,
   query focus/online wiring.
5. **Copy, polish and tests (M17, M18, L1 to L20).**

Items that need work outside this repo: H1 (migration), H3 (RPC), H4
(migration), H5 (SMTP on the VPS), M4 (unregister RPC), M7 (ownership rule),
M11 (cancel order). JS-only items can ship over EAS Update to the current 1.0.5
builds; M15's NetInfo part and anything adding a native module need a new build.
