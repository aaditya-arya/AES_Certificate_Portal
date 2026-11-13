# Portal conversion verification

Updated 13 November 2026 for the Node.js conversion.

| Requirement | Resulting behavior |
|---|---|
| Remove React | Plain JavaScript controller and HTML views; React, React DOM, JSX and Lucide React dependencies removed. |
| Simple dashboard | Completed, Draft and Remaining counts are read from SQL. Cards filter the report list. |
| SQL storage | Node uses `data/aes-portal.sqlite`; rows are retained in report JSON and image bytes in linked SQL tables. |
| Standard REST API | Versioned CRUD, search/pagination, complete JSON export, dashboard counts, OpenAPI and a change feed. |
| Preserve existing records | Same-origin browser reports migrate into SQL without overwriting existing server records or deleting the browser originals. |
| Prevent lost updates | If-Match versions protect updates/deletion; database transactions keep report/media/event changes consistent. |
| Preserve report entry | Seven continuous sections, large controls, typed/calendar dates, field search, linked narrative, table row controls, photographs and sign-off. |
| Preserve sample fill | Fresh coherent random values, extended row counts and image preservation. |
| Preserve report output | Word/PDF downloads and original section 5.0 XML preservation verified in browsers. |
| Hosted continuity | Existing private Site uses the same API/schema through D1/R2; the standalone app uses Node/SQLite. |
| Linked documents | Separate Flash, IRC, Punch and NCR registers/forms, linked inspection context, explicit save, attachment storage and Word/PDF exports. |
| Document lifecycle | Flash/IRC issue and revision, cancellation reason, Punch/NCR action/closure/reopening requirements, immutable saved history and version protection. |
| Quality safeguards | Unconditional IRC release blocked by open quality records; linked inspections protected from deletion. |

API/model tests and browser checks are described in [STANDARDS.md](STANDARDS.md). [API.md](API.md) describes the integration contract. Local and hosted storage locations are listed in [README.md](README.md).
