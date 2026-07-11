# Architecture

This document records the main architecture decisions, the repository layout, the
data model, and how data flows through the system. It complements the full
specification in `docs/product-spec.md`.

## 1. Design goals

The architecture serves a narrow, well-defined product: a customised forecast for
two fixed Norwegian locations that learns from its own history. The priorities, in
order:

1. **Correctness of the historical record.** Forecast snapshots are immutable and
   the horizon logic is exact. Everything else depends on this.
2. **Honest uncertainty.** The system never presents accuracy or precision it has
   not earned from data.
3. **Resilience.** The app runs fully on Yr alone. Any single provider or station
   can fail without breaking the product.
4. **Clarity over scale.** Two locations means we optimise for readable code and
   correct results, not throughput.

## 2. Architecture decision records

### ADR-001: Next.js App Router as the single web framework

The UI, the read APIs, and the light server logic live in one Next.js application
using the App Router with TypeScript and React. This keeps the consumer experience,
the admin views, and the server-side data access in one place, which suits a small
private app. Server components and server actions handle normal requests. Heavy or
scheduled work is kept out of request handlers (see ADR-004).

### ADR-002: Supabase Postgres as the system of record

All durable data lives in Postgres, provisioned through Supabase. Supabase also
provides authentication, row-level security, and object storage for compressed raw
payloads. Postgres is the right fit because the core of the product is a relational
time-series problem: forecasts, observations, evaluations, and aggregates joined by
location, provider, variable, target time, and horizon.

### ADR-003: Provider adapter pattern with a normalised model

Every forecast source implements a common `ForecastProvider` interface and returns
data in a single normalised shape. Provider-specific parsing never leaks into the
UI or the evaluation code. This is what makes Storm optional and makes future
providers cheap to add. Raw provider payloads are stored separately from normalised
data, so we can reprocess history if a parser improves.

### ADR-004: Scheduled jobs run independently of the app

Data collection and evaluation run on a schedule, not on page visits. The first
implementation uses a cron mechanism (Vercel Cron, Supabase scheduled functions, or
GitHub Actions for an early prototype) that calls protected job endpoints guarded by
`CRON_SECRET`. Jobs are idempotent, so a retry or an overlap never corrupts the
record.

### ADR-005: Immutable snapshots, append-only history

Forecast points are written once and never updated. Evaluations and aggregates are
derived data that can be recalculated from the immutable base. This is the single
most important structural decision, because genuine seven-day accuracy is only
possible if the seven-day-old forecast still exists exactly as it was made.

### ADR-006: Transparent statistics before machine learning

The customised forecast starts as bias correction plus an error-weighted ensemble,
expressed in plain, testable functions. A contextual model is introduced only once
enough history exists and only if it beats simple baselines out of sample.
Explanations are generated from structured model inputs, not from a language model.

### ADR-007: UTC storage, Europe/Oslo display

All timestamps are stored in UTC and converted to Europe/Oslo only at the
presentation and daily-aggregation boundaries. Daylight-saving transitions are
handled explicitly in the time helpers and covered by tests.

## 3. System overview

At a high level there are four moving parts:

- **Ingestion** pulls forecasts (every three hours) and observations (hourly) and
  writes immutable records.
- **Evaluation** runs nightly, pairs matured forecasts with observations, computes
  errors, and refreshes rolling accuracy aggregates and provider weights.
- **Custom forecast building** combines the latest provider forecasts using bias
  correction, weighting, and confidence, and stores the result with an explanation.
- **The web app** reads precomputed data and renders the home screen, location
  detail pages, the accuracy dashboard, and the admin section.

The read path is fast because dashboards and custom forecasts are precomputed. The
write path is where the care goes: validation, immutability, and idempotency.

## 4. Repository layout

```
weather-intelligence/
  CLAUDE.md
  README.md
  .env.example
  docs/
    product-spec.md
    architecture.md
    implementation-plan.md
    backlog.md
    (later) data-sources.md
    (later) storm-data-source-investigation.md
    (later) station-selection.md
    (later) forecast-snapshot-methodology.md
    (later) accuracy-metrics.md
    (later) custom-forecast-model.md
    (later) operations.md
    (later) privacy-and-security.md
  src/
    app/                      # routes: home, /leiligheten, /hytta, /accuracy, /admin
    components/               # presentational and shared UI components
    lib/
      weather/
        providers/
          met-norway/         # MetNorwayProvider (Locationforecast)
          storm/              # StormProvider
          pent/               # PentProvider
          mock-storm/         # MockStormProvider for development
        observations/
          frost/              # MET Norway Frost adapter
        normalization/        # raw -> NormalizedForecastPoint / NormalizedObservation
        evaluation/           # error metrics, matching, horizon bucketing
        ensemble/             # bias correction and weighted combination
        confidence/           # High / Medium / Low logic
        stations/             # candidate discovery and station selection
        units/                # unit conversions
        time/                 # UTC <-> Europe/Oslo, DST-safe helpers
    jobs/
      ingest-forecasts/
      ingest-observations/
      evaluate-forecasts/
      build-custom-forecasts/
    types/                    # shared TypeScript types
    db/                       # data access, queries, migration references
  supabase/
    migrations/               # SQL migrations (source of truth for the schema)
  tests/                      # unit and end-to-end tests
```

The rule that keeps this clean: provider quirks live under `lib/weather/providers`,
statistical logic lives under `evaluation`, `ensemble`, and `confidence`, and the UI
only ever reads normalised or precomputed data.

## 5. Data model

