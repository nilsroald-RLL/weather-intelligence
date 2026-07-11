# Product and Technical Specification: Personal Weather Intelligence App

This is the authoritative specification. It is written so that it can be read
without prior project context. Read all of it before choosing an implementation
approach.

## Summary

Build a small private web application that creates a customised weather forecast
for exactly two fixed locations in Norway by combining forecasts from Yr / MET
Norway and Storm, comparing previous forecasts against actual observed weather,
and gradually learning which forecast source performs best for each location,
weather variable, season, and forecast horizon.

The application is intended for personal and family use. It is not initially a
public commercial service.

## 1. Product objective

Create a mobile-first personal weather application for two fixed locations:

- **Apartment** — display name **Leiligheten**, address Kongsveien 83C, Oslo
- **Cabin** — display name **Hytta**, address Moltmyrvegen 39, Øyer

The application shall display:

- the current Yr forecast
- the current Storm forecast, preferably from a legitimate and technically stable
  source
- a simple Yr–Storm average
- a customised forecast calculated from historical forecast accuracy
- the actual observed weather after the forecast period has passed
- accuracy statistics for forecasts issued from a few hours up to seven days before
  the target time
- confidence in the customised forecast
- an understandable explanation of why the customised forecast differs from Yr or
  Storm

The core question the app answers: based on how Yr and Storm have historically
performed at this exact location and forecast horizon, what weather is most likely
to occur?

## 2. Product principles

The application should be:

- optimised for two locations rather than a general weather platform
- mobile-first and easy to use on an iPhone
- installable as a Progressive Web App
- simple enough for daily use
- transparent about data sources and calculations
- robust if one provider is temporarily unavailable
- designed to accumulate a valuable forecast history over time
- modular, so additional data providers can be added later
- careful not to present false precision
- explicit when confidence is low or data is insufficient

Do not use "AI" merely as a label. Start with transparent statistical methods and
introduce more sophisticated machine learning only when enough historical data
exists.

## 3. Core user experience

### 3.1 Home screen

Two large location cards: Leiligheten and Hytta. Each card shows current
temperature, apparent temperature when available, weather condition, precipitation
expected in the next hour, precipitation during the rest of the day, wind speed and
direction, high and low temperature, a customised forecast summary, a confidence
indicator, and a data update timestamp.

Example:

```
HYTTA
Nå
12.4°C · Feels like 10.8°C
Light rain · 3.2 m/s southwest

I dag
Custom: 11–15°C · 4.5 mm rain
Yr:     10–14°C · 6.1 mm
Storm:  12–16°C · 3.4 mm
Custom confidence: Medium

Why?
Storm has historically performed better for daytime temperature here,
while Yr has performed better for rain during the last 30 days.
```

The user must be able to switch between: Now, Today, Hourly, 7 days, Accuracy.

### 3.2 Location details

Each location has a dedicated page.

**Current conditions**: current observation, current Yr forecast, current Storm
forecast, customised estimate, and the difference between forecast and current
observation.

**Hourly forecast** (at least the next 48 hours): time, customised temperature, Yr
temperature, Storm temperature, precipitation amount, precipitation probability
when available, wind, weather icon, confidence. Provider lines can be toggled on and
off.

**Seven-day forecast** (per day): customised high and low, Yr high and low, Storm
high and low, precipitation total, precipitation probability, wind, confidence, and
the provider currently weighted highest.

Do not show the customised forecast with unnecessary decimal precision.
Temperatures in the consumer UI are normally rounded to one decimal or whole
degrees depending on context.

### 3.3 Accuracy dashboard

The accuracy page answers: which provider is most accurate here, whether the winner
changes by forecast horizon, whether it changes for temperature, rain, or wind,
whether the Yr–Storm average beats either provider, whether the customised forecast
now beats both, and whether there is a consistent warm, cold, wet, or dry bias.

Filters: location, date range, weather variable, forecast horizon, season, and
daytime versus nighttime.

Initial forecast-horizon groups: 0–3h, 3–12h, 12–24h, 24–48h, 48–72h, 72–96h,
96–120h, 120–144h, 144–168h. Simplified tabs: Same day, 1 day, 2 days, 3 days,
5 days, 7 days.

