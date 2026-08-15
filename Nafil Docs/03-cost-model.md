# Nafil Estates — Infrastructure Cost Model

Running cost at 1,000 / 10,000 / 100,000 / 1,000,000 users.

**Prices verified against published rates, July 2026** (supabase.com/pricing; sources in §7).
Re-check before contract signature.

> **No SMS.** Visitor codes are generated in-app and shared by the resident through the OS
> share sheet (WhatsApp, SMS, email — whatever they pick). We send no messages ourselves.
> This removes what would otherwise be the single largest cost at scale — see §6.

---

## 1. What "user" means here

A user is a **resident account**. Security and admin staff are a rounding error — a
1,000-unit estate has maybe 15 staff.

Scale in context:

| Users | Roughly | Reality check |
|---|---|---|
| 1,000 | 1 large estate, or 3–4 small ones | Pilot / first client |
| 10,000 | 10–15 estates | Established single client |
| 100,000 | 100+ estates | Regional operator |
| 1,000,000 | ~300,000 households | National scale; Venco reports ~48,000 units |

The 1M column is a stress test, not a forecast. Read it as "what breaks first," not "next
year's budget."

---

## 2. Consumption per user per month

Derived from the schema in `Nafil Backend/supabase/migrations/`:

| Activity | Assumption | Data |
|---|---|---|
| Visitor passes | 8/month (~2/week) | 8 rows × ~200 B = 1.6 KB |
| Visitor logs | 8/month (one per pass) | 8 rows × ~200 B = 1.6 KB |
| Issues | 0.1/month (most residents never report) | 0.05 KB |
| Announcements | Read-only, shared per estate | ~0 per user |
| **Database growth** | | **≈ 3.5 KB/user/month** |
| | | *≈ 42 KB/user/year (×2 with indexes ≈ 85 KB)* |
| Issue photos | 10% report × 50% attach × 2 × 300 KB | **≈ 30 KB/user/month** |
| API egress | ~30 app opens × 50 KB JSON | **≈ 3 MB/user/month** |
| QR codes | Rendered on-device from the pass code | **0** |
| Pass delivery | Resident's own WhatsApp/SMS via share sheet | **0** |

**Deliberately conservative on photos.** If issue reporting is more popular than assumed —
or residents attach video — storage and egress climb fast. Cap upload size and compress
client-side; it's the cheapest lever available and near-impossible to retrofit once users
have habits.

---

## 3. Verified unit prices

**Supabase** (July 2026):

| Plan | Cost | MAU | Database | Storage | Egress |
|---|---|---|---|---|---|
| Free | $0 | 50,000 | 500 MB | 1 GB | 5 GB |
| Pro | $25/mo | 100,000 | 8 GB | 100 GB | 250 GB |
| Team | $599/mo | 100,000 | 8 GB | 100 GB | 250 GB |

Overages (Pro and Team): **$0.00325**/MAU · **$0.125**/GB database · **$0.0213**/GB storage ·
**$0.09**/GB egress.

Compute add-ons: Micro $10 · Small $15 · Medium $60 · Large $110 · XL $210 · 2XL $410 ·
4XL $960 · 8XL $1,870. **Pro and Team include $10/mo compute credit**, covering one Micro
instance — net compute cost is `price − $10`.

Push notifications (Expo / FCM / APNs): **free**.

---

## 4. Cost by scale

USD/month.

### 1,000 users — *≈ $44/mo*

| Item | Cost |
|---|---|
| Supabase Pro | $25 |
| Compute (Micro, covered by credit) | $0 |
| FastAPI host (Render/Railway starter) | $19 |
| Storage 30 MB, egress 3 GB — within quota | $0 |
| Push notifications | $0 |
| **Total** | **≈ $44** |

Everything fits inside base tiers. You're paying for *existing*, not for usage.

### 10,000 users — *≈ $70/mo*

| Item | Cost |
|---|---|
| Supabase Pro | $25 |
| Compute (Small $15 − $10 credit) | $5 |
| FastAPI host | $40 |
| DB 420 MB/yr, storage 3.6 GB/yr, egress 30 GB/mo — within quota | $0 |
| **Total** | **≈ $70** |

Comfortably inside Pro quotas. **Best cost-per-user in the model — $0.007/user.**

### 100,000 users — *≈ $740/mo*

| Item | Cost |
|---|---|
| Supabase Pro | $25 |
| Compute (XL $210 − $10 credit) | $200 |
| Read replica | $210 |
| Egress overage — 300 GB vs 250 included | $5 |
| FastAPI — 2–3 instances + load balancer | $250 |
| Monitoring / error tracking | $50 |
| DB 4.2 GB/yr, storage 36 GB/yr — within quota | $0 |
| **Total** | **≈ $740** |

