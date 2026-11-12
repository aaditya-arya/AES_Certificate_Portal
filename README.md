# Akshar Engineering Services inspection portal

A browser application for preparing AES inspection reports from `FINAL_DOC.docx` and the fields in `Format_Filled_Required.pdf`.

## Run locally

Requires Node.js 20.19+ or 22.12+.

```powershell
npm ci
npm run dev
```

Open the Local URL printed by Vite. For production, run `npm run build` and serve `dist/` over HTTP. Do not open `index.html` directly from the filesystem.

## Report workflow

1. Create a report or open the supplied reference example as a separate draft.
2. Complete the seven editor steps, covering all eight numbered report sections.
3. Review the required fields and export Word or PDF. Draft export is available while fields are incomplete.
4. Download a JSON backup to preserve the editable report and its photographs.

The interface uses 16 px form text and 44–48 px primary controls. The report library contains search, stage/status filters, and direct Word, PDF, and Open actions. Extra report actions are under More. The sidebar menu can be collapsed, and becomes a drawer on smaller screens.

Use **Complete step & continue** to review each step. The progress bar counts reviewed steps, rather than prefilled fields. Editing a reviewed section invalidates that step and the final review. Optional photographs can be omitted while still completing their review step. **View all sections** shows the whole report in document order; its footer can confirm all displayed sections after validation. Form search looks through field names, guidance, and entered values, including table cells and photograph descriptions, and focuses the selected field.

Every report date can be typed (DD.MM.YYYY, DD/MM/YYYY, or ISO) or chosen through its keyboard-accessible calendar button. Invalid calendar dates are rejected by review validation and identified beside the input.

Leaving a changed report opens a save-before-leaving dialog. A failed write keeps the editor open. Pending writes trigger the browser's native close/reload warning. Populated row removal, photograph removal, report deletion, and replacement of custom section 5.0 text require confirmation.

The ten-row report details table and stage selector have a fixed structure. Equipment, reference documents, activity rows, calibration instruments, expenditure entries, and attendees start with one data row each. Their plus buttons add rows only to those repeatable lists.

The opening paragraph derives the requester from the client by default, and the inspection organization from the manufacturer by default. Both links can be disabled for a different organization. Its location is **organization, locality, state**. Street, city, and PIN remain in the full address in the report details table. The visit date is reused in the paragraph.

Photographs are stored with individual descriptions, can be reordered, and export in two columns. Signature images are optional and must be uploaded by the user. Original specimen signatures are not included.

## Export fidelity

Word generation fills a cleaned copy of the original `FINAL_DOC.docx` package. It preserves the template's section order, table structures, page dimensions, branding, styles, headers, and footer page-number fields. Repeated rows and photograph pairs are cloned from their template rows. Word recalculates page numbers on opening. Dynamic content changes page count.

Section **5.0 Details of activities carried out** is included from the original document by default. Its original Word XML is left unchanged, preserving paragraphs, list numbering, indentation and emphasis. Existing custom content is retained for older drafts. Existing custom text remains editable; restoring the original requires confirmation. New reports use the original section automatically. Uppercase fields and uppercase lines are shown in bold in the form and formatted accordingly in exports. Original section 5.0 emphasis is preserved as supplied.

The direct PDF export recreates the AES layout with embedded Noto Sans fonts, repeating page headers, footers, automatic table pagination, and photograph captions. Its pagination and typography can differ from Microsoft Word. To obtain exactly Word's rendering, open the exported `.docx` in Word and use **Save as PDF**.

## Storage and access

All reports and uploaded images are stored in **IndexedDB in the current browser**, under this site's origin. This version has no shared database, staff accounts, device synchronization, external report approval, or email delivery. The hosted Site is owner-private. Site access is separate from report storage.

Reports do not move automatically between the local development URL and the hosted URL. Use **Backup** and **Restore** to transfer them. Clearing browser data removes saved reports. Storage failures are surfaced with a backup action. Imported reports receive new IDs and are returned to draft for review.

“Ready” means the required-field checks passed and the user marked the report ready; it is not a third-party approval.

## Validation

```powershell
npm test
npm run build
npm run dev -- --port 5174
# In another terminal, with Google Chrome installed:
node tests/browser.mjs
# Override the test URL when using another port:
$env:AES_TEST_URL='http://127.0.0.1:5173'
node tests/browser.mjs
```

The integration script checks typed and calendar dates, invalid dates, live uppercase formatting, name/value search across all steps, completion and invalidation, save failure protection, removal confirmations, linked text, tables, photographs, original section 5.0 Word XML preservation, downloads, PDF preview, draft persistence, backup/restore, and mobile overflow. It also generates a stress PDF with long activities, findings, captions and inspector names. Verification files are written to the ignored `test-results/` directory. See [VERIFICATION.md](VERIFICATION.md) for the report audit and [STANDARDS.md](STANDARDS.md) for the W3C references, accessibility results, responsive matrix and Chrome/Firefox test commands.

## Source layout

- `src/model.js`: field schema, linked values, validation, reference example, backup import validation.
- `src/form-controls.jsx`: accessible typed/calendar dates, multiline live bold rendering, and report-detail rows.
- `src/accessibility.css`: contrast, focus, control boundaries, reflow and reduced-height adjustments.
- `src/focus.js`: dialog/drawer keyboard containment, focus restoration and shared scroll locking.
- `src/standard-activity.json`: section 5.0 paragraphs extracted from the original Word document.
- `src/main.jsx`: report library, form editor, review and export interactions.
- `src/storage.js`: browser persistence, image preparation, downloads and backups.
- `src/word.js`: fills the original Word template using namespace-aware XML.
- `src/pdf.js`: direct PDF generation.
- `public/report-template.docx`: cleaned original-format template.
- `public/example/`: source reference content for the optional example.
- `public/fonts/`: Noto Sans fonts and open font license for PDF embedding.

All template, example, branding and font assets required to run or build the portal are included. Original source documents and generated reports are not required to build the application. The originals in the development workspace were left unchanged.
