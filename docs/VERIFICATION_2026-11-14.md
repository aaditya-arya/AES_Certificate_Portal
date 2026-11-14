# Portal verification — 14 November 2026

Application baseline: `8989e01`. Tests ran locally on Windows with Node 22.23.1, installed Chrome and Playwright Firefox. The application source required no functional correction in this pass. The Vite test harness was corrected to allocate explicit ephemeral ports: Vite treats `port: 0` as its default development port, which could interfere with a running portal. The proxy, sidebar and refined-browser checks passed again with the normal portal running separately on port 5173.

## Results

| Check | Result |
| --- | --- |
| `npm test` | 38 passed, no failures or skipped tests |
| `npm run build` | Production frontend and hosted Worker built successfully |
| `node tests/node-browser.mjs` | Chrome and Firefox passed; 44 responsive layouts and 5 clean axe scans per browser |
| `node tests/report-links-browser.mjs` | Chrome and Firefox passed |
| `node tests/dossiers-browser.mjs` | Chrome and Firefox passed |
| `node tests/documents-browser.mjs` | Chrome and Firefox passed |
| `node tests/conflict-browser.mjs` | Chrome passed |
| `node tests/master-details-browser.mjs` | Chrome passed |
| `node tests/sidebar-browser.mjs` | Chrome passed, including real Vite proxy |
| `node tests/refined-browser.mjs` | Chrome passed, including single-row search and PDF fixture generation |
| `python scripts/check-pdf.py` | Reference 4 pages, random sample 5 pages, extended sample 6 pages; content bounds, page headers/footers and end markers passed |
| Local running-app Copy link check | API 1.3.0; register button, clipboard fallback, returned URL and exact numbered report opening passed on port 5173 |

For Firefox, run each browser script with `AES_BROWSER=firefox` in its environment. Test artifacts and screenshots are under the ignored `test-results/` directory. Browser suites create populated reports and linked documents in isolated in-memory databases; normal saved reports are not replaced. The local Copy link check reads an existing report without editing it.

## Flows exercised

- Empty and populated dashboard; completed, draft and remaining counts; combined search/filter/reset; continuous seven-section navigation.
- Typed/calendar dates, invalid date feedback, automatic AES numbering, stable assigned numbers, source-table narrative derivation and linked module numbering.
- Creating reports, filling randomized sample data and added rows, editing, autosaving, reloading, adding photographs/captions and signatures, and preserving SQL values.
- Unique report links, direct loading/reloading, back/forward navigation, clipboard fallback, missing/deleted links, colliding references and old aliases after corrected numbers.
- Editable blank and legacy Section 5.0; long expanding text; beginning/middle/end retained in Word; PDF generation and responsive sizing.
- Word/PDF downloads; legacy template preservation; PDF page boundaries and repeated headers/footers.
- Dossier assignments, eight resource groups, metadata, file download/ZIP contents, overall results, issued PDF retention, locks and cancellation reasons.
- Flash, IRC, Punch and NCR creation, editing, attachments, exports, revisions/history, issue and cancellation; quality closure requests/approval records and reopening safeguards.
- Concurrent edit conflicts, cancelled reloads, confirmed reloads, failed saves, unsaved-navigation prompts and recovery without dropping entered values.
- Sidebar edge hover, changing icon, Ctrl+B, mobile drawer, Escape focus, logo navigation, scroll unlocking and stable section rail geometry.
- SQL persistence, row/media round trips, migration preservation, optimistic concurrency, atomic numbering, integration/origin checks and local hosted-Worker D1/R2 adapter tests.

Automated axe scans used WCAG A/AA tags through 2.2 on the tested screens; this is not a complete manual accessibility certification. Desktop/mobile screenshots were also inspected. No unresolved failure remained in the checks above.

## Scope boundaries

This pass validates the local Node application, production build and simulated hosted storage bindings. It does not represent a new live hosted deployment or a fresh comparison with the Samsung service. The unknown phone application and its integration contract remain untested. Engineer sign-in and per-engineer ownership enforcement remain deferred by the user; unique report links identify reports and do not grant authorization. Existing private hosted access is unchanged.
