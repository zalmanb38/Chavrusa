# Chavrusa Match

A web app for finding a chavrusa (Torah study partner) — browse fellow
learners, connect, schedule a time, and learn together remotely or in
person. Free to join, mobile-first, and fully multilingual.

## Stack

- **Next.js** (App Router, TypeScript, Tailwind CSS)
- **Supabase** — auth, Postgres database, row-level security
- **next-intl** — i18n routing, with full RTL support for Hebrew
- **Vercel** (intended hosting/deployment target)

## Status

This is the first milestone: project setup plus the core auth/profile flow.

- [x] Next.js + Tailwind scaffold
- [x] Multilingual UI: English, Hebrew, French, Spanish (Hebrew in RTL)
- [x] Supabase auth: email/password + Google OAuth
- [x] User profiles (name, languages, topics, level, city, preference,
      availability)
- [x] Browse/discovery page with filters (language, topic, city,
      preference)
- [x] Sending, accepting, and declining connect requests; a Requests page
      showing incoming/outgoing requests and current matches
- [x] Scheduling flow once matched (propose/confirm/suggest-a-different-time)
      and contact handoff (WhatsApp/phone/Zoom revealed only after a
      confirmed session — enforced at the RLS level, not just in the UI)
- [x] Password reset flow (forgot-password / reset-password)
- [x] Report and Block (blocked users are hidden from browse and can't send
      or receive new connect requests, both enforced via RLS)
- [ ] Phone number verification
- [ ] Paid tier / donations (intentionally deferred — schema and layout
      leave room for it)

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL Editor, run the migration in
   [`supabase/migrations/0001_init.sql`](./supabase/migrations/0001_init.sql).
   It creates the `profiles`, `connect_requests`, `blocks`, and `reports`
   tables, all with row-level security policies, plus a trigger that
   auto-creates a blank profile row whenever someone signs up.
3. (Optional, for Google sign-in) In **Authentication → Providers**, enable
   Google and fill in your OAuth client ID/secret. In **Authentication →
   URL Configuration**, add `http://localhost:3000/auth/callback` (and your
   production URL's equivalent) as a redirect URL.

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from
your Supabase project's **Settings → API** page.

### 4. Run the dev server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) — you'll be redirected
to `/en` (or your browser's preferred locale among `en`/`he`/`fr`/`es`).

## Project structure

```
src/
  app/
    [locale]/          # all UI routes, locale-prefixed (/en, /he, /fr, /es)
      layout.tsx        # sets <html lang/dir>, wraps pages in the nav
      page.tsx           # landing page
      login/ signup/     # auth pages
      profile/            # profile create/edit (auth-guarded)
      browse/              # discovery + filters (auth-guarded)
      requests/             # incoming/outgoing connect requests + matches
      matches/[id]/          # scheduling + contact handoff for one match
    auth/callback/         # OAuth + email-confirmation redirect handler
  components/               # NavBar, LocaleSwitcher, forms, etc.
  i18n/                      # next-intl routing/navigation/request config
  lib/supabase/               # browser + server Supabase clients
  proxy.ts                     # locale routing + auth session refresh
messages/                       # en.json, he.json, fr.json, es.json
supabase/migrations/              # SQL schema + RLS policies
```

## Notes on design decisions

- **Locales double as spoken-language options.** The four supported UI
  languages (`en`/`he`/`fr`/`es`) are the same list used for "languages
  spoken" on a profile, so there's one source of truth
  (`src/lib/profile-options.ts`).
- **RTL** is handled by setting `dir="rtl"` on `<html>` for Hebrew and using
  Tailwind's logical spacing utilities (`ms-`, `me-`, `ps-`, `pe-`, etc.)
  rather than hardcoded `left`/`right`, so layouts mirror automatically.
- **Free-tier-first schema.** There's no payments/subscription table yet by
  design (matches the MVP spec's "not in v1" list), but `profiles` and the
  page structure don't assume a single membership tier, so adding a `plan`
  column and a donation flow later won't require reshaping what's here.