Example display:

```
Temperature accuracy – Hytta – Last 90 days
Forecast horizon     Yr MAE    Storm MAE    Average    Custom
0–24 hours            0.9°C      1.2°C       0.8°C      0.7°C
24–48 hours           1.3°C      1.4°C       1.1°C      1.0°C
3 days                1.8°C      1.6°C       1.5°C      1.4°C
5 days                2.4°C      2.1°C       2.0°C      1.9°C
7 days                3.1°C      2.8°C       2.7°C      2.6°C
```

Do not describe temperature accuracy as a percentage unless a clearly defined and
displayed percentage methodology exists. Prefer MAE in degrees.

## 4. Forecast data sources

### 4.1 Yr / MET Norway

Use the official MET Norway Locationforecast API as the primary source for
Yr-compatible forecasts.

Requirements: use the precise latitude, longitude, and elevation of each location;
comply with MET Norway terms and identification requirements; send an appropriate
identifying User-Agent; cache responses; respect rate limits; store the source
issue time and retrieval time; preserve original provider values before
transformations; store enough metadata to identify the model run or update time
when available. Do not scrape the Yr website when an official API is available.

### 4.2 Storm and Pent

Pent displays forecasts from both Yr and Storm. Do not assume Pent or Storm provides
an unrestricted public API.

Implement Storm access through a provider adapter:

```ts
interface ForecastProvider {
  providerId: string;
  fetchForecast(location: Location): Promise<NormalizedForecast>;
  healthCheck(): Promise<ProviderHealth>;
}
```

Create adapters such as `MetNorwayProvider`, `StormProvider`, `PentProvider`,
`MockStormProvider`.

**Required investigation before implementation.** Inspect the publicly available
Pent web application and, where technically appropriate, its network traffic, to
determine: whether Pent calls a public JSON endpoint; whether it returns Yr and
Storm separately; whether authentication is required; whether the data can legally
and practically be used for private automated access; whether the endpoint has
stable identifiers and timestamps; whether use would conflict with terms of
service; and whether direct Storm access is available instead.

Do not bypass authentication, access controls, rate limits, or technical
protections. Do not implement covert scraping or circumvention.

Document findings in `docs/storm-data-source-investigation.md`, including endpoints
identified, sample response structure without secrets, authentication
requirements, technical stability assessment, terms and licensing concerns, chosen
approach, and fallback strategy.

**Storm fallback hierarchy**, in order: official Storm or licensed provider API; a
legitimate Pent endpoint suitable for personal use; a manually configurable
external endpoint; mock or manually imported Storm data during development; running
with Yr only while clearly showing that Storm is unavailable.

The entire application must work without Storm. It must not fail because the Storm
adapter is unavailable.

### 4.3 Actual observed weather

Use MET Norway's Frost API, or another official observation source if necessary,
for actual observations.

For each location: geocode the address; identify nearby observation stations;
determine station distance; determine elevation difference; determine which
variables each station records; assess data completeness; select the most
representative station or combination.

Do not blindly select the geographically closest station. A slightly more distant
station may be more representative because of elevation, terrain, urban conditions,
or measurement availability.

Store: station identifier, name, coordinates, elevation, distance from location,
elevation difference, available elements, data completeness, and selection
rationale. Create a setup or admin view showing candidate stations for each
location.

Station selection supports one primary station per variable, a different station
per variable (temperature, precipitation, wind, snow), fallback stations, optional
blending of nearby stations, and manual override.

### 4.4 Optional local sensor support

Design the data model so a future local sensor can be added at either address
(Netatmo, Ecowitt, Home Assistant, custom MQTT sensor, personal weather station). A
local sensor should later be able to become the preferred actual observation
source. Do not implement this in the first release unless it is straightforward,
but preserve the abstraction.

## 5. Address and location setup

Geocode the two addresses during initial setup and store:

```ts
type Location = {
  id: string;
  slug: "leiligheten" | "hytta";
  displayName: string;
  address: string;
  latitude: number;
  longitude: number;
  elevationMeters?: number;
  timezone: "Europe/Oslo";
  isActive: boolean;
};
```

