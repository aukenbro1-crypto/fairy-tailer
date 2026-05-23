# Fairyteller Project Passport

Last updated: 2026-05-23 05:25 UTC

## Project Context

Fairyteller is a public personalized storybook generator at `fairyteller.ru`.

The current public app is a Vite/React static site. The legacy generation path sends `/create` form data directly to a Make webhook. The migration target is a more reliable pipeline with n8n orchestration, a persistent job state API, and a future HTML/CSS-to-PDF render service.

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

## n8n Migration Workflows

The new n8n pipeline is intentionally split into four workflows:

| Workflow | ID | Purpose |
| --- | --- | --- |
| `fairyteller_intake` | `Vty7vSn4vd5Nduht` | Receive order, create `jobId`, start text pipeline, return fast `202`. |
| `fairyteller_text` | `kCtpw2d7pEOI3QRF` | Story bible, first chapter preview, chapters 2-5, validation/repair. |
| `fairyteller_visuals` | `RXzoJ7Bdlr2y3l60` | Portraitizer, image generation, retries/cache. |
| `fairyteller_render_publish` | `XAaFdi6hJjnQFiAQ` | Print PDF render, preflight, publish/email. |

Current state as of 2026-05-23: the internal text, visuals, and render/publish workflows are published and connected to the Job API with placeholder contracts. They update status, write JSON artifacts, and preserve the intended stage boundaries, but they do not yet call Gemini/OpenAI/image/render services.

Activation state:

- `fairyteller_intake`: inactive; keep inactive until the website is switched from Make to n8n.
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

Core endpoints:

- `GET /healthz`
- `POST /api/fairyteller/jobs`
- `GET /api/fairyteller/jobs/:jobId`
- `GET /api/fairyteller/jobs/:jobId/full`
- `PATCH /api/fairyteller/jobs/:jobId`
- `PUT /api/fairyteller/jobs/:jobId/artifacts/:fileName.json`

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
- Keep Make webhook path untouched until n8n + job API are smoke-tested.
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
