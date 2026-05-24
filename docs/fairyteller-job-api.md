# Fairyteller Job API

This service is the state store between the website, n8n workflows, and the future PDF render service.

It is intentionally small and dependency-free:

- one job directory per book
- atomic JSON writes
- append-only event log
- authenticated mutations
- public status without email or full order details

## Run

```sh
FAIRYTELLER_API_PORT=3099 \
FAIRYTELLER_DATA_DIR=/data/fairyteller \
FAIRYTELLER_API_TOKEN=change-me \
npm run start:api
```

For local development:

```sh
npm run dev:api
```

When `NODE_ENV=production`, set `FAIRYTELLER_API_TOKEN`. n8n should send it as:

```txt
Authorization: Bearer <token>
```

## Storage Layout

```txt
/data/fairyteller/jobs/ft_.../
  order.json
  status.json
  events.jsonl
  artifacts/
    text.json
    visuals.json
    render.json
  files/
    chapter-1.png
    book.pdf
    cover.pdf
    interior.pdf
```

## Endpoints

### Health

```http
GET /healthz
```

### Create Job

```http
POST /api/fairyteller/jobs
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "source": "fairyteller_create",
  "order": {
    "world": "disney_light",
    "location": "Стамбул у Босфора",
    "artifact": "старый серебряный компас",
    "email": "reader@example.com",
    "heroes": []
  }
}
```

Returns public-safe status:

```json
{
  "jobId": "ft_...",
  "status": "received",
  "stage": "intake",
  "progress": 0
}
```

### Public Status

```http
GET /api/fairyteller/jobs/:jobId
```

This response is safe for the website status page. It does not include email or the full order.

### Full Job

```http
GET /api/fairyteller/jobs/:jobId/full
Authorization: Bearer <token>
```

Internal use only. Returns `order`, `status`, and `events`.

### Update Status

```http
PATCH /api/fairyteller/jobs/:jobId
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "status": "chapter_1_ready",
  "stage": "text",
  "progress": 35,
  "message": "Первая глава готова",
  "preview": {
    "title": "Серебряный компас",
    "chapter": 1
  }
}
```

Allowed statuses:

- `received`
- `text_generating`
- `chapter_1_ready`
- `text_ready`
- `visuals_generating`
- `visuals_ready`
- `rendering`
- `done`
- `failed`

### Write JSON Artifact

```http
PUT /api/fairyteller/jobs/:jobId/artifacts/text.json
Authorization: Bearer <token>
Content-Type: application/json
```

Use this for `text.json`, `visuals.json`, `render.json`, and validation reports.

### Read JSON Artifact

```http
GET /api/fairyteller/jobs/:jobId/artifacts/text.json
Authorization: Bearer <token>
```

Internal use only. The continue workflow uses this to fetch the first-chapter `text.json` before generating chapters 2-5.

### Write File Artifact

```http
PUT /api/fairyteller/jobs/:jobId/files/chapter-1.png
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "contentType": "image/png",
  "contentBase64": "iVBORw0KGgo..."
}
```

Allowed file extensions: `.png`, `.jpg`, `.jpeg`, `.webp`, `.pdf`.

### Public File

```http
GET /api/fairyteller/jobs/:jobId/files/chapter-1.png
```

Use returned file URLs in `preview.imageUrl`, `visuals.json`, and later render inputs.

## n8n Integration Shape

The intended first production wiring:

1. `fairyteller_intake` receives the website form.
2. It sends normalized JSON to `POST /api/fairyteller/jobs`.
3. It returns `jobId` to the website.
4. Each downstream workflow writes status updates before and after long-running work.
5. The website polls `GET /api/fairyteller/jobs/:jobId`.
