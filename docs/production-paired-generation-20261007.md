# Production generation — paired chapters and final book layout (2026-10-07)

Deployed the locally tested three-call pipeline on the existing production workflow IDs: Gemini 2.5 Pro through OpenLux writes plan + chapter 1 → chapters 2–3 → chapters 4–5. Grok images begin after each accepted chapter and generated character references. No separate mandatory scene-selection or typography-rewrite call is added.

Illustration scenes are selected from the whole written chapter, with quoted evidence. Prompts direct action, reaction, gaze and varied composition. Neutral identity cards have empty hands and no story props; identity references do not prescribe pose/expression/framing. First-image references are filtered by visible hero IDs; supporting people need a separate source quotation. Scene and wardrobe locks survive retries and 7600-byte prompt compaction.

Early validation checks response/content/scene integrity. Once all prose is ready, `story-text.json` preserves accepted prose and authenticated `POST /api/fairyteller/jobs/:id/book-layout` lays out 4/4/6/6/5 text pages at fixed 10.5 pt, justified, without changing words/order. The endpoint rejects books without the final-layout marker. Up to two bounded shortening calls are possible only for true physical overflow, preserving the accepted illustration fragments anywhere in the chapter. The editor returns at most three addressed paragraph replacements per overflowing chapter; entire illustrated blocks remain frozen. Character counts are advisory: every valid candidate reaches the actual layout, and another edit is allowed only after repeated physical overflow. Original prose and each candidate are preserved separately. Prepared pages go to `full-text.json` with `layoutReady=true`; the PDF uses those boundaries and verifies no clipping. Existing books keep their previous renderer path.

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

## Production incident and fix (2026-10-08)

Job `ft_1791448881549_qbxcxx` exposed a promotion defect: the continuation node still required a loopback `FAIRYTELLER_API_BASE_URL`, and the illustration wait node read the same absent Lab variable. The previous offline production test supplied that variable, masking the defect; the API/renderer smoke did not execute continuation. First-chapter text, three identity references and its image were already saved.

The promotion builder now rewrites both nested API bases to the deployed `localApiBase` (`https://fairyteller.ru`), removes local response-capture helpers, and rejects any remaining `FAIRYTELLER_API_BASE_URL` dependency. Production integration tests deliberately omit this variable, assert every API request uses the production target, scan all six workflows, and execute the illustration barrier. Scope: only the first-text and full-text workflows; model choice, chapter grouping, prose, saved references and PDF layout remain unchanged.

Incident snapshot and recovery evidence: `/root/fairyteller-recovery-20261008/`. The orphan image waiter was stopped through its existing failed-text check before an idle restart. Recovery uses the original run key and saved first chapter; no new customer order or first-chapter/photo generation is required.

Continuation checkpoints also used to serialize `order._photoRefs` into every prose context. Real three-photo requests produced very large chapter artifacts and HTTP 413 even though the model response was valid. The checkpoint context now omits only these private image bytes; the immutable run key still scopes the original photos. A regression fixture with over 1 MB of photo data verifies every chapter artifact remains below 500 KB and contains no photo marker. Source photos and identity references remain in their original storage.

Word-preservation checks remain strict. Their failure diagnostics now include chapter number, source/prepared character counts and first differing position, without logging private prose. The mismatch was traced to the API preflight worker stdout parser: `Buffer.toString()` decoded each byte chunk independently, turning a Cyrillic letter split across chunks into two replacement characters. The API now uses the stream UTF-8 decoder before collecting lines. A real API/subprocess regression deliberately splits a Cyrillic code point across stdout chunks in a large JSON response and repeats three requests on the reused worker. Guarding word preservation remains mandatory.

Recovery completed at `2026-10-08T09:21:39.509Z`: original job is `done`, 41-page PDF, 25 text pages at 10.5 pt justified, no truncation and all chapter words preserved. First chapter, three identity reference files and first image are byte-identical to the incident snapshot. Final recovery reused the four saved continuation chapters and their four existing images; only the outstanding cover/PDF stage remained. This was incident recovery, not a new-generation timing benchmark.

## Final-fit correction (2026-10-09)

A production order overflowed chapter 1. The old repair reduced 3786 characters to 3755, then failed the only repeated layout. It accepted any reduction and did not validate its requested character range. `Ensure Full Text Fits` now computes a budget below both the failing chapter length and its nominal ceiling, with 10% initial headroom. The model gets the exact budget for editable blocks; illustrated blocks remain verbatim. Out-of-budget responses never replace saved text and do not trigger another expensive pagination pass. At most two provider requests are allowed; the second budget is tighter. Only actual overflowing chapters change, and the renderer still verifies the real fit at 10.5 pt with justification.

`ops/apply-fairyteller-final-fit.mjs` updates only this node in a freshly exported workflow. `node ops/test-fairyteller-final-fit.mjs --production` executes the actual node offline and verifies insufficient shortening, strict scene locks, unchanged other chapters, bounded retries and preservation on failure. The same tests run for the Lab workflow.

