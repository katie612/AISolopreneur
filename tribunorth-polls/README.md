# Tribu Pulse — anonymous landing-page polls

Drop-in module for the tribunorth.com.au Next.js app (`katie612/Tribu`).
Three one-tap polls that collect no personal information, show the reader how
everyone else answered, and roll up weekly into the Notion Feedback Hub.

It lives here rather than in the site repo because this session couldn't reach
`katie612/Tribu` — see **Getting it into the site** at the bottom.

---

## Why anonymous polls rather than more form fields

A waitlist form asks the reader to give something up. A poll gives them
something back: the moment after they tap, they find out they're not the only
one. That's why response rates on these run far above a form, and why the
result is worth putting on the page at all.

The reveal is the product, not the data collection. `70% of families don't have
a current will` sitting under the question does more persuasive work than any
sentence of copy — and it's the same stat that's already being quoted in the
investor materials, except now it has a sample size and a date attached.

---

## The three polls and where they go

Placement matters more than the questions. Each one sits where the reader is
already asking themselves that question.

| Poll id | Question | Place it directly after |
| --- | --- | --- |
| `where-it-lives` | Where does your family's information actually live? | **"A rough system works. And then life happens…"** |
| `first-vault` | Which vault would you open first? | the Housing / Insurance / Legacy cards |
| `will-status` | Do you have a will that's current? | **"Your family's information."**, just before the waitlist |

The order is deliberate. The first poll gets a cheap, low-stakes tap in early,
which makes the next two far more likely to be answered. `will-status` sits
last because it's the one with tension in it, and that tension should land
immediately before "Join the waitlist", not halfway up the page.

### What was deliberately left out

**"How many properties do you have?"** doesn't belong in an anonymous poll. It
segments rather than provokes — nobody learns anything about themselves by
answering it, so it reads as a survey question and costs a tap that the other
three need. It's genuinely useful for pricing though, so put it on the Tally
waitlist form instead, where there's already a consented relationship and one
more question costs nothing.

Three is the ceiling. A fourth poll turns a landing page into a questionnaire.

---

## Install

```bash
npm i @supabase/supabase-js
```

Copy into the site repo, keeping the paths:

```
src/lib/polls.ts
src/components/PulsePoll.tsx
src/components/PulsePoll.module.css
src/app/api/pulse/route.ts
src/app/api/pulse/sync/route.ts
```

If the repo doesn't use the `@/*` path alias, change the two imports in
`route.ts` / `sync/route.ts` and one in `PulsePoll.tsx` to relative paths.

Run `supabase/migration.sql` once in the Supabase SQL editor.

Environment variables (Vercel → Project → Settings → Environment Variables):

| Variable | What it is |
| --- | --- |
| `SUPABASE_URL` | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key. **Server-only** — no `NEXT_PUBLIC_` prefix, ever. |
| `NOTION_TOKEN` | Internal integration token, for the weekly roll-up |
| `CRON_SECRET` | Any random string. Vercel sends it back as a bearer token. |

Then use it anywhere in `page.tsx`:

```tsx
import PulsePoll from '@/components/PulsePoll';

<PulsePoll pollId="first-vault" />
```

### Weekly roll-up into Notion

Add to `vercel.json`:

```json
{ "crons": [{ "path": "/api/pulse/sync", "schedule": "0 22 * * 0" }] }
```

Sundays 22:00 UTC, which is Monday morning in Melbourne. Each run writes one
aggregate Signal row per poll into the Feedback Hub — the finding, not the raw
votes. Those stay in Supabase.

The Notion integration needs to be shared into the **Signals** database
(`···` → Connections → add the integration) or the writes 404.

---

## Privacy

The polls collect nothing that identifies a person: no email, no name, no IP,
no user agent, no analytics event tied to a profile.

The one thing stored alongside a vote is `device_token`, a random UUID minted
in the browser and used only to stop the same device voting twice on the same
poll. It isn't derived from anything about the reader and is never sent
anywhere but this site's own endpoint.

That means aggregate results are always publishable, with no consent question
to ask — which is the practical reason to make the polls anonymous rather than
tying them to the waitlist. It also sits consistently with the page's existing
Privacy Act 1988 positioning: a page that makes a point of Australian data
handling shouldn't quietly fingerprint the people reading it.

RLS is on with no policies, so the publishable key can't read or write the
table at all. Everything goes through the route handler.

---

## Design decisions worth knowing before changing anything

**Results stay hidden until 15 votes** (`revealAfter` in `polls.ts`). Below
that, the voter sees a holding message and their vote still counts. Without
this gate, the first visitor sees "100% of families have no will" off one tap,
which is both meaningless and actively bad copy to have sitting live.

**Percentages use largest-remainder rounding**, so three-way splits show
34/33/33 rather than 33/33/33. Bars that don't total 100 look broken.

**A failed write never shows an error.** If Supabase is unreachable the reader
gets "Thank you." and the page moves on. A visibly broken widget costs more
than a lost vote.

**Returning visitors skip straight to results** — the vote is remembered in
`localStorage`, and the component refetches the current numbers on mount.
Blocked storage (private browsing) degrades to being able to vote again;
that's the right trade against the poll appearing broken.

**Supabase free projects pause after ~7 days of inactivity.** Both existing
Tribu projects are currently paused, and a paused project means the polls stop
recording. A live landing page writing votes normally keeps it awake, but if
traffic is intermittent, check it after the first quiet week.

---

## Getting it into the site

This session had GitHub access scoped to `katie612/AISolopreneur` only, and
`add_repo` for `katie612/Tribu` came back with no access, so none of this could
be committed there directly.

Two ways forward:

1. **Grant access and I'll open a PR on `katie612/Tribu`.** Install or extend
   the Claude GitHub App at
   https://github.com/apps/claude/installations/select_target, or reconnect
   GitHub at https://claude.ai/connect-github.
2. **Copy the five files across in Cursor**, which is already being used on
   that repo. The paths above are the whole change — no existing file is
   modified except `page.tsx`, where the three components get placed, and
   `vercel.json` for the cron.
