# Design

## Context

Greenfield repo (only `.claude/` and `openspec/` exist). Requirements: see proposal.md and the five capability specs.

Constraints found while researching the source:
- CBS publishes counts per sector (Jewish, Muslim, Christian-Arab, Druze), sex, name, and year, from 1948/49 through 2024 (Release 391/2025, `11_25_391t1.xlsx`). Names with fewer than 5 births in a sex/sector/year are omitted.
- The real file (inspected, 8.1 MB, committed at `data/raw/11_25_391t1.xlsx`): 8 sheets (boys/girls x Jewish, Muslim, Christian-Arab, Druze); title row 1 says "current names of those born 1949-2024"; header on row 3; column A is the name, column B the all-years total, columns C-BZ are years 1949-2024. Cells are a number (5 or more), `0`, or `..` (1-4 births; consistent with the totals for 99.7% of Jewish-boy rows). Roughly 80% of rows (for example 5,023 of 6,319 Jewish boys) have no single year with 5 or more births and appear only through the total. There is no "all sectors" sheet and no yearly births totals row.
- "Current names" means the name as currently registered, which can differ from the name at birth; the UI notes this.
- `www.cbs.gov.il` resets scripted HTTP connections (observed `Connection reset by peer` with curl), so the build cannot reliably fetch the file.
- Hosting is GitHub Pages: static only, no server-side routing, possibly under a subpath of the user's custom domain.
- The data.gov.il "first names" dataset is from the Population Authority, not CBS, so it is out of scope as a source.

## Goals / Non-Goals

**Goals:**
- One static build that serves all three UI views and all three deployment modes.
- Small first-load payload; heavy data loaded lazily.
- Reproducible data build from a committed raw CBS file; yearly refresh is a file swap.

**Non-Goals:**
- No backend, accounts, or analytics service.
- No merging of spelling variants or etymology/meaning data.
- No English UI (Hebrew only, per decision).
- No regional breakdown (not published by CBS).

## Decisions

### D1: Data enters via a manually downloaded CBS xlsx in `data/raw/`
Because CBS blocks scripted downloads, the user downloads the file in a browser and commits it. The build never touches the network.
Alternatives: fetch in CI (fails on CBS bot protection); use the `babynamesIL` R package data (second-hand, lags releases, license unstated, user does not want R).

