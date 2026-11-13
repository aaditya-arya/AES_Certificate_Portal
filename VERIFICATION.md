# Portal verification

Updated 13 November 2026 for the continuous form workflow. This supersedes the earlier step-by-step interface audit.

| Requirement | Verified behavior |
|---|---|
| Continuous report entry | All seven sections stay on one page; normal scrolling and section links update the active section. No completion or next-page gates remain. |
| Sidebar | Reports open with a transparent compact section rail. The sidebar panel slides away, seven section names stay available, and the icon-only control supports Ctrl+B and a hover shortcut hint. Mobile uses a drawer and a sticky seven-section strip. |
| Compact filters | Search-by, search text, accreditation, stage, status and date bounds fit two desktop rows. Filters combine and Reset clears them. |
| Remove Backup and Restore | JSON backup generation, import controls and validation are removed. Existing IndexedDB reports are retained. Automatic saving and Word/PDF downloads remain. |
| Dates and capitals | Dates can be typed or selected, impossible dates are identified, and uppercase entries and multiline uppercase lines appear bold. |
| Safe navigation | Leave confirmation saves before navigating. Failed saves keep the editor open. Populated entry, photo and report removal require confirmation. |
| Search | Names, guidance and entered scalar, row and photo values are indexed. Search jumps to and focuses the actual field in the continuous document. |
| Original section 5.0 | Default Word export preserves the original template section XML, including paragraph and run formatting. Existing custom text is retained until explicitly reset. |
| Comfortable entry | Main inputs use 18 px text, repeatable entries have individual labels, and descriptions have room to wrap. |
| Export fidelity | Word fills the original template. Direct PDF recreates the AES layout with automatic pagination, embedded fonts, photo captions and wrapped names. |

Nine model tests cover dates, linked narrative fields, validation, search, compound filters and legacy report preservation. Browser tests cover the continuous workflow, navigation and focus, shortcut behavior, filters, removal confirmations, storage failures, persistence, Word/PDF downloads and original section 5.0 XML. Accessibility and responsive results are documented in [STANDARDS.md](STANDARDS.md).

The earlier stress export verification confirmed all 130 activity tokens, 200 finding tokens, 250 caption tokens and a long inspector name in a multi-page PDF. The current change leaves PDF generation unchanged. Direct PDF export can paginate differently from Microsoft Word; use Word's Save as PDF for its exact rendering.
