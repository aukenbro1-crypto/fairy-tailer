# Fairyteller Project Passport

Last updated: 2026-05-26 09:25 UTC

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
- n8n response: JSON with `jobId` and optional `statusUrl` starts public status polling from the generation overlay
- current n8n UX: no intermediate first-chapter reader. The overlay shows a staged full-book progress/timer flow while generation is running, then switches to a clean in-modal `preview.pdf` reader with a bottom print-payment CTA when render is ready.

Frontend migration environment variables:

- `VITE_FAIRYTELLER_CREATE_URL`: target create endpoint; production build uses `/webhook/fairyteller/create`
- `VITE_FAIRYTELLER_STATUS_BASE_URL`: public status API base; defaults to `/api/fairyteller/jobs`

## n8n Migration Workflows

The new n8n pipeline is intentionally split into modular workflows:

| Workflow | ID | Purpose |
| --- | --- | --- |
| `fairyteller_intake` | `Vty7vSn4vd5Nduht` | Receive order, create `jobId`, start text pipeline, return fast `202`. |
| `fairyteller_text` | `kCtpw2d7pEOI3QRF` | Story bible, chapter 1 text, then starts first visuals and full-text generation automatically. |
| `fairyteller_visuals` | `RXzoJ7Bdlr2y3l60` | Portraitizer, image generation, retries/cache. |
| `fairyteller_continue` | `Y7Bt3zq9XTContinue` | Legacy/manual continuation webhook kept for old jobs and recovery, no longer part of the default UX. |
| `fairyteller_full_text` | `C2Pcin7lctSY5nc2` | Background continuation generator for chapters 2-5 and `full-text.json`. |
| `fairyteller_full_visuals` | `FVFullVisuals20260523` | Background generator for chapter 2-5 illustrations using the existing visual bible and per-hero reference cards. |
| `fairyteller_cover` | `FVCover20260523` | Background cover-art generator using full text, visual bible, and per-hero reference cards. |
| `fairyteller_render_publish` | `XAaFdi6hJjnQFiAQ` | Print PDF render, preflight, publish/email. |

Current state as of 2026-05-26: the internal text, full-text, visuals, cover, and PDF render paths are published and connected to the Job API. The text workflow generates chapter 1 with Gemini, writes `text.json`, then starts `fairyteller_visuals` and `fairyteller_full_text` asynchronously from the same payload. The website no longer waits for a user continuation click; it shows staged full-book progress until `book.pdf` is ready. The visuals workflows generate per-hero reference cards, optional combined hero reference sheet, chapter illustrations, cover art, and `visuals.json`; the PDF render step creates `cover.pdf`, `interior.pdf`, `book.pdf`, `preview.pdf`, and `render.json`.

Activation state:

- `fairyteller_intake`: active public production intake.
- `fairyteller_text`: active internal sub-workflow.
- `fairyteller_visuals`: active internal sub-workflow.
- `fairyteller_continue`: active public recovery/legacy continuation webhook.
- `fairyteller_full_text`: active internal sub-workflow.
- `fairyteller_full_visuals`: active internal sub-workflow.
- `fairyteller_cover`: active internal sub-workflow.
- PDF render: active host-side renderer invoked by the Job API after cover generation.
- `fairyteller_render_publish`: legacy placeholder workflow, superseded for current PDF smoke by the Job API renderer.

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
- The first-chapter Gemini call is wrapped in a code node with controlled transient retries/backoff (`10s`, `20s`, `35s`, `55s`). If Gemini still returns provider errors, the workflow patches the Job API to `failed` before throwing so the frontend and Telegram do not hang silently.
- The first-chapter normalizer extracts fenced/embedded JSON and repairs raw control characters inside strings before `JSON.parse`.
- The first-chapter normalizer also patches the Job API to `failed` before throwing if Gemini returns unrecoverable JSON or an invalid print-ready block shape.
- The previous OpenAI path is not active because the current VPS n8n `OPENAI_API_KEY` returned `401 invalid_api_key` on 2026-05-23.
- The first-chapter contract writes `text.preview.imageStatus = "pending"` so `fairyteller_visuals` can prioritize the first chapter illustration next.
- `fairyteller_text` starts the full book automatically after chapter 1 is normalized. It fans out to `fairyteller_visuals` for the portrait sheet/chapter 1 image and to `fairyteller_full_text` for chapters 2-5. `fairyteller_continue` remains available only for old jobs or manual recovery.

Gemini integration note:

- n8n Docker env includes `GEMINI_API_KEY` and `GOOGLE_API_KEY`.
- Do not store literal Gemini keys in workflow JSON or git.
- Gemini API smoke on 2026-05-23 returned `200` from `GET /v1beta/models` and listed available models.
- Previous n8n container backup before Gemini env injection: `baku-n8n-docker-bak-20260523054556`.

Visual generation note:

- `fairyteller_visuals` prioritizes `chapter_1` before cover and later chapter images.
- `fairyteller_intake` detects uploaded hero photo binary fields and stores per-hero metadata: `photoField`, `photoMime`, `photoFileName`, and `hasPhoto`.
- The `/create` form sends an explicit `heroN_age_group` for each filled hero. The customer-facing choices are `child`, `teen`, and `adult`; this explicit value is the source of truth for character proportions.
- `fairyteller_intake` still has legacy fallback inference from free-form name/description/relation text. Current internal values are `child`, `teen`, `adult`, `senior`, or `unknown`, with `ageGroupSource` recorded as `explicit`, `age_number`, `keyword`, or `not_detected`. Keyword inference checks adult/senior terms before child terms to avoid misclassifying descriptions like "мама Макса ... мальчик".
- `fairyteller_visuals` now uses `per_hero_reference_cards_v1`: original uploaded hero photos are used only inside the portraitizer to generate separate `hero-1-reference.*`, `hero-2-reference.*`, etc. Each card is tied to exactly one hero and carries name, description, relation, and `ageGroup`.
- The combined `hero-reference-sheet.png` is optional overview/fallback material, not the primary identity source. If Gemini cannot generate one individual card from a source photo after retries, the card is marked `source_photo_fallback`; the original private photo is then used only to build the combined sheet inside the same workflow and is not persisted in public artifacts.
- Chapter 1, chapter 2-5, and cover image generation attach the ready per-hero reference cards inline to Gemini as the primary identity canon. If some individual cards are missing, later image workflows attach both the ready individual cards and the combined sheet so secondary heroes still have a visual reference instead of dropping back to text-only identity.
- Portraitizer, chapter, and cover prompts treat hero age group as mandatory visual canon: children, teenagers, adults, and seniors must keep distinct proportions, maturity, and relative height/scale instead of being averaged into the main hero's apparent age.
- `fairyteller_visuals` persists `visuals.visualBible` as the reusable visual canon for the book: selected style prompt, world visual direction, hero descriptions, per-hero reference card URLs/statuses, optional portrait sheet URL/status, and consistency rules. Future cover and chapter 2-5 image jobs must reuse this `visualBible` and the same per-hero reference cards instead of regenerating character identity from scratch.
- Chapter illustration prompts must target the actual interior image page: `136 x 136 mm`, square `1:1`, full-bleed, roughly `1606 x 1606 px` at 300 DPI. Key faces, hands, silhouettes, and the important object must stay away from the left 15% gutter/spine area and outer 3 mm trim edge.
- Chapter illustration prompts must explicitly forbid rendered typography: no chapter numbers, titles, captions, signs, labels, fake letters, posters, banners, UI, white margins, blank paper backgrounds, or decorative borders. If a scene contains papers/books/signs, they must be abstract unreadable texture only; the PDF renderer owns all visible text.
- Cover-art prompts target the front-cover image frame in the PPTX-derived cover template, not the whole wraparound spread: about `1.46:1` landscape artwork placed into the white front-cover frame. The final PDF page remains `268.5 x 136 mm`.
- First chapter image generation uses `gemini-2.5-flash-image` through `generateContent`.
- The `minibrick` style is explicitly mapped to brick-built minifigure/toy diorama prompts; do not rely on fallback style mapping for it.
- The generated file is stored through the Job API under `/api/fairyteller/jobs/:jobId/files/chapter-1.png`.
- The public status preview is updated with `imageStatus: "ready"`, `imageUrl`, and `imageAbsoluteUrl`.
- Cover and chapter 2-5 images are generated by the background visual workflows after the full text is ready.

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
- PDF renderer source file: `/opt/fairyteller-render/fairyteller-render-pdf.mjs`
- nginx backup before API proxy change: `/root/nginx-codex-backups/fairyteller.bak_codex_20260523050814`
- nginx also proxies `/webhook/` to Docker n8n on `127.0.0.1:5680`; backup before webhook proxy change: `/root/nginx-codex-backups/fairyteller.bak_codex_20260523061350_webhook`

Core endpoints:

- `GET /healthz`
- `POST /api/fairyteller/chat/messages`
- `GET /api/fairyteller/chat/sessions/:sessionId/messages`
- `POST /api/fairyteller/telegram/webhook`
- `POST /api/fairyteller/jobs`
- `GET /api/fairyteller/jobs/:jobId`
- `GET /api/fairyteller/jobs/:jobId/full`
- `PATCH /api/fairyteller/jobs/:jobId`
- `PUT /api/fairyteller/jobs/:jobId/artifacts/:fileName.json`
- `PUT /api/fairyteller/jobs/:jobId/files/:fileName`
- `GET /api/fairyteller/jobs/:jobId/files/:fileName`
- `GET /api/fairyteller/jobs/:jobId/files/:fileName?base64=1` returns authenticated JSON/base64 for internal workflow reuse of generated files.
- `POST /api/fairyteller/jobs/:jobId/render-pdf` starts the authenticated PDF render step and writes `cover.pdf`, `interior.pdf`, and `render.json`.

Mutating/internal endpoints require:

```txt
Authorization: Bearer <FAIRYTELLER_API_TOKEN>
```

Never commit the production token.

## Website Support Chat

The public site includes a lightweight support chat widget mounted globally from `src/components/FairytellerChat.tsx`.

Message flow:

1. Visitor messages are posted to `POST /api/fairyteller/chat/messages`.
2. The Job API stores chat sessions under `${FAIRYTELLER_DATA_DIR}/chat/sessions`.
3. Each visitor message is sent to the configured Telegram admin chat.
4. The admin replies in Telegram by replying directly to the bot message, or by sending `/reply <sessionId> <text>`.
5. Telegram calls `POST /api/fairyteller/telegram/webhook`; the API appends the operator reply to the matching session.
6. The widget polls `GET /api/fairyteller/chat/sessions/:sessionId/messages` while open and shows new replies.

