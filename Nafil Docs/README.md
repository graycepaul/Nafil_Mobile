# Nafil Estates — Docs

Planning and reference docs for the Nafil Estates platform.

| Doc | What it covers |
|---|---|
| [01-architecture.md](01-architecture.md) | System design, why Supabase + FastAPI, access control, state management |
| [02-roadmap.md](02-roadmap.md) | Phased delivery plan, MVP → utility vending, sequencing rationale |
| [03-cost-model.md](03-cost-model.md) | Infrastructure cost at 1k / 10k / 100k / 1M users |
| [04-competitive-venco.md](04-competitive-venco.md) | Venco feature audit and what we're doing differently |

## Quick reference

- **Primary color:** `#084DA5`, default theme is light (not system)
- **Repos:** [`Nafil_Backend`](https://github.com/graycepaul/Nafil_Backend)
- **Stack:** Expo/React Native · Supabase (Postgres + Auth + RLS) · FastAPI
- **Roles:** `resident` · `security` · `admin` · `super_admin`
- **Supabase:** project "Nafil DB", ref `itfepppqjtodmizbglze`, region eu-west-1,
  Postgres 17.6 — schema deployed, RLS verified
