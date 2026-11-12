# Web standards and browser verification

Verified on 12 November 2026 before the GitHub push. The interface remains a browser-local report application; these checks do not add staff accounts or a shared database.

## Reference requirements

The review uses the W3C's WCAG 2.2 guidance for:

- [Text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html): 4.5:1 for ordinary text and 3:1 for qualifying large text.
- [Keyboard operation](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html), [visible focus](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html), and [focus not obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html).
- [Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) at 320 CSS pixels. Data tables retain their own keyboard-accessible horizontal scrolling regions.
- [Minimum pointer targets](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html). Main actions are 44–48 px high; calendar actions are 44 px square.
- Programmatic control names, labels, heading order, landmark roles, dialog behavior, and error identification.

## Corrections from this review

- Darkened low-contrast helper text, table headings, placeholders, and status text while preserving AES branding.
- Aligned the Menu button's accessible name with its visible text.
- Added a skip-to-content link, strong focus indicators, and space for focused controls below sticky toolbars. Toolbars stop sticking on short viewports.
- Corrected the validation heading hierarchy and a named report preview's landmark role.
- Moved dialogs into a body portal. Dialogs trap keyboard focus, make their background inert, close with Escape, and restore focus when dismissed.
- Added equivalent keyboard focus behavior to the mobile navigation drawer. Closed mobile navigation is removed from the tab order.
- Made nested dialogs share the scroll lock correctly, preventing a stuck page after closing them.
- Corrected review-screen overflow at 320 px without hiding report content.
- Kept all-sections completion available from the review step, and revalidated legacy Ready records without discarding their field values.

## Automated results

| Check | Chrome | Firefox |
|---|---|---|
| Complete report workflow | Pass | Pass |
| Accessibility scans | 17 states, zero axe violations | 17 states, zero axe violations |
| Responsive cases | 83 cases pass | 83 cases pass |
| Keyboard navigation, focus containment and restoration | Pass | Pass |

Widths tested: **320, 375, 390, 640, 768, 820, 1024, 1440, and 1920 CSS pixels**. The layout matrix covers the empty and populated report library, all seven report steps, and error states. The scans cover template dialogs, nested mobile dialogs, navigation, review, and required-field errors as well as the normal form.

The workflow test covers typed/calendar dates, invalid date rejection, uppercase live formatting, all-field search and focus, step completion and invalidation, row/photo removal confirmations, failed-save protection, Word/PDF downloads, PDF preview, persistence, backups and restoration, all-sections completion when opened from review, and long PDF content. The default section 5.0 Word XML remains unchanged from the template.

Additional release checks: nine model tests, production build, dependency audit, production preview/export smoke check, and Git whitespace checks. Generated reports and browser backups stay in the ignored `test-results/` directory and are not part of the source push.

Automated checks and the documented keyboard flows are the scope of this verification, not a formal WCAG certification or exhaustive assistive-technology audit. The browser's built-in PDF viewer and exported PDFs are not covered by the web UI's axe result. See [VERIFICATION.md](VERIFICATION.md) for export fidelity and storage limits.

## Reproduce

```powershell
npm ci
npx playwright install chromium firefox
npm test
npm run build
npm run dev -- --port 5174 --strictPort
```

In another terminal:

```powershell
# Uses installed Google Chrome locally.
npm run test:browser
npm run test:standards

$env:AES_BROWSER='firefox'
npm run test:browser
npm run test:standards
```

Set `AES_TEST_URL` to change the origin. Set `CI=true` to use Playwright's bundled Chromium instead of installed Chrome. Each browser writes its workflow and standards results to separate JSON files in `test-results/`.
