# Fairyteller Project Passport

Last updated: 2026-05-23 06:45 UTC

## Project Context

Fairyteller is a public personalized storybook generator at `fairyteller.ru`.

The current public app is a Vite/React static site. The active generation path sends `/create` form data to n8n through a same-origin nginx webhook proxy, then tracks progress through the persistent Fairyteller Job API. The migration target is to complete the remaining text, visual, and HTML/CSS-to-PDF render pieces inside this n8n-backed pipeline.

## Current Production

- VPS: `82.26.198.127`
- Hostname: `tr-vmv2-nano`
- SSH: `root@82.26.198.127` with local key `~/.ssh/baku_tr_ed25519`
- Public site root: `/var/www/fairyteller/current`
- Releases root: `/var/www/fairyteller/releases`
- Nginx site: `/etc/nginx/sites-available/fairyteller`
- Domain: `https://fairyteller.ru`
- Node on VPS: `v22.22.2`
- npm on VPS: `10.9.7`

## Local Source

- Local repo: `/Users/nikita0shch/Documents/Cursor/Codex/Make/Lovable migration/fairy-tailer`
- GitHub remote: `https://github.com/aukenbro1-crypto/fairy-tailer.git`
- Branch: `main`

## Website Submit Flow

Current production default is the n8n intake webhook through `https://fairyteller.ru/webhook/fairyteller/create`.

The `/create` form is now compatible with both response shapes:

- legacy Make response: any successful HTTP response marks the request as accepted and keeps the email-based UX
- n8n response: JSON with `jobId` and optional `statusUrl` starts public status polling from the success overlay
- n8n status preview: when `preview.title`, `preview.text`, and first-chapter image URLs are present, the success overlay can show the first chapter and illustration before the full book is complete

Frontend migration environment variables:

- `VITE_FAIRYTELLER_CREATE_URL`: target create endpoint; production build uses `/webhook/fairyteller/create`
- `VITE_FAIRYTELLER_STATUS_BASE_URL`: public status API base; defaults to `/api/fairyteller/jobs`

## n8n Migration Workflows

The new n8n pipeline is intentionally split into four workflows:

| Workflow | ID | Purpose |
| --- | --- | --- |
| `fairyteller_intake` | `Vty7vSn4vd5Nduht` | Receive order, create `jobId`, start text pipeline, return fast `202`. |
| `fairyteller_text` | `kCtpw2d7pEOI3QRF` | Story bible, first chapter preview, chapters 2-5, validation/repair. |
| `fairyteller_visuals` | `RXzoJ7Bdlr2y3l60` | Portraitizer, image generation, retries/cache. |
| `fairyteller_render_publish` | `XAaFdi6hJjnQFiAQ` | Print PDF render, preflight, publish/email. |

Current state as of 2026-05-23: the internal text, visuals, and render/publish workflows are published and connected to the Job API. The text workflow generates a real first chapter with Gemini and writes `text.json`; the visuals workflow generates a hero reference sheet, then the first chapter illustration, and writes `hero-reference-sheet.png`, `chapter-1.png`, and `visuals.json`; render/publish still uses placeholder contracts.

Activation state:

- `fairyteller_intake`: active public production intake.
- `fairyteller_text`: active internal sub-workflow.
- `fairyteller_visuals`: active internal sub-workflow.
- `fairyteller_render_publish`: active internal sub-workflow.

Current placeholder status flow:

1. `received`
2. `text_generating`
3. `chapter_1_ready`
4. `visuals_generating`
5. `visuals_ready`
6. `rendering`
7. `done`

Text generation note:

