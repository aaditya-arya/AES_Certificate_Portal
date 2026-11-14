# Inspection workflow audit and implementation contract

Reviewed 13 November 2026. This file is the durable task context. Do not replace functional checks with UI screenshots or describe AES as an exact Samsung clone.

## Evidence and limits

The authorized temporary account was used read-only. The inspected route was Inspection Result → Input Inspection Result, dates 2026-04-01 through 2026-11-13, the June record, then Inspection Decide. Existing Flash and IR screens were also opened. Browser-delivered client handlers were inspected to distinguish visible controls from actual validation and navigation. No Samsung save, issue, delete, upload, revision or approval operation was executed.

Raw authenticated snapshots and downloaded client scripts are local, ignored evidence under `test-results/reference-audit/`. They contain account/project data and must not be committed. This document paraphrases behavior; Samsung source code, credentials and private documents are not included in AES.

Observed client checks establish intended browser behavior, not independently verified private server rules. External document-management services, permission rules and approval routing cannot be proved by a read-only account. Tests against AES establish AES behavior, not private Samsung server equivalence.

## Findings → executable requirements

| Area | Observed behavior | AES requirement and verification |
|---|---|---|
| Register | Project/status/PO/date/assignment filtering; row links carry project, PO, application type/sequence and related-report context. | Searchable register, persistent inspection relationship, separate dossier entry; integration/browser tests. |
| Inspection Decide | Application information and calendar; notification/item-list files; project/assignment, witness method, client witness, agency and inspector; IAD, M/R/specification, vendor documents, additional files, formats and special instructions. | Durable dossier with master-data inheritance, assignment state, grouped resources, revision/approval/tag metadata and item list. |
| Downloads | Group selections; selected files; all files; multiple files use a ZIP archive. Vendor documents can open a separate enterprise repository. | Local/hosted file storage and selected/all ZIP downloads. External enterprise repository access remains an integration gap. |
| Flash | Result, summary, non-conformance description and action item fields are checked; image captions are checked; issue checks for at least three images. | Validate at issue time; drafts remain savable. Full test fixtures include three captioned images. |
| Flash revision | Revision increases; date is reset to current date; visit findings, items and photos are cleared; previous issued file/history remains accessible. | New visit revision with retained immutable prior snapshot, not a copy silently presented as a new visit. |
| Punch | The register checks for an existing open Punch at project/vendor/PO scope before Add. | Reject a second open Punch for that scope; allow a new one after closure. |
| IR | Draft save checks photo names/time validity; issue requires overall inspection result and inspector stamp; issued/submitted records disable editing. Approval/organization affect cancellation rights. | Separate save/completion from issue; validate result/stamp and completeness, retain an issued PDF artifact, lock edits until explicit cancellation with reason. Named reviewers are not an authenticated approval system. |
| Quality records | IR shows live open Punch/NCR counts and linked records. | Live dossier summary and links; IRC unconditional release gate uses open records. |
| Naming | Shared PO/application lineage is visible. The private sequence allocator was not observed. | Use the user's chosen AES format, allocated atomically, and preserve legacy references. Do not assert that the AES allocator reproduces Samsung's private algorithm. |

## Deliberate AES choices

- AES's own Word/PDF report template and continuous seven-section editor are retained.
- Reference format is `AESPL/client/vendor/IR/inspector/YYMM/DD-sequence`; related documents inherit it. This is the user's instruction, not Samsung's number format.
- AES assignment actions operate in the existing private shared workspace. They do not impersonate Samsung users or claim role/approval equivalence.
- Report master details are entered once; dossier and document context read from those records.
- Demo records must be visibly labelled TEST/SAMPLE, use test-only stamps/files, and remain identifiable by a scenario marker.

## Verification obligations

For every implemented rule, keep negative tests as well as a happy path: missing fields, empty selection, invalid dates/files, stale versions, locked issue, duplicate open Punch, cancelled issue, and historical-file access. Browser tests must click real controls and verify persistence/reload and downloaded archive contents. Create fully filled scenarios in AES, with an artifact manifest listing their IDs/statuses and explicit test-only labelling.