Coordinates must be editable in configuration. Do not geocode on every forecast
request. Elevation matters, particularly for Øyer. If provider forecast elevation
differs from the property elevation, retain the metadata and consider
elevation-based temperature corrections only after confirming the data semantics.

## 6. Forecast snapshot methodology

This is the most important data-engineering requirement.

The application must save forecasts before the forecasted weather occurs. Never
overwrite a historical forecast snapshot with a newer forecast.

Each snapshot records: provider, location, forecast retrieval time, provider issue
time, target timestamp, forecast horizon in minutes or hours, all forecast
variables, a raw provider payload reference or checksum, parsing version, and
ingestion status.

Example:

```
Forecast retrieved: Monday 09:00
Target weather time: Sunday 12:00
Forecast horizon: 147 hours
Provider: Yr
Forecast temperature: 14.2°C
```

When the target time has passed, the forecast is paired with the relevant actual
observation. This makes genuine seven-day forecast evaluation possible.

## 7. Data collection schedule

**Forecast ingestion**, every three hours: fetch Yr for both locations, fetch Storm
when available, normalise, save immutable snapshots. Suggested Europe/Oslo times:
00:15, 03:15, 06:15, 09:15, 12:15, 15:15, 18:15, 21:15. Avoid running exactly on the
hour if source systems update then.

**Observation ingestion**, every hour after a delay (HH:20 or HH:30), so
observations are available before ingestion.

**Daily processing**, once per night: backfill missing observations, match
forecasts with actuals, calculate errors, update rolling accuracy metrics, update
provider weights, generate data-quality warnings.

**Weekly processing**: recalculate longer-term model parameters, identify seasonal
and horizon-specific biases, detect station or provider changes, produce a summary.

All jobs must be idempotent.

## 8. Normalised weather model

Provider-specific data is transformed into a normalised format.

```ts
type NormalizedForecastPoint = {
  locationId: string;
  providerId: string;
  issuedAt: string | null;
  retrievedAt: string;
  targetTime: string;
  forecastHorizonMinutes: number;
  airTemperatureC?: number;
  minTemperatureC?: number;
  maxTemperatureC?: number;
  apparentTemperatureC?: number;
  precipitationAmountMm?: number;
  precipitationProbabilityPct?: number;
  windSpeedMps?: number;
  windGustMps?: number;
  windDirectionDeg?: number;
  relativeHumidityPct?: number;
  airPressureHpa?: number;
  cloudAreaFractionPct?: number;
  weatherSymbolCode?: string;
  sourceWeatherCode?: string;
  rawPayloadId?: string;
  parserVersion: string;
};

type NormalizedObservation = {
  locationId: string;
  stationId: string;
  observedAt: string;
  airTemperatureC?: number;
  precipitationAmountMm?: number;
  windSpeedMps?: number;
  windGustMps?: number;
  windDirectionDeg?: number;
  relativeHumidityPct?: number;
  airPressureHpa?: number;
  qualityCode?: string;
  sourceProvider: string;
  retrievedAt: string;
};
```

Keep raw and normalised data separate.

## 9. Database design

Use PostgreSQL, preferably through Supabase unless there is a strong reason to
choose otherwise. Suggested tables:

- **locations**: the two fixed properties.
- **forecast_providers**: id, name, adapter_type, enabled, terms_notes,
  last_success_at, last_failure_at, health_status.
- **forecast_runs**: id, provider_id, location_id, retrieved_at, issued_at,
  raw_payload_id, response_status, parser_version, error_message.
- **forecast_points**: id, forecast_run_id, location_id, provider_id, target_time,
  forecast_horizon_minutes, normalised forecast fields, created_at. Add unique
  constraints to prevent accidental duplicate ingestion.
- **weather_stations**: id, source, source_station_id, name, coordinates,
  elevation, metadata, active period.
- **location_station_mappings**: location_id, station_id, variable, priority,
  distance_km, elevation_difference_m, selection_reason, manually_selected, active.
- **observations**: station_id, observed_at, weather variables, quality flags,
  retrieved_at.
- **location_observations** (optional resolved observation after station selection
  or blending): location_id, observed_at, variable, value, source station
  information, resolution method, quality score.
