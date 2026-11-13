# Akshar Engineering Services inspection portal

A Node.js application with a plain HTML/CSS/JavaScript interface, a versioned REST API and SQL persistence. React and React DOM have been removed. The continuous AES form, original Word template, PDF export, photographs, typed/calendar dates, section navigation and random sample filling are retained.

## Run locally

Requires Node.js 22.13 or newer.

```powershell
npm ci
npm run build
npm start
```

Open http://127.0.0.1:3001. The SQL database is created automatically on first startup.

For development, use `npm run dev`. This starts the Node API on port 3001 and the frontend on port 5173. `START_PORTAL.cmd` starts development mode. To use another frontend port, run `npm run dev -- --port 5174`.

## Where data is stored

| Environment | Report data | Photographs and signatures |
|---|---|---|
| Local Node.js | `data/aes-portal.sqlite` | Binary image bytes in the same SQLite database |
| Hosted Site | Cloudflare D1, binding `DB` | Cloudflare R2, binding `BUCKET` |

The default local database path is relative to this project. `DATABASE_PATH` can select another file. SQLite may also create `-wal` and `-shm` companion files while running. Database files, local environment files and test artifacts are ignored by Git. GitHub contains code and schema migrations, not saved user reports.

SQL tables:

- `reports`: report JSON, searchable metadata, workflow state, timestamps and revision version. All six repeatable row arrays are retained inside the report JSON.
- `report_media`: links between a report and its photographs/signatures.
- `media_blobs`: deduplicated binary image bytes for the local Node server.
- `report_changes`: incremental create/update/delete events for integration.

Existing IndexedDB reports are copied into SQL when opening the upgraded portal at the same browser origin used previously. Existing server reports are not overwritten during migration, and the original browser copy is retained. Separate origins and the local/hosted SQL databases do not synchronize automatically.

## Dashboard and workflow

The dashboard has three buttons: Completed (marked ready), Draft (required details filled and awaiting final review), and Remaining (required details still missing). Their counts come from SQL and each button filters the report list. Search scope, query, status and reset share one row; secondary filters open from Filters and show an active count. The form uses compact metadata rows, aligned labels and readable writing controls.

Reports use one continuous form with seven section anchors. The selected section follows scrolling. The icon-only control sits on the sidebar edge, appears when hovering the sidebar or left screen edge, and changes direction with its state. Keyboard focus reveals it and Ctrl+B toggles it. Section links retain their positions while its panel opens/closes. The company logo returns to the report list. Inputs use large type; repeatable entries have individual labels and plus buttons.

Create sample report or Fill sample report generates realistic random values, preserves extended row counts and uploaded photographs, and retains the original section 5.0. Existing entries require confirmation before replacement. A separate sample preserves the original report.

Changes save through the REST API. A failed save keeps the editor open; concurrent edits return a version conflict rather than overwriting another editor. Word and PDF remain available for drafts. Mark completed requires report validation to pass.

## REST API and integration

Flash reports, inspection release certificates (IRC), Punch lists and non-conformance reports (NCR) have separate searchable registers and continuous forms. Open them from the sidebar, dashboard module buttons, or **Related documents** on an inspection row. That shortcut scopes the register and preselects the inspection for new documents. Inspection details and initial equipment items are inherited from the saved inspection; document content and status are stored independently.

- Flash/IRC: save drafts, issue, cancel an issue with a reason, or create the next draft revision. Issued versions are locked.
- Punch/NCR: save drafts, open for action, record owners/target dates and item resolutions, then close after entering verification, reviewer and closure date. NCR closure also requires root cause and corrective action. Reopening requires a reason.
- An unconditional IRC release is blocked while the inspection has open Punch/NCR records. A conditional release requires written conditions.
- Attach PDFs, Word documents and photographs with descriptions; download current files or historical versions. Maximum 10 files, 5 MB each, 20 MB total per document. Every save/transition creates an immutable snapshot. Files removed from the current version remain available to previous versions until the entire draft is deleted.
- Download Word/PDF from the editor or register. Existing AES inspection report exports retain their original template; the new modules use separate AES-branded layouts.

These records use the same `data/aes-portal.sqlite` file locally and the existing D1/R2 bindings when hosted. Tables are `inspection_documents`, `document_files`, `document_versions` and `document_events`. A linked inspection cannot be deleted while it has documents. These modules use explicit **Save** controls and warn before leaving unsaved entries. They are a shared private workspace; prepared/reviewed names are recorded fields, not separate authenticated approval roles. There is no connection to Samsung's database or sign-in system, and no Samsung credentials are stored in the application.

See [API.md](API.md) for routes, JSON examples, authentication and integration guidance. The machine-readable contract is available at `/api/v1/openapi.json`.

The standard API is ready for another application to consume; no app-specific outbound integration is configured. Complete JSON export includes fields, rows, inline image data, the derived opening paragraph/location and version metadata. The change feed includes deletions.

## Configuration and hosting

Copy `.env.example` to `.env.local` when changing defaults. Node listens on localhost by default. Binding it to a network address requires `PORTAL_PASSWORD`; the browser username is `aes`. `API_KEY` enables Bearer-authenticated `/api/v1/integration/*` routes. The key is never embedded in frontend code. `ALLOWED_ORIGINS` is a comma-separated list of permitted browser origins for integrations.

The existing private Site retains its URL and audience. Its hosting runtime uses a Worker adapter with D1/R2, while the standalone application runs on Node.js with SQLite. Both use the same validation, SQL schema, API and plain JavaScript frontend. `.openai/hosting.json` declares the hosted bindings. `drizzle/` contains generated schema migrations, applied on Node startup and by Sites during deployment. Request handlers never create database tables.

## Verification

```powershell
npm run build
npm test
npx playwright install chromium firefox
npm run test:browser
$env:AES_BROWSER='firefox'
npm run test:browser
```

Browser tests use isolated in-memory SQL databases. API tests check disk persistence, version conflicts, image round-trips, filters, validation and integration authorization. Hosted adapter tests exercise SQL/R2 bindings. See [STANDARDS.md](STANDARDS.md) and [VERIFICATION.md](VERIFICATION.md).

## Source layout

- `server/index.js`: standalone Node HTTP server and local access configuration.
- `server/api.js`: REST routes and HTTP errors.
- `server/repository.js`: SQL report/media storage and change feed.
- `server/validation.js`: report schema and workflow validation.
- `server/sqlite.js`: local SQLite connection and migrations.
- `db/schema.js`, `drizzle/`: SQL schema and generated migrations.
- `src/app.js`, `src/views.js`, `src/library.js`: plain JavaScript controller and HTML views.
- `src/api-client.js`: server persistence and one-time browser migration.
- `src/model.js`, `src/sample-data.js`: report schema, validation and random samples.
- `src/word.js`, `src/pdf.js`: AES report exports.
- `worker/index.js`, `scripts/build.mjs`: hosted adapter and artifact packaging.

Word fills the cleaned original template and preserves section 5.0 XML. Direct PDF export follows the supplied reference's Letter page geometry, section order, tables, two-column photographs and sign-off. Repeating headers are drawn after pagination so table continuations retain branding. The bundled OFL-licensed Carlito font approximates the reference's Aptos typography; it is not an exact Microsoft Word rendering. The reference-data fixture has four pages, while added rows and long captions can require more. Original source documents in the parent workspace are unchanged.
