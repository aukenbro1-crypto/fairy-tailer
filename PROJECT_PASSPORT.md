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

Current state as of 2026-05-23: the internal text, continue/full-text, visuals, and render/publish workflows are published and connected to the Job API. The text workflow generates a real first chapter with Gemini and writes `text.json`; the website then exposes a "full story" continuation action, which calls `fairyteller_continue` and starts `fairyteller_full_text` for chapters 2-5; the visuals workflow generates a hero reference sheet, then the first chapter illustration, and writes `hero-reference-sheet.png`, `chapter-1.png`, and `visuals.json`; render/publish still uses placeholder contracts.

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
- `fairyteller_text` no longer starts the full book automatically. The website calls `/webhook/fairyteller/continue` after the first chapter preview; `fairyteller_continue` fetches the protected `text.json` artifact and starts `fairyteller_full_text` asynchronously.

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
- `fairyteller_visuals` persists `visuals.visualBible` as the reusable visual canon for the book: selected style prompt, world visual direction, hero descriptions, portrait sheet URL/status, and consistency rules. Future cover and chapter 2-5 image jobs must reuse this `visualBible` and the same generated portrait sheet instead of regenerating character identity from scratch.
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
- Replaced short n8n world labels with Make-derived world profiles for `disney_light`, `adventure_classic`, `fantasy_epic`, `cyberpunk_dream`, and a cleaned `hogwarts_world` profile. The old `new_year` key remains an alias to `hogwarts_world` inside `fairyteller_text`.
- Updated the frontend world value from `new_year` to `hogwarts_world` in the main constructor and the wizard page.
- Deployed frontend release `/var/www/fairyteller/releases/20260523-151440-codex-hogwarts-world-key` and repointed `/var/www/fairyteller/current` to it.
- Hardened `fairyteller_text` `Normalize First Chapter` against Gemini malformed JSON: it now retries parse with comma/control-character repairs and falls back to extracting five first-chapter blocks from the raw response instead of failing the whole job.
- Synced production workflow exports for `fairyteller_intake`, `fairyteller_text`, and `fairyteller_visuals`.
- Verified public smoke with `hogwarts_world`, `chapters=4`, minibrick style, location `закрытая библиотека...`, and artifact `латунный жетон...`. Smoke job: `ft_1779520304316_ov65b1`; final status: `done`; `text.json` contains `chapterPlan` length `4`; first chapter title: `Шепот Старой Библиотеки`.
- Added world-profile handoff from text to visuals: `fairyteller_text` now persists `worldTitle`, `worldEnv`, `worldMotifs`, `worldConflict`, and `worldVisual` into `text.bible`; `fairyteller_visuals` injects those fields into the chapter-1 image prompt as `World direction` while keeping the selected illustration style as the hard rendering/material constraint.
- Verified world/style smoke with `cyberpunk_dream` + `minibrick`. Smoke job: `ft_1779521136379_fyau2h`; final status: `done`; `text.json` contains `worldVisual`; `visuals.json` image prompt contains both `World direction` and `brick-miniature`.
- Fixed frontend create submission fallback: `StoryConstructor` and `RomanticStoryForm` now default to `/webhook/fairyteller/create` instead of the legacy Make webhook when `VITE_FAIRYTELLER_CREATE_URL` is not injected at build time.
- Deployed frontend release `/var/www/fairyteller/releases/20260523-163709-codex-n8n-default-endpoint`; verified the production bundle no longer contains the old Fairyteller Make create webhook and public POST smoke returns `202`. Smoke job: `ft_1779525490110_d50hb6`.
- Hardened `fairyteller_text` malformed-JSON recovery again: `Normalize First Chapter` now extracts `textBlocks` with a tolerant string scanner from `"textBlocks": [` so it can recover when Gemini omits commas between array string elements.
- Verified tolerant parser smoke. Smoke job: `ft_1779526045123_62etdm`; final status: `done`; `text.json` contains 5 first-chapter blocks, `chapterPlan` length `4`, `worldTitle=Adventure Classic`, and `chapter-1.png`.
- Restored Make-style visual handling for references and style: frontend now offers `Фотореализм` as the default style; n8n uses the incoming `illustration_style_prompt` instead of short internal style summaries; original uploaded hero photos are read once in `fairyteller_intake` as private in-memory `photoRefs` and then attached directly to Gemini image requests in `fairyteller_visuals`.
- Removed raw n8n binary propagation across Fairyteller sub-workflows. This avoids `Failed to restore binary data ID` failures from temporary upload files while keeping base64 photo refs out of persisted public job artifacts (`order.json`, `text.json`, `visuals.json`, and `status.json`).
- Verified photorealistic photo-reference smoke through public intake. Smoke job: `ft_1779529334093_1q6il1`; final status: `done`; `order.json` has `hero_photo data0 image/png hasPhoto=true`; `hero-reference-sheet.png` and `chapter-1.png` were generated; `visuals.json` prompt contains `Use the attached original user photos` and photorealistic style instructions.
- Adjusted the reference architecture: original user photos are now used only by the portraitizer to create `hero-reference-sheet.png`; chapter images consume that generated reference sheet as the character canon and do not attach original photos directly. Verified smoke job: `ft_1779530348001_xveuec`; final status: `done`; `portraitSheet.photoRefCount=1`; final chapter prompt contains `generated character reference sheet` and does not contain `attached original user photos`.
- Hardened `fairyteller_text` against another Gemini malformed JSON variant: `Normalize First Chapter` now recovers from truncated/unterminated strings by splitting the raw response into five chapter blocks when JSON repair fails, and the first-chapter request allows `maxOutputTokens=9000`. Verified text smoke job: `ft_1779533953410_nxc57k`; `artifacts/text.json` exists with 5 text blocks and title `Шепот Старых Книг`.
- Fixed a syntax regression in `fairyteller_text` `Normalize First Chapter`: newline cleanup now uses `replaceAll` instead of a regex literal that could be serialized into an invalid multi-line regular expression in n8n. Verified smoke job: `ft_1779534789892_nmu16b`; `artifacts/text.json` exists with 5 text blocks and title `Первый Снег и Старый Компас`.
- Hardened `fairyteller_visuals` portraitizer: `Normalize Hero Reference Sheet` no longer fails the whole job when Gemini returns no inline image. It records the portrait sheet as `failed`, writes a tiny technical placeholder file for the file-write step, and `Build Chapter 1 Image Prompt` only attaches a reference sheet when `portraitSheet.status === 'ready'`; otherwise chapter image generation continues from text hero descriptions. Verified smoke job: `ft_1779535143483_lkbj1j`; final status `done`; `portraitSheet ready`; `chapter-1.png ready`.
- Tightened photo-reference behavior: when uploaded photos are present, portraitizer must produce a real `hero-reference-sheet.png`; it now uses a stronger mandatory image prompt, lower temperature, `TEXT+IMAGE` response modalities, and one in-node retry with the same photo refs before failing the job explicitly. This prevents silent delivery of unrelated chapter art when photo likeness is required. Verified smoke jobs: `ft_1779536054965_3hwkz0` and `ft_1779536230568_tyk2rp`; both finished `done` with `portraitSheet ready`, `photoRefCount=1`, and `chapter-1.png ready`.
- Added the visual-consistency contract to `fairyteller_visuals`: `Build Chapter 1 Image Prompt` now creates `visualBible`, injects it into the chapter-1 prompt, and `Normalize Chapter 1 Image` writes it into `visuals.json`. Queued future image slots (`cover`, `chapter_2`-`chapter_5`) now carry `referenceSheetUrl`, `visualBibleVersion`, and a consistency rule requiring the same portrait sheet and visual bible. Verified smoke job: `ft_1779538331952_8q4dt9`; `visuals.visualBible.referencePolicy=portrait_sheet_is_required_identity_canon`; all queued visual slots point to the same `hero-reference-sheet.png`.
- Added `fairyteller_full_text` as the background continuation workflow for chapters 2-5. It receives the first-chapter payload, asks Gemini for structured continuation chapters, combines them with chapter 1, writes `artifacts/full-text.json`, and patches `artifacts.fullText` without moving the public status backward. Gemini HTTP requests in text, full-text, and visuals now retry transient provider failures up to 3 times with a 10 second pause. Verified smoke job: `ft_1779539483364_1d0z2z`; final status `done`, `preview.imageStatus=ready`, `artifacts.fullText.status=ready`, and `full-text.json` contains 5 chapters with 5 text blocks each.
- Added the user-gated continuation path: `fairyteller_continue` is a new n8n webhook at `/webhook/fairyteller/continue`; it accepts `jobId`, fetches protected `text.json`, patches `artifacts.fullText.status=generating`, and starts `fairyteller_full_text`. The frontend success overlay now shows a "Хочу всю историю" button after the first chapter preview. Verified smoke job: `ft_1779540291674_2djg5i`; before continue, final public status had `preview.imageStatus=ready` and no `artifacts.fullText`; after POST `/webhook/fairyteller/continue`, `artifacts.fullText` moved `generating -> ready` and `full-text.json` contained 5 chapters with 5 blocks each.
