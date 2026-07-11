# Implementation Plan

This plan turns the specification into a staged delivery. It defines the phases,
the first runnable vertical slice, the data-source access plan, the station
selection method, and the open risks. Detailed tasks live in `docs/backlog.md`.

## Sequencing principle

Build the historical record first, then the ability to judge it, then the second
data source, then the customised forecast, then polish. The reason for this order
is that everything valuable in the product depends on immutable forecast snapshots
that must start accumulating as early as possible. Every day of delay is a day of
history the app will never have.

## Phases

### Phase 1: Foundation

Deliver the project skeleton, the database schema, authentication, the two fixed
locations, geocoding and configuration, the Yr/MET provider, the Frost observation
provider, scheduled collection, raw and normalised storage, and provider health
monitoring.

End state: the app displays the Yr forecast and actual observations for both
locations, and scheduled jobs are already saving immutable snapshots.

### Phase 2: Forecast history and accuracy

Deliver immutable snapshot handling, forecast/observation matching, horizon
calculation, accuracy metrics, a basic accuracy dashboard, and data-quality
handling.

End state: the app correctly evaluates Yr snapshots from hours to seven days ahead
as data accumulates, and never claims seven-day accuracy before real seven-day
snapshots exist.

### Phase 3: Storm/Pent integration

Complete the Storm/Pent investigation and document it in
`docs/storm-data-source-investigation.md`. Then implement the selected legitimate
provider adapter behind the common interface.

End state: the app displays and evaluates Yr and Storm separately, and still runs
correctly when Storm is unavailable.

### Phase 4: Customised forecast

Deliver the simple average, bias correction, provider weighting, confidence, the
explanation panel, and the customised hourly and daily forecast.

End state: the app generates a transparent local forecast for both properties, with
confidence and an explanation for every value.

### Phase 5: Refinement

Deliver PWA polish, offline cache, improved visualisations, model validation,
seasonal analysis, optional notifications, and optional local sensor integration.

## First runnable vertical slice

The first thing to build and run end to end. It proves the spine of the product
before breadth is added.

The slice must:

- include both locations, Leiligheten and Hytta
- fetch Yr forecasts from the official MET Norway Locationforecast API
- retrieve actual observations from Frost for a selected station per location
- save immutable forecast snapshots on a schedule
- display current conditions and the seven-day Yr forecast for each location
- show which observation station was selected
- show a clear placeholder state for Storm
- run locally and be deployable

Concrete steps for the slice:

1. Scaffold the Next.js app with TypeScript, Tailwind, and strict settings.
2. Add the environment schema and validate it at startup.
3. Create the Supabase project and the first migration covering `locations`,
   `forecast_providers`, `forecast_runs`, `forecast_points`, `weather_stations`,
   `location_station_mappings`, and `observations`.
4. Seed the two locations with geocoded coordinates and elevation.
5. Implement `MetNorwayProvider`: fetch, validate with Zod, store raw payload,
   normalise, compute horizon, insert immutable `forecast_points`.
6. Implement the Frost observation adapter and a first station selection for each
   location.
7. Add the forecast ingestion job (every three hours) and the observation ingestion
   job (hourly), both idempotent and protected by `CRON_SECRET`.
8. Build the home screen with the two location cards and a seven-day Yr view.
9. Show the selected station and a Storm placeholder.
10. Add a minimal admin view for provider and job status.
11. Deploy with working scheduled jobs.

At this point the app is useful on day one and, more importantly, has started
building the history that everything else depends on.

## Data-source access plan

**Yr / MET Norway (Locationforecast).** Primary and always-on. Use the precise
latitude, longitude, and elevation per location. Send a descriptive User-Agent as
required by MET Norway terms. Cache responses, respect rate limits, and store issue
and retrieval times plus model-run metadata when available. No website scraping.

**MET Norway Frost (observations).** Requires a `FROST_CLIENT_ID`. Used for actual
observed weather. Discover candidate stations near each location, then select per
variable (see below).

**Storm / Pent.** Access is not assumed. Phase 3 begins with an investigation into
whether a legitimate JSON endpoint exists, whether it returns Yr and Storm
separately, whether authentication is required, whether terms permit private
automated use, and whether stable identifiers and timestamps are provided. No
bypassing of authentication, access controls, rate limits, or technical
protections. The fallback hierarchy is: official Storm or licensed API, then a
legitimate Pent endpoint suitable for personal use, then a manually configurable
endpoint, then mock or manually imported data, then Yr-only mode with a visible
Storm-unavailable state. Findings are documented before any adapter is written.

## Observation station selection method

For each location, do not simply pick the nearest station. The method:

1. Geocode the address once and store coordinates and elevation.
2. Query Frost for candidate stations within a reasonable radius.
3. For each candidate record distance, elevation difference, which variables it
   measures (temperature, precipitation, wind, snow), and data completeness over a
   recent window.
4. Score candidates per variable, balancing proximity against elevation similarity,
   terrain and urban character, and measurement availability. Elevation matters
   especially for Øyer.
5. Select a primary station per variable, plus fallbacks, allowing a different
   station for temperature, precipitation, wind, and snow, and optional blending.
6. Record the selection rationale and expose it in the admin view, with manual
   override.

The detailed scoring and the final choices for both addresses are documented in
`docs/station-selection.md` during Phase 1.

## Risks and unresolved questions

- **Storm legitimacy is unresolved.** Whether a compliant Storm source exists for
  private use is the biggest open question. The whole product is designed to work
  without it, so this is a risk to breadth, not to viability.
- **Station representativeness at the cabin.** Øyer's terrain and elevation make
  observation matching harder. Wrong station choices would quietly distort accuracy
  metrics, so the selection is documented and overridable.
- **Provider daily-value semantics.** Yr and Storm may define daily highs, lows, and
  precipitation intervals differently. These must be confirmed before trusting
  provider-native daily values, otherwise aggregation is misleading.
- **History takes time.** Meaningful local skill needs weeks, and seasonal analysis
  needs a full year. The UI must communicate the learning state honestly rather
  than imply confidence it has not earned.
- **Job reliability.** The chosen scheduler must run every three hours without
  depending on app visits. If a run is missed, snapshots for that window are lost
  permanently, so monitoring and alerting on missed runs matter from Phase 1.

## Definition of done for the MVP

The MVP is complete when all acceptance criteria in `docs/product-spec.md`
section 32 are met, the required documentation exists, and the scheduled jobs have
been running long enough to demonstrate real forecast/observation matching across
horizons.
