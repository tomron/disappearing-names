# Proposal

## Why

Israeli given names shift dramatically across generations: names that were common in the 1950s are nearly extinct today, others surged recently, and the pattern differs by sector (Jewish, Muslim, Christian-Arab, Druze). The Central Bureau of Statistics (CBS) publishes the underlying counts, but only as spreadsheets and annual press releases, so there is no easy way for the public to explore how a name rose or vanished. A public, Hebrew-language site makes this history browsable and shareable.

## What Changes

- New static, client-side website (no backend) in Hebrew only, RTL, with data sourced exclusively from CBS name releases.
- A build-time data pipeline that reads the CBS xlsx (committed under `data/raw/`) and emits compact static JSON: per-name yearly series by sector and sex, plus precomputed change metrics.
- Three views over the same data:
  - **Explore**: search a name, see its popularity over the years, filter by sector and sex, and a "surprise me" button that shows a random name with a big rise or fall.
  - **Discover**: a feed of cards (sparklines) for names that vanished or surged, filterable by sector and sex.
  - **Compare**: multi-name comparison chart, filters, and ranked tables of top risers and fallers.
- Explicit explanation in the UI that CBS omits names given to fewer than 5 children (per year, sex, sector), so "disappeared" means "fell below the reporting threshold".
- Deployment to GitHub Pages via GitHub Actions, supporting three modes from one build: standalone URL, subpath under the user's personal domain (configurable base path), and an embed mode (no site chrome, iframe-friendly).
- Documented yearly update flow: download the new CBS xlsx in a browser (CBS resets scripted connections), commit it, rebuild.

## Capabilities

### New Capabilities
- `name-data-pipeline`: Ingest the CBS names xlsx and produce validated, versioned static JSON, including change metrics and the below-threshold semantics.
- `name-explorer`: Search a name and view its popularity over time by sector and sex, plus the random "big change" picker.
- `name-discovery-feed`: Card feed of names that vanished or surged, with sparklines and sector/sex filtering.
- `name-comparison-dashboard`: Multi-name comparison chart, filters, and ranked risers/fallers tables.
- `site-deployment`: Hebrew RTL shell, GitHub Pages deployment, configurable base path, and embed mode.

### Modified Capabilities
<!-- None: greenfield project, no existing specs. -->

## Impact

- New code: Vite-based static frontend, Node data-build script, GitHub Actions workflow. All greenfield.
- Dependencies: a charting library, an xlsx parser (build-time only), Node tooling. No runtime server or R.
- Data: CBS release files are committed as raw inputs; attribution to CBS is required in the UI. CBS terms of use should be checked before publishing derived data.
- External: GitHub Pages hosting; optional custom domain/subpath on the user's personal site.

## Assumptions

- Sub-groups are sector x sex, which is what CBS publishes; no regional breakdown exists.
- "Big change" is measured on share of births (per year, sector, sex), not raw counts, since total births grew over time.
- Names with very low peak counts are excluded from the random picker and rankings to avoid noise; thresholds are tunable.
- Spelling variants of the same name remain separate entries; no automatic merging.
