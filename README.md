# Weather Intelligence

A private, mobile-first weather application for two fixed locations in Norway. It
combines forecasts from Yr / MET Norway and Storm, stores each forecast before
the weather happens, compares those forecasts against what was actually observed,
and gradually learns which source is most trustworthy for each location, weather
variable, season, and forecast horizon.

The result is a customised local forecast that is transparent about where it comes
from and honest about how confident it is.

## The two locations

- **Leiligheten** (apartment): Kongsveien 83C, Oslo
- **Hytta** (cabin): Moltmyrvegen 39, Øyer

## What it answers

Based on how Yr and Storm have historically performed at this exact location and
forecast horizon, what weather is most likely to occur?

## Current version and status

**Version:** 0.3.0
**Status:** Yr forecasts on screen. Signing in shows real, current Yr / MET Norway
forecasts for both Leiligheten and Hytta: current conditions and a seven-day view,
backed by immutable forecast snapshots in Supabase. Storm is a visible placeholder.
Forecast ingestion runs via a `CRON_SECRET`-protected endpoint, triggered manually
for now rather than on a real schedule.

The project moves forward one versioned iteration at a time. See `docs/roadmap.md`
for the version plan and the release ritual, `docs/implementation-plan.md` for the
phased plan and the first vertical slice, `docs/backlog.md` for what is done and
what is next, and `CHANGELOG.md` for the history.

## Key ideas

- **Immutable forecast snapshots.** Every forecast is saved before the target time
  and never overwritten, so real seven-day accuracy can be measured later.
- **Honest accuracy.** Long-range accuracy is only ever computed from forecasts
  that were genuinely made that far in advance.
- **Yr-only safe mode.** The app runs fully on Yr alone. Storm is additive, and its
  absence never breaks anything.
- **Transparent maths first.** Simple statistics (bias correction, error-weighted
  ensembles) come before any machine learning, and any model must beat simple
  baselines out of sample before it is used.
- **No false precision.** Confidence is shown plainly, and the UI is explicit when
  data is thin.

## Documentation

| File | Contents |
| --- | --- |
| `CLAUDE.md` | Working guidance and hard rules for AI assistants |
| `docs/product-spec.md` | The full, authoritative product and technical specification |
| `docs/architecture.md` | Architecture decisions, repository layout, and data model |
| `docs/roadmap.md` | Versioned roadmap, strategy, and the release ritual |
| `docs/implementation-plan.md` | Delivery phases and the first vertical slice |
| `docs/backlog.md` | Staged, prioritised task list |
| `CHANGELOG.md` | History of what changed in each version |

Further docs to be added during implementation:
`docs/data-sources.md`, `docs/storm-data-source-investigation.md`,
`docs/station-selection.md`, `docs/forecast-snapshot-methodology.md`,
`docs/accuracy-metrics.md`, `docs/custom-forecast-model.md`,
`docs/operations.md`, `docs/privacy-and-security.md`.

## Tech stack

Next.js (App Router), TypeScript, React, Tailwind CSS, shadcn/ui, Recharts,
Supabase (Postgres, auth, storage), Zod, Vitest or Jest, Playwright.

## Local setup

Prerequisites: Node.js 20 or later, a Supabase project, a MET Norway Frost client
credential, and a descriptive User-Agent string for MET Norway.

```bash
# install dependencies
npm install

# copy the environment template and fill in values
cp .env.example .env.local

# link to your Supabase project once, then push migrations to it
npx supabase link --project-ref <your-project-ref>
npm run db:migrate

# start the development server
npm run dev
```

Open the app on `http://127.0.0.1:3000`.

Migrations are pushed straight to the linked hosted Supabase project with
`supabase db push`; the local Docker-based Supabase stack (`supabase start`) is
not required and is not assumed to be available.

### Why the dev server binds to 127.0.0.1

`npm run dev` and `npm run start` pass `-H 127.0.0.1` so Next.js binds only to
localhost instead of all network interfaces. On a locked-down machine without
admin rights, binding to all interfaces triggers a Windows Firewall prompt that
can't be dismissed without elevated privileges. Binding to `127.0.0.1` avoids
that prompt entirely; the app is still fully reachable at
`http://127.0.0.1:3000`, just not from other devices on the network.

## Environment variables

All variables are documented in `.env.example`. The essentials:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY` for Supabase
- `MET_USER_AGENT` to identify the app to MET Norway (required by their terms)
- `FROST_CLIENT_ID` for MET Norway observation data
- `STORM_PROVIDER_MODE` and related Storm variables, only needed when Storm is
  enabled
- `APP_TIMEZONE` (Europe/Oslo)
- `CRON_SECRET` to protect scheduled job endpoints

Secrets stay server-side. Never ship the service-role key or provider secrets to
the browser.

## Database migrations

Schema and migration tooling arrive in Phase 1. The migration plan lives in
`docs/architecture.md`. Migrations are the source of truth for the schema.

## Scheduled jobs

Data collection does not depend on anyone opening the app.

- **Forecast ingestion**: every three hours (for example 00:15, 03:15, 06:15, and
  so on in Europe/Oslo). Fetch, normalise, and save immutable snapshots for Yr, and
  for Storm when available.
- **Observation ingestion**: hourly, slightly after the hour (HH:20 or HH:30) so
  observations have time to become available.
- **Daily processing**: backfill observations, match forecasts to actuals,
  calculate errors, update rolling accuracy and provider weights, raise
  data-quality warnings.
- **Weekly processing**: recalculate longer-term parameters, find seasonal and
  horizon biases, detect station or provider changes, produce a summary.

All jobs are idempotent.

## Provider configuration

Providers are pluggable through a common adapter interface. Yr / MET Norway is the
primary and always-on source. Storm is added through an adapter with a fallback
hierarchy, and the app treats Storm as optional. See
`docs/storm-data-source-investigation.md` (to be produced) for the legitimacy
assessment and chosen approach.

## Deployment

Target deployment is a platform that supports Next.js plus reliable scheduled jobs
every three hours (for example Vercel with Cron, alongside Supabase). Do not rely
on client visits for data collection.

## Known limitations

- Accuracy history has to accumulate. Early on the app clearly states that the
  local model is still learning, and it does not claim seven-day accuracy before
  genuine seven-day snapshots have matured.
- Storm access depends on a legitimate source being found and documented. Until
  then the app runs in Yr-only mode with a visible placeholder for Storm.
- Observation quality depends on nearby stations, elevation differences, and which
  variables each station reports. Station choices are visible and can be overridden
  manually.

## Data sources and attribution

Weather data comes from MET Norway (Yr and the Frost observation service) and,
when enabled, from Storm. Required attribution and terms are documented on the
in-app Data sources page and in `docs/data-sources.md`. The customised forecast is
not an official MET Norway, Yr, Storm, or Pent product.
