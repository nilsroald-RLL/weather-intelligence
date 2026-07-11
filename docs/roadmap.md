# Roadmap and Strategy

This document describes where the project is going, what makes it worth building,
how it is versioned, and the exact ritual for shipping each iteration. It sits on
top of the phased plan in `docs/implementation-plan.md`. The phases describe the
engineering order. This roadmap turns that into small, shippable versions that a
human developer, or Claude Code, can follow one at a time.

## The vision

Most weather apps tell you what one provider predicts. This one does something more
useful and more honest: it remembers what every provider predicted, checks it
against what actually happened at your two exact locations, and gradually learns who
to trust for each place, each weather variable, and each forecast horizon. Over time
it produces a local forecast that is measurably better than any single source, and
it can explain why.

That is the whole idea. A small, calm, personal tool that earns trust with evidence
instead of claiming it.

## What makes it a strong project

- **A genuine data-engineering spine.** Immutable forecast snapshots plus honest
  horizon logic is a real problem done properly. It is the part most weather
  dashboards get wrong, and getting it right is what makes everything else
  possible.
- **Analytics with a point.** The accuracy dashboard is not decoration. It answers
  a concrete question every day: given how Yr and Storm have actually performed
  here, what is most likely to happen.
- **Transparency as a feature.** Every customised number carries a confidence level
  and a plain explanation built from real inputs, not a black box.
- **Nordic, focused design.** Two locations, done beautifully, beats a general
  platform done adequately.
- **Room to grow.** The same spine supports notifications, seasonal analysis, a
  local sensor at the cabin, and eventually a small contextual model, without any
  rewrite.

## Versioning scheme

The project uses semantic-style versioning: `MAJOR.MINOR.PATCH`.

- **MINOR** bumps are the normal unit of progress. Each iteration adds a coherent
  slice of capability and moves the version, for example `0.5.0` to `0.6.0`, and
  later `1.5.0` to `1.6.0`. The mechanism is identical at every stage.
- **PATCH** bumps are small fixes and polish within an iteration, for example
  `0.6.0` to `0.6.1`.
- **MAJOR** bumps mark a milestone the whole product turns on. `1.0.0` is the
  accepted MVP. A future `2.0.0` would be something like opening the app beyond
  personal and family use.

Everything up to and including the MVP lives in the `0.x` range. After `1.0.0`,
enhancements continue as `1.x` minor bumps.

## Milestones

Each milestone below is one iteration. The heading is the version it ships as. The
"Ships" line is the visible outcome. The "Done when" line is how you know it is
finished. Detailed tasks live in `docs/backlog.md`, and each milestone maps back to
a phase in `docs/implementation-plan.md`.

### v0.1.0: Foundation and documentation (done)

Ships: the repository, the full specification, architecture, plan, backlog,
environment template, and this roadmap.
Done when: a developer can clone the repo and understand the whole project from the
docs alone.

### v0.2.0: App scaffold and data model (Phase 1)

Ships: the Next.js app with TypeScript and Tailwind, environment validation at
startup, authentication, the two seeded locations, and the first Supabase migration
for the Phase 1 tables.
Done when: the app runs locally, a user can sign in, and both locations exist in the
database with correct coordinates and elevation.

### v0.3.0: Yr forecasts on screen (Phase 1)

Ships: the `MetNorwayProvider`, response validation, raw and normalised storage, and
a home screen showing current conditions and the seven-day Yr forecast for both
locations.
Done when: opening the app shows a real, current Yr forecast for Leiligheten and
Hytta.

### v0.4.0: Real observations and station selection (Phase 1)

Ships: the Frost observation adapter, candidate station discovery, a documented
station choice per variable, and an admin view showing the selection.
Done when: the app shows actual observed weather next to the forecast, and the
chosen station and its rationale are visible.

### v0.5.0: Scheduled collection and immutable snapshots (Phase 1 complete)

Ships: the three-hourly forecast job and hourly observation job, both idempotent and
protected by `CRON_SECRET`, plus provider health monitoring.
Done when: snapshots accumulate on schedule without anyone opening the app, and
history has started building.

### v0.6.0: Matching and horizons (Phase 2)

