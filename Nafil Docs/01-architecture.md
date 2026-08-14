# Nafil Estates — Architecture

## Overview

One React Native app serving three audiences via role-based access, backed by Supabase
(auth + Postgres + RLS) with a FastAPI service for work Supabase can't do well.

Venco ships three separate apps (resident, security, admin). We deliberately ship **one**:
smaller install base to maintain, one release pipeline, one design system, and staff who
hold multiple roles (a facility manager who also lives on the estate) don't juggle apps.

```
┌─────────────────────────────────────────┐
│         Nafil Mobile (Expo RN)          │
│  resident │ security │ admin │ super    │
└────────────┬───────────────┬────────────┘
             │               │
    (direct, RLS-protected)  │ (JWT-authenticated)
             │               │
             ▼               ▼
   ┌──────────────────┐  ┌─────────────────────┐
   │     Supabase     │  │   Nafil Backend     │
   │  Auth            │  │   (FastAPI)         │
   │  Postgres + RLS  │◄─┤   PDFs, jobs,       │
   │  Storage         │  │   integrations      │
   │  Realtime        │  │                     │
   └──────────────────┘  └─────────────────────┘
```

## Why two backends?

Not two backends — **one database, two access paths**.

**Supabase direct** (from the app) handles auth and ordinary CRUD. Row Level Security
enforces access in Postgres, so there's no value in proxying these calls through our own
server; it would just add latency and code to maintain.

**FastAPI** handles what PostgREST/RLS genuinely can't:

| Concern | Why it needs a server |
|---|---|
| PDF reports/statements | reportlab; not expressible in SQL |
| Scheduled jobs | Pass expiry, billing runs, digests (APScheduler) |
| Payment gateway calls | Secrets must never ship in the app bundle |
| Utility vending | Third-party token APIs, retry/reconciliation logic |
| Cross-estate aggregation | Complex joins/analytics for super_admin |
| Push notification fan-out | Batch sends via Expo push API |

**Rule of thumb:** if it can be a table read/write under RLS, it goes direct to Supabase. If
it needs a secret, a schedule, or a document, it goes through FastAPI.

## Access control

Two layers, and they are not redundant:

1. **Client-side routing** (`app/_layout.tsx`) — decides *which UI* a role sees. This is UX,
   not security. A determined user can bypass it.
2. **Row Level Security** (Postgres policies) — decides *what data* a role can touch. This is
   the actual boundary, and it holds regardless of what the client does.

FastAPI verifies the same Supabase-issued JWT (`app/core/security.py`) rather than issuing
its own tokens — one identity system, one user table, no sync problem.

### Roles

| Role | Scope | Can |
|---|---|---|
| `resident` | Own records | Create visitor passes, report issues, read announcements |
| `security` | Own estate | Check visitors in/out, view on-site list, send emergency alerts |
| `admin` | Own estate | Approve residents, manage issue queue, post announcements |
| `super_admin` | All estates | Everything above, across every community |

Role lives on `profiles.role`. Estate scoping is `profiles.estate_id`; every domain table
carries `estate_id` so policies can filter on it without a join.

## Multi-community model

One client, many estates. Every domain row carries `estate_id`, and RLS policies compare it
against the caller's own `estate_id` (via the `auth_estate_id()` helper). `super_admin`
bypasses the estate check but still goes through RLS.

This is single-tenant at the *client* level and multi-tenant at the *estate* level — enough
isolation for the current client without the overhead of true SaaS multi-tenancy. If the app
is later resold to other property companies, add a `clients` table above `estates` and extend
the policies; the estate-scoping work is already done.

## State management

| Concern | Tool | Why |
|---|---|---|
| Server data | TanStack Query | Caching, refetch, invalidation — data that lives in Postgres |
| Session/profile | Zustand (`store/auth-store.ts`) | Global, synchronous reads, no provider nesting |
| Theme preference | Zustand + AsyncStorage persist | Survives restarts |
| Derived theme values | React Context (`context/theme-context.tsx`) | Resolves system/light/dark into a token set |

Don't put server data in Zustand. If it comes from Postgres, it belongs in Query.

## Theme

Primary: `#084DA5`. Tokens in `constants/colors.ts` (light + dark sets), spacing/radius/
typography/elevation in `constants/theme.ts`, consumed via `useTheme()`. Default mode is
`light`, not `system` — the brand is designed light-first.

Components read tokens from the hook rather than hardcoding hex values, so dark mode and any
future rebrand are a single-file change.

## Known gaps

- **Scheduler and horizontal scaling** — APScheduler runs in-process. Multiple uvicorn
  workers would double-fire jobs. Needs a single scheduler instance or an advisory lock
  before scaling out.
- **`super_admin` UI** — currently reuses the admin screens with no estate switcher.
- **Offline gatehouse** — security scanning assumes connectivity. A gate with poor signal
  needs a local queue; see roadmap Phase 2.
- **Unused dependencies** — `playwright`, `passlib`, `python-multipart` came with the Arbinx
  stack and aren't used yet. Drop them if nothing needs them (Playwright especially — it's a
  heavy install).
