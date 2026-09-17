# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# Production infrastructure

Before debugging anything about the web export deployed to
`app.nafilestates.com` (wrong backend URL, broken auth redirect, stale
build) - or before touching Supabase URLs/keys anywhere in this repo -
read `AGENTS.md` in the `Nafil Backend` repo first. In short: production
runs on a self-hosted VPS at `api.nafilestates.com`, never on
`itfepppqjtodmizbglze.supabase.co` (a deprecated, deliberately paused
Supabase Cloud project - never unpause it, never point anything at it
again), and Vercel's dashboard Environment Variables can silently override
this repo's own `vercel.json` at build time.
