# Venco — Feature Audit

Reference for what the incumbent does, so we build deliberately rather than by imitation.

> **Sourcing caveat:** assembled from Venco's public marketing site and app store listings
> (July 2026). We could not access a live dashboard, so screen-level UX is unverified.
> Treat this as a feature inventory, not a specification.

## Their shape

Three apps, one platform:

| App | Audience |
|---|---|
| Venco | Residents / property owners |
| Venco Security | Gate and security personnel |
| Venco Admin | Facility managers, developers, residents' associations |

Company: Venco Platforms Ltd, Lagos. Positions as "all-in-one community management" across
gated estates, streets, apartment blocks, and commercial complexes.

## Features by app

### Resident
- Pay service charges / communal dues; download e-statements and utility bills
- Prepaid electricity vending, remote, any time
- Pre-book visitors (access codes / virtual IDs)
- Report and track issues
- Amenities booking
- Dashboard: utility usage and balance at a glance
- Community and emergency alerts
- Marketplace (separate product line)

### Security
- Real-time caller verification — matches an incoming caller's number against registered
  residents/visitors, shows a time-sensitive verification prompt
- Access control: single-use codes, NFC ID cards, RFID car stickers, QR scanning
- Integration with boom barriers and turnstiles
- Domestic staff screening (recurring visitor whitelisting)
- Emergency alert broadcast/receive

### Admin
- Configure bills and tariffs; automate collections and reconciliation
- Revenue assurance features to reduce payment defaults
- Individual and bulk messaging to residents
- Issue tracking
- Reporting on community operations
- Security personnel account management
- Access code management
- Approve residents' join-community requests

## What we're doing differently

| | Venco | Nafil |
|---|---|---|
| App count | 3 separate apps | 1 app, role-based access |
| Tenancy | Multi-tenant SaaS | Single client, multiple estates |
| Deployment | Their platform, their terms | Client-owned, self-hosted infra |
| Customization | Configuration within their product | Whatever the client asks for |

**The one-app decision** is the main structural divergence. It costs us some role-specific
polish — a gate-only device shows tabs a guard never uses — but it means one release
pipeline, one design system, and staff holding multiple roles (a facility manager who also
lives on the estate) don't juggle installs.

## Worth stealing

- **Caller verification.** Clever: the visitor calls the gate from the number on their pass,
  and the guard gets an instant match. Solves the "visitor arrives, guard is mid-shift-change"
  gap without hardware. Cheap to build once passes store a phone number.
- **Revenue assurance framing.** Not a feature so much as a posture — the admin product is
  sold on *collections*, not on convenience. Worth mirroring in how Phase 2 is scoped.
- **Domestic staff as a distinct pass type.** Recurring, long-validity, screened once. We
  have it in the Phase 1 backlog for this reason.

## Worth skipping (for now)

- **Marketplace.** Separate product, separate business. Adds surface area, unclear return for
  a single client.
- **ANPR / heavy access hardware.** Evaluate per-estate; the cost rarely justifies itself
  below a certain gate volume.
- **Their breadth of property types.** They support offices and shopping complexes because
  they're selling to everyone. We're building for one client's residential estates.