Postgres holds the following tables. Timestamps are UTC.

**locations.** The two fixed properties (id, slug, display name, address, latitude,
longitude, elevation, timezone, active flag). Coordinates are editable in
configuration and are not re-geocoded on every request.

**forecast_providers.** One row per source (id, name, adapter_type, enabled,
terms_notes, last_success_at, last_failure_at, health_status).

**forecast_runs.** One row per provider retrieval (id, provider_id, location_id,
retrieved_at, issued_at, raw_payload_id, response_status, parser_version,
error_message).

**forecast_points.** One row per target timestamp within a run (id, forecast_run_id,
location_id, provider_id, target_time, forecast_horizon_minutes, the normalised
forecast fields, created_at). Unique constraints prevent duplicate ingestion. These
rows are immutable.

**weather_stations.** Observation stations (id, source, source_station_id, name,
coordinates, elevation, metadata, active period).

**location_station_mappings.** Which station serves which variable for which
location (location_id, station_id, variable, priority, distance_km,
elevation_difference_m, selection_reason, manually_selected, active). A location can
use different stations for temperature, precipitation, wind, and snow.

**observations.** Raw normalised observations per station (station_id, observed_at,
weather variables, quality flags, retrieved_at).

**location_observations.** Optional resolved observation per property after station
selection or blending (location_id, observed_at, variable, value, source station
information, resolution method, quality score).

**forecast_evaluations.** One row per matched forecast/observation pair
(forecast_point_id, observation reference, variable, forecast_value, actual_value,
signed_error, absolute_error, squared_error, categorical outcome, evaluated_at).

**accuracy_aggregates.** Rolling metrics per location, provider, variable, horizon
bucket, and period (sample_count, mean_error, mean_absolute_error,
root_mean_squared_error, additional metrics, calculated_at).

**custom_forecasts.** The generated local forecast (location_id, target_time,
generated_at, horizon, variable, custom_value, confidence, provider weights, model
version, explanation payload).

**model_versions.** Named model configurations (id, name, configuration,
trained_from, trained_to, created_at, is_active).

**data_quality_events.** Recorded problems (provider or station, issue type,
severity, timestamp, description, resolved status).

### Immutability and derived data

`forecast_points` and `observations` are the immutable base. `forecast_evaluations`,
`accuracy_aggregates`, and `custom_forecasts` are derived and can be rebuilt. Raw
payloads are stored separately (referenced by `raw_payload_id`) so parsing can be
improved and history reprocessed without touching the immutable snapshots.

## 6. Data flow

### Forecast ingestion (every three hours)

For each enabled provider and each location: fetch, validate the response with Zod,
store the raw payload, create a `forecast_run`, normalise into
`NormalizedForecastPoint` rows, compute the forecast horizon from issue or retrieval
time, and insert immutable `forecast_points`. A schema change fails visibly and
writes a `data_quality_event` rather than producing incorrect values.

### Observation ingestion (hourly, after a short delay)

Fetch observations from Frost for the mapped stations, normalise, and store. Missing
values stay missing. Missing precipitation is never treated as zero.

### Nightly evaluation

Find forecast points whose target time has passed and that are not yet evaluated.
Match each to the appropriate observation using consistent interval rules (identical
intervals for accumulated precipitation, nearest-within-tolerance for hourly
temperature). Compute signed, absolute, and squared errors, circular error for wind
direction, and categorical outcomes for rain. Refresh `accuracy_aggregates` and
provider weights. Skip invalid comparisons rather than manufacturing data.

### Custom forecast building

For each target time and variable: take the latest valid forecast from each enabled
provider, look up relevant historical metrics, bias-correct with shrinkage, weight
by regularised inverse error within configured bounds, combine, measure
disagreement, compute confidence, and store the result with a structured
explanation.

## 7. Horizon and matching rules

The horizon is the time between forecast issuance (preferred) or retrieval and the
target timestamp. Continuous horizon and predefined buckets are both supported. For
the dashboard, snapshots closest to 24, 48, 72, 120, and 168 hours are used, with
tolerance (for example ±3 hours at 24 hours, ±6 hours at longer horizons). The exact
methodology is documented in `docs/forecast-snapshot-methodology.md`. A seven-day
number is only ever produced from a genuinely seven-day-old snapshot.

## 8. Resilience and failure handling

- Storm absence puts the app in Yr-only mode with a visible placeholder. Nothing
  else changes.
- Provider or station failures are recorded as data-quality events and surfaced in
  the admin section and as warnings.
- Jobs are idempotent, so retries and overlaps are safe.
- The UI shows stale-data warnings and, offline, the latest successfully fetched
  forecast.

## 9. Security posture

Secrets stay server-side. The browser never receives the Supabase service-role key,
Frost credentials, provider secrets, or private endpoint tokens. Job endpoints are
protected by `CRON_SECRET`. Row-level security is applied where appropriate. Auth
starts as a Supabase magic link, passkey, or a small approved-user list. Details go
in `docs/privacy-and-security.md`.

## 10. Testing strategy

Unit tests cover normalisation, horizon calculation (including daylight-saving
edges), evaluation metrics (including circular wind error and interval matching),
and the ensemble under edge conditions (missing provider, low samples, strong bias,
outliers, weight constraints). Job tests cover idempotency, duplicate ingestion,
provider failure, and delayed Frost data. Playwright covers the core UI flows: both
locations render, the unavailable-Storm state, the stale-data state, sample counts
shown, and PWA installability. See the full list in `docs/product-spec.md` section
27.
