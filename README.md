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

The dashboard has three buttons: Completed (marked ready), Draft (required details filled and awaiting final review), and Remaining (required details still missing). Their counts come from SQL and each button filters the report list.

Reports use one continuous form with seven section anchors. The selected section follows scrolling. The icon-only control sits on the sidebar edge, appears when hovering the sidebar or left screen edge, and changes direction with its state. Keyboard focus reveals it and Ctrl+B toggles it. Section links retain their positions while its panel opens/closes. The company logo returns to the report list. Inputs use large type; repeatable entries have individual labels and plus buttons.

Create sample report or Fill sample report generates realistic random values, preserves extended row counts and uploaded photographs, and retains the original section 5.0. Existing entries require confirmation before replacement. A separate sample preserves the original report.

Changes save through the REST API. A failed save keeps the editor open; concurrent edits return a version conflict rather than overwriting another editor. Word and PDF remain available for drafts. Mark completed requires report validation to pass.

## REST API and integration

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

Word fills the cleaned original template and preserves section 5.0 XML. Direct PDF export recreates the layout and may paginate differently from Microsoft Word. Use Word's Save as PDF for Word's exact rendering. Original source documents in the parent workspace are unchanged.
