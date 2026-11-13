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

Development proxy regression tests send actual Origin headers through Vite for both localhost and 127.0.0.1, while verifying unrelated origins remain blocked. `node tests/sidebar-browser.mjs` checks browser saves through that proxy, left-edge hover, icon direction, keyboard controls, stable section positions, logo navigation and mobile scroll restoration in Chrome or Firefox. The hosted verification script also sends the Site's Origin header.

The UI/PDF revision is covered by `node tests/refined-browser.mjs` in Chrome and Firefox: single-row search, secondary-filter controls, reset/search behavior, mobile filters, responsive form layouts and accessibility scans. It generates reference, randomized and extended-row PDF fixtures. `python scripts/check-pdf.py` (PyMuPDF required) checks the reference's four-page structure, repeated headers/footers, text bounds and end markers. Fonts use bundled Carlito with its SIL OFL license. This approximates Aptos; the PDF is not pixel-identical to the Word renderer.

Linked-document checks: `tests/documents.test.mjs` verifies upgrade from the original SQL schema without losing inspections, concurrent edits, all four module lifecycles, immutable history, attachment access/export/cleanup, linked-inspection deletion protection, release/closure requirements and invalid inputs. The hosted Worker test exercises document routes with D1/R2-compatible bindings. `node tests/documents-browser.mjs` covers all four editors/registers in Chrome and Firefox, inherited inspection fields/items, files, Word/PDF downloads, revision history, closure, related-document shortcuts, cancellation reasons, mobile reflow, accessibility and failed-save/unsaved-change protection. No writes were made to the Samsung reference portal during its review.

`tests/numbering.test.mjs` covers AES formatting, code overrides, concurrent allocations, stable and legacy references, deletion/non-reuse, ready-report validation and child-document sequences. `node tests/master-details-browser.mjs` covers code suggestions/overrides, typed dates, automatic reference display, live ten-row preview/narrative, code-field search, linked numbering, accessibility and desktop/mobile layouts in Chrome and Firefox. The reviewed Samsung Inspection Decide page exposed an application dossier and shared PO/application reference structure; its internal counter/date allocation algorithm was not inferred as fact from a single record. AES uses the separately selected AES reference format.

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
