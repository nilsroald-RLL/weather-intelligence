# Backlog

A staged, prioritised task list. Tasks are grouped by phase and roughly ordered.
Checkboxes track progress. Keep this file updated as work proceeds. Nothing here
overrides the hard rules in `CLAUDE.md`.

Legend: `[ ]` not started, `[~]` in progress, `[x]` done.

## Phase 0: Foundation and documentation (this stage)

- [x] Create repository foundation and documentation structure
- [x] Write `CLAUDE.md` with hard rules and working method
- [x] Write `README.md`
- [x] Write `docs/product-spec.md`
- [x] Write `docs/architecture.md`
- [x] Write `docs/implementation-plan.md`
- [x] Write `docs/backlog.md`
- [x] Write `.env.example`
- [ ] Confirm Supabase project and credentials
- [ ] Confirm MET Norway Frost client credential and a descriptive User-Agent
- [ ] Confirm deployment target and scheduler choice

## Phase 1: Foundation (first vertical slice)

### Project setup

- [x] Scaffold Next.js (App Router) with TypeScript and strict settings
- [x] Add Tailwind CSS and a lightweight component system (shadcn/ui)
- [x] Add ESLint, Prettier, and strict TypeScript config
- [x] Add the environment schema and validate it at startup
- [x] Add Vitest or Jest and a first smoke test
- [x] Add Playwright and a first end-to-end smoke test

### Database

- [x] Set up Supabase and migration tooling
- [x] Migration: `locations`
- [ ] Migration: `forecast_providers`
- [ ] Migration: `forecast_runs`
- [ ] Migration: `forecast_points` with unique constraints against duplicates
- [ ] Migration: `weather_stations`
- [ ] Migration: `location_station_mappings`
- [ ] Migration: `observations`
- [x] Seed the two locations with geocoded coordinates and elevation
- [ ] Add indexes on location, provider, target time, and horizon

### Authentication

- [ ] Implement initial auth (magic link, passkey, or approved-user list)
- [ ] Apply row-level security where appropriate
- [ ] Keep admin controls off any public surface

### Yr / MET Norway provider

- [ ] Define the `ForecastProvider` interface and `NormalizedForecastPoint` type
- [ ] Implement `MetNorwayProvider` fetch with a descriptive User-Agent
- [ ] Validate responses with Zod
- [ ] Store raw payloads separately from normalised data
- [ ] Normalise into forecast points and compute horizon from issue/retrieval time
- [ ] Insert immutable forecast points, never overwriting

### Frost observations

- [ ] Implement the Frost adapter and `NormalizedObservation` type
- [ ] Discover candidate stations near each location
- [ ] Record distance, elevation difference, available variables, completeness
- [ ] Select a primary station per variable with rationale
- [ ] Never treat missing values, especially precipitation, as zero

### Scheduled jobs

- [ ] Forecast ingestion job, every three hours, idempotent
- [ ] Observation ingestion job, hourly after a short delay, idempotent
- [ ] Protect job endpoints with `CRON_SECRET`
- [ ] Log job runs and surface failures

### UI (slice)

- [ ] Home screen with the two location cards
- [ ] Seven-day Yr view per location
- [ ] Show the selected observation station
- [ ] Storm placeholder state
- [ ] Minimal admin view for provider and job status
- [ ] Deploy with working scheduled jobs

### Docs

- [ ] `docs/data-sources.md`
- [ ] `docs/station-selection.md` with the chosen stations and rationale
- [ ] `docs/forecast-snapshot-methodology.md`

## Phase 2: Forecast history and accuracy

- [ ] Confirm immutable snapshot handling end to end
- [ ] Forecast/observation matching with consistent interval rules
- [ ] Continuous horizon plus predefined buckets
- [ ] Temperature metrics: MAE and mean error, plus RMSE and ±1/±2°C
- [ ] Precipitation occurrence: hit, miss, false alarm, precision, recall, F1
- [ ] Precipitation amount: MAE, signed bias, dry vs event handling
- [ ] Wind speed metrics and circular wind-direction error
- [ ] Weather-code mapping to normalised categories
- [ ] `accuracy_aggregates` refresh in the nightly job
- [ ] `forecast_evaluations` population
- [ ] Basic accuracy dashboard with filters and sample counts
- [ ] Data-quality rules and `data_quality_events`
- [ ] Guard against claiming seven-day accuracy before real snapshots mature
- [ ] `docs/accuracy-metrics.md`
- [ ] Weekly processing job for longer-term parameters and summaries

## Phase 3: Storm/Pent integration

- [ ] Investigate Storm/Pent access legitimately (no circumvention)
- [ ] Write `docs/storm-data-source-investigation.md` with findings and approach
- [ ] Implement `MockStormProvider` for development
- [ ] Implement the selected legitimate Storm adapter behind the interface
- [ ] Store and evaluate Storm snapshots alongside Yr
- [ ] Confirm the app still runs correctly in Yr-only mode
- [ ] Show Yr, Storm, and average values where available
- [ ] Provider toggles in the hourly and seven-day views

## Phase 4: Customised forecast

- [ ] Stage 0: simple average and single-provider fallback with clear labelling
- [ ] Stage 1: rolling signed bias with shrinkage, carefully sign-tested
- [ ] Stage 2: regularised inverse-error weighting with configurable window
- [ ] Weight constraints (for example 0.15 to 0.85) with documented exceptions
- [ ] Confidence model (High/Medium/Low) from the specified inputs
- [ ] Structured explanation panel generated from model inputs
- [ ] `custom_forecasts` and `model_versions` population
- [ ] Customised hourly and daily forecast in the UI
- [ ] Compare custom against baselines (Yr, Storm, average, bias-corrected average)
- [ ] `docs/custom-forecast-model.md`

## Phase 5: Refinement

- [ ] PWA install, icons, safe-area support, fast initial load
- [ ] Offline display of the latest forecast with a stale-data warning
- [ ] Improved temperature line charts and rain visualisations
- [ ] Walk-forward model validation and seasonal analysis
- [ ] Contextual Stage 3 model, only if it beats baselines out of sample
- [ ] Optional notifications using the customised forecast and confidence
- [ ] Optional local sensor integration (Netatmo, Ecowitt, Home Assistant, MQTT)
- [ ] `docs/operations.md`
- [ ] `docs/privacy-and-security.md`
- [ ] Accessibility pass (contrast, keyboard, screen reader, Norwegian formats)

## Cross-cutting, ongoing

- [ ] Keep raw and normalised data separated
- [ ] Keep all timestamps in UTC, display in Europe/Oslo, test DST edges
- [ ] Keep jobs idempotent
- [ ] Fail visibly on schema changes and record data-quality events
- [ ] Maintain server-side-only secrets
- [ ] Keep the app working with Yr alone at all times
- [ ] Expand tests alongside each feature per spec section 27
