# Direct book generation from the constructor

Released 2026-10-05 on the production homepage and `/create`.

Previously, `Создать книгу` requested a separate editable story brief, and the customer had to approve it with a second button. It now checks the form and existing generation quota, then submits directly to the book intake. The existing text workflow produces the story bible, five-chapter plan and first chapter; the rest of the book continues through the existing pipeline.

The request retains the photographed heroes, ages, descriptions, world, illustration style, location and optional `artifact`. Empty `artifact` remains empty. Approved-brief fields and the call to the story-brief endpoint are removed from this constructor. The other constructors, story-brief workflow, production text/image/PDF workflows, existing books, editor and payment flows are preserved.

## Production release and rollback

- Active release: `/var/www/fairyteller/releases/20261005-constructor-direct-create-v1`.
- Rollback release: `/var/www/fairyteller/releases/20260908-account-delete-v1`.
- Constructor module: `assets/DesignTest-8HgBMuFi-direct-create-20261005.js`.
- Root module: `assets/index-D0zYtsgX-direct-create-20261005.js`.
- Deployment starts from a copy of the active production release. Only constructor code changes semantically. The 63 affected JS modules receive new names and updated import references, and 34 HTML files point to the versioned modules. This preserves the original immutable assets, including the shared root-module identity across imports.
- Rollback is an atomic replacement of `/var/www/fairyteller/current` with a symlink to the rollback release; no API or workflow rollback is required.

## Verification

The pre-change constructor and its 22 direct JS dependencies were byte-identical to the active production modules. `npm run build`, targeted ESLint and the source whitespace check passed. Browser checks exercised missing-data validation, one-click submission with a photo and important detail, a blank important detail, quota refusal without a create request, progress polling and the mobile layout at 390 px. The new module graph loaded without browser errors. A local execution of the production first-chapter prompt builder confirmed direct input works without an approved brief and retains the requested hero, location and artifact. No AI-provider calls or synthetic customer books were created during verification.

All 97 deployment overlay files were hash-checked on the server, and the preserved files matched the previous release. Public routes and the new constructor module were checked after activation. A live browser smoke uses intercepted create/status requests to verify the UI without triggering paid generation.

The repository-wide TypeScript check has existing errors outside the changed page, including account timers and missing sidebar UI modules. It is not a passing project-wide type check. The production build and targeted page lint pass.

## Story-quality follow-up

The current input normalization has no automatic compass default. The removed brief stage could promote an invented recurring prop to an approved artifact canon; the direct flow avoids that path. The existing text prompts require an empty artifact canon when the customer supplied no important detail, but this is a prompt instruction rather than a guarantee that prose will contain no unrequested prop.

The active genre prompt explicitly restricts fantasy stakes to local, resolvable problems and restricts cyberpunk to helping a person, district or small community. Those restrictions are inherited by continuation through the story bible. Broader stakes and a chapter-by-chapter escalation contract require a separate editorial prompt change; they were not changed by this constructor release.