- **forecast_evaluations**: forecast_point_id, observation reference, variable,
  forecast_value, actual_value, signed_error, absolute_error, squared_error,
  categorical outcome, evaluated_at.
- **accuracy_aggregates**: location_id, provider_id, variable, horizon bucket,
  period, sample_count, mean_error, mean_absolute_error, root_mean_squared_error,
  additional metrics, calculated_at.
- **custom_forecasts**: location_id, target_time, generated_at, horizon, variable,
  custom_value, confidence, provider weights, model version, explanation payload.
- **model_versions**: id, name, configuration, trained_from, trained_to,
  created_at, is_active.
- **data_quality_events**: provider or station, issue type, severity, timestamp,
  description, resolved status.

Store timestamps in UTC. Display them using Europe/Oslo.

## 10. Forecast evaluation metrics

Use appropriate metrics for each variable.

**10.1 Temperature.** Primary: MAE and Mean Error (for warm/cold bias). Secondary:
RMSE, percentage within ±1°C, percentage within ±2°C. Error = forecast − actual.
Positive mean error means the provider forecasts too warm; negative means too cold.

**10.2 Precipitation occurrence.** Define rain/no-rain with configurable
thresholds, for example hourly event at actual precipitation ≥ 0.1 mm and daily
event at ≥ 0.5 mm. Metrics: hit rate, false-alarm rate, miss rate, precision,
recall, F1, and Brier score when probability forecasts exist. Show a simple
consumer interpretation ("Yr correctly predicted whether it would rain in 81% of
evaluated periods") while retaining rigorous metrics in the detailed view.

**10.3 Precipitation amount.** Precipitation is skewed and hard to predict. Use MAE
in millimetres, signed bias, logarithmic or capped error for weighting if
appropriate, and separate evaluation for dry periods and precipitation events. Do
not let one extreme rain event dominate all provider weighting.

**10.4 Wind speed.** MAE in m/s, signed bias, RMSE, percentage within ±1 m/s, and
gust accuracy when comparable data exists.

**10.5 Wind direction.** Use circular error, not normal subtraction. 359° and 1°
differ by 2°, not 358°.

**10.6 Weather conditions and icons.** Map provider codes to normalised categories:
clear, partly cloudy, cloudy, fog, drizzle, rain, heavy rain, sleet, snow, thunder.
Evaluate broad categories rather than requiring exact icon matches.

## 11. Forecast-horizon evaluation

Accuracy is calculated from the time between forecast issuance or retrieval and the
target timestamp. Prefer provider issue time when reliable, otherwise retrieval
time. Support both continuous horizon and predefined buckets.

Never compare the latest available forecast to an observation and label it a
seven-day forecast merely because the target date appears in a seven-day UI. A
genuine seven-day evaluation must use a snapshot created roughly seven days
earlier.

Where multiple snapshots fall within one bucket, define a consistent selection
strategy: the nearest snapshot to the canonical horizon, or evaluate all and weight
them. For the dashboard use snapshots closest to 24, 48, 72, 120, and 168 hours,
with tolerance such as ±3 hours for 24-hour snapshots and ±6 hours for longer
horizons. Document the exact methodology.

## 12. Customised forecast model

Implement in stages.

**Stage 0: insufficient history.** When evaluation data is insufficient, the custom
forecast is a simple average of available providers with Low confidence. When only
Yr is available, the custom forecast is Yr, with confidence based on horizon rather
than local skill. Label this state clearly.

**Stage 1: bias-corrected provider forecasts.** For each location, provider,
variable, and horizon bucket, calculate rolling signed bias. Example: Yr forecast
15.0°C, historical Yr bias −0.7°C, bias-corrected Yr 15.7°C. Be careful with sign
conventions and test them. Use shrinkage toward zero when sample count is low:

```
adjusted_bias = observed_bias × sample_count / (sample_count + regularization_strength)
```

**Stage 2: performance-weighted ensemble.** Weight providers inversely by
historical error: `weight = 1 / (MAE + epsilon)`, normalised to sum to one. Use
recent and longer-term local performance, minimum sample thresholds, and
horizon- and variable-specific skill. Recommended blended window: 50% recent 30-day,
30% recent 90-day, 20% all-time or seasonal. Make it configurable and document the
choice. Constrain weights (for example minimum 0.15, maximum 0.85) unless one source
is unavailable or clearly invalid.

**Stage 3: contextual local model.** Once enough history exists, consider month or
season, hour of day, day/night, horizon, forecasted precipitation state, wind
direction, pressure, elevation, provider disagreement, and recent performance. Use
an interpretable model first (regularised linear regression, gradient-boosted trees
with SHAP explanations, or Bayesian model averaging). Do not use a complex neural
network for this data volume. Use walk-forward validation. Never train on future
data. Compare every model against baselines (Yr alone, Storm alone, unweighted
average, bias-corrected average). Activate an advanced model only if it shows
sustained out-of-sample improvement.

## 13. Confidence model

Display confidence as High, Medium, or Low. Confidence considers forecast horizon,
provider disagreement, historical sample count, recent model error, missing
provider data, observation quality, unusual weather conditions, and whether the
custom model reliably beats the baselines.

Example rules. High: horizon under 24 hours, providers agree closely, sufficient
history, low recent error. Medium: horizon 1–4 days, moderate disagreement,
acceptable history. Low: horizon 5–7 days, large disagreement, insufficient data,
missing provider, or a data-quality warning.

The UI shows an explanation, for example: "Low confidence because Yr and Storm
differ by 4.2°C, and seven-day forecasts at this location have historically had an
average error of 2.8°C."

## 14. Daily high, low, and precipitation aggregation

Provider APIs represent daily values differently. Create a documented normalisation
strategy: use local day boundaries in Europe/Oslo; derive high and low from hourly
points if necessary; sum comparable precipitation intervals; avoid double-counting
overlapping intervals; use provider daily values only when their semantics are
clear; preserve provider-native values separately. Handle daylight-saving
transitions correctly.

## 15. Observation matching

Match forecast target timestamps to observations consistently. For hourly
temperature use an observation at the target hour, or the nearest valid observation
within a tolerance. For accumulated precipitation ensure forecast and observation
intervals are identical (do not compare a six-hour forecast with a one-hour
observation); transform both to common hourly or daily intervals where possible.

Each evaluation retains the forecast interval, observation interval, matching
method, time difference, and quality status. Skip invalid comparisons rather than
manufacturing data.

## 16. Missing data and data quality

The system tolerates Storm being unavailable, delayed observations, missing station
variables, provider response changes, duplicate forecast points, station outages,
malformed values, daylight-saving changes, API errors, and incomplete seven-day
coverage.

Data-quality rules detect physically implausible values, large timestamp shifts,
identical stale forecasts over long periods, unexpectedly empty responses, sudden
station changes, parser failures, and observation gaps.

Never silently replace missing values with zero. In particular, missing
precipitation must not be interpreted as no precipitation.

## 17. User interface requirements

**17.1 Design language.** Nordic, calm, premium but minimal, highly legible
outdoors, suitable for quick checking, not overloaded with jargon. Support light and
dark mode. Use Norwegian in the initial UI. Labels: Nå, I dag, Time for time,
7 dager, Treffsikkerhet, Yr, Storm, Snitt, Tilpasset, Sikkerhet, Sist oppdatert,
Faktisk vær, Varslet, Avvik.

**17.2 Comparison visualisation.** Temperature: line charts for Yr, Storm, and
Custom, with actual observations for completed periods and provider toggles. Rain:
bars or interval indicators, distinguishing probability from amount. Accuracy:
simple provider rankings, metric values, sample counts, and no misleading truncated
axes.

**17.3 Explanation panel.** Every customised forecast is explainable, for example:
"Hvorfor 14°C? Yr predicts 13°C. Storm predicts 16°C. At the cabin, Storm has
recently been more accurate for 3-day daytime temperatures, but it has averaged
0.8°C too warm. The customised estimate is therefore 14.4°C." Generate explanations
from structured model inputs rather than an unconstrained language model.

**17.4 PWA features.** Installable PWA, responsive iPhone layout, application icons,
offline display of the latest successfully fetched forecast, visible stale-data
warning, safe-area support, fast initial load. Push notifications are a possible
future feature. Do not require App Store distribution for the first version.

## 18. Authentication and privacy

This is a private application. Initial auth options: Supabase magic link, passkey,
or a simple approved-user list. Do not expose administrative controls publicly.
Store secrets only on the server. Never expose Frost credentials, provider API
secrets, Supabase service-role keys, or private endpoint tokens. Apply row-level
security where appropriate. A single-user mode is acceptable initially, but the
design should allow a small number of family accounts.

## 19. Suggested technical stack

**Frontend**: Next.js (App Router), TypeScript, React, Tailwind CSS, shadcn/ui or a
similarly lightweight component system, Recharts or another accessible chart
library, PWA support.

**Backend**: Next.js server routes or server actions for normal requests, separate
scheduled jobs for ingestion and evaluation, Supabase Postgres, Supabase auth,
Supabase storage for compressed raw payloads if useful.

**Jobs**: Supabase scheduled functions, Vercel Cron, GitHub Actions for an early
prototype, or a small worker service. Choose a method that reliably supports jobs
every three hours. Do not depend on the user opening the app for data collection.

**Validation and testing**: Zod for external API validation, Vitest or Jest,
Playwright for core end-to-end flows, database migration tooling, strict TypeScript.

## 20. Provider adapter architecture

Keep all provider-specific parsing out of UI components. Suggested structure:

```
src/
  app/
  components/
  lib/
    weather/
      providers/
        met-norway/
        storm/
        pent/
        mock-storm/
      observations/
        frost/
      normalization/
      evaluation/
      ensemble/
      confidence/
      stations/
      units/
      time/
  jobs/
    ingest-forecasts/
    ingest-observations/
    evaluate-forecasts/
    build-custom-forecasts/
  types/
  db/
```

Validate provider responses before normalisation. When an external response schema
changes, fail visibly and create a data-quality event rather than silently
producing incorrect values.

## 21. Administrative functionality

A small protected admin section shows:

- **Provider status**: enabled/disabled, last successful fetch, last failure,
  response duration, parser version, most recent error.
- **Station mapping** (per location and variable): current primary station,
  fallback station, distance, elevation, available data, completeness, manual
  selection controls.
- **Job status**: last forecast ingestion, last observation ingestion, last
  evaluation, next expected run, failure log.
- **Model status**: active model version, training period, sample counts,
  validation performance, comparison against baselines.
- **Raw data inspection**: a limited, sanitised view of recent provider responses
  for debugging.

## 22. API and legal compliance

Before using any data source: review its terms of service; document attribution
requirements, usage limits, and whether caching is allowed; implement required
attribution; identify the app appropriately; avoid unnecessary calls; use
server-side caching; respect robots and access restrictions where applicable.

Provide a Data sources page listing Yr / MET Norway, Storm or Pent when enabled, MET
Norway Frost, observation station names, and last update times. Do not imply the
customised forecast is an official MET Norway, Yr, Storm, or Pent product.

## 23. Historical initialisation

Forecast accuracy cannot be reconstructed reliably from current forecast APIs unless
archived snapshots exist. Therefore: begin collecting immutable snapshots
immediately; do not pretend current observations provide historical forecast
accuracy; optionally investigate legitimate archived forecast datasets; keep
imported historical data clearly separated from live-collected data; mark source and
methodology.

During the initial learning period, show status such as "The local model is still
learning. 12 days of forecast history collected." Suggested thresholds (all
configurable): below 14 days insufficient, 14–30 days early estimate, 30–90 days
moderate basis, over 90 days useful rolling local skill, one full year seasonal
evaluation becomes meaningful.