If Telegram cannot register a public webhook for the domain, set `FAIRYTELLER_CHAT_TELEGRAM_POLLING=1` on the API service. In that mode the same server reads bot updates with Telegram `getUpdates` and uses the same reply handling logic.

Required production env for two-way chat:

- `FAIRYTELLER_CHAT_TELEGRAM_BOT_TOKEN`
- `FAIRYTELLER_CHAT_TELEGRAM_CHAT_ID`
- `FAIRYTELLER_CHAT_TELEGRAM_WEBHOOK_SECRET`
- optional fallback: `FAIRYTELLER_CHAT_TELEGRAM_POLLING=1`

Generation progress and failure alerts use a separate Telegram bot identity:

- `FAIRYTELLER_ALERT_TELEGRAM_BOT_TOKEN`
- `FAIRYTELLER_ALERT_TELEGRAM_CHAT_ID`

Legacy `FAIRYTELLER_TELEGRAM_*` variables remain as fallback only when the split role-specific variables are absent. Production should keep the site support chat on the support bot and generation alerts on the operations bot.

The webhook should be registered with Telegram using `secret_token` and URL `https://fairyteller.ru/api/fairyteller/telegram/webhook`. Do not store bot tokens or webhook secrets in git.

## Print Target

Final output target from print shop upload requirements:

- PDF version: `1.7` (accepted range shown by print shop: `1.3-1.7`)
- Fonts: embedded in PDF
- Color space: RGB
- PDF protection: none
- Total page count, including cover: 41
- Page 1 (cover/back-cover spread): `268.5 x 136.0 mm`
- Pages 2-41: `136.0 x 136.0 mm`
- Current PDF UX links the combined print PDF (`book.pdf`) as the primary customer artifact. `book.pdf` contains mixed page sizes: page 1 is the cover/back-cover spread, pages 2-41 are square interior pages. The renderer still writes `preview.pdf` for internal/debug use: page 1 is the right/front half of the cover spread, pages 2-41 are the square interior pages, and page 42 is the left/back half of the cover spread.
- Current production smoke PDF weights from job `ft_1779609291175_25otqb`: `book.pdf` ~21.3 MB, `interior.pdf` ~19.0 MB, `cover.pdf` ~9.8 MB. This is acceptable for print proofing but too heavy for a fast web preview; the likely optimization layer is image resampling/compression before PDF embedding while preserving the print-size contract.

Reference production PDF:

- Local reference file: `/Users/nikita0shch/Downloads/Изнанка старого Дуба-2 (1).pdf`
- Observed page objects: 41
- Page 1 MediaBox: `761 x 385 pt` (cover/back-cover spread; matches about `268.5 x 136.0 mm`)
- Pages 2-41 MediaBox: `385 x 385 pt` (square pages; matches about `136.0 x 136.0 mm`)
- No explicit `TrimBox`, `BleedBox`, or `CropBox` entries were found in the PDF byte structure during the quick metadata pass.

Preferred render architecture:

- Current active renderer: Node.js `pdf-lib` generator with embedded fonts, exact page sizes, Job API file outputs, extracted PPTX template assets from `MasterTemplate_book.pptx` and `MasterTemplate_cover_romantic.pptx`, and a versioned layout contract at `server/render-layouts/fairyteller-pptx-v2.json`.
- The renderer composes the final one-file `book.pdf` by joining two logical templates: page 1 is the wider cover/back-cover spread, and pages 2-41 are square interior pages. A single source PPTX cannot safely hold mixed slide sizes, so the source-of-truth templates remain separate while the print artifact is combined.
- Dynamic content should replace template placeholders only: cover title, cover subtitle/summary, cover art, front matter, chapter title pages, full-page chapter illustrations, the declared chapter text-page map, and the final outro/QR pages. Do not add extra colored rectangles or duplicate `by FairyTeller` outside the PPTX page plan.
- Pinned template fonts currently embedded for repeatability: `Rubik Mono One`, `Inter Light`, `Inter SemiBold`, and `Amatic SC`; the cover blurb uses the renderer's serif fallback in the Georgia-like slot unless a licensed Georgia-compatible font is installed.
- The PDF renderer must remain a deterministic layout/preflight layer. It should not rewrite or silently trim story content. If a chapter has anything other than the declared print-ready text block count, or if a block does not fit inside the declared template box, render preflight must fail so the upstream editor step can repair the text.
- The current print rhythm uses 40 interior pages with physical chapter opener spreads. Interior page 1 is title/year, page 2 is subtitle plus story summary, page 3 is table of contents, then chapters open on pages `4, 10, 16, 24, 32` with a left title/teaser page and a right full-page illustration. Text-page counts by chapter are `[4, 4, 6, 6, 5]`, page 39 is a decorative ending, and page 40 is the QR/coauthor page.
- The n8n text chain should preserve the Make-era author/editor split: the author creates the story, then an editor/prepress step reshapes it into `printReadyChapters` with the current block map `[4, 4, 6, 6, 5]` and text sized for the fixed PDF template.
- Future renderer option after layout polish: HTML/CSS template with Playwright/Chromium PDF export, pinned browser/runtime version, and preflight checks for page count, page size, image resolution, text overflow. Keep the current PPTX-extracted renderer as the stable baseline until the HTML path proves better.

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
- Replaced short n8n world labels with Make-derived world profiles for `romantic_story`, `adventure_classic`, `fantasy_epic`, `cyberpunk_dream`, and a cleaned `hogwarts_world` profile. The old `disney_light` key remains a legacy alias to `romantic_story`, and `new_year` remains an alias to `hogwarts_world` inside `fairyteller_text`.
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
- Hardened chapter-1 image normalization in `fairyteller_visuals`: if Gemini returns a successful response without inline image data, `Normalize Chapter 1 Image` now retries once with a simpler image-only prompt and the same generated reference sheet before failing the job with a clear `imageStatus=failed` message. Verified smoke job: `ft_1779540991824_gjmvrd`; final status `done`, `preview.imageStatus=ready`, `chapter-1.png` written.
- Hardened `fairyteller_full_text` malformed JSON parsing for continuation runs. A user-triggered continue request on `ft_1779540714365_uihv8x` had reached `artifacts.fullText.status=generating` but failed when Gemini omitted separators inside the structured chapter JSON; `Normalize Full Text` now falls back to loose chapter/block extraction. Re-ran `/webhook/fairyteller/continue` for that job and verified `artifacts.fullText.status=ready`; `full-text.json` contains 5 chapters with 5 blocks each.
- Shifted the continuation UX from email delivery to in-browser reading for the current preview stage. `full-text.json` is now publicly readable by unguessable `jobId`, and the success overlay fetches it when `artifacts.fullText.status=ready`, then shows chapters 2-5 one at a time with chapter switch buttons. Deployed frontend release `/var/www/fairyteller/releases/20260523-211058-codex-full-story-tabs`; verified public `full-text.json` read for `ft_1779540714365_uihv8x` returns 5 chapters.
- Unarchived and activated `fairyteller_full_text` (`C2Pcin7lctSY5nc2`) so it is visible in the n8n UI and available at `/workflow/C2Pcin7lctSY5nc2`.
- Hardened `fairyteller_full_text` `Normalize Full Text` against Gemini returning more than five text blocks for a chapter: the normalizer now coerces continuation text to exactly five layout blocks before validation. Re-ran `/webhook/fairyteller/continue` for `ft_1779542137791_hnqw7t`; verified `artifacts.fullText.status=ready`, `full-text.json` contains chapters `[1,2,3,4,5]`, and every chapter has 5 text blocks.
- Added `fairyteller_full_visuals` (`FVFullVisuals20260523`) and wired `fairyteller_full_text` to start it asynchronously after `full-text.json` is ready. The workflow fetches `visuals.json`, reuses `visualBible` and `hero-reference-sheet.png`, generates `chapter-2.png` through `chapter-5.png`, writes them as Job API files, updates `visuals.json`, and exposes public status in `artifacts.fullVisuals`.
- Added authenticated Job API base64 reads for generated files so n8n can reuse `hero-reference-sheet.png` as a stable inline reference without depending on n8n binary download behavior.
- Updated the frontend full-story reader to show chapter illustrations when `artifacts.fullVisuals.images` becomes ready. Deployed frontend release `/var/www/fairyteller/releases/20260523-220014-codex-full-visuals-code`.
- Verified full-visual smoke on `ft_1779542137791_hnqw7t`: `artifacts.fullVisuals.status=ready`, four generated files exist (`chapter-2.png` through `chapter-5.png`, each about 2.6-2.7 MB), and `visuals.json` now has ready image jobs for chapters 1-5 with cover still queued.
- Added `fairyteller_cover` (`FVCover20260523`) and wired `fairyteller_full_visuals` to start it asynchronously after chapter 2-5 images are ready. It uses `full-text.json`, `visuals.json`, `visualBible`, and `hero-reference-sheet.png` to generate a no-text cover-art background and stores it as `cover-spread.png`.
- Verified cover smoke on `ft_1779542137791_hnqw7t`: `artifacts.cover.status=ready`, `cover-spread.png` exists, `visuals.json` has ready image jobs for chapters 1-5 plus cover. Gemini returned the cover source as `1024 x 1024`; the print-accurate page-1 spread (`268.5 x 136 mm`) must be composed in the HTML/CSS PDF render layer rather than treating this raw image as the final cover spread.
- Added the first working PDF renderer at `server/fairyteller-render-pdf.mjs`, deployed it to `/opt/fairyteller-render/fairyteller-render-pdf.mjs`, and exposed authenticated `POST /api/fairyteller/jobs/:jobId/render-pdf`.
- Wired `fairyteller_cover` to invoke the PDF render endpoint after `cover-spread.png` is ready. The render step writes `cover.pdf`, `interior.pdf`, and `artifacts/render.json`, then exposes `artifacts.render`, `artifacts.coverPdf`, and `artifacts.interiorPdf` in public job status.
- Verified PDF smoke on `ft_1779542137791_hnqw7t`: `cover.pdf` is PDF 1.7 with 1 page at `268.5 x 136.0 mm`; `interior.pdf` is PDF 1.7 with 40 pages at `136.0 x 136.0 mm`; both download publicly through Job API file URLs. Deployed frontend release `/var/www/fairyteller/releases/20260523-231419-codex-pdf-links` to show PDF links when `artifacts.render.status=ready`.
- Fixed PDF text truncation in the renderer: story text pages now fit each full text block by reducing font size within bounds and fail render preflight instead of silently cutting lines. Added `render.preflight.noTextTruncation=true`.
- Added the provided Google Slides PDF exports as renderer master backgrounds and deployed them to `/opt/fairyteller-render/templates`. Interior pages now use the book paper texture master, and cover render uses the romantic cover master with generated cover art placed into the `COVER_IMG` area. Re-rendered `ft_1779550092673_8ltt9c`; `cover.pdf` and `interior.pdf` keep the required page sizes/page counts and no longer silently drop overflowing story text.
- Added `server/render-layouts/fairyteller-template-v1.json` and deployed it to `/opt/fairyteller-render/render-layouts/fairyteller-template-v1.json`. The renderer now reads explicit boxes/colors/page-plan from this layout contract, writes `render.layoutVersion=fairyteller-template-v1`, and enforces the expected five text blocks per chapter before composing PDFs. Re-rendered `ft_1779550092673_8ltt9c`; render stayed ready with cover page count `1`, interior page count `40`, and `render.preflight.expectedTextBlocksPerChapter=5`.
- Added combined print PDF output. The renderer now writes `book.pdf` by joining the generated cover and interior PDFs into a single 41-page mixed-size PDF, while keeping `cover.pdf` and `interior.pdf` for debugging. The Job API exposes `artifacts.bookPdf`, and the frontend shows a primary `Печатный PDF` link. Verified on `ft_1779550092673_8ltt9c`: `book.pdf` has 41 pages, first page `268.5 x 136.0 mm`, page 2 and last page `136.0 x 136.0 mm`.
- Replaced the PDF-template approximation with a PPTX-extracted renderer contract (`fairyteller-pptx-v2`). The cover now uses the clean PPTX background, places cover art only inside the white frame, draws title/subtitle/summary without extra colored backing, and keeps the existing `by FairyTeller` mark instead of duplicating it. Interior pages use the PPTX book assets and deterministic page sizing. Deployed renderer/assets/fonts/layout to `/opt/fairyteller-render`, re-rendered `ft_1779550092673_8ltt9c`, and verified `book.pdf` remains 41 pages with `render.preflight.noTextTruncation=true`.
- Added paragraph-aware typography to interior text pages. The renderer preserves explicit paragraph breaks when they exist, infers visual paragraphs from sentence groups when n8n returns flat text blocks, draws first-line indents, and distributes spare page height into bounded paragraph spacing for short text pages. Re-rendered `ft_1779550092673_8ltt9c`; `book.pdf` remained 41 pages with `render.preflight.noTextTruncation=true`.
- Added fairy-tale drop caps to the first text page of each chapter. The renderer removes the opening letter from the first paragraph, redraws it as a large embedded red serif letter, and shapes the first lines of text around it. Re-rendered `ft_1779550092673_8ltt9c`; `book.pdf` remained 41 pages with `render.preflight.noTextTruncation=true`.
- Updated the early interior pages and web preview UX. Interior page 4 now combines the subtitle and short book summary; page 5 is a blank dedication page with `Посвящается...` and handwriting lines. The `/create` success overlay now uses a book-style reader: it opens from a cover, shows chapter opener/text pages as spreads, keeps the "Хочу всю историю" action inside the reader, and links to the final print PDF when render is ready. Deployed frontend release `/var/www/fairyteller/releases/20260524-144653-codex-book-reader-preview`; re-rendered `ft_1779550092673_8ltt9c` with `render.preflight.noTextTruncation=true`.
- Changed the interior PDF to the fixed 40-page rhythm: page 1 title/year, page 2 subtitle plus story summary, page 3 handwritten dedication page, page 4 table of contents, then each of the five chapters gets 7 pages exactly (`chapter title`, `full-page illustration`, `5 text pages`). Page 40 is the QR/coauthor page. Chapter starts are now `5, 12, 19, 26, 33`; first text pages with red drop caps are `7, 14, 21, 28, 35`. Updated `server/render-layouts/fairyteller-pptx-v2.json`, deployed renderer/layout to `/opt/fairyteller-render`, re-rendered `ft_1779550092673_8ltt9c`, and verified `book.pdf` is 41 pages, `interior.pdf` is 40 pages, and `render.preflight.noTextTruncation=true`.
- Updated the web book reader to mirror the print rhythm: each chapter now opens as a spread with a title/teaser page on the left and a full-page illustration on the right, followed by text pages. Deployed frontend release `/var/www/fairyteller/releases/20260524-154330-codex-40-page-book-plan`; browser smoke on `https://fairyteller.ru/create?codexSmoke=40page` loaded the fresh `index-Cydf7pxL.css` asset and showed no console errors.
- Reworked the interior PDF rhythm again for true physical opener spreads: removed the early dedication page, moved the table of contents to page 3, and set chapter opener spreads to pages `4/5`, `10/11`, `16/17`, `24/25`, and `32/33`. The upstream n8n text contracts now generate and normalize chapter text blocks as `[4, 4, 6, 6, 5]`; chapter image prompts ask Gemini to keep key faces/hands/details away from gutter/trim zones. Deployed the four affected workflows (`fairyteller_text`, `fairyteller_full_text`, `fairyteller_visuals`, `fairyteller_full_visuals`) plus renderer/layout to production; backup before workflow import: `/root/fairyteller-n8n-backups/20260524-172625-before-spread-openers`. Smoke render job copy `ft_codex_spread_smoke_20260524` produced `book.pdf` with 41 pages, `interior.pdf` with 40 pages, `render.preflight.expectedTextBlocksByChapter=[4,4,6,6,5]`, `render.preflight.chapterStartPages=[4,10,16,24,32]`, and `render.preflight.noTextTruncation=true`.
- Hardened the full-visuals/render tail after a production test job (`ft_1779609291175_25otqb`) exposed two failures: Gemini returned transient `503` during chapter 2-5 image generation, and an overlong chapter opener teaser blocked PDF render. `fairyteller_full_visuals` now retries Gemini image requests up to 4 times with backoff, and the renderer clamps chapter opener teasers instead of failing on non-story teaser overflow. Deployed the workflow and renderer to production, re-ran `/webhook/fairyteller/continue` for the job, and verified public status: `fullText=ready`, `fullVisuals=ready`, `cover=ready`, `render=ready`, `bookPdf=/api/fairyteller/jobs/ft_1779609291175_25otqb/files/book.pdf`, `render.preflight.expectedTextBlocksByChapter=[4,4,6,6,5]`, and `render.preflight.noTextTruncation=true`.
- Polished the `/create` generated-book preview UX according to `docs/art-director-ux-designer.md`: removed the red cover placeholder and "open book" gate, replaced technical status/toast copy with book-facing language, made the reader appear directly as a responsive spread, constrained spread sizing to fit the viewport without internal scrollbars, and fixed the old `.mixer-chassis > *` CSS rule that was overriding the preview modal's fixed positioning.
- Deployed frontend release `/var/www/fairyteller/releases/20260524-141100-codex-preview-polish` and repointed `/var/www/fairyteller/current` to it. Production smoke on `https://fairyteller.ru/create?codex=f6badde` loaded `assets/index-Bq0YTsKH.css` and `assets/index-AGMzZNvb.js` with no browser console errors.
- Tightened n8n image-generation targets in `fairyteller_visuals`, `fairyteller_full_visuals`, and `fairyteller_cover`. Interior chapter prompts now explicitly generate for the `136 x 136 mm` square page and write `targetPageSizeMm=[136,136]`, `targetAspectRatio="1:1"`, and `role="interior_full_page_right_spread"` into image metadata. Cover prompts now generate front-cover framed art at about `1.46:1` instead of a full wraparound spread. Production backup before import: `/root/fairyteller-n8n-backups/20260524-image-page-size`; n8n was restarted and all three workflows are active.
- Aligned the web book reader text pagination with the print PDF contract: print-ready chapter `textBlocks` now render as one preview page per block instead of being re-split by web character limits. The loose web splitter remains only for the early single-block first-chapter preview before the full print-ready text is available.
- Cleaned the generated-book preview surface: removed secondary cover/interior PDF debug links, removed footer helper copy and "create another story" from the modal, added a close button, added a print/payment CTA to `https://fairyteller.ru/print` when the final PDF is ready, and replaced the first-chapter waiting state with an animated book/progress treatment.

