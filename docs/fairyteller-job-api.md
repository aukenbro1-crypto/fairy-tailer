# Fairyteller Job API

This service is the state store between the website, n8n workflows, and the future PDF render service.

It is intentionally small and dependency-free:

- one job directory per book
- atomic JSON writes
- append-only event log
- authenticated mutations
- public status without email or full order details
- local lead capture in `leads.jsonl` when an email is provided, plus protected deduplicated email-list and CSV views
- try-before-buy paywall state in `payment.json`
- optional Telegram operations notifications from server-side environment variables
- optional customer completion email and protected manual operator mail through Resend-compatible environment variables

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
  payment.json
  events.jsonl
  artifacts/
    text.json
    visuals.json
    render.json
    email.json
  files/
    chapter-1.png
    book.pdf
    preview.pdf
    cover.pdf
    interior.pdf
/data/fairyteller/leads.jsonl
```

## Notifications and Mail

The API never stores notification secrets in the repo. Configure them on the server:

- `FAIRYTELLER_ALERT_TELEGRAM_BOT_TOKEN` and `FAIRYTELLER_ALERT_TELEGRAM_CHAT_ID` enable generation progress and failure alerts.
- `FAIRYTELLER_CHAT_TELEGRAM_BOT_TOKEN`, `FAIRYTELLER_CHAT_TELEGRAM_CHAT_ID`, `FAIRYTELLER_CHAT_TELEGRAM_WEBHOOK_SECRET`, and optional `FAIRYTELLER_CHAT_TELEGRAM_POLLING=1` enable website chat messages and replies.
- `FAIRYTELLER_CHAT_AUTO_REPLY_DELAY_MS` and `FAIRYTELLER_CHAT_AUTO_REPLY_TEXT` configure the support chat fallback reply shown when no operator has answered a visitor message yet. The production delay is `2000` ms.
- Legacy `FAIRYTELLER_TELEGRAM_*` variables remain as fallback only when split role-specific variables are absent.
- `FAIRYTELLER_YOOKASSA_SHOP_ID`, `FAIRYTELLER_YOOKASSA_SECRET_KEY`, and optional `FAIRYTELLER_BOOK_PRICE_RUB` enable paywall checkout.
- `FAIRYTELLER_RESEND_API_KEY` and `FAIRYTELLER_MAIL_FROM` enable purchase-access email after YooKassa confirms payment.
- `FAIRYTELLER_MAIL_REPLY_TO` is optional.
- `FAIRYTELLER_PUBLIC_BASE_URL` defaults to `https://fairyteller.ru` and is used to build public links in emails.
- `FAIRYTELLER_SEND_RENDER_READY_EMAIL=1` restores the old render-ready email behavior. Leave it unset for the paywall flow.
- `FAIRYTELLER_DAILY_FREE_GENERATION_LIMIT` defaults to `3` and limits free create requests per normalized email.
- `FAIRYTELLER_DAILY_FREE_GENERATION_WINDOW_MS` defaults to 24 hours.
- `CUSTOMER_FREE_GENERATION_LIMIT_OVERRIDES` in `server/fairyteller-api.mjs` contains hardcoded per-email exceptions. Current exception: `aleks27134@gmail.com` is limited to 1 free generation per rolling 3-day window.
- `FAIRYTELLER_CUSTOMER_BOOKS_SECRET` is optional; when unset, the API token signs customer "my books" links.

Telegram messages include direct `book.pdf` and `preview.pdf` links once the render artifact is ready for operators. Public PDF downloads require a paid access token; `book.pdf` is the primary customer/print artifact. If the PDF render endpoint itself fails, the API marks the job as `failed`, stores the render error, and sends the failure notification.

Production also runs a service-level watchdog via `fairyteller-service-watchdog.timer` every five minutes. It uses the same alert Telegram variables, reads secrets only from `/etc/fairyteller/api.env`, and checks root disk usage, suspicious SSH activity, Job API health, n8n health/container state, recent n8n webhook start errors, recent failed jobs, and fresh stuck jobs. The script lives in the repo at `ops/fairyteller-service-watchdog.mjs` and is deployed to `/opt/fairyteller-monitor/fairyteller-service-watchdog.mjs`; dedupe state is stored under `/data/fairyteller/monitor/`.

The legacy render-ready customer email template references small public product-example images from `/images/email/`. If mail is not configured, generation and payment state still persist; email delivery records `mail_provider_not_configured`.

## Protected Operator Views

- `GET /api/fairyteller/books` lists generated PDF artifacts after operator login.
- `GET /api/fairyteller/books/storage` shows the protected book-photo file storage. Operators can create folders, upload individual images or browser-selected folders, copy a public share link, and delete folders.
- `GET /api/fairyteller/books/storage/:folderId` shows one protected storage folder, supports adding more files/folders, and deleting individual files.
- `GET /api/fairyteller/books/storage/share/:folderId/:token` is a noindex public read-only gallery link for sharing a folder without admin login.
- `GET /api/fairyteller/books/leads` shows a protected deduplicated email database built from `leads.jsonl`.
- `GET /api/fairyteller/books/leads.csv` downloads the same email database as CSV.
- `GET /api/fairyteller/books/mail` shows the protected manual mail form with editable HTML body, repeatable CTA buttons, and editable footer/signature.
- `POST /api/fairyteller/books/mail` sends one manual email through the configured Resend sender and appends a local audit row to `mail-sends.jsonl`; the email HTML allows a limited safe tag set for links and basic formatting.

