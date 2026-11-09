# Spec Delta

## Purpose

Presents an editorial feed of names that vanished or surged, so visitors can browse interesting changes without knowing what to search for.

## ADDED Requirements

### Requirement: Feed of vanished and surging names
The site SHALL present sections of cards, including at least "names that vanished" and "names that surged", each card showing the name, a sparkline of its history, and its relative change.

#### Scenario: Open the feed
- **WHEN** the visitor opens the discovery view
- **THEN** both the vanished and surged sections are shown with cards ordered by magnitude of change

### Requirement: Filter the feed
The feed SHALL be filterable by sector and sex, and by the decade in which a name peaked.

#### Scenario: Filter by sector
- **WHEN** the visitor selects the Druze sector
- **THEN** the cards show only names qualifying for that sector, using that sector's data for sparklines and change

#### Scenario: Filter by peak decade
- **WHEN** the visitor selects the 1970s
- **THEN** the cards show only names whose peak year falls in that decade

### Requirement: Expand a card
Selecting a card SHALL open the name in the explorer view with the same filters applied.

#### Scenario: Card to explorer
- **WHEN** the visitor selects a card
- **THEN** the explorer opens on that name and filters

### Requirement: Fresh picks
The feed SHALL offer a way to reshuffle which qualifying names are displayed, while keeping the most extreme changes available.

#### Scenario: Reshuffle
- **WHEN** the visitor presses the reshuffle control
- **THEN** a different selection of qualifying names is shown

### Requirement: Cards are readable and explain change
Each card SHALL state in Hebrew plain language the peak period and the current situation, such as "peaked in the 1950s, no longer published".

#### Scenario: Vanished card text
- **WHEN** a card represents a name now below threshold
- **THEN** its text states that the name is no longer published and when it peaked
