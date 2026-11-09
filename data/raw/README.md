# Raw CBS data

`11_25_391t1.xlsx` is the Israel Central Bureau of Statistics (CBS) release 391/2025: "Current names of
those born 1949-2024, by sex and population group, first name and year of birth".

## Getting a newer file

`www.cbs.gov.il` resets scripted connections, so download it in a browser:

1. Open https://www.cbs.gov.il/he/mediarelease/DocLib/2025/391/11_25_391t1.xlsx (for a newer release,
   find the latest "שמות פרטיים" press release on cbs.gov.il and download its table 1).
2. Save the file into this folder and update the path in `scripts/build-data.ts` if the name changed.
3. Update `source.json` in this folder: the release, file name, `retrieved` date (the day you downloaded it,
   YYYY-MM-DD) and the file's URL. The CBS license asks for these in the credit shown in the site footer;
   the build fails with a clear message if they are missing or inconsistent.
4. Run `npm test` (the layout test fails with a clear message if CBS changed the format), then
   `npm run build:data`.

## Layout (verified by `tests/cbs-layout.test.ts`)

- Eight sheets: boys and girls for each of the Jewish, Muslim, Christian-Arab and Druze sectors.
  Sector and sex come from the sheet name; there is no "all sectors" sheet and no births-total row.
- Row 1 is a title, row 2 the sheet name, row 3 the header; data starts on row 4.
- Column A is the name, column B the all-years total (`סך הכל`), columns C-BZ are the years 1949-2024.
- A yearly cell is a number (5 or more births), `0`, or `..` (suppressed: 1 to 4 births).
- Some numbers are stored as text with a thousands separator (for example `1,395`).
- Names are the names as currently registered, not necessarily at birth.
- Names with fewer than 5 births in total are not published. Most listed names never reach 5 in any
  single year and appear only through their total.
