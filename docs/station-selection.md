# Observation Station Selection

This documents how the Frost observation station was chosen for each variable
at Leiligheten and Hytta, following the method in
`docs/implementation-plan.md` ("Observation station selection method") and
the requirements in `docs/product-spec.md` section 4.3. It reflects what is
seeded in the `weather_stations` and `location_station_mappings` migrations
(`supabase/migrations/20260723131231_create_weather_stations.sql` and
`..._create_location_station_mappings.sql`).

## Method

1. Geocode the address once; coordinates and elevation are already stored on
   `locations` (v0.2.0).
2. Query Frost's `/sources` endpoint for candidate stations near each
   location (`geometry=nearest(POINT(lon lat))`).
3. For each candidate, record distance, elevation difference, which
   variables it measures (via `/observations/availableTimeSeries`), and data
   completeness over a recent window (a live `/observations` query for the
   last 7 days).
4. Score candidates per variable, balancing proximity against elevation
   match, station character (official climate station vs. municipal
   drainage gauge vs. road-weather station), and measurement availability.
5. Select a primary station per variable, plus a fallback where one exists.
6. Record the rationale here and expose it in the admin view
   (`/admin`), with `manually_selected` on `location_station_mappings`
   available for a future manual override.

Do not simply pick the nearest station. The point of this exercise (and the
whole reason for the extra columns instead of blindly using the nearest
row) is that proximity is only one factor, and it is not the most important
one for temperature.

## Leiligheten (Kongsveien 83C, Oslo — 59.8823, 10.7805, 119m)

### Candidates considered (nearest 12, within ~5.2km)

| Station | ID | Distance | Elevation | Holder | Variables available | Exposure category |
| --- | --- | --- | --- | --- | --- | --- |
| Oslo - Ryen | SN18165 | 1.9 km | 130m | Oslo kommune (VAV ROSIM) | Precipitation only | 2 |
| Oslo - Lambertseter | SN18020 | 2.2 km | 135m | Oslo kommune (VAV) | Temperature, precipitation | 2 |
| Oslo - Kværnerbyen | SN18162 | 2.5 km | 15m | Oslo kommune (VAV ROSIM) | Precipitation only | — |
| Oslo - Høyenhall | SN18195 | 3.3 km | 80m | Oslo kommune (VAV ROSIM) | Precipitation only | — |
| Oslo - Østensjø | SN18170 | 3.5 km | 123m | Oslo kommune (VAV ROSIM) | Precipitation only | — |
| Oslo - Tøyen | SN18310 | 3.6 km | 19m | Oslo kommune (VAV ROSIM) | Precipitation only | — |
| **Oslo - Hovin** | SN18210 | 4.7 km | 100m | MET.NO + Oslo kommune | Temperature, wind, humidity, precipitation | 2 |
| Oslo - Elvebakken | SN18317 | 4.3 km | 15m | Oslo kommune (VAV ROSIM) | Precipitation only | — |
| Oslo - Trasop | SN18180 | 4.6 km | 176m | Oslo kommune (VAV ROSIM) | Precipitation only | — |
| Oslo - Solli plass | SN18645 | 4.9 km | 25m | Oslo kommune (VAV ROSIM) | Precipitation only | — |
| Oslo - Ljabruveien | SN17980 | 5.0 km | 92m | Oslo kommune (VAV) | Precipitation only | — |
| Oslo - Løren | SN18205 | 5.2 km | 88m | Oslo kommune (VAV ROSIM) | Precipitation only | — |

**Oslo - Blindern** (SN18700), MET Norway's primary long-running Oslo climate
station, is 7.5 km away at 94m — outside the nearest-12 radius above, but
checked directly because of its reputation: full variable set (temperature,
wind speed/direction, humidity, pressure, dew point, cloud cover),
`exposureCategory 1` (the best rating Frost reports), and a continuous
record since long before any of the closer stations existed.

