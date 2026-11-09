# Tasks

## 1. Project scaffolding

- [x] 1.1 Initialize a Vite + TypeScript project with the chosen UI framework (Preact or Svelte), a `.gitignore`, and npm scripts `dev`, `build`, `build:data`, `test`; verify `npm run dev` serves a blank Hebrew RTL page
- [x] 1.2 Add Vitest and a lint/format setup; verify `npm test` runs a placeholder test and passes
- [x] 1.3 Add `data/raw/` with the CBS xlsx (Release 391/2025, `11_25_391t1.xlsx`, already downloaded by the user); still to do: add a README with browser download steps and verify they are accurate

## 2. Data pipeline (`name-data-pipeline`)

- [x] 2.1 Write the sheet layout already inspected (8 sheets, header row 3, name in A, total in B, years 1949-2024 in C-BZ, cell states number / `0` / `..`) into `data/raw/README.md`; verify a test asserts these facts against the real file
- [x] 2.2 Implement the xlsx parser module producing normalized rows (sector and sex from the sheet, year, name, state and count) with strict structural validation and descriptive errors; verify unit tests cover missing columns, non-numeric counts, `..` and `0` cells, total-only names, and a missing raw file message
- [x] 2.3 Implement aggregates (all sectors, all sexes), the three cell states, and estimated yearly birth totals (published plus 2.5 per suppressed cell); verify tests that aggregates equal the sum of parts, suppressed cells are never recorded as 0, and no total is below its yearly cells (excess is recorded as a residual, not an error)
- [x] 2.4 Implement share computation and change metrics (peak, baseline, recent, relative change, riser/faller tags) with thresholds in a config file; verify tests for a vanished name, a surged name, and the rarity filter
- [x] 2.5 Emit `meta.json`, `index.json`, sharded `series/*.json`, and `movers.json` into `public/data/` with provenance; verify the output schema test and report payload sizes, confirming initial load fetches only index and meta
- [x] 2.6 Document the pipeline and yearly update steps in the README; verify by running `npm run build:data` from a clean checkout following the docs

## 3. Shared app foundation (`site-deployment` shell)

- [x] 3.1 Implement the RTL Hebrew shell: layout, navigation among Explore, Discover, Compare, footer with CBS attribution, release, year range, and the below-5 note; verify visually at 360px and desktop widths and with a test that the attribution renders on every route
- [x] 3.2 Implement client routing with query-string state and the 404 fallback for GitHub Pages; verify deep links and refresh work under `vite preview`
- [x] 3.3 Implement the data store: cached lazy loading of meta, index, series shards, and movers, plus shared filter state (sector, sex); verify unit tests for caching and shard lookup
- [x] 3.4 Run the RTL chart spike with uPlot and Observable Plot (multi-series, hover, sparkline, Hebrew labels), pick one, and wrap it in a single chart component; verify the component renders a series with hover in RTL and record the decision in design.md

## 4. Explorer (`name-explorer`)

- [x] 4.1 Implement Hebrew name search with niqqud-insensitive prefix matching, popularity ordering, and the not-found message; verify unit tests for matching and a UI test for the empty state
- [x] 4.2 Implement the single-name chart with count/share toggle, peak highlight, hover details, and distinct rendering of below-threshold ranges; verify a rendering test and manual check on a name that vanished
- [x] 4.3 Implement sector and sex filters and the split-by-sector mode; verify tests that filters change the plotted series
- [x] 4.4 Implement the trajectory summary text and chart text alternative; verify tests on text for a fallen and a risen name
- [x] 4.5 Implement the Surprise-me button using `movers.json`, honoring sector/sex filters, with a label stating direction and magnitude; verify tests that picks always qualify within the active filter
- [x] 4.6 Implement shareable URL state for name and filters; verify reopening a shared URL restores the view

## 5. Discovery feed (`name-discovery-feed`)

- [x] 5.1 Implement card and sparkline components with plain-language Hebrew change text; verify tests for vanished and surged card text
- [x] 5.2 Implement the vanished and surged sections ordered by magnitude, with sector, sex, and peak-decade filters; verify filtering uses the selected slice's data
- [x] 5.3 Implement reshuffle and card-to-explorer navigation preserving filters; verify a test that reshuffle changes the selection and the click opens the right name

## 6. Comparison dashboard (`name-comparison-dashboard`)

- [x] 6.1 Implement multi-name chart with add/remove, legend, series limit message; verify tests for adding three names and exceeding the limit
- [x] 6.2 Implement filters (sector, sex, decade range, minimum peak count) applying to chart and tables; verify the decade-range test
- [x] 6.3 Implement sortable risers and fallers tables with row-to-chart action; verify sorting and row-add behavior in tests
- [x] 6.4 Implement URL encoding of names and filters; verify restoring a comparison from a URL

## 7. Embed, accessibility, and deployment (`site-deployment`)

- [x] 7.1 Implement embed mode (`?embed=1`, `view`, `name`) hiding header/footer chrome and keeping compact attribution; verify by loading in a test iframe page at small sizes without scrollbars
- [x] 7.2 Add accessibility pass: keyboard operation, labeled inputs, contrast, chart text alternatives; verify with an automated axe check on all three views
- [x] 7.3 Add the `BASE_PATH` build configuration and a subpath smoke test that serves the build at `/disappearing-names/` and checks assets, data fetches, and deep links return 200
- [ ] 7.4 Add the GitHub Actions workflow to build and deploy to Pages on push to main; verify a successful run and the live URL loads
- [x] 7.5 Write the README sections for the three deployment modes (standalone, subpath of personal domain, iframe snippet) and verify by following each against a local build

## 8. Final integration checks

- [x] 8.1 Confirm CBS terms of use allow publishing derived data and that attribution wording is correct; verify the footer text matches the CBS requirements
- [ ] 8.2 End-to-end pass on the deployed site: search, surprise, feed, compare, embed, and a mobile device; verify no console errors and record load-size numbers
- [x] 8.3 Spot-check 10 well-known names (for example one that vanished, one that surged, one stable) against the CBS spreadsheet values; verify the site's numbers match

## Workflow follow-up

- Archive the change after review and a successful production deploy.
- Verify the archived specs under `openspec/specs/`.