## 24. Initial customised forecast rules

Implement a deterministic first version. For each target time and variable:
retrieve the latest valid forecast from each enabled provider; determine the
horizon; find historical metrics for the same location, variable, horizon bucket,
and recent range; bias-correct each provider if sufficient history exists; weight
each provider with regularised inverse error; combine corrected values; calculate
disagreement; calculate confidence; save the customised forecast and explanation
factors.

```ts
function createCustomTemperatureForecast(input) {
  const valid = input.providerForecasts.filter(isValid);
  if (valid.length === 0) {
    return unavailableResult();
  }
  if (valid.length === 1) {
    return {
      value: valid[0].value,
      confidence: horizonBasedConfidence(input.horizon),
      reason: "Only one forecast provider is currently available."
    };
  }
  const corrected = valid.map((forecast) => {
    const metrics = findRelevantMetrics(
      input.location, forecast.provider, "temperature", input.horizon
    );
    return {
      ...forecast,
      correctedValue: applyRegularizedBiasCorrection(forecast.value, metrics),
      weight: calculateRegularizedSkillWeight(metrics)
    };
  });
  const value = weightedAverage(corrected);
  const disagreement = providerSpread(corrected);
  const confidence = calculateConfidence({
    horizon: input.horizon,
    disagreement,
    sampleCounts: corrected.map(x => x.sampleCount),
    historicalError: corrected.map(x => x.mae)
  });
  return {
    value,
    confidence,
    providerInputs: corrected,
    explanation: buildStructuredExplanation(corrected)
  };
}
```

