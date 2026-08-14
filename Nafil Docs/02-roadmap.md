# Nafil Estates — Roadmap

Phasing is ordered by *value per unit of build effort*, not by feature parity with Venco.
The visitor flow ships first because it's the feature residents and security touch daily and
the one that most visibly replaces the incumbent.

Timeline estimates assume one full-time developer. They are ranges, not commitments — the
integration-heavy phases (payments, vending) carry the most schedule risk because they depend
on third parties.

---

## Phase 0 — Foundation ✅ *done*

- Expo + Expo Router scaffold, role-based routing
- Supabase schema: estates, profiles, visitor_passes, visitor_logs, issues, announcements
- RLS policies for all four roles
- FastAPI service skeleton (JWT verification, PDF service, scheduler)
- Theme system (Air Force Blue), Zustand stores
- Workspace split: `Nafil Mobile` / `Nafil Backend` / `Nafil Docs`

---

## Phase 1 — MVP  *≈ 4–6 weeks*

The smallest thing worth putting in a real estate's hands.

### Visitor management
- [x] Resident: create pass → QR + 6-char code
- [x] Share pass via OS share sheet (WhatsApp, SMS, email — resident's choice)
- [ ] Security: scan QR / enter code, verify, check in
- [ ] Security: on-site list, check-out
- [ ] Auto-expire stale passes (scheduled job — *scaffolded*)
- [ ] Recurring passes for domestic staff (weekly/monthly validity)

### Issues
- [ ] Resident: report with category + photos (Supabase Storage)
- [ ] Admin: queue, assign, status transitions
- [ ] Resident: status notifications

### Communication
- [ ] Announcements feed
- [ ] Emergency alerts (security + admin)
- [ ] Push notifications (Expo push tokens)

### Onboarding & admin
- [ ] **Settle the auth method** — SMS OTP is off the table (see cost model §6), so the
      choice is email/password (already scaffolded) or email magic link. Either way, **admin
      approval is the real identity gate**: a resident self-registers, and an admin approves
      them against the estate's unit register. That check is stronger than phone verification
      anyway — it confirms the person actually lives there, which an OTP never did.
      Phone stays on the profile as a contact field, not an auth factor.
- [ ] Resident self-registration → admin approval
- [ ] Admin: resident directory, role assignment
- [ ] Estate setup (units, gates, staff accounts)

**Exit criteria:** one estate running daily visitor traffic through the app for two weeks
with no manual fallback to the paper gate book.

---

## Phase 2 — Money  *≈ 6–8 weeks*

Where the platform starts paying for itself — and where the client's real pain is, since
collections are the hardest part of running an estate.

### Billing & collections
- [ ] Bill/tariff configuration (service charge, security levy, per-unit or flat)
- [ ] Automated recurring bill generation (scheduled job)
- [ ] Resident: view balance, payment history, download statements (PDF — *scaffolded*)
- [ ] Payment gateway — **Paystack or Flutterwave** (card, transfer, USSD)
- [ ] Webhook reconciliation, receipt generation
- [ ] Admin: collections dashboard, defaulter list, payment reminders

### Amenities
- [ ] Bookable amenities (clubhouse, pool, courts)
- [ ] Booking calendar, conflict prevention, optional fees

### Reliability
- [ ] **Offline mode for the gatehouse** — cache valid passes locally, queue check-ins,
      sync on reconnect. A gate that can't verify a visitor when the network drops is a gate
      that goes back to the paper book.

**Exit criteria:** a full billing cycle collected through the app, reconciled without manual
spreadsheet work.

---

## Phase 3 — Depth  *≈ 8–12 weeks*

Parity-plus features. Only worth building once Phases 1–2 are genuinely embedded.

### Utility vending
- [ ] Prepaid electricity token purchase
- [ ] Meter registration, usage history, low-balance alerts
- [ ] Vendor integration + reconciliation

> **Heaviest lift in the roadmap.** Requires a vending partner, meter compatibility, and
> careful failure handling — a failed token purchase that debits the resident is the single
> worst bug this app could ship. Budget disproportionate time for error paths.

### Access hardware
- [ ] NFC/RFID resident cards, vehicle stickers
- [ ] Boom barrier / turnstile integration
- [ ] ANPR (plate recognition) — evaluate cost/benefit before committing

### Analytics
- [ ] Admin dashboards: visitor patterns, issue SLAs, collection rates
- [ ] Scheduled report emails (PDF)
- [ ] `super_admin` cross-estate comparison + estate switcher UI

---

## Phase 4 — Optional

Only if the client asks. Each adds real surface area for modest return.

- Marketplace (estate vendors/artisans)
- Community social feed
- Polls and voting for residents' association decisions
- Panic button with location
- Visitor pre-approval workflows for events

---

## Sequencing notes

- **Settle auth before residents start registering.** Changing the identifier after accounts
  exist means a migration. Email/password is scaffolded and works; the decision just needs
  confirming rather than defaulting into.
- **Never add automatic WhatsApp delivery.** Pass sharing is free because the resident's own
  phone sends the message. Automatic sending means the WhatsApp Business API, which bills per
  conversation — at 1M users that's ~$10,700/mo for something the share sheet does for $0.
- **Offline gatehouse is Phase 2, not Phase 3.** It looks like polish but it's the difference
  between the app being trusted at the gate and being abandoned.
- **Don't start Phase 3 vending until Phase 2 payments are stable.** Same money-handling
  code paths, same reconciliation logic — build it once, correctly.
- **Push notifications are Phase 1**, not a nice-to-have. Announcements nobody sees are
  announcements nobody acts on.