The email database is populated automatically when `POST /api/fairyteller/jobs` receives an order with a valid `email`.

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

Create requests with a valid email are limited to 3 free jobs per rolling 24-hour window by default. Per-email overrides can change both the limit and the rolling window. When the limit is reached, the API does not create a job and returns `429` with `code=daily_limit_exceeded`, `booksUrl`, `payUrl`, reset timing, period labels, and the support signature:

```json
{
  "ok": false,
  "limitExceeded": true,
  "code": "daily_limit_exceeded",
  "limit": 3,
  "used": 3,
  "windowMs": 86400000,
  "periodLabel": "сегодня",
  "periodScopeLabel": "сегодня",
  "booksUrl": "/api/fairyteller/my-books/...",
  "payUrl": "/pay?jobId=..."
}
```

### Customer Books Link

```http
GET /api/fairyteller/my-books/:token
```

Shows a noindex/no-store customer page with all jobs for the token email, preview links, payment buttons, and the support signature. Tokens are signed and expire according to `FAIRYTELLER_CUSTOMER_BOOKS_TOKEN_TTL_MS` (default 30 days).

### Public Sample

```http
GET /api/fairyteller/jobs/:jobId/sample
```

Returns the try-before-buy sample only: title/summary, chapters 1-2, chapter 3 title, chapter 3 illustration URL, and a short chapter 3 teaser. This endpoint does not expose full text or PDF links.

```http
GET /api/fairyteller/jobs/:jobId/sample-pages
GET /api/fairyteller/jobs/:jobId/sample-pages/:fileName
```

Returns the current unpaid `/book/:jobId` preview surface: JPEG page renders from `paywall-preview.pdf` plus progress metadata. The preview now exposes the full 42-page browser preview and uses `progress.chapterEndPages` to place non-blocking payment prompts after each chapter instead of locking the last page.

```json
{
  "pages": [{ "n": 1, "fileName": "page-01.jpg", "url": "/api/fairyteller/jobs/ft_.../sample-pages/page-01.jpg" }],
  "progress": {
    "availablePages": 42,
    "totalPages": 42,
    "availableChapters": 5,
    "totalChapters": 5,
    "chapterEndPages": [{ "chapter": 1, "page": 10 }]
  }
}
```

### Public Status

```http
GET /api/fairyteller/jobs/:jobId
```

Returns public generation status plus sanitized payment state:

```json
{
  "jobId": "ft_...",
  "status": "done",
  "paid": false,
  "payment": { "status": "unpaid", "paid": false }
}
```

### Checkout

```http
POST /api/fairyteller/jobs/:jobId/checkout
```

Creates or reuses a YooKassa redirect payment and stores `payment.json` with `status=pending`.

```json
{
  "paymentId": "2f...",
  "confirmationUrl": "https://yoomoney.ru/checkout/payments/..."
}
```

The return URL is `/book/:jobId?status=pending`; final confirmation comes from the webhook, not from the browser redirect.

### YooKassa Webhook

```http
POST /api/fairyteller/webhook/yookassa
```

On `payment.succeeded`, the API fetches the payment from YooKassa server-to-server, verifies `metadata.jobId`, writes `payment.json` with `status=paid`, creates a 30-day access token, and sends the purchase-access email. Duplicate succeeded webhooks are idempotent and do not resend the email.

On `payment.canceled`, the API writes `status=canceled`.

Deployment note: `/book/:jobId` is a React route. Production nginx must include `/book/` in the explicit SPA route list; otherwise direct magic-links from email can 404 under the real-404 static-route config.

### Paid Artifacts

```http
GET /api/fairyteller/jobs/:jobId/artifacts/full-text.json?access=<token>
GET /api/fairyteller/jobs/:jobId/files/book.pdf?access=<token>
GET /api/fairyteller/jobs/:jobId/files/preview.pdf?access=<token>
```

The same endpoints remain available to internal callers with `Authorization: Bearer <token>`. Public callers without a valid paid access token receive `403`.

Chapter image files remain publicly readable because the sample paywall needs chapter 3 artwork.

### Resend Purchase Link

```http
POST /api/fairyteller/jobs/:jobId/resend-link
```

If the job is paid, resends the same magic-link email. The endpoint is rate-limited per job by `FAIRYTELLER_RESEND_LINK_WINDOW_MS`, default 5 minutes.

```json
{
  "source": "fairyteller_create",
  "order": {
    "world": "romantic_story",
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

Internal use only. The default pipeline now starts full-text generation automatically after chapter 1; the legacy continue workflow can still fetch the first-chapter `text.json` for old jobs or manual recovery.

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
