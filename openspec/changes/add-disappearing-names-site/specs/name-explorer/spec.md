# Spec Delta

## Purpose

Lets a visitor search for a given name and see how its popularity changed over the years, by sector and sex, and discover names via a random big-change picker.

## ADDED Requirements

### Requirement: Search names in Hebrew
The site SHALL provide a search box that suggests matching names as the visitor types Hebrew text, matching on prefix and ignoring niqqud.

#### Scenario: Prefix suggestions
- **WHEN** the visitor types the first letters of a name
- **THEN** a list of matching names is shown, ordered by overall popularity

#### Scenario: No match
- **WHEN** the typed text matches no name in the data
- **THEN** the site shows a "name not found" message explaining that names given to fewer than 5 children are not published

### Requirement: Show popularity over time
For a selected name the site SHALL display a chart of its yearly count or share across the full covered year range, with a visitor toggle between count and share.

#### Scenario: Select a name
- **WHEN** the visitor selects a name
- **THEN** a line chart of that name over all covered years is shown with the peak year highlighted

#### Scenario: Hover details
- **WHEN** the visitor hovers or taps a point on the chart
- **THEN** the year and value for that point are shown

### Requirement: Filter by sector and sex
The explorer SHALL let the visitor filter the chart by sector and by sex, defaulting to all sectors and all sexes.

#### Scenario: Sector filter
- **WHEN** the visitor selects the Muslim sector
- **THEN** the chart shows only data for that sector

#### Scenario: Compare sectors
- **WHEN** the visitor chooses to split by sector
- **THEN** one line per sector is drawn on the same chart

### Requirement: Distinguish unpublished years
The chart SHALL visually distinguish years where the name is below the CBS publication threshold from years with a published count, and SHALL explain this in a visible note.

#### Scenario: Gap in data
- **WHEN** a name is unpublished for a range of years
- **THEN** that range is shown as "below 5 births" instead of as a measured zero

### Requirement: Summarize the name's trajectory
The explorer SHALL show a short summary: peak year, peak value, latest published year, and relative change from peak.

#### Scenario: Summary for a fallen name
- **WHEN** a name has fallen far from its peak
- **THEN** the summary states the peak year and the percentage drop

### Requirement: Flag peaks that may predate the data
When a name's all-years total includes substantially more births than its 1949-2024 yearly counts explain, the summary SHALL state that the peak may have been before 1949.

#### Scenario: Large residual
- **WHEN** a name's unexplained births are at least half of its highest yearly count
- **THEN** the summary adds that the peak may predate 1949

### Requirement: Surprise-me random big-change name
The explorer SHALL provide a button that selects a random name from those tagged as riser or faller, optionally restricted to a chosen sector and sex, and opens it.

#### Scenario: Random pick
- **WHEN** the visitor presses the surprise button
- **THEN** a randomly chosen riser or faller is displayed with a label stating it rose or fell and by how much

#### Scenario: Sector-restricted pick
- **WHEN** a sector filter is active and the visitor presses the button
- **THEN** the picked name has a qualifying change within that sector

### Requirement: Shareable URLs
The selected name and filters SHALL be reflected in the URL so that a view can be shared and reopened.

#### Scenario: Reopen shared link
- **WHEN** a visitor opens a URL containing a name and a sector filter
- **THEN** the explorer opens directly on that name with that filter applied