Ships: forecast-to-observation matching with consistent interval rules, and correct
horizon calculation for both continuous horizon and buckets.
Done when: a matured forecast can be paired with the right observation and its true
horizon is known.

### v0.7.0: Accuracy dashboard (Phase 2 complete)

Ships: temperature, precipitation, and wind metrics, a basic accuracy dashboard with
filters and sample counts, and data-quality handling.
Done when: the dashboard shows real Yr accuracy by horizon, and never claims
seven-day accuracy before genuine seven-day snapshots exist.

### v0.8.0: Storm integration (Phase 3 complete)

Ships: the documented Storm access investigation, a mock adapter, and, if a
legitimate source is confirmed, the real Storm adapter behind the common interface.
Done when: Yr and Storm are shown and evaluated separately, and the app still runs
correctly in Yr-only mode.

### v0.9.0: The customised forecast (Phase 4 complete)

Ships: the simple average, bias correction with shrinkage, error-weighted
ensembling within bounds, the confidence model, and the explanation panel.
Done when: both properties get a transparent local forecast with confidence and a
plain explanation for every value.

### v1.0.0: MVP

Ships: PWA install and offline behaviour, polish, and everything needed to meet the
acceptance criteria in `docs/product-spec.md` section 32.
Done when: every acceptance criterion is true and the scheduled jobs have run long
enough to show real matching across horizons.

## After the MVP

These are `1.x` enhancements. They are deliberately loose, since priorities will
become clearer once the app is in daily use.

- **v1.1.0** Richer visualisations: better temperature line charts with observations
  overlaid, clearer rain interval displays.
- **v1.2.0** Notifications: rain at the apartment, frost or heavy snow at the cabin,
  strong wind, and unusually high provider disagreement, each carrying confidence.
- **v1.3.0** Contextual model (Stage 3): an interpretable model using season, hour,
  disagreement, and more, activated only if it beats the baselines out of sample.
- **v1.4.0** Seasonal analysis: once a full year of history exists, seasonal and
  horizon-specific bias views.
- **v1.5.0** Local sensor support: a Netatmo, Ecowitt, Home Assistant, or MQTT
  sensor that can become the preferred observation source.
- **v1.6.0** Family accounts: polished multi-user mode with per-user preferences.

The point of listing 1.5 and 1.6 here is to show that a late-stage minor bump works
exactly like an early one. The version moves, the changelog records it, the tag is
pushed, and the README reflects the new state.

## Release ritual for every iteration

This is the repeatable loop. Whoever does the work, a human or Claude Code, follows
the same steps so the repository history stays clean and a developer can always pick
up where the last iteration left off.

1. **Branch.** Create a branch named for the version, for example
   `feature/v0.6-matching-and-horizons`.
2. **Build in small commits.** Implement the milestone. Keep commits focused and
   readable. Add or update tests alongside the code.
3. **Update the changelog.** Add a new version heading in `CHANGELOG.md` describing
   what was added, changed, or fixed.
4. **Update the backlog.** Tick the completed items in `docs/backlog.md`.
5. **Update the README.** Move the "Current version" and "Status" lines forward, and
   note anything a developer needs to know to run the new state.
6. **Update related docs.** If the iteration produced a methodology, write or update
   the matching file under `docs/` (for example `accuracy-metrics.md`).
7. **Open a pull request.** Review the diff. For anything touching credentials,
   scheduled jobs, or the accuracy logic, review it carefully.
8. **Merge to main.**
9. **Tag the release.** `git tag v0.6.0` then `git push --tags`.
10. **Optionally create a GitHub Release** from the tag, pasting in the changelog
    entry so the milestone is easy to find later.

The commands for a typical iteration look like this:

```bash
git checkout -b feature/v0.6-matching-and-horizons
# ...work, commit in small steps...
git add .
git commit -m "Add forecast-observation matching and horizon calculation"
git push -u origin feature/v0.6-matching-and-horizons
# open and merge the PR on GitHub, then:
git checkout main
git pull
git tag v0.6.0
git push --tags
```

## How a developer follows the project

Anyone joining reads, in order: `README.md` for orientation, this roadmap for where
things are going, `docs/backlog.md` for what is done and what is next, and
`CHANGELOG.md` for what changed and when. The current version in the README plus the
latest tag always tells you exactly where the project stands.
