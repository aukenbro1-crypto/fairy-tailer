# Hero 2 antagonist role

Released 2026-10-05 on `/` and `/create`. Hero 2 has an unchecked `Антигерой` checkbox with the explanation `Противостоит главному герою и мешает ему достичь цели.` It sends the canonical role through the existing `hero2_rel` field. The active intake was verified to retain the relation and hero number in `order.heroes`.

Both text prompt builders recognize hero 2's exact canonical relation. The main hero remains hero 1; hero 2 has a separate goal and creates causal obstacles throughout the plan and chapters. The role takes precedence over generic duo/team/romantic expectations. Identity, description and age are retained; child safety remains higher priority than threatening genre treatment. No additional model requests, output fields, database migrations or illustration changes were added.

## Verification

- Production constructor and its direct dependencies matched the pre-change local build after normalizing versioned asset names.
- Build and targeted ESLint passed. Antagonist contract checks cover all five genres and twenty durable continuation requests. Existing dramaturgy and durable-generation regression checks passed.
- The production intake code preserved the role in a local execution with synthetic input.
- Browser checks against the staged static release and production verified checked/unchecked multipart submission, removing and re-adding hero 2, and no horizontal overflow at 390 px. Create requests were intercepted; no customer orders or paid generation were started. Expected intercepted HTTP 500 responses, signed-out account HTTP 401 responses and unavailable analytics were distinct from JavaScript module failures.
- Both published workflows were exported again and matched the intended nodes and connections; fifteen workflows remain active and service health checks passed.

## Production and rollback

Frontend: `/var/www/fairyteller/releases/20261005-antagonist-v1`. The release copies the previous production tree and overlays 63 versioned JS modules and 34 HTML references. Original immutable files remain intact; all 97 overlay hashes were verified before atomic activation.

Frontend rollback: `/var/www/fairyteller/releases/20261005-constructor-direct-create-v1`.
Text version: `6ff6b6b8-8950-48b3-99ca-5f5571720580`.
Full-text version: `f1054ed5-55ba-4884-8717-33117aa45b67`.
Before-change workflow exports: `/root/n8n-docker-data/imports/20261005-story-dramaturgy/text.role-before.json` and `full.role-before.json`. Rollback imports and publishes both exports, then restarts orchestration after checking for running executions.

Run `node ops/test-fairyteller-antagonist.mjs`, `node ops/test-fairyteller-story-dramaturgy.mjs` and `node ops/test-fairyteller-durable-full-text.mjs` for contract checks. Prompt rules define the intended behavior; literary compliance has not been established by a new paid full-book sample for this role.