## 25. Rain forecast combination

Do not average all rain fields without understanding them. Treat separately:
precipitation probability, precipitation occurrence, and precipitation amount. When
both providers supply probability, calibrate each provider's historical
probabilities and combine using weighted probability. When only amounts are
available, estimate occurrence from positive amount, combine amounts carefully, and
retain high uncertainty.

For consumer display show phrases such as "Rain is likely between 14:00 and 17:00.
Customised estimate: 2–5 mm. Confidence: Medium." Avoid presenting 2.73 mm as
meaningful precision.

## 26. Notifications for a later phase

Design for, but do not necessarily implement initially: rain expected at the
apartment, frost expected at the cabin, heavy snowfall at the cabin, strong wind, a
major change from yesterday's forecast, unusually high forecast disagreement, and
better cabin weather than previously expected. Notifications should use the
customised forecast and include confidence.

## 27. Testing requirements

**Data normalisation**: MET timestamps, precipitation periods, missing values, unit
conversion, weather-code mapping, malformed responses.

**Forecast horizons**: daylight-saving changes, exact 24-hour horizon, seven-day
tolerance, issue time versus retrieval time.

**Evaluation**: signed and absolute temperature error, rain hit/miss/false alarm,
circular wind-direction error, interval matching, no observation available.

**Ensemble model**: equal provider performance, one provider missing, low sample
count, strong provider bias, extreme outlier, provider disagreement, weight
constraints.

