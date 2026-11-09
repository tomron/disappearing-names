# Spec Delta

## Purpose

Gives power users a dashboard to compare several names at once and to rank the biggest risers and fallers under chosen filters.

## ADDED Requirements

### Requirement: Compare multiple names
The dashboard SHALL let the visitor add several names and draw them together on one chart, with a legend and distinguishable series.

#### Scenario: Add names
- **WHEN** the visitor adds three names
- **THEN** one chart shows all three series over the same year range

#### Scenario: Limit of series
- **WHEN** the visitor tries to add more names than the supported maximum
- **THEN** the dashboard explains the limit and does not add the name

### Requirement: Dashboard filters
The dashboard SHALL provide filters for sector, sex, decade range, and minimum peak count, applying to both the chart and the ranked tables.

#### Scenario: Decade range
- **WHEN** the visitor narrows the range to 1980-2000
- **THEN** the chart and tables reflect only that period

### Requirement: Ranked risers and fallers
The dashboard SHALL show ranked tables of the largest risers and largest fallers for the current filters, with columns for name, peak year, baseline value, recent value, and relative change.

#### Scenario: Ranking updates with filters
- **WHEN** the visitor changes the sector filter
- **THEN** both tables are recomputed for that sector

#### Scenario: Row to chart
- **WHEN** the visitor selects a table row
- **THEN** that name is added to the comparison chart

### Requirement: Sortable tables
Table columns SHALL be sortable by the visitor.

#### Scenario: Sort by peak year
- **WHEN** the visitor sorts by peak year
- **THEN** rows are reordered accordingly

### Requirement: Shareable comparison state
The selected names and filters SHALL be encoded in the URL.

#### Scenario: Reopen comparison
- **WHEN** a visitor opens a URL with names and filters
- **THEN** the dashboard restores that comparison