## Parity not claimed

Samsung role administration, project/PO/material master integrations, external drawing repositories, email/distribution rules, private server approval routing and its proprietary number allocator remain outside demonstrated parity. Do not turn these entries green without new evidence and corresponding tests.

## Implemented and checked, 14 November 2026

- Register: report/PO/assignment field search, master details and an Inspection details entry.
- Dossier: inherited application table, assignment dates/state/contact/witness information; item list; live linked document/open-quality counts; all eight resource groups with document number, revision, approval code and tag metadata.
- Resources: persistent SQL/R2 bytes, individual downloads and selected/all ZIPs; cross-inspection file access blocked; stale-version protection. AES currently accepts PDF, DOCX, XLSX, ZIP, PNG/JPEG up to 5 MB each, a deliberate local limit rather than claimed Samsung equivalence.
- IR: issue-time completeness/result/stamp/assignment checks, actual generated PDF snapshot, server-enforced report/assignment locks, cancellation reason/history and immutable prior issued artifacts. Report and dossier versions participate in concurrency checks.
- Flash: three captioned photographs and required findings/action fields at issue; fresh visit content on revision with prior evidence retained. Confirmation explains the reset.
- Punch: open-list duplication checked by normalized project/vendor/PO, including inside the atomic write to prevent concurrent openings.

Executable evidence: `tests/dossiers.test.mjs`, `tests/dossiers-browser.mjs`, `tests/documents.test.mjs`, `tests/documents-browser.mjs`, and the existing report/browser suites. Browser assertions inspect ZIP contents, downloaded PDF bytes, disabled issued fields, cancellation, assignment persistence, eight resource groups and open-quality counts. Axe scans and 320?1440 px checks cover the dossier. Automated SQL/R2 tests include invalid files, missing stamp/result, stale requests, simultaneous issue/edit and duplicate open Punch.

`npm run seed:workflow` retains three local scenarios and writes their actual IDs to ignored `data/workflow-test-manifest.json`. They are synthetic fixtures, not copied Samsung project data. `DRAFT-COMPLETE` retains editable drafts; `OPEN-ACTIONS` has open Punch/NCR and conditional IRC; `CLOSED-RELEASED` has closed actions, released IRC and issued IR. The visible stamp states SAMPLE / TEST ONLY.

Remaining boundaries: the assignment calendar is represented by editable inspection/application/check dates, not Samsung's per-day allocation grid; no external project/vendor/material directory, drawing repository, email distribution, authenticated reviewer approval, or Samsung server transaction was reproduced. Those require a separately specified integration and role model. These are functional limits, not claims of completed parity.

## Additional client audit: IRC, Punch and NCR

On 14 November the browser's service configuration and the three referenced static client assets were read with same-origin GET requests. No private service write endpoints were called. The IRC Issue handler checks the release decision, inspection result, signed packing list and reported-by file, and blocks issuing unsaved edits. Punch exposes Open/Request-for-closing states; Approved/Closed cannot be selected directly by the inspector. NCR checks item name/title at save, and inspector description plus an NCR file when requesting closure. Organization-dependent approval remains a server/role boundary.

AES now provides file-purpose metadata, IRC result/packing-list/reporter-evidence issue checks, NCR item/title fields, and `open ? closure_requested ? closed` transitions. Pending closure locks editing; cancelling the request requires a reason. The final action is labelled **Record approved closure**: it records a review outcome in the shared private workspace and does not claim a separately authenticated approver. Incomplete AES drafts remain savable; title/item checks run before opening the NCR rather than blocking draft capture.

Tests explicitly reject missing IRC evidence, direct closure from Open, missing NCR-file evidence and reasonless request cancellation. Requested closure remains an outstanding quality record and blocks unconditional release. Current released test scenarios include a labelled synthetic packing-list PDF, NCR PDF and reporter stamp.