**Jobs**: idempotency, duplicate ingestion, temporary provider failure, delayed
Frost data, retry behaviour.

**UI**: both locations render, unavailable Storm state, stale-data state, accuracy
sample count shown, installable PWA, mobile viewport.

## 28. Observability

Implement structured logs, job-run records, provider success/failure metrics,
ingestion counts, evaluation counts, data-lag monitoring, and error reporting.

Create visible warnings when: no new forecast has been received within six hours,
observations are delayed, a provider schema has changed, a station has stopped
reporting, or customised forecast generation failed. Do not send repeated alerts for
the same unresolved incident.

## 29. Performance

There are only two locations, so optimise for correctness and clarity rather than
scale. Still: cache current forecast responses; precompute dashboard aggregates;
index by location, provider, target time, and horizon; paginate raw history; avoid
returning raw payloads to the browser; keep home-screen requests fast. Targets:
cached home page data under one second, fresh server-side page response in a few
seconds, graceful rendering while one source is delayed.

## 30. Accessibility

Support sufficient contrast, readable font sizes, keyboard navigation, semantic
labels, screen-reader descriptions, weather information not communicated through
colour alone, metric units, and Norwegian date and time formats.

## 31. Delivery phases

**Phase 1: Foundation.** Project skeleton, database schema, authentication, two
fixed locations, geocoding/configuration, Yr/MET provider, Frost observation
provider, scheduled collection, raw and normalised storage, provider health
monitoring. End state: the app displays Yr forecast and actual observations for both
locations.

