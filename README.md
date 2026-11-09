# שמות שנעלמים (Disappearing Names)

A static Hebrew (RTL) site for exploring how Israeli given names rose and vanished, by sector and sex.
Data: Israel Central Bureau of Statistics (CBS), "current names of those born 1949-2024".

## Requirements

Node 20 or newer. No backend, no R.

## Data pipeline

```
data/raw/*.xlsx  ->  npm run build:data  ->  public/data/{meta,index,movers}.json + series/*.json
```

- `npm run build:data` reads the single `.xlsx` in `data/raw/`, validates it, and writes static JSON
  to `public/data/` (git-ignored; `npm run build` runs it first). It takes a couple of seconds.
- `npm test` includes a test that checks the workbook layout against the real file, so a changed CBS
  format fails with a clear message instead of producing bad data.
- Thresholds for "big change" (window length, minimum peak count, fall and rise ratios) are in
  `scripts/config.ts` and are written into `meta.json` on every build.

Output files:

| File                | Purpose                                                                 | Loaded                                 |
| ------------------- | ----------------------------------------------------------------------- | -------------------------------------- |
| `meta.json`         | release, year range, build date, thresholds, estimated births per slice | at start                               |
| `index.json`        | `[name, total, hasSeries]` for every name, most popular first (search)  | at start                               |
| `series/<hex>.json` | yearly series per name, sharded by first letter                         | when a name is opened                  |
| `movers.json`       | top risers and fallers per sector/sex slice                             | by Discover, Compare and "surprise me" |

Gzipped, the start-up payload is about 95 KB and the largest series shard about 125 KB.

### Reading the data correctly

- CBS omits names with fewer than 5 births in a year (per sex and sector). A yearly cell is a count
  (5 or more), `0`, or suppressed (`..`, 1 to 4 births). The pipeline keeps these three states apart.
- Shares use an estimated births total (published counts plus 2.5 per suppressed cell), because the
  file has no births totals. This is disclosed in the UI.
- Some names have births in the all-years total that the 1949-2024 cells do not explain (likely
  born before 1949; unconfirmed). They are kept and recorded as a `residual`.
- Names are as currently registered, not necessarily at birth. Spelling variants are separate names.

## Yearly update

CBS publishes new data each December, and `www.cbs.gov.il` blocks scripted downloads.

1. Download the new names workbook in a browser (see `data/raw/README.md`).
2. Replace the old `.xlsx` in `data/raw/` (keep exactly one file there) and update `data/raw/source.json`
   (release, file name, retrieval date, URL): the CBS license asks for these in the credit.
3. `npm test` to confirm the layout is unchanged, then `npm run build:data`.
4. Review `public/data/meta.json` (release, year range) and push.

## Deployment

One build serves all three modes. The only difference is the base path the site is built for.

### 1. Standalone on GitHub Pages, linked from your personal site

1. Push this project to a GitHub repository (branch `main`).
2. In the repository, open Settings, then Pages, and set Source to **GitHub Actions**.
3. Each push to `main` runs `.github/workflows/deploy.yml`: lint, typecheck, tests, build, publish.
4. The site is at `https://<user>.github.io/<repository>/`. Link to it from your personal site.

The workflow builds with the base path `/<repository>/` by default.

### 2. Under your personal domain (a subpath)

- If your personal site is already served by GitHub Pages on a custom domain, a project repository
  is served at `https://<your-domain>/<repository>/` automatically. Nothing to change: this is mode 1.
- To serve from a different path, set the repository variable `BASE_PATH` (Settings, Secrets and
  variables, Actions, Variables) to the path the files are served from, with leading and trailing
  slashes, for example `/names/`. Use `/` when the site has its own domain or sub-domain.
- If your personal site is hosted elsewhere, build for the path you will upload to and copy `dist/`
  there:

  ```
  BASE_PATH=/names/ npm run build    # then upload dist/ so it is served at https://<your-domain>/names/
  ```

Deep links such as `/names/discover` work on GitHub Pages because the build also writes `404.html`
(a copy of `index.html`). On a host that does not serve `404.html` for unknown paths, configure it to
fall back to `index.html` instead.

### 3. Embedded in a page of your personal site

Add an iframe that points at the site with `embed=1`:

```html
<iframe
  src="https://<user>.github.io/<repository>/?embed=1&view=explore&name=שרון"
  title="שמות שנעלמים"
  width="100%"
  height="520"
  style="border: 0"
  loading="lazy"
></iframe>
```

Embed mode hides the site header and navigation and keeps a one-line CBS attribution with a link to
the full site. Parameters (all optional except `embed`):

| Parameter           | Meaning                                                   |
| ------------------- | --------------------------------------------------------- |
| `embed=1`           | turns embed mode on                                       |
| `view`              | `explore` (default), `discover` or `compare`              |
| `name`              | the name to open (explore)                                |
| `names`             | comma-separated names, up to 5 (compare)                  |
| `sector`            | `jewish`, `muslim`, `christian` or `druze` (default: all) |
| `sex`               | `F` or `M` (default: both)                                |
| `mode`              | `share` to show share of births instead of counts         |
| `from`, `to`, `min` | year range and minimum peak count (compare)               |

Choose a `height` that fits your page; the content scrolls inside the frame if it is taller.

## Testing

```
npm test      # unit and component tests, plus checks against the real CBS file
npm run e2e   # real-browser checks (needs Chrome; set CHROME_PATH if it is not in the default macOS location)
```

`npm run e2e:live -- https://<host>/<base>/` runs the same kind of end-to-end pass against a deployed site
(search, surprise, feed, compare, embed, a phone profile, and first-load size).

`npm run e2e` covers the chart, explorer, discovery feed, comparison dashboard, embed mode (inside a
real iframe), accessibility (axe, light and dark), and a smoke test that serves the build under
`/disappearing-names/` and at the domain root the way GitHub Pages does.

## Development

```
npm install
npm run build:data   # generate public/data
npm run dev          # local dev server
npm test             # unit tests (vitest)
npm run lint
```