MAU sits **exactly at the Pro ceiling** (100,000). One user over and MAU overage begins.
Database growth (4.2 GB/yr) also starts pressing the 8 GB included limit in year two.

### 1,000,000 users — *≈ $11,100/mo*

| Item | Cost |
|---|---|
| Supabase Team | $599 |
| **MAU overage — 900k over included** | **$2,925** |
| **Compute (8XL $1,870 − $10 credit)** | **$1,860** |
| **Read replicas (×2)** | **$3,740** |
| Egress overage — 3 TB/mo | $248 |
| Database overage — ~85 GB | $10 |
| Storage overage — ~360 GB/yr | $6 |
| FastAPI cluster | $1,500 |
| CDN, monitoring, logging | $200 |
| **Total** | **≈ $11,088** |

At this scale you negotiate Enterprise rather than paying list, so the real figure lands
lower. Treat it as an upper bound.

---

## 5. Cost per user

| Scale | Total/mo | **Per user/mo** |
|---|---|---|
| 1,000 | $44 | $0.044 |
| 10,000 | $70 | $0.007 |
| 100,000 | $740 | $0.0074 |
| 1,000,000 | $11,088 | $0.0111 |

Cost per user drops ~6× from 1k→10k, stays flat through 100k, then rises modestly at 1M as
MAU overage kicks in. **The curve is now dominated by infrastructure, which amortizes well.**

Where the money goes at 1M:

- **Compute + read replicas: $5,600 — 50%**
- MAU overage: $2,925 — 26%
- FastAPI cluster: $1,500 — 14%
- Everything else: 10%

---

## 6. What the no-SMS decision saved

Sending OTP or visitor codes by SMS would have added, at ~$0.0107/message (Nigerian
transactional rate) and one message per user per month:

| Scale | SMS would have cost | As % of total |
|---|---|---|
| 1,000 | +$11 | 20% |
| 10,000 | +$107 | 60% |
| 100,000 | +$1,070 | 59% |
| 1,000,000 | **+$10,700** | **49%** |

At 1M users that's **roughly a 2× total bill** — SMS alone would have cost more than all
infrastructure combined. Generating codes in-app and letting the resident share them is the
single highest-leverage cost decision in this project, and it also happens to be the better
product: the resident picks the channel their visitor actually uses.

**⚠️ The trap to avoid.** The share sheet is free because *the resident's own phone* sends
the message. If anyone later proposes "let's just send it automatically over WhatsApp," that
means the **WhatsApp Business API**, which bills per conversation and reintroduces the entire
cost line above. Automatic delivery and free delivery are mutually exclusive here.

---

## 7. Remaining cost levers

**MAU is billed on *active* users, not registered ones.** A resident who doesn't open the app
in a given month doesn't count. Don't send engagement pushes that exist only to re-activate
dormant accounts — you'd be paying $0.00325 a head for the privilege.

**Read replicas double compute.** They're $3,740 of the 1M bill. Add one when you can
demonstrate read contention, not preemptively.

**Egress rewards discipline.** Compress images on upload, paginate lists, don't `select('*')`
when you need four columns. Cheap habits early, expensive to retrofit.

**Auth without SMS still needs a plan.** See §8.

---

## 8. Not included

- **Development** — build cost, not run cost
- **Apple Developer** $99/yr · **Google Play** $25 one-time
- **Payment gateway fees** — Paystack/Flutterwave ~1.5% + ₦100, capped. Passed to residents
  or absorbed; a business decision, and at scale it dwarfs everything on this page
- **Utility vending margins** — Phase 3, commercial terms unknown
- **Support staff** — the real cost at 100k+ users
- **Domain, email, SSL** — trivial

### Sources

- [Supabase pricing](https://supabase.com/pricing) — tiers, quotas, overages, compute add-ons
- [Nigeria SMS pricing overview](https://www.sent.dm/en/resources/sms-pricing/nigeria-sms-pricing) — ₦6.00 operator rate (for the §6 comparison)
- [Termii pricing](https://zoftwarehub.com/products/termii/pricing) — transactional rate $0.0107/msg
- [USD/NGN 2026 history](https://www.exchange-rates.org/exchange-rate-history/usd-ngn-2026) — ₦1,375 average

---

## 9. Recommendation

**Start on Supabase Pro ($25) and don't over-engineer.** It carries you to ~100,000 users,
well past this client's realistic ceiling. Revisit when MAU approaches 100k or database
growth crosses 8 GB.

Worth doing now:

1. **Compress and size-cap image uploads.** Storage and egress both, and unfixable later.
2. **Track MAU from day one.** It's the metric that triggers every tier change.
3. **Settle the auth method** (see `02-roadmap.md`) — with SMS off the table, the choice is
   email-based, and it should be made before residents start registering.