- `fairyteller_text` calls Gemini through `https://generativelanguage.googleapis.com/v1beta/models/:generateContent`.
- The request uses `$env.GEMINI_API_KEY`; do not store the literal key value in the workflow JSON.
- Model configured for first-chapter generation: `gemini-2.5-flash` with JSON response mode and `responseSchema`.
- The first-chapter normalizer extracts fenced/embedded JSON and repairs raw control characters inside strings before `JSON.parse`.
- The previous OpenAI path is not active because the current VPS n8n `OPENAI_API_KEY` returned `401 invalid_api_key` on 2026-05-23.
- The first-chapter contract writes `text.preview.imageStatus = "pending"` so `fairyteller_visuals` can prioritize the first chapter illustration next.

Gemini integration note:

- n8n Docker env includes `GEMINI_API_KEY` and `GOOGLE_API_KEY`.
- Do not store literal Gemini keys in workflow JSON or git.
- Gemini API smoke on 2026-05-23 returned `200` from `GET /v1beta/models` and listed available models.
- Previous n8n container backup before Gemini env injection: `baku-n8n-docker-bak-20260523054556`.

Visual generation note:

- `fairyteller_visuals` prioritizes `chapter_1` before cover and later chapter images.
- `fairyteller_intake` detects uploaded hero photo binary fields and stores per-hero metadata: `photoField`, `photoMime`, `photoFileName`, and `hasPhoto`.
- `fairyteller_visuals` first generates `hero-reference-sheet.png` as a stylized character sheet from hero descriptions and uploaded photo references when present.
- Chapter image generation uses the generated hero reference sheet as an inline image reference, so chapter 1 can preserve the same character designs.
- First chapter image generation uses `gemini-2.5-flash-image` through `generateContent`.
- The `minibrick` style is explicitly mapped to brick-built minifigure/toy diorama prompts; do not rely on fallback style mapping for it.
- The generated file is stored through the Job API under `/api/fairyteller/jobs/:jobId/files/chapter-1.png`.
- The public status preview is updated with `imageStatus: "ready"`, `imageUrl`, and `imageAbsoluteUrl`.
- Cover and chapter 2-5 images are still queued placeholders.

## Job API

The job API is the source of truth for order status between the website, n8n, and the render service.

Local implementation:

- `server/fairyteller-api.mjs`
- `docs/fairyteller-job-api.md`
- `.env.api.example`

Planned production service:

- systemd service: `fairyteller-api.service`
- listen address: `127.0.0.1:3099`
- production data dir: `/data/fairyteller`
- public proxy: `https://fairyteller.ru/api/fairyteller/`
- environment file: `/etc/fairyteller/api.env`
- service source file: `/opt/fairyteller-api/fairyteller-api.mjs`
- nginx backup before API proxy change: `/root/nginx-codex-backups/fairyteller.bak_codex_20260523050814`
- nginx also proxies `/webhook/` to Docker n8n on `127.0.0.1:5680`; backup before webhook proxy change: `/root/nginx-codex-backups/fairyteller.bak_codex_20260523061350_webhook`

Core endpoints:

- `GET /healthz`
- `POST /api/fairyteller/jobs`
- `GET /api/fairyteller/jobs/:jobId`
- `GET /api/fairyteller/jobs/:jobId/full`
- `PATCH /api/fairyteller/jobs/:jobId`
- `PUT /api/fairyteller/jobs/:jobId/artifacts/:fileName.json`
- `PUT /api/fairyteller/jobs/:jobId/files/:fileName`
- `GET /api/fairyteller/jobs/:jobId/files/:fileName`

Mutating/internal endpoints require:

```txt
Authorization: Bearer <FAIRYTELLER_API_TOKEN>
```

Never commit the production token.

## Print Target

Final output target from print shop upload requirements:

- PDF version: `1.7` (accepted range shown by print shop: `1.3-1.7`)
- Fonts: embedded in PDF
- Color space: RGB
- PDF protection: none
- Total page count, including cover: 41
- Page 1 (cover/back-cover spread): `268.5 x 136.0 mm`
- Pages 2-41: `136.0 x 136.0 mm`
- Customer may receive separate cover and interior PDFs initially; future UX can also provide a combined preview PDF if it still satisfies the print shop upload check.