### D2: Node + TypeScript build script, parse with an xlsx library
`scripts/build-data.ts` reads the xlsx, validates, and writes JSON into `public/data/`. Keeps the whole project in one toolchain, with no R or Python dependency. The parser is a small module on `fflate` (unzip) with direct XML scanning, independent of zip entry order (ExcelJS's streaming reader failed on files whose `workbook.xml` follows the worksheets); ExcelJS is used only to write test fixtures. All are dev-only dependencies.

### D3: Vite + a lightweight UI framework (Preact or Svelte) with hash-free client routing
Vite gives a configurable `base` (needed for subpath deploys) and fast static output. A small framework keeps the bundle light for three views with shared state. Routing uses the History API with a `404.html` fallback copy of `index.html` (GitHub Pages SPA trick) so deep links survive refresh; query-string state encodes name and filters.
Alternatives: Astro (good for content, heavier for three interactive views), plain JS (state sharing across views becomes messy), Next.js static export (overkill).

### D4: Data layout
- `meta.json`: release id, year range, build date, sector/sex lists, thresholds used.
- `index.json`: compact array of names with total count, peak, and tags, sized for client-side search.
- `series/<shard>.json`: per-name series sharded (for example by first letter) so selecting a name fetches one small file.
- `movers.json`: precomputed rise/fall lists per sector x sex slice, for the feed, random picker, and ranking tables.
`movers.json` entries also carry a 19-point `spark` array (mean share per 4-year bin, scaled to 100) so feed cards need no per-name shard fetch. Series store counts per year with a sentinel for below-threshold; shares are derived from yearly totals in `meta.json`.

### D5: "Change" is based on share of published births
Total births grew, so raw counts mislead. The file has no births totals, so the denominator per year, sector, and sex is estimated: sum of published counts plus 2.5 per suppressed (`..`) cell (the midpoint of 1-4). Summing published counts alone would overstate shares more in recent years, when naming is more diverse and more cells are suppressed. Names whose total is below 5 are absent entirely, so the estimate is a slight underestimate; this is disclosed in `meta.json` and the UI. Alternative: take official births by population group from a separate CBS table (more accurate, a second manual download); revisit if the estimate looks distorted in spot checks (task 8.3).
Share = name count / estimated total. Suppressed cells count as 2.5 for averaging and are drawn as a range band, not a point. Defaults: baseline = peak decade-window average share, recent = last 10 years' average share; "vanished" if every recent year is suppressed or zero. Minimum peak count and the vanish ratio live in a config file and are recorded in `meta.json`.

### D6: Charts with Observable Plot (decided after an RTL spike)
Need multi-series lines, hover, a visibly distinct suppressed-year marker, and an accessible text alternative. Spike on real data in Chrome, both libraries in an RTL page: both rendered and responded to hover. Chosen: Observable Plot, because it outputs SVG (the wrapper exposes the chart as `role="img"` with a text summary), tooltips are built in, and suppressed years are ordinary `×` marks. Cost is about 95 KB gzipped against about 23 KB for uPlot, so Plot is imported on demand and the chart is wrapped in one component (`src/components/Chart.tsx`). Card sparklines are a tiny hand-written SVG and do not load the library. The y-axis title is rendered as page text, not in the chart, because Plot's rotated axis label was clipped in RTL.
Rejected: uPlot (canvas, so no DOM for accessibility; suppressed markers need custom drawing; its legend labels the x value in English, "Value"); Chart.js/ECharts (larger).

### D7: Three views as routes over one shared data store
Explorer (`/`), Discover (`/discover`), Compare (`/compare`) share a data-loading module with caching and a filter state module. The Surprise button reads `movers.json`.

### D8: Embed mode via query parameter
`?embed=1` (plus `view` and `name`) hides header/footer chrome, keeps a compact attribution, and reports no scrollbars. No postMessage API in v1.

### D9: Deploy with GitHub Actions to Pages
Workflow: install, build data, build site with `BASE_PATH` from a repository variable (default `/<repo>/`), upload Pages artifact, deploy. Personal-site integration is configuration only: standalone URL, custom domain, or subpath (set `BASE_PATH`), and the iframe snippet is documented in the README.

### D10: Hebrew handling
Normalize names (strip niqqud, normalize final letters only for matching, not display) for search. RTL via `dir="rtl"` and logical CSS properties. The chart time axis stays left-to-right (older to newer), the common convention for Hebrew-language data charts, while all text and layout are RTL. This sits behind one config flag so it is easy to flip.

## Risks / Trade-offs

- [CBS changes file layout in a new release] → Strict validation fails the build with a clear message; layout mapping isolated in one parser module.
- [CBS terms of use unclear for redistributing derived data] → Check terms before first public deploy; attribute CBS; keep raw file link to the official source.
- [Below-5 truncation makes "disappeared" ambiguous] → UI states it explicitly; suppressed (1-4) years are drawn distinctly from zero and from published counts.
- [Most names never reach 5 in a single year, so they have no usable series] → Flag them as total-only, exclude from charts, rankings, and the random picker; search still finds them and shows the total.
- [About 2.4% of rows (698 of 28,626, mostly Jewish names) have a column-B total above what the 1949-2024 cells can explain, by roughly one year's births; no row is below it] → Likely births before 1949 or otherwise outside the yearly columns (unconfirmed). Keep the total, record the residual per name, fail the build only if a total is below its own cells, and flag names whose residual is large as "peak may predate 1949" in the UI.
- [Spelling variants split a name's popularity] → Documented limitation; possible later enhancement.
- [Large JSON for ~tens of thousands of names] → Search index kept minimal, series sharded, gzip by Pages; measure bundle sizes in CI.
- [Subpath and deep-link breakage on Pages] → `base` config plus 404 fallback, covered by a subpath smoke test.
- [Chart library RTL quirks] → Short spike before committing; charts behind a wrapper component.
- [Noisy "big change" picks from tiny counts] → Minimum peak count filter and tunable thresholds.

## Migration Plan

Greenfield: no migration. Rollout: build locally, verify at root and subpath, enable GitHub Pages (source: GitHub Actions), then link or mount from the personal site. Rollback: revert the commit or disable the Pages deployment; no data store to restore.
Yearly update: download the new CBS xlsx, replace the file in `data/raw/`, run the build, review the diff in `meta.json`, push.

## Open Questions

- Exact CBS release listing page to cite in the README and footer (confirm when the file is downloaded).
- Whether to use a custom domain for the standalone deploy (does not affect the build).
