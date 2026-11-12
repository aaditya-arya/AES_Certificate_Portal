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

The ten-row report details table and stage selector have a fixed structure. Equipment, reference documents, activity rows, calibration instruments, expenditure entries, and attendees start with one data row each. Their plus buttons add rows only to those repeatable lists.

The opening paragraph derives the requester from the client by default, and the inspection organization from the manufacturer by default. Both links can be disabled for a different organization. Its location is **organization, locality, state**. Street, city, and PIN remain in the full address in the report details table. The visit date is reused in the paragraph.

Photographs are stored with individual descriptions, can be reordered, and export in two columns. Signature images are optional and must be uploaded by the user. Original specimen signatures are not included.

## Export fidelity

Word generation fills a cleaned copy of the original `FINAL_DOC.docx` package. It preserves the template's section order, table structures, page dimensions, branding, styles, headers, and footer page-number fields. Repeated rows and photograph pairs are cloned from their template rows. Word recalculates page numbers on opening. Dynamic content changes page count.

The direct PDF export recreates the AES layout with embedded Noto Sans fonts, repeating page headers, footers, automatic table pagination, and photograph captions. Its pagination and typography can differ from Microsoft Word. To obtain exactly Word's rendering, open the exported `.docx` in Word and use **Save as PDF**.

## Storage and access

All reports and uploaded images are stored in **IndexedDB in the current browser**, under this site's origin. This version has no shared database, staff accounts, device synchronization, external report approval, or email delivery. The hosted Site is owner-private. Site access is separate from report storage.

Reports do not move automatically between the local development URL and the hosted URL. Use **Backup** and **Restore** to transfer them. Clearing browser data removes saved reports. Storage failures are surfaced with a backup action. Imported reports receive new IDs and are returned to draft for review.

“Ready” means the required-field checks passed and the user marked the report ready; it is not a third-party approval.

## Validation

```powershell
npm test
npm run build
npm run dev -- --port 5173
# In another terminal, with Google Chrome installed:
node tests/browser.mjs
```

The integration script checks linked text, row counts, added rows, captions, exports, specimen-data removal, draft persistence, backup/restore, the reference example, and mobile overflow. It writes verification files to the ignored `test-results/` directory. The generated Word files have also been checked by opening and exporting them with Microsoft Word on the development computer.

## Source layout

- `src/model.js`: field schema, linked values, validation, reference example, backup import validation.
- `src/main.jsx`: report library, form editor, review and export interactions.
- `src/storage.js`: browser persistence, image preparation, downloads and backups.
- `src/word.js`: fills the original Word template using namespace-aware XML.
- `src/pdf.js`: direct PDF generation.
- `public/report-template.docx`: cleaned original-format template.
- `public/example/`: source reference content for the optional example.
- `public/fonts/`: Noto Sans fonts and open font license for PDF embedding.

The original source documents in the parent directory are unchanged. Asset preparation is recorded in `../analysis/prepare_assets.py` for traceability; it is not needed to run or build the portal.