Reference production PDF:

- Local reference file: `/Users/nikita0shch/Downloads/Изнанка старого Дуба-2 (1).pdf`
- Observed page objects: 41
- Page 1 MediaBox: `761 x 385 pt` (cover/back-cover spread; matches about `268.5 x 136.0 mm`)
- Pages 2-41 MediaBox: `385 x 385 pt` (square pages; matches about `136.0 x 136.0 mm`)
- No explicit `TrimBox`, `BleedBox`, or `CropBox` entries were found in the PDF byte structure during the quick metadata pass.

Preferred render architecture:

- HTML/CSS template
- Playwright/Chromium PDF export
- pinned browser/runtime version
- preflight checks for page count, page size, image resolution, text overflow

Google Slides/Drive should be phased out because OAuth reauthorization has been unstable every 2-3 weeks.

## Operational Rules

- Treat production as the current source of truth before changing live behavior.
- Keep Make fallback code available until the n8n render/publish path is feature-complete and stable.
- Do not commit secrets, generated books, customer photos, or runtime job data.
- Prefer small deployable pieces:
  1. job API
  2. n8n intake -> job API
  3. website submit -> intake/job status
  4. text generation
  5. visuals
  6. render service

## Change Log

### 2026-05-23

- Added local dependency-free Fairyteller Job API.
- Added API docs and environment example.
- Added npm scripts `dev:api` and `start:api`.
- Created four n8n skeleton workflows for the migration pipeline.
- Verified local API smoke test with create/status/update/artifact/full-job flow.
- Deployed `fairyteller-api.service` to VPS and enabled it at boot.
- Added nginx proxy for `https://fairyteller.ru/api/fairyteller/`.
- Verified production create/status smoke test. Smoke job: `ft_1779512912560_fa954f24`.
- Added exact print shop requirements: PDF 1.7, embedded fonts, RGB, no protection, 41 pages, page 1 `268.5 x 136.0 mm`, pages 2-41 `136.0 x 136.0 mm`.
- Injected `FAIRYTELLER_API_TOKEN` into the Docker n8n container environment; previous container backup: `baku-n8n-docker-bak-20260523051638`.
- Connected `fairyteller_intake` to the production Job API while keeping the public intake workflow inactive.
- Connected `fairyteller_text` to Job API status updates and `text.json` artifact writing.
- Connected `fairyteller_visuals` to Job API status updates and `visuals.json` artifact writing.
- Connected `fairyteller_render_publish` to Job API status updates and `render.json` artifact writing with the print-shop page contract.
- Published internal sub-workflows `fairyteller_text`, `fairyteller_visuals`, and `fairyteller_render_publish`.
- Verified end-to-end n8n placeholder smoke test through manual intake execution. Smoke execution: `326`; smoke job: `ft_1779513917368_j7xu2m`; final public status: `done`.
- Added `/create` frontend compatibility for the new async n8n response contract: `jobId`, `statusUrl`, and public status polling in the success overlay while preserving the Make webhook as the default endpoint.
- Added `.env.example` with frontend migration variables.
- Deployed frontend release `/var/www/fairyteller/releases/20260523-053332-codex-async-status` and repointed `/var/www/fairyteller/current` to it. Production `/create` still uses the legacy Make endpoint by default.
- Replaced the `fairyteller_text` placeholder builder with an OpenAI Responses API first-chapter generator and JSON normalizer; published active version `b83a24c7-1745-4404-b07f-e34032a27c3b`.
- Verified that the current n8n `OPENAI_API_KEY` is present but invalid; real text smoke is blocked until the key is replaced.
- Added Gemini API environment variables to the Docker n8n container, recreated n8n with the existing data volume, and verified Gemini API access without printing the key.
- Switched `fairyteller_text` from OpenAI to Gemini as the primary first-chapter generator and published active version `6db34909-8976-42df-9bea-84f6d1a1ed85`.
- Verified manual intake smoke with Gemini first-chapter generation. Smoke execution: `330`; smoke job: `ft_1779515670105_344zxe`; final status: `done`; generated title: `Серебряный компас над Невой`; `text.json` contains 5 first-chapter blocks from `gemini-2.5-flash`.
- Added Job API file artifacts: authenticated `PUT /api/fairyteller/jobs/:jobId/files/:fileName` and public `GET /api/fairyteller/jobs/:jobId/files/:fileName`.
- Switched `fairyteller_visuals` from placeholder-only to real first-chapter image generation with Gemini and published active version `07a5ffc0-2d15-41f7-b33d-25b493413860`.
- Verified manual intake smoke with first-chapter text and image. Smoke execution: `334`; smoke job: `ft_1779516199604_fpktms`; final status: `done`; generated image: `chapter-1.png`, `1024 x 1024`, RGB, about `1.3 MB`.
- Observed smoke timing for `ft_1779516199604_fpktms`: first chapter ready in about `29s`, first image ready about `7s` later, total time from job creation to `done` about `36.4s`.
- Added `/create` success overlay rendering for the first-chapter preview and illustration when the n8n status API returns preview artifacts.
- Deployed frontend release `/var/www/fairyteller/releases/20260523-061016-codex-first-chapter-preview` and repointed `/var/www/fairyteller/current` to it. Production `/create` still uses the legacy Make endpoint by default.
- Published `fairyteller_intake` as an active production webhook.
- Added nginx same-origin proxy from `https://fairyteller.ru/webhook/` to Docker n8n on `127.0.0.1:5680`.
- Verified HTTPS intake smoke through `POST /webhook/fairyteller/create`. Smoke job: `ft_1779516843392_7ybt48`; final status: `done`; first chapter title: `Компас и утренний Петербург`; first image status: `ready`.
- Rebuilt and deployed production frontend with `VITE_FAIRYTELLER_CREATE_URL=/webhook/fairyteller/create`. Release: `/var/www/fairyteller/releases/20260523-061507-codex-n8n-create-switch`.
- Fixed `fairyteller_text` JSON parse failures in `Normalize First Chapter` by adding Gemini `responseSchema`, stricter JSON-string prompt rules, and normalizer repair for control characters inside strings. Published active version `730aebcf-54a5-45c2-b8e1-35b63d7aeb84`.
- Verified repair smoke through public intake. Smoke job: `ft_1779517701337_9crdia`; final status: `done`; first chapter title: `Шепот Прибоя и Древние Знаки`; first image status: `ready`.
- Added sanitized workflow export for `fairyteller_text` at `n8n/workflows/fairyteller_text.workflow.json`.
- Updated `fairyteller_intake` to preserve hero photo metadata from webhook binary uploads. Published active version `b3e41497-f707-48d2-8935-4dd68ec55f09`.
- Added a portraitizer stage to `fairyteller_visuals`: build hero reference sheet request, generate `hero-reference-sheet.png`, store it as a Job API file, and feed it into first chapter image generation. Published active version `321456b9-4c12-48d3-a922-5af94be484b5`.
- Fixed the `minibrick` visual style mapping so the Lego-like option produces brick-built minifigure/toy diorama prompts instead of falling back to the Disney-style prompt.
- Verified minibrick smoke through public intake. Smoke job: `ft_1779518387625_1duomz`; final status: `done`; files generated: `hero-reference-sheet.png` and `chapter-1.png`, both `1024 x 1024`; visual check confirmed brick/minifigure style.
- Verified photo-upload smoke through public intake with `hero1_photo`. Smoke job: `ft_1779518617754_ftw6ah`; final status: `done`; this confirmed the portraitizer can read webhook binary data before generating the hero reference sheet.
- Added sanitized workflow exports for `fairyteller_intake` and `fairyteller_visuals`.
