# Story dramaturgy generation — 2026-10-05

The constructor directly starts the existing first-chapter generation. The same request creates the story bible, five-chapter plan and first chapter. Remaining chapters use the existing durable chapter generator.

## Changed behavior

- Start with one or two short paragraphs of place and ordinary life, then disrupt the routine.
- End the first chapter with a concrete consequence and unresolved question; chapter two advances it.
- Expand the stakes and consequences through causal decisions rather than independent small errands. Romantic stakes concern a shared future; child stories preserve emotional safety.
- Use no catalogue of ready-made plot threats in the prompt.
- A blank important detail stays blank in the story/illustration canon. Do not invent a mandatory compass or other physical quest artifact. Ordinary tools and surroundings remain allowed. Explicit user details are preserved.
- Continue existing saved plans and events when generating later chapters; do not rewrite old first chapters.

## Scope and verification

Only two workflow nodes changed: `Build First Chapter Prompt` in `fairyteller_text` and `Build Full Text Prompt` in `fairyteller_full_text`. Continuation rules are in the system prompt because the durable generator removes the generic user-prompt tail when requesting individual chapters.

No new model request or separate plan review was added. Schemas, output targets, provider budgets and retry behavior are unchanged. Longer instructions can slightly affect processing time; provider latency remains variable and was not benchmarked against an equivalent baseline.

Tests cover five genres, twenty mocked continuation requests, optional and explicit compass handling, child tone, unchanged provider contract, durable assembly, malformed JSON retries, provider fallback and quota errors. Real text-only provider samples covered fantasy, adventure, cyberpunk and romance; first-chapter calls took 63–85 seconds. No images or customer orders were generated. A rejected fantasy sample turned an invented gear into a quest artifact; the final rule explicitly prevents that substitution. These samples verify behavior in bounded cases, not a universal model guarantee.

## Production and rollback

Published text version: `621473a9-1da7-471a-88a6-cf81f6e67f8e`.
Published full-text version: `03ce8808-7604-4260-8a95-abf018ba8861`.

Before-change exports: `/root/n8n-docker-data/exports/20261005-story-dramaturgy-before/`. To roll back, import both exports, publish both workflow IDs and restart the orchestration service after confirming no running executions. Frontend, Job API, illustration and PDF workflows do not require a rollback for this release.

Run `node ops/test-fairyteller-story-dramaturgy.mjs` and `node ops/test-fairyteller-durable-full-text.mjs` for local checks. The first test includes a permanent fixture of the pre-change provider configuration.