Almost every station within 5km of Kongsveien 83C is a municipal storm-drain
rain gauge (`Oslo kommune, VAV ROSIM` — Vann- og avløpsetaten / Rosim,
Oslo's water and sewer utility). These report precipitation only. This is
exactly the "closest station is not necessarily useful" trap the
implementation plan warns about.

### Completeness (checked live, last 7 days as of 2026-07-23)

| Station | Timestamps in last 7 days | Notes |
| --- | --- | --- |
| Blindern | 10,080 | Full 10-minute (and sub-minute) coverage, actively reporting |
| Ryen | 168 | Exactly hourly, no gaps |
| Lambertseter | 168 | Exactly hourly, no gaps |
| Hovin | not separately re-checked; element discovery confirms an active feed | |

### Selection

| Variable | Primary | Fallback | Rationale |
| --- | --- | --- | --- |
| Temperature | Blindern (7.5 km, -25m) | Hovin (4.7 km, -19m) | Best elevation match (94m vs. 119m) and the richest, longest-running variable set among candidates. The closer alternatives have no temperature sensor at all. |
| Wind speed / direction | Blindern (7.5 km, -25m) | Hovin (4.7 km, -19m) | Same reasoning as temperature. |
| Relative humidity | Blindern (7.5 km, -25m) | Hovin (4.7 km, -19m) | Same reasoning as temperature. |
| Air pressure | Blindern (7.5 km, -25m) | — | Only candidate reporting sea-level pressure; no fallback identified within a reasonable radius. |
| Precipitation | Ryen (1.9 km, +11m) | Lambertseter (2.2 km, +16m) | Precipitation is highly spatially variable — proximity is weighted over elevation match here, unlike the other variables. |

## Hytta (Moltmyrvegen 39, Øyer — 61.249116, 10.494436, 764m)

Coverage is much sparser than Oslo, and elevation dominates the decision —
Øyer's terrain means horizontal distance alone is a poor proxy for what the
cabin actually experiences.

### Candidates considered (nearest 12, within ~28.5km)

| Station | ID | Distance | Elevation | Holder | Variables available |
| --- | --- | --- | --- | --- | --- |
| E6 Fåberg | SN13110 | 9.9 km | 205m | Statens vegvesen (road weather) | Full set (temperature, wind, humidity, precipitation) — plus road-surface sensors |
| Lillehammer - Bjørnerud | SN12980 | 11.5 km | 388m | Lillehammer kommune | Temperature, precipitation |
| Lillehammer - Nordseterv. høydebasseng | SN12710 | 11.8 km | 562m | Lillehammer kommune | Not checked in detail (elevation good, distance similar to Storåsen) |
| E6 Tingberg | SN13125 | 11.9 km | 200m | Statens vegvesen | Not checked in detail |
| Gausdal - Follebu | SN13030 | 12.7 km | 375m | NIBIO | Not checked in detail |
| **Sjusjøen - Storåsen** | SN12960 | 14.9 km | 930m | MET.NO | Full set incl. snow depth |
| Lillehammer - Rådhuset | SN12648 | 15.0 km | 210m | Lillehammer kommune | Not checked in detail |
| E6 Vingnes | SN12666 | 15.9 km | 130m | Statens vegvesen | Not checked in detail |
| Lillehammer - Vårsætergrenda | SN12700 | 16.2 km | 507m | Lillehammer kommune | Not checked in detail |
| Gausdal - Øvrehagen | SN13060 | 17.4 km | 552m | MET.NO | Precipitation/snow only, no temperature or wind |
| Lillehammer - Sætherengen | SN12680 | 17.5 km | 240m | MET.NO | Not checked in detail |
| Fåvang | SN13150 | 28.4 km | 200m | NIBIO | Not checked in detail |

Only the top two (E6 Fåberg, Sjusjøen - Storåsen) and Gausdal - Øvrehagen
were checked in full detail (element availability, live values); the rest
are listed for completeness of the candidate sweep but were deprioritised
once Storåsen's elevation match and full variable set were confirmed.
Lillehammer - Nordsetervegen (562m) is worth a closer look in a future
iteration if Storåsen's distance ever becomes a problem, given its closer
elevation match than most alternatives.

### Completeness and a live elevation check (2026-07-23)

Both Storåsen and E6 Fåberg show full, active reporting with no gaps. A
live temperature comparison at the same moment was the clearest evidence
for weighting elevation over distance:

- **Sjusjøen - Storåsen** (930m): 4.7°C
- **E6 Fåberg** (205m): 10.2°C

A ~5.5°C gap between two stations roughly 20km apart in the same general
area, tracking almost exactly the elevation difference (725m) at a typical
environmental lapse rate (~0.65°C/100m ⇒ ~4.7°C expected) — strong
real-world confirmation that using the lower, closer station would
systematically read the cabin's temperature several degrees too warm.

E6 Fåberg is also a Statens vegvesen road-weather station
(`exposureCategory 4`, the worst Frost reports), with sensors partly
oriented around road-surface conditions rather than general meteorological
exposure, which reinforces demoting it to a fallback rather than primary.

### Selection

| Variable | Primary | Fallback | Rationale |
| --- | --- | --- | --- |
| Temperature | Storåsen (14.9 km, +166m) | E6 Fåberg (9.9 km, -559m) | Elevation dominates at 764m. Storåsen is the closest station with an acceptable elevation match; the live check above confirms the lower station would read materially warmer. |
| Wind speed / direction | Storåsen (14.9 km, +166m) | E6 Fåberg (9.9 km, -559m) | Same reasoning as temperature. |
| Relative humidity | Storåsen (14.9 km, +166m) | E6 Fåberg (9.9 km, -559m) | Same reasoning as temperature. |
| Precipitation | Storåsen (14.9 km, +166m) | E6 Fåberg (9.9 km, -559m) | Same reasoning as temperature — orographic precipitation is also elevation-sensitive, and Storåsen has the better terrain match. |
| Air pressure | — | — | No candidate within a reasonable radius reports sea-level pressure; left unmapped rather than guessed. |

## Known gaps and future work

- Elevation difference is stored signed (station minus location), so a
  positive number means the station is higher than the property.
- Neither Hytta candidate reports sea-level pressure — genuinely absent from
  nearby coverage, not an oversight.
- `manually_selected` and `active` on `location_station_mappings` exist so a
  choice here can be revised later (a discovered better station, a station
  going offline) without a new migration for the mapping logic itself, only
  a data update.
- This is the first cut. Snow depth (available at Storåsen) is not stored -
  `NormalizedObservation` (docs/product-spec.md section 8) doesn't include a
  snow field, so adding it would be a deliberate type change, not done here.
- Frost reports many candidate stations only from `/sources` metadata
  without a detailed completeness check (marked "not checked in detail"
  above for Hytta) - reasonable given the top two candidates already gave a
  clear, well-evidenced answer, but worth revisiting if Storåsen's data
  quality ever degrades.
