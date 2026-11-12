# Portal audit and corrections

The existing local implementation and both exported files supplied from Downloads were inspected before changes. Existing work was retained; a snapshot of the prior source is in the parent workspace's `analysis/revision-audit/before/` directory.

| Requirement | What the inspected implementation did | Verified correction |
|---|---|---|
| Remove the promotional banner | Removed in local edits, while the selected hosted source still pointed at the earlier committed version. | The simplified source is built and published to the same existing Site. No promotional banner or summary cards remain. |
| Proper sidebar control | Collapse controls existed in two places. | One large Menu control collapses/expands the desktop sidebar. A large mobile menu opens the drawer. |
| Consistent steps 1–7 | Completion was inferred from prefilled content. The percentage used a different formula from the step tracker, and an empty report's visual bar had a minimum fill. | Completion is recorded after review. Every progress display uses completed steps. Edits invalidate the affected step and final review. |
| Safe navigation | The warning called autosaved edits “unsaved,” offered to overwrite them with the opening snapshot, and navigated even if manual saving failed. | Leave confirmation saves before navigating. Failed saves leave the editor open. Already autosaved changes are described truthfully. |
| Search all form fields | Search matched a fixed list of section keywords. | Field names, guidance and entered scalar/table/photo values are indexed. Results jump to and focus the exact control. |
| Select and type dates | Both controls existed, but parsing accepted impossible dates. The picker button was removed from keyboard tab order. | Dates can be typed or picked, calendar buttons are keyboard accessible, and real calendar dates are validated. |
| Bold capitals while typing | Whole-field capitals worked; mixed-case multiline fields could not show bold uppercase lines. | Text fields and synchronized multiline editing show uppercase entries/lines in bold without replacing native editing, selection or undo. |
| Original section 5.0 | Editable text and approximate formatting were reconstructed instead of retaining the original document section. | Default Word export leaves the original section XML unchanged. Existing custom reports retain their text and can be restored to the original with confirmation. |
| Clear report order | Local edits had begun reordering the form, but repeated labels, row-output examples and fixed page claims added clutter. | Fields follow the ten metadata rows and eight numbered report sections. Labels and examples identify what the user should enter; optional address components are explained. |
| Accessible daily use | Numerous small actions, duplicate displays, decorative content and a fourteen-column list. | Main controls are at least 44–48 px high, form text is 16 px, report actions are labeled, and the report list keeps six practical columns. |
| Correct exports | Long inspector names were truncated to the first PDF line. Some multi-page text boxes reused the prior page's border coordinate. | Full names wrap, and long activity text, findings and captions flow across pages without body text entering the footer. |

## Checks performed

- Eight model tests pass, including impossible dates, completion, field-value search, backup validation and legacy report preservation.
- Browser integration passes creation/editing, both date methods, live bold rendering, step completion/invalidation, field focus from search, row/photo confirmation, saving failure protection, Word/PDF downloads, PDF preview, backup/restore and mobile navigation/layout.
- The default Word export's section 5.0 was structurally compared directly with **FINAL_DOC.docx**, including attributes, paragraphs and run formatting. It is identical.
- The standard verification PDF contains the full inspector name and the last QAP clause.
- A ten-page stress PDF retained all **130 activity tokens**, **200 finding tokens**, and **250 caption tokens**, plus the full long inspector name. Every page contains its page footer; measured body text stays within the content bounds.
- Production build passes. Browser drafts remain local to their existing IndexedDB origin; existing report records are migrated in memory without deleting their values.

Direct PDF export recreates the AES layout. For Microsoft Word's exact pagination and typography, save the exported `.docx` as PDF from Word. Section 5.0's original Word formatting is preserved independently of that conversion.
