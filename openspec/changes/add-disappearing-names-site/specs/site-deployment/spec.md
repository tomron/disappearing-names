# Spec Delta

## Purpose

Defines the Hebrew RTL site shell and how one build is deployed to GitHub Pages as a standalone site, under a subpath of a personal domain, or embedded in another page.

## ADDED Requirements

### Requirement: Hebrew right-to-left interface
All user-facing text SHALL be in Hebrew and the layout SHALL be right-to-left, including charts, tables, and navigation.

#### Scenario: Page direction
- **WHEN** any page loads
- **THEN** the document is marked Hebrew and RTL and no English UI strings are visible, apart from the CBS source name where appropriate

### Requirement: Navigation among the three views
The site SHALL provide navigation among the explorer, discovery, and comparison views, with the explorer as the landing view.

#### Scenario: Landing
- **WHEN** a visitor opens the site root
- **THEN** the explorer view is shown with navigation to the other two views

### Requirement: Source attribution and caveats
Every view SHALL show a visible attribution to CBS, the release identifier, the covered years, and the note that names given to fewer than 5 children are not published. The full site SHALL also give the CBS credit its license asks for (the CBS name, the title of the source file, the date it was retrieved, a link to the source file, and a link to the license), and SHALL state that the site is not CBS's and is not endorsed by it.

#### Scenario: Attribution visible
- **WHEN** a visitor views any page
- **THEN** a footer or about section shows the CBS attribution and data freshness

#### Scenario: Full credit and non-endorsement
- **WHEN** a visitor views the footer of the full site
- **THEN** it shows the retrieval date, links to the CBS file and license, and a statement that the site is not endorsed by CBS

### Requirement: Static hosting on GitHub Pages
The site SHALL be fully static and deploy to GitHub Pages through an automated workflow on pushes to the main branch.

#### Scenario: Deploy on push
- **WHEN** a commit is pushed to main
- **THEN** the workflow builds the data and site and publishes it to GitHub Pages

### Requirement: Configurable base path
The build SHALL accept a base path so the same site works at the domain root or under a subpath such as `/disappearing-names/`, with all assets, data files, and in-app links resolving correctly.

#### Scenario: Subpath build
- **WHEN** the site is built with base path `/disappearing-names/` and served at that subpath
- **THEN** pages, scripts, data files, and deep links load without 404 errors

#### Scenario: Deep link refresh
- **WHEN** a visitor refreshes on a deep link such as a specific name
- **THEN** the page loads correctly rather than showing a hosting 404

### Requirement: Embed mode
The site SHALL support an embed mode, enabled by a URL parameter, that hides the site header and footer chrome, keeps a small CBS attribution, and works inside an iframe.

#### Scenario: Embedded explorer
- **WHEN** the page is loaded with the embed parameter inside an iframe
- **THEN** it renders without the site header and navigation and remains usable at small sizes

#### Scenario: Embed a specific view
- **WHEN** the embed URL includes a view and name
- **THEN** only that view for that name is displayed

### Requirement: Responsive and accessible
The site SHALL be usable on phone-width screens and SHALL meet basic accessibility: keyboard operable controls, labeled inputs, sufficient contrast, and text alternatives for charts.

#### Scenario: Mobile layout
- **WHEN** the viewport is 360px wide
- **THEN** no horizontal page scrolling occurs and controls remain usable

#### Scenario: Chart text alternative
- **WHEN** a chart is shown
- **THEN** an accessible textual summary of the trend is available
