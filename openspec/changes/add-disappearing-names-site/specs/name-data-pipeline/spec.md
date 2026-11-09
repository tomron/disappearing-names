# Spec Delta

## Purpose

Turns the CBS given-names spreadsheet into validated static JSON that the site loads at runtime, including the change metrics used to find names that rose or vanished.

## ADDED Requirements

### Requirement: Ingest the CBS names release
The pipeline SHALL read the CBS given-names xlsx committed under `data/raw/` and extract rows of sector, year, sex, name, and count. It MUST NOT depend on network access to CBS at build time.

#### Scenario: Build from committed file
- **WHEN** the build runs with a CBS xlsx present in `data/raw/`
- **THEN** it produces the static JSON outputs without making any request to cbs.gov.il

#### Scenario: Missing raw file
- **WHEN** no xlsx exists in `data/raw/`
- **THEN** the build fails with a message explaining how to download the file from CBS in a browser and where to place it

### Requirement: Validate input structure
The pipeline SHALL fail the build with a descriptive error when the input lacks expected columns, contains non-numeric counts, or yields zero rows for a sector listed as supported.

#### Scenario: Unexpected layout
- **WHEN** a new CBS release changes the sheet layout so required columns cannot be found
- **THEN** the build fails and names the missing column instead of emitting partial data

### Requirement: Preserve sector and sex dimensions
Output data SHALL retain the sector (Jewish, Muslim, Christian-Arab, Druze) and sex dimensions published by CBS, and SHALL provide an "all sectors" and "all sexes" aggregate for each name.

#### Scenario: Aggregate matches parts
- **WHEN** a name has counts in several sectors for a year
- **THEN** its "all sectors" count for that year equals the sum of the sector counts

### Requirement: Represent three cell states
The pipeline SHALL distinguish three states per name, sex, sector, and year as CBS publishes them: a published count (5 or more), suppressed (CBS marks `..`, meaning 1 to 4 births), and zero (CBS marks `0`). Suppressed MUST NOT be recorded as zero.

#### Scenario: Suppressed year
- **WHEN** a cell contains `..`
- **THEN** the output marks that year as suppressed (1 to 4 births), not as 0 and not as a number

#### Scenario: Explicit zero
- **WHEN** a cell contains `0`
- **THEN** the output records zero births for that year

### Requirement: Handle the CBS workbook layout
The pipeline SHALL read the eight sheets (boys and girls for each of the Jewish, Muslim, Christian-Arab, and Druze sectors), with the header on row 3, the name in column A, the all-years total in column B, and one column per birth year from 1949 to 2024. Sector and sex MUST come from the sheet identity, not from cell contents.

#### Scenario: Sheet identified
- **WHEN** the sheet titled for Muslim girls is parsed
- **THEN** all its rows are tagged sector Muslim and sex female

#### Scenario: Names with no yearly count of 5 or more
- **WHEN** a name's total is 5 or more but every yearly cell is `0` or `..`
- **THEN** the name is kept in the data with its total and flagged as never individually published in any year

### Requirement: Reconcile totals and expose residual
The pipeline SHALL compare each name's all-years total with its yearly cells, SHALL fail the build when a total is below what its yearly cells require, and SHALL record any excess beyond the cells' maximum as a per-name residual of births outside the covered years.

#### Scenario: Total below its cells
- **WHEN** a name's total is less than its published counts plus one per suppressed cell
- **THEN** the build fails and names the sheet and row

#### Scenario: Residual recorded
- **WHEN** a name's total exceeds its published counts plus four per suppressed cell
- **THEN** the output records the excess as that name's residual and does not fail

### Requirement: Compute share of births
For each year, sector, and sex the pipeline SHALL estimate total births as the sum of published counts plus an estimate for suppressed cells, and SHALL compute each name's share against that estimate, so popularity can be compared across years with different total births. The estimation method MUST be recorded in the metadata and disclosed in the UI.

#### Scenario: Denominator includes suppressed names
- **WHEN** a year, sector, and sex contains suppressed cells
- **THEN** the estimated total exceeds the sum of published counts by the suppressed estimate

#### Scenario: Estimate is disclosed
- **WHEN** the metadata is read
- **THEN** it states how the denominator was estimated

### Requirement: Compute change metrics
The pipeline SHALL precompute, per name and per sector/sex slice, its peak year, peak share, latest share, and relative change between a baseline period and a recent period, and SHALL tag each name as a riser, faller, or neither.

#### Scenario: Vanished name
- **WHEN** a name had a substantial peak share in an early decade and is below threshold in the latest ten years
- **THEN** it is tagged as a faller with a change of at least the configured vanish ratio

#### Scenario: Rarity filter
- **WHEN** a name never reached the configured minimum peak count
- **THEN** it is excluded from the riser and faller lists and from the random picker

### Requirement: Emit compact, loadable outputs
The pipeline SHALL emit a small search index of all names and lazily loadable per-name series so that the initial page load does not require downloading all series.

#### Scenario: Initial payload
- **WHEN** a visitor opens the site
- **THEN** only the search index and shared metadata are fetched before the visitor selects a name

### Requirement: Record data provenance
Output SHALL include the CBS release identifier, the covered year range, and the build date, so the UI can display the source and freshness.

#### Scenario: Provenance available
- **WHEN** the site reads the metadata output
- **THEN** it contains the release identifier, first and last year, and build date
