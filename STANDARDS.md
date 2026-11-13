# Web standards and browser verification

Verified on 13 November 2026 before the GitHub push. The interface remains a browser-local report application; these checks do not add staff accounts or a shared database.

## Reference requirements

The review uses the W3C's WCAG 2.2 guidance for:

- [Text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html): 4.5:1 for ordinary text and 3:1 for qualifying large text.
- [Keyboard operation](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html), [visible focus](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html), and [focus not obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html).
- [Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) at 320 CSS pixels. Data tables retain their own keyboard-accessible horizontal scrolling regions.
- [Minimum pointer targets](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html). Main actions are 48–54 px high; calendar actions are 46 px square.
- Programmatic control names, labels, heading order, landmark roles, dialog behavior, and error identification.

## Corrections from this review

- Darkened low-contrast helper text, table headings, placeholders, and status text while preserving AES branding.
- Replaced Menu text with an icon-only sidebar control, an accessible action name and a Ctrl+B hover hint.
- Added a skip-to-content link, strong focus indicators, and space for focused controls below sticky toolbars. Toolbars stop sticking on short viewports.
- Corrected the validation heading hierarchy and a named report preview's landmark role.
- Moved dialogs into a body portal. Dialogs trap keyboard focus, make their background inert, close with Escape, and restore focus when dismissed.
- Added equivalent keyboard focus behavior to the mobile navigation drawer. Closed mobile navigation is removed from the tab order.
- Made nested dialogs share the scroll lock correctly, preventing a stuck page after closing them.
- Corrected review-screen overflow at 320 px without hiding report content.
- Replaced narrow editable table cells with labelled, responsive entry cards and 18 px inputs.
- Removed the progress bar and template controls; kept section names visible and interactive in the compact sidebar.
- Added selected-field report search and compound accreditation, stage, status and inspection-date filters, with reset and explicit Edit actions.
- Fixed the menu icon and destructive-action text contrast.
- Converted the editor to one continuous page with scroll-linked section anchors and no section-completion gates.
- Added icon-only sidebar controls, the Ctrl+B shortcut, slide transitions and automatic collapse when opening a report.
- Added a sticky mobile section strip, and removed backup/restore functionality while retaining saved records.
- Reduced the desktop filters to two rows and prevented layout animation from causing overflow during a resize to mobile.

## Automated results

| Check | Chrome | Firefox |
|---|---|---|
| Complete report workflow | Pass | Pass |
| Accessibility scans | 13 states, zero axe violations | 13 states, zero axe violations |
| Responsive cases | 90 cases pass | 90 cases pass |
| Keyboard navigation, focus containment and restoration | Pass | Pass |
| Compact navigation, entry cards and report filter workflow | Pass | Pass |

Widths tested: **320, 375, 390, 640, 768, 820, 1024, 1440, and 1920 CSS pixels**. The layout matrix covers the empty and populated report library, all seven scroll destinations in the continuous form, and error states. The scans cover storage-help dialogs, nested mobile dialogs, navigation, review, and required-field errors as well as the normal form.

The workflow test covers typed/calendar dates, invalid date rejection, uppercase live formatting, all-field search and focus, continuous scrolling and active-section tracking, row/photo removal confirmations, failed-save protection, Word/PDF downloads, PDF preview, persistence, absence of backup/restore controls, and marking ready without section-completion gates. The default section 5.0 Word XML remains unchanged from the template.

Additional release checks: twelve model tests, production build, dependency audit, production preview/export smoke check, and Git whitespace checks. Generated reports and browser test artifacts stay in the ignored `test-results/` directory and are not part of the source push.

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
npm run test:ux

$env:AES_BROWSER='firefox'
npm run test:browser
npm run test:standards
npm run test:ux
```

Set `AES_TEST_URL` to change the origin. Set `CI=true` to use Playwright's bundled Chromium instead of installed Chrome. Each browser writes its workflow and standards results to separate JSON files in `test-results/`.

## Sample-fill verification

The sample-fill suite covers filling a blank form, creating a sample from the report list, all seven sections and eight photographs, canceling and confirming replacement, preserving the original through Create separate sample, Word/PDF export, save/reopen, failed table/photo loading, and edits made during loading. It checks the replacement dialog and filled form with axe, and reflow at 320, 390, 768 and 1440 px. Run `npm run test:sample` with the same browser and URL environment variables above.

## Stable rail and random extended-row samples

The editor rail keeps the same coordinates in its open and collapsed states. A dedicated browser check compares all seven button rectangles and the form rectangle through pointer and Ctrl+B toggles at 1440x900, 1024x768 and 900x640. It also checks mobile drawer navigation and accessibility in both desktop states.

Random sample tests exercise extra equipment, document, activity, calibration, expense and attendee rows added through the UI. Existing counts and row IDs are retained, every row cell is populated, repeated fills generate fresh values, and extended rows are included in exported Word and PDF files. Model tests additionally check larger row counts, date ordering, quantities, original section 5.0 content and preservation of uploaded images. Run `node tests/sidebar-random-browser.mjs` with the standard browser/URL variables to reproduce.
