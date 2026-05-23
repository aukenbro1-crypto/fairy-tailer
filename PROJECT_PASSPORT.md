# Fairyteller Project Passport

Last updated: 2026-05-23 05:10 UTC

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

Current state as of 2026-05-23: skeleton contracts are created in n8n, inactive, with stub nodes only. They do not yet call Gemini/OpenAI/render services.

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

Final output target:

- Interior PDF: exactly 41 pages
- Interior trim size: 13 x 13 cm
- Cover PDF: spread containing back cover and front cover, with spine/bleed to be finalized from print spec
- Customer may receive separate cover and interior PDFs initially; future UX can also provide a combined preview PDF

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
