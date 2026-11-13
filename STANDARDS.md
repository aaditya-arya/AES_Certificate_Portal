# Node portal web and API verification

Verified 13 November 2026. The current application uses plain browser JavaScript and a Node.js/SQL backend. React has been removed.

## Web references

The UI review follows W3C WCAG guidance for [contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [keyboard access](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html), [focus visibility](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html), [reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) and [target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

The browser suite covers five accessibility states: empty dashboard, populated dashboard, continuous SQL-backed form, mobile editor and mobile drawer. It checks 44 layout cases across widths 320, 375, 390, 640, 768, 820, 1024, 1440 and 1920 CSS pixels. The seven section destinations are exercised on desktop and mobile.

Chrome and Firefox cover dashboard counts/filtering, SQL save/reopen, Ctrl+B and stable section geometry, random filling of extended rows, dates, typing focus, field search, photograph/signature upload, removal confirmation, Word/PDF export, original section 5.0 XML, completed status, failed-save protection and browser-data migration.

Automated axe scans and these keyboard flows are the verification scope, not formal WCAG certification or an exhaustive assistive-technology audit. The built-in PDF viewer and exported PDFs are outside the web UI axe result.

## API and persistence checks

API tests cover CRUD, SQL file persistence across reopen, ETag/If-Match conflicts, simultaneous editors, complete row/image round-trips, deduplicated local image bytes, JSON export, dashboard states, SQL-safe search, input validation, cross-origin checks, authenticated integration routes and the incremental deletion feed.

The hosted adapter test checks the built frontend, D1 API behavior and R2 image storage through compatible test bindings. Deployment and live API verification are separate release checks.

## Reproduce

```powershell
npm ci
npm run build
npm test
npm run test:browser
$env:AES_BROWSER='firefox'
npm run test:browser
```

`test:standards`, `test:ux` and `test:sample` run the same consolidated browser suite. Test databases and generated reports are isolated from `data/aes-portal.sqlite` and ignored by Git.