Production verification: only `Ensure Full Text Fits` was changed, with published/current/history parity; all other 14 active workflows were unchanged. The failed order completed at `2026-10-09T01:28:56.353Z` after reusing chapters 2–5, both references and all five chapter images. Recovery took 3m06.353s, not a fresh-book generation benchmark. The first correction was rejected before writing because it returned 3365 characters against a 3330-character ceiling; the second passed and the real renderer produced a 41-page PDF at 10.5 pt justified, without truncation. All continuation words and illustration quotations were preserved. Original first-chapter text remains saved; its print version was shortened to fit. Private snapshot/evidence: `/root/fairyteller-layout-repair-20261009/`.

Verification: actual production and Lab final-fit regression tests, production paired-node tests, syntax compilation and scoped lint passed. Full repository lint still reports 13 existing errors (top-level n8n snippets and unrelated TypeScript/React rules) and 9 warnings. No frontend, API, renderer or model routing changes.

## Paragraph-only final fitting (2026-10-09)

A subsequent order exposed the cost of the strict character ceiling: a 3380-character first correction was discarded against a 3330-character ceiling without trying its physical layout. Its raw answer was not saved, so whether that particular answer would have fitted is unknown. The book finished after a second call, with 182.38 seconds spent in final fitting.

The current node replaces whole-chapter rewriting with addressed paragraph patches. Only actual overflowing chapters are sent to the editor. It may replace at most three existing paragraphs per chapter, cannot remove/split a paragraph, and must keep each replacement nonempty and shorter. Titles, summaries, all other paragraphs and chapters, and the entire blocks containing accepted illustration evidence are retained by code. The prompt preserves events, motivations, causal links and transitions; semantic preservation still depends on the editor for the changed paragraphs.

The approximately 5% shortening target is guidance rather than an admission check. Every valid candidate is persisted and measured in the actual 10.5 pt justified layout. Only a repeated physical failure permits a second editor call; the hard maximum is two calls and three layouts. `story-text.json` preserves original prose, while private `text-fit-attempt-1.json`/`text-fit-attempt-2.json` record source/candidate chapters, exact patches and layout outcome. The editor keeps Gemini 2.5 Pro/OpenLux with a 128-token thinking budget; the main three generation calls and illustration process are unchanged.

Verification includes both production and Lab node execution, one-character edits above the advisory target, multiple overflowing chapters in one call, actual repeated overflow, invalid/protected patches, original/candidate preservation and paired-generation regression. An isolated real API/renderer run uses an unchanged copy of a completed book, without provider calls or emails. Its tiny-edit regression simulates only the initial overflow; the candidate above the former 3330-character ceiling is then measured by the actual renderer. This does not prove that the lost 3380-character answer would have fitted. No new paid end-to-end book was generated, and four-minute generation is not yet demonstrated.

Private rollback/deployment evidence: `/root/fairyteller-fit-paragraphs-20261009/`. Only `Ensure Full Text Fits` in the existing full-text workflow is updated.

Published/current/history parity verified for version `89114310-3efd-4cb8-b37d-511c5556b6ca`; all other 14 active workflows and the two checked completed customer books are unchanged. The restart occurred while idle, submissions reopened, and public constructor/book routes return 200. Actual PDF: 41 pages, 10.5 pt, no truncation; the tested tiny-edit candidate had 3594 characters, above the former 3330 ceiling. Both production and Lab real-renderer tests passed, alongside scoped lint.

## Editor response parsing (2026-10-09)

A fresh test completed all five chapters and five chapter images, then failed final fitting because its editor reply began with `**My Thinking` rather than a bare JSON object. The previous response was not retained, so the original thought flags/finish reason cannot be reconstructed. The editor now explicitly requests `includeThoughts=false`, excludes tagged thought parts, and accepts a complete final paragraph-edit JSON object after untagged reasoning or in a final JSON fence. Truncated/non-final responses are rejected, and the existing exact-address, nonempty/shorter paragraph and frozen-scene checks remain mandatory. Raw editor responses are saved as private `text-fit-response-N.json` before parsing. No additional automatic provider retry was added.

Contract tests cover these response formats and reject thought-only/truncated answers; production/Lab tests, the actual renderer regression and scoped lint pass. Private deployment/recovery snapshot: `/root/fairyteller-fit-json-20261009/`. The recovery resumes only final fitting, the existing-image barrier, cover and PDF; it does not regenerate chapters or identity/chapter images.

Recovery finished at `2026-10-09T07:03:40.059Z` (73.644 seconds after resuming, not a fresh-generation benchmark): one editor call corrected three paragraphs each in chapters 1 and 2, from 4004 to 3853 and 3839 to 3701 characters. The accepted real layout produced a 41-page PDF at 10.5 pt without truncation. The captured new response contains a tagged thought part followed by the JSON answer, confirming that filtering these parts is necessary despite `includeThoughts=false`. Prepared words match the accepted edits; original story, all chapter checkpoints/drafts and all five chapter images are byte-identical. The temporary recovery workflow/webhook is disabled and its temporary MCP exposure removed.
