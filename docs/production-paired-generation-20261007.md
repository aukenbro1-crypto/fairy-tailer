# Production generation — paired chapters and final book layout (2026-10-07)

Deployed the locally tested three-call pipeline on the existing production workflow IDs: Gemini 2.5 Pro through OpenLux writes plan + chapter 1 → chapters 2–3 → chapters 4–5. Grok images begin after each accepted chapter and generated character references. No separate mandatory scene-selection or typography-rewrite call is added.

Illustration scenes are selected from the whole written chapter, with quoted evidence. Prompts direct action, reaction, gaze and varied composition. Neutral identity cards have empty hands and no story props; identity references do not prescribe pose/expression/framing. First-image references are filtered by visible hero IDs; supporting people need a separate source quotation. Scene and wardrobe locks survive retries and 7600-byte prompt compaction.

Early validation checks response/content/scene integrity. Once all prose is ready, `story-text.json` preserves accepted prose and authenticated `POST /api/fairyteller/jobs/:id/book-layout` lays out 4/4/6/6/5 text pages at fixed 10.5 pt, justified, without changing words/order. The endpoint rejects books without the final-layout marker. One bounded shortening call is possible only for true physical overflow, preserving the accepted illustration fragments anywhere in the chapter. Prepared pages go to `full-text.json` with `layoutReady=true`; the PDF uses those boundaries and verifies no clipping. Existing books keep their previous renderer path.

Production checkpoint version: `production_paired_v1_whole_chapter_scenes`. Print contract: `local-pages-v4` + `layoutStage=final` (retained for compatibility with the tested Lab). Model/grouping selection is fixed in production; local-only guards, IDs, resume webhooks and API URLs are removed. Public constructor URL and webhook path are unchanged. Visual QA remains at its existing default; no new paid quality gate.

## Verification

- All six imported/published node and connection graphs match the prepared version; active/current history parity verified.
- Server/API sources match the uploaded release, API/n8n health is good, public constructor and an existing book return 200, create webhook is registered for POST.
- Paired-node integration tests run on the actual production exports with intercepted model calls.
- Actual API/renderer test with production mode and Lab disabled produced 41 pages, preserved prose and late scene anchors, and rejected legacy layout without touching it.
- Deployed API/renderer smoke reuses existing text/images: 25 prepared text pages, 41-page PDF, 10.5 pt, justification, no clipping, unchanged words. Layout took 9.65 s on the VPS. Zero provider calls/emails; temporary smoke job removed. Existing customer book artifacts remained byte-identical.
- Scoped lint and application build passed. Production PDF page 19 visually checked.

Latest user-run Lab book `ft_lab_1791367924362_9ysisj` completed in 4m51.438s. This is one local measurement, not a production SLA or proof of a four-minute target. A fresh full paid production generation was not started during deployment.

## Rollback and source

Private VPS snapshot: `/root/fairyteller-pipeline-20261007-v5/before/` (six workflows, API, renderer, nginx config). Reimport/publish the six previous workflows, restore the two server files, restart API/n8n, then verify health/current-published parity. Do not restore/remove customer job data. Imports use a writable container `/tmp` directory; the full execution database was not duplicated on the nearly-full disk. Deployment briefly gated only new book submissions and automatically reopened them on success/failure; current site/books/payments stayed served.

Sources: `n8n/workflows/` holds the active production exports; `n8n/local-sequential/` remains isolated for experiments. `n8n/code/local-sequential/` contains shared tested generation code. File-only builders prepare both versions; `n8n/production-exports/20261007-paired-v1-before/workflows.json` is the audited six-workflow baseline, without pinned executions. Production tests: `node ops/test-fairyteller-local-paired.mjs --production` and `FAIRYTELLER_TEST_JOB_DIR=/absolute/path/to/an/existing/local/job node ops/test-fairyteller-local-final-layout.mjs --production`. The latter reuses an untracked local book, not committed customer data.

Published IDs/versions and smoke metrics: [release record](production-paired-generation-20261007.json).

Git deployment branch: `codex/paired-generation-production-v1`. The first commit syncs previously deployed API helpers/behavior; the second records the new pipeline. Production was compared live before mutation; unrelated local changes were preserved.