**Phase 2: Forecast history and accuracy.** Immutable snapshots,
forecast/observation matching, horizon calculation, accuracy metrics, a basic
accuracy dashboard, data-quality handling. End state: correct evaluation of Yr
snapshots from hours to seven days ahead as data accumulates.

**Phase 3: Storm/Pent integration.** Complete the investigation, then implement the
selected legitimate provider adapter. End state: display and evaluate Yr and Storm
separately.

**Phase 4: Customised forecast.** Simple average, bias correction, provider
weighting, confidence, explanations, customised hourly and daily forecast. End
state: a transparent local forecast for both properties.

**Phase 5: Refinement.** PWA polish, offline cache, improved visualisations, model
validation, seasonal analysis, optional notifications, optional local sensor
integration.

## 32. Acceptance criteria

The MVP is accepted when all of the following are true:

- The app contains exactly the two configured locations.
- It is usable on an iPhone and installable as a PWA.
- Yr forecasts are fetched from an official API.
- Forecast snapshots are stored immutably.
- Forecasts are stored for target times up to at least seven days ahead.
- Actual observations come from documented weather stations.
- Station choices are visible and manually overridable.
- Forecast horizons are calculated correctly.
- Temperature accuracy is shown using MAE and bias.
- Rain occurrence accuracy distinguishes hits, misses, and false alarms.
- The app does not treat missing data as zero.
- Storm unavailability does not break the application.
- The Storm/Pent access approach is documented.
- The app shows Yr, Storm, average, and custom values when available.
- The customised forecast includes confidence and an explanation.
- Accuracy views display sample counts.
- No seven-day accuracy is claimed before genuine seven-day snapshots have matured.
- Scheduled jobs run independently of user visits.
- API credentials remain server-side.
- Data-source attribution and update timestamps are visible.

## 33. Required documentation

Create `README.md` and, under `docs/`: `architecture.md`, `data-sources.md`,
`storm-data-source-investigation.md`, `station-selection.md`,
`forecast-snapshot-methodology.md`, `accuracy-metrics.md`,
`custom-forecast-model.md`, `operations.md`, `privacy-and-security.md`.

The README covers project purpose, screenshots or UI overview, local setup,
environment variables, database migrations, scheduled jobs, provider configuration,
deployment, and known limitations.

## 34. Environment configuration

Use an environment schema and validate it at startup. Potential variables:

```
NEXT_PUBLIC_APP_NAME=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
MET_USER_AGENT=
FROST_CLIENT_ID=
STORM_PROVIDER_MODE=
STORM_API_BASE_URL=
STORM_API_KEY=
APP_TIMEZONE=Europe/Oslo
CRON_SECRET=
```

Do not require Storm variables when Storm is disabled.

## 35. Implementation process

Before writing the full application: inspect the existing repository; summarise the
current state; identify missing prerequisites; propose the architecture; create the
database schema; build incrementally; run tests after each major phase; document
assumptions and unresolved issues. Do not fabricate working Storm integration, API
responses, or weather-station choices.

When external data access cannot be completed, provide the exact blocker, the
evidence gathered, a mock adapter, and the next concrete action required.

## 36. First task

Produce these deliverables before implementing all features: a concise architecture
decision record; the proposed repository structure; database schema and migration
plan; a data-source access plan; a specific plan for obtaining Storm data
legitimately; a method for selecting representative observation stations for both
addresses; a staged implementation backlog; risks and unresolved questions; and the
definition of the first runnable vertical slice.

The first runnable vertical slice should include both locations, fetch Yr forecasts,
retrieve actual observations, save immutable forecast snapshots, display current and
seven-day Yr forecasts, show the selected observation station, have a placeholder
state for Storm, and run locally and be deployable.

After presenting this plan, proceed with implementation unless an essential
credential or repository decision is missing.

## Important constraints

- Never overwrite historical forecasts.
- Never calculate long-range accuracy using a recent forecast.
- Never treat missing data as zero.
- Never invent Storm access.
- Never bypass access controls.
- Never claim a model is more accurate without out-of-sample evidence.
- Never hide provider or observation-data problems.
- Prefer transparent calculations over unjustified complexity.
- Keep the app focused on the two specified properties.
- Build a useful product before adding advanced machine learning.
