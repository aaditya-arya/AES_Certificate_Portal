# AES REST API v1

Local base URL: `http://127.0.0.1:3001/api/v1`. The hosted portal exposes the same `/api/v1` routes behind its existing private access boundary. OpenAPI 3.1 JSON is available at `/api/v1/openapi.json`.

## Routes

| Method | Route | Purpose |
|---|---|---|
| GET | `/health` | SQL connection status and storage type |
| GET | `/dashboard` | Completed, draft, remaining and total counts |
| GET | `/reports` | Searchable, paginated summaries without image bytes |
| POST | `/reports` | Create a report |
| GET | `/reports/{id}` | Complete editable report and image data URLs |
| PUT | `/reports/{id}` | Replace a report; requires `If-Match` |
| DELETE | `/reports/{id}` | Delete a report; requires `If-Match` |
| GET | `/reports/{id}/export` | Download the complete JSON integration payload |
| GET | `/reports/{id}/media/{mediaId}` | Read a photograph or signature image |
| GET | `/changes?after=0` | Incremental created, updated and deleted events |
| GET | `/openapi.json` | Machine-readable API contract |

## JSON format

Create/update accepts the report object itself, not the response envelope. Missing fields on creation receive the standard portal defaults. The full field schema is generated from the shared report model in OpenAPI. Dates are stored as ISO `YYYY-MM-DD` strings, and table quantities retain their units.

```json
{
  "reportNo": "AES/EXAMPLE/001",
  "client": "Example Engineering Ltd.",
  "project": "Transformer inspection",
  "manufacturer": "Example Electrical Works Ltd.",
  "inspectionDate": "2026-11-13",
  "state": "Maharashtra",
  "status": "draft"
}
```

The six row arrays are `persons`, `equipment`, `documents`, `activities`, `calibration` and `expenses`. Every row has a stable `id` and the column fields shown in OpenAPI. `photos` contains `{id, data, caption, name}`. The two signature fields are `inspectorSignature` and `reviewerSignature`.

Image values use JPEG/PNG/WebP data URLs. A request is limited to 32 MB, an image to 6 MB, each repeatable table to 1000 rows, and photographs to 100 entries. The browser resizes uploaded images before saving. Image bytes are separate from the SQL report JSON and reassembled for detail/export responses.

Typical detail/export response:

```json
{
  "schemaVersion": "1.0",
  "data": {
    "report": {"id":"report-id", "reportNo":"AES/EXAMPLE/001", "client":"Example Engineering Ltd."},
    "version": 2,
    "workflow": "draft",
    "updatedAt": "2026-11-13T08:00:00.000Z",
    "derived": {"openingParagraph":"...", "inspectionLocation":"...", "requester":"...", "inspectionEndDate":"13.11.2026"}
  }
}
```

The abbreviated example omits most report fields. Actual detail/export responses include the full form, rows and image data. Linked requester/location values are normalized before storage. The derived opening paragraph uses organization, locality and state; the full address remains in the inspection location.

## Versions and safe updates

POST returns `201`, an `ETag` such as `"1"`, and `{data:{id,version,workflow,createdAt,updatedAt}}`. GET detail also returns the current ETag. PUT/DELETE require that value in `If-Match`; stale writes return `409 VERSION_CONFLICT`, and missing versions return `428 VERSION_REQUIRED`. Writes and their media metadata/change events are transactional. Deleted IDs are retired; create a new ID rather than resurrecting one.

`status` is `draft` or `ready`. The derived `workflow` is `completed` for a valid ready report, `draft` for a filled report awaiting review, or `remaining` when required details are missing. Setting `status: ready` before required validation passes returns `422` with details. Drafts can retain unfinished field values.

## Search and pagination

`GET /reports` supports `q`, `searchBy`, `workflow`, `status`, `stage`, `accreditation`, `dateFrom`, `dateTo`, `limit` and `offset`. Limits are 1 through 100; offsets are non-negative integers. Search-by values include `all`, `reportNo`, `client`, `project`, `manufacturer`, `location`, `inspector` and `equipment`.

```json
{"data":[{"id":"...","reportNo":"...","workflow":"draft","version":2}],"meta":{"total":1,"limit":50,"offset":0}}
```

## Connecting the other application

For a first integration, list report summaries, GET or export the required IDs, and map `data.report` into the other app. Poll `/changes?after=<lastSequence>` to discover updates and deletions; persist `meta.nextAfter` after successful processing. No outbound delivery endpoint or app-specific field mapping has been configured.

When `API_KEY` is configured, `/api/v1/integration/reports` and other `/api/v1/integration/*` paths mirror the standard routes and require `Authorization: Bearer <your-key>`. Hosted private Site requests also need its platform service access. The standalone Node deployment is available for an existing backend that does not use Sites authentication.

Node listens on localhost by default. A non-localhost bind requires `PORTAL_PASSWORD`; browser Basic authentication uses username `aes`. A valid configured Bearer API key can access API routes on such a deployment. Browser origins are checked and can be extended with `ALLOWED_ORIGINS`. Keep real values in `.env.local` or the hosting service's secret settings; only `.env.example` belongs in Git.

PowerShell example for local development:

```powershell
$api = 'http://127.0.0.1:3001/api/v1'
$created = Invoke-RestMethod -Method Post -Uri "$api/reports" -ContentType 'application/json' -Body '{"client":"Example client"}'
$id = $created.data.id
$detail = Invoke-RestMethod -Uri "$api/reports/$id"
$detail.data.report.project = 'Example project'
$body = $detail.data.report | ConvertTo-Json -Depth 30
Invoke-RestMethod -Method Put -Uri "$api/reports/$id" -ContentType 'application/json' -Headers @{'If-Match' = ('"' + $detail.data.version + '"')} -Body $body
Invoke-RestMethod -Uri "$api/reports/$id/export"
```

Errors consistently use `{"error":{"code":"...","message":"...","details":[]}}`, with `details` present when useful.

## Flash, IRC, Punch and NCR API

The OpenAPI schema now includes `InspectionDocument` and the routes below. These also work under `/api/v1/integration/` with the existing Bearer API key rules.

| Route | Behavior |
|---|---|
| `GET /documents` | Search by `type=flash|irc|punch|ncr`, `reportId`, `status`, `q`, `dateFrom`, `dateTo`; paginate with `limit` (1–100) and `offset`. |
| `POST /documents` | Create a draft linked by `reportId` to an existing inspection. |
| `GET /documents/{id}` | Full document, frozen context, attachment metadata and optimistic version. |
| `PUT /documents/{id}` | Replace editable fields; requires `If-Match`. Issued/closed documents are locked. |
| `POST /documents/{id}/transitions` | `{ "action": "issue|revise|cancel-issue|close|reopen", "note": "reason" }`, with `If-Match`. Cancellation and reopening require a reason. |
| `GET /documents/{id}/history` | Save/transition versions, timestamps and recorded reasons. |
| `GET /documents/{id}/versions/{version}` | Immutable saved snapshot. |
| `GET /documents/{id}/files/{fileId}` | Download a current file; add `?version=1` for a historical snapshot's file. |
| `GET /documents/{id}/export` | Complete JSON including base64 attachment data for another application. |
| `DELETE /documents/{id}` | Delete a draft, all versions and its files; requires `If-Match`. |
| `GET /document-changes?after=0` | Cursor-based document events including deletions. Separate from the inspection change feed. |

Common write fields: `id`, `type`, `reportId`, `number`, `date`, `preparedBy`, `reviewedBy`, `items`, `attachments`, plus fields specific to the chosen type. `status` and `revision` are server controlled. Do not send response-only `context`, `version`, `createdAt` or `updatedAt` back in a PUT. The inspection link and type cannot change after creation. Context is refreshed from the inspection on editable saves; past versions retain their original context.

Type-specific fields:

- Flash: `result` (Accepted / Accepted with comments / Rejected), `summary`, `outstanding`, `actionBy`, `referenceDocuments`.
- IRC: `releaseDecision` (Released / Released with conditions / Not released), `certificateScope`, `releaseRemarks`, `shipmentDetails`, `referenceDocuments`.
- Punch: `summary`, `owner`, `targetDate`, `closedDate`, `verification`.
- NCR: `summary`, `referenceDocuments`, `cause`, `correction`, `correctiveAction`, `verification`, `owner`, `targetDate`, `closedDate`.

Item fields: `id`, `tag`, `description`, `quantity`, `inspection`, `result`, `priority` (Low/Normal/High/Critical), `owner`, `dueDate`, `status` (open/closed), `resolution`. Start with one item and extend up to 500. Missing optional text fields default to empty strings.

New attachments use `{ "id": "uuid", "name": "evidence.pdf", "caption": "Description", "data": "data:application/pdf;base64,..." }`. Saved attachments are referenced by their ID and optional caption, without resending `data`. Supported file types are PDF, DOCX, PNG, JPEG and WebP, with signature checks and limits of 5 MB each, 10 files and 20 MB total. Metadata/bytes live in `document_files` locally; hosted binary files use R2. Removing a file from a document leaves it available to earlier versions.

Flash/IRC flow is draft → issued → new draft revision, or cancel-issue back to draft. Punch/NCR flow is draft → open → closed, with a reason required to reopen. Closure requires every item to be closed with a resolution, plus verification, reviewer and closure date. NCR also requires root cause and corrective action. An unconditional IRC release is rejected while open Punch/NCR records exist. Issuing and closing never send data to an external service.

## AES reference numbering

Reports now include `numberingMode` (`automatic` or `manual`), `clientCode`, `manufacturerCode`, `inspectorCode` and the assigned `visitSequence`. For automatic allocation, send an empty `reportNo`, a valid `inspectionDate` and codes (or names from which initials can be suggested). Codes use up to 12 uppercase letters/digits; provide the actual assigned codes where they differ from initials. Example: IACL + BEPL + AS + 2026-11-07 produces `AESPL/IACL/BEPL/IR/AS/2611/0701` for the first available sequence. POST/PUT responses include the assigned `reportNo` and a `numbering` metadata object. Incomplete drafts can save without a reference; allocation occurs when the inputs are complete. Explicit existing numbers remain unchanged.

Document writes also accept `numberingMode`. An empty automatic document number is allocated from the linked inspection: `AESPL/IACL/BEPL/FR/AS/2611/0701/01`, for example. Each document type has a separate sequence. A parent without a report number returns `INSPECTION_UNNUMBERED`; use a numbered inspection or an explicit manual document number. Existing document references and issued revision history are retained. The allocation tables are server owned, atomic across concurrent saves, and deliberately retain consumed references after deletion.