- Added `preview.pdf` as a customer/browser PDF artifact: the renderer splits the print cover spread into square front/back preview pages around the existing square interior, Job API exposes `artifacts.previewPdf`, and the web reader uses it for the PDF button before falling back to print `book.pdf`. Job API also stores submitted emails in `/data/fairyteller/leads.jsonl`, can send Telegram operations notifications, and can send customer completion email through server-side environment variables without committing secrets. The preview currently fixes browser geometry but still embeds print-weight assets, so the next speed pass should add a compressed/rasterized web preview.
- Telegram operations messages now include direct `preview.pdf` and print `book.pdf` links when available. Failures reported through normal job status updates notify Telegram, and PDF-render endpoint failures now also mark the job `failed` with the render error before returning the API error.
- Deployed the preview/ops update to production: frontend release `/var/www/fairyteller/releases/20260525-1126-codex-preview-pdf-ops`, API source `/opt/fairyteller-api/fairyteller-api.mjs`, renderer source `/opt/fairyteller-render/fairyteller-render-pdf.mjs`. Re-rendered smoke job `ft_1779609291175_25otqb`; public status exposes `artifacts.previewPdf`, `preview.pdf` has 42 square pages at `136 x 136 mm`, and `book.pdf` remains the 41-page print artifact. Customer mail is wired but intentionally records `mail_provider_not_configured` until a mail-provider API key/from-domain are configured.
- Replaced the final web reader surface with the real `preview.pdf` once PDF render is ready, and replaced the unstable full-text HTML spread during render with a clean waiting state. The early first-chapter preview still uses the lightweight HTML reader until the customer asks for the full book. The print CTA now reads `Купить печатную книгу`, opens `/print` in a new tab, and production frontend release `/var/www/fairyteller/releases/20260525-140237-codex-pdf-preview-reader` is live.
- Added a protected noindex service page at `/api/fairyteller/books` in the Job API. It lists generated PDF artifacts from `/data/fairyteller/jobs/*/files` (`preview.pdf`, `book.pdf`, `cover.pdf`, `interior.pdf`), requires the existing `FAIRYTELLER_API_TOKEN` through bearer/header or a POST login form that sets an HttpOnly cookie, sends `X-Robots-Tag: noindex, nofollow, noarchive`, and uses `Referrer-Policy: no-referrer`.
- Added optional passwordless access for the same PDF list through `/api/fairyteller/books/:secret`, where `:secret` is configured only on production as `FAIRYTELLER_ADMIN_BOOKS_SECRET` in `/etc/fairyteller/api.env`. This keeps the normal token login available while giving operators a bookmarkable no-token URL.
- Removed the intermediate web book preview from the default `/create` UX. After submit, the user now sees one staged full-generation overlay with an approximate timer; `fairyteller_text` automatically starts `fairyteller_full_text` alongside first visuals, and the UI links the final print `book.pdf` when render completes. Strengthened text density prompts to target one print-ready block per page (`780-1050` chars for chapter 1, `820-1050` chars for chapters 2-5), strengthened image prompts to forbid rendered typography/white margins, and moved the decorative `Конец` label up/right on page 39.
- Changed the `/api/fairyteller/books` login form to use a separate operator password from `FAIRYTELLER_ADMIN_BOOKS_PASSWORD` instead of asking for the API token. Bearer/header API-token access remains available for technical checks, and the password value must stay only in production environment config.
- Added inferred hero age groups to the visual pipeline. `fairyteller_intake` now stores `ageGroup`/`ageGroupSource` for each hero from explicit future fields or from free-form descriptions, and `fairyteller_visuals`, `fairyteller_full_visuals`, and `fairyteller_cover` pass those labels into the portraitizer, visual bible, chapter-image prompts, and cover prompt so secondary heroes keep stable adult/child/teen/senior proportions.
- Replaced the single critical portrait-sheet identity path with `per_hero_reference_cards_v1`. `fairyteller_visuals` now generates one reference card per hero from the original photo and hero metadata, stores those cards as Job API files, and writes them into `visuals.visualBible.heroReferenceCards`; chapter 1, chapter 2-5, and cover generation attach those cards inline as the primary identity canon. The combined `hero-reference-sheet.png` is now optional fallback/overview material. Deployed `fairyteller_visuals`, `fairyteller_full_visuals`, and `fairyteller_cover` to production, restarted Docker n8n, verified all three are active, and kept backup `/root/fairyteller-n8n-backups/20260525-155221-hero-cards`.
- Restored the ready-state PDF preview in `/create` without reintroducing the unstable HTML book spread: once render is ready, the modal hides the status/title header, opens `preview.pdf` in a larger frame, moves the print CTA to the bottom center as `Оплатить печатную версию`, and shows lightweight print/delivery popups. Deployed frontend release `/var/www/fairyteller/releases/20260525-163439-codex-pdf-preview-cta`; nginx root now points to that release.
- Hardened `fairyteller_text` after production job `ft_1779729265248_8he7z7` hit Gemini `503 high demand` during "Пишем первую главу" and left the public job stuck at `text_generating`. The Gemini request node now performs longer controlled retries and marks the job `failed` on exhausted provider errors; `Normalize First Chapter` now also marks the job `failed` on unrecoverable response-shape errors. Deployed to production n8n, restarted `baku-n8n-docker`, verified workflow `kCtpw2d7pEOI3QRF` active, and kept backup `/root/fairyteller-n8n-backups/20260526-014428`. The stuck job was manually patched to `failed` with a user-safe Gemini-overload message.
- Added explicit hero age-group selection to `/create` (`Ребенок`, `Подросток`, `Взрослый`) and sends `heroN_age_group` to the n8n intake for every filled hero. Hardened visual reference generation after production jobs `ft_1779761155173_uq2c9l` and `ft_1779763092303_h1rz3w`: individual hero-card failures from Gemini no longer immediately collapse the whole visual run; they become `source_photo_fallback`, the private source photo is used only to build the combined reference sheet, and chapter/cover workflows attach both ready cards and the combined sheet whenever the card set is partial.
- Simplified the final `/create` PDF preview: removed the secondary `PDF` button and the right-side print/delivery tip bubbles, kept only the `preview.pdf` frame plus the centered `Оплатить печатную версию` CTA, and added an animated book-page loader while the embedded PDF viewer initializes.
- Hardened the full-visuals/render tail after production jobs reached `85%` with `Gemini did not return an inline image ... IMAGE_OTHER`. `fairyteller_visuals` no longer starts the legacy `fairyteller_render_publish` placeholder after chapter 1, `fairyteller_full_visuals` can fall back to an existing ready chapter image for a single failed later-chapter image instead of aborting the book, and the Job API now infers a public `failed` state from failed critical artifacts when no real PDF artifact exists. Re-ran `/webhook/fairyteller/continue` for stuck job `ft_1779811711746_r1rkcb` and verified it completed with `preview.pdf` and `book.pdf`.
- Current production frontend baseline is `/var/www/fairyteller/releases/20260527-0909-codex-create-status-center`, with `/var/www/fairyteller/current` repointed to it. This release locks in the boutique Fairyteller redesign on `/` and `/create`: real book-object header imagery, the three-step constructor bound to the Job API, age-group fields for heroes, updated genres/styles, centered generation status, no legacy Lovable fallback, and the examples carousel/photos. It also includes `/podarok/dlya-pary`, route-specific title/description/canonical/OG/Twitter/JSON-LD output, generated static SEO HTML for key routes, updated `sitemap.xml`, and Yandex/OAI-friendly `robots.txt`. Production smoke on May 27, 2026 verified `/create` serves the new constructor without the removed "Компас над старым городом" preview block, Yandex.Metrika `109116448` is present, `/podarok/dlya-pary` returns pair landing metadata/JSON-LD, and `sitemap.xml` includes `/create`, `/podarok/dlya-pary`, and blog routes.
- Split Telegram bot roles in the Job API on May 27, 2026. Website support chat now uses the chat-specific `FAIRYTELLER_CHAT_TELEGRAM_*` env group and production polling, while generation progress/failure alerts use `FAIRYTELLER_ALERT_TELEGRAM_*`. Production was updated from the saved pre-switch env backup so support chat remains on the support bot and generation alerts return to the operations bot; `/healthz` verified after restart.
- Deployed frontend release `/var/www/fairyteller/releases/20260527-1547-codex-couple-inline-constructor-light-seo` for `/podarok/dlya-pary`. The page now embeds the book constructor as the third screen, defaults the couple flow to two adult heroes, locks the submitted `world` to the romantic story profile, removes the visible world picker, and keeps only a compact light romantic-format note. Production smoke verified both `/podarok/dlya-pary` and `/podarok/dlya-pary/` return the pair page title/canonical and the static SEO HTML exists in the active release.
- Deployed frontend release `/var/www/fairyteller/releases/20260527-1620-codex-couple-footer-hero-sync` for `/podarok/dlya-pary`. The couple landing page footer now matches the main page footer exactly: logo block, shared Fairyteller description, anchor navigation, VK/Dzen links, create CTA, and copyright line. Production smoke verified the active release, pair static SEO HTML, pair title/canonical, and the active `CoupleGiftLanding` asset contains the shared footer copy while the previous final CTA block is absent.
- Deployed frontend release `/var/www/fairyteller/releases/20260527-1640-codex-clickable-gift-tiles` for the homepage gift-idea grid. The six "Повод начинается с человека" tiles are now full-card links with arrow affordances; "Любимому человеку" and "На годовщину" point to `/podarok/dlya-pary`, while the other occasion tiles point to `/create`. Production smoke verified the homepage asset contains the new pair landing link.
- Renamed the romantic world key cleanup on May 27, 2026: frontend constructors now submit `romantic_story` as the canonical world key, while n8n keeps `disney_light` as a legacy alias for existing jobs/bookmarks. `fairyteller_text` and `fairyteller_full_text` now carry a stronger romcom-style relationship arc: warm collision or existing-couple tension, forced joint task, funny complications, almost-confession, non-cruel misunderstanding, vulnerability choice, and a small final gesture/new shared ritual. Production n8n backup: `/root/fairyteller-n8n-backups/20260527-081232Z-romantic-story-before`; after-export: `/root/fairyteller-n8n-exports/20260527-081506Z-romantic-story-after`. Deployed frontend release `/var/www/fairyteller/releases/20260527-1622-codex-romantic-story-key-clean`; active assets contain `romantic_story` and no `disney_light`.
- Deployed frontend release `/var/www/fairyteller/releases/20260527-1705-codex-empty-root-clickable-tiles` after the old visible SEO/no-JS fallback reappeared inside `#root`. Production HTML for `/`, `/create`, `/podarok/dlya-pary`, `/romantic`, `/8march`, and blog static pages now keeps `#root` empty while retaining route-specific title, description, canonical, OG/Twitter tags, and JSON-LD in `<head>`. The source `index.html` and SEO page generator were updated so future builds do not reintroduce visible fallback content behind the React app. This release also keeps the homepage gift tiles as cache-busted full-card links: "Любимому человеку" and "На годовщину" route to `/podarok/dlya-pary`, while the other tiles route to `/create`.
- Deployed cache-bust frontend release `/var/www/fairyteller/releases/20260527-1715-codex-cachebust-clickable-tiles` after browser testing showed some sessions still using the old non-clickable homepage occasion-grid chunk. The homepage now loads fresh `index-_nRWBKKt.js` and `DesignTest-7OGxZveJ.js`; production browser smoke verified the six "Повод начинается с человека" tiles are real links, and clicking "Любимому человеку" navigates to `/podarok/dlya-pary`.
- Tuned `fantasy_epic` text dramaturgy/ToV in production n8n on May 27, 2026. The plot structure remains epic, but `fairyteller_text` now frames fantasy through concrete roads, cities, rules of magic, artifact price, practical tasks, and clear choices instead of pushing constant fate/light/dark/heart metaphors. `fairyteller_full_text` now carries the same continuation rule for chapters 2-5: each chapter advances through a clear task, obstacle, magic rule or artifact cost, and a concrete hero choice. Backup: `/root/fairyteller-n8n-backups/20260527-092809Z-fantasy-tov-before`; after-export: `/root/fairyteller-n8n-exports/20260527-0933-fantasy-tov-after`. Verified `baku-n8n-docker` health and active workflows `fairyteller_text`/`fairyteller_full_text`.
