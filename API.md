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
