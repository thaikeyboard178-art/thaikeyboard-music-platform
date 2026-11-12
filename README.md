# THAIKEYBOARD Music Training — Đọc nốt nhạc

Vietnamese-first, responsive music-practice application. The initial public module teaches note reading in treble (Sol) and bass (Fa) clefs with a standard engraved staff, multiple-choice answers, keyboard shortcuts, and an interactive two-octave virtual piano. Practice modes include unlimited free practice, 10/20/30/50-question challenges, timed speed practice, and a deterministic daily challenge. Core practice does not require an account, server, database, payment, or secret.

## Rhythm V1 — active activities and source map

Rhythm Training is registered at **`/rhythm-training`** through `client/src/app/moduleRegistry.ts`; its page implements two learner-facing activities: **Tap Rhythm** and an independent visual-only **Rhythm Quiz**. Quiz is an in-page screen, not a separate `/rhythm-quiz` route. The Quiz requires neither audio nor tapping. There is no Lesson, Listen & Identify, or Count the Beat user flow. See the [module source guide](client/src/modules/rhythm-training/README.md), [active curriculum decisions](client/src/modules/rhythm-training/docs/Curriculum-V1.md), and [approved Tap owner decisions](client/src/modules/rhythm-training/docs/Tap-Rhythm-V1-Phase-4A.2-Owner-Decisions.md).

Tap covers Levels 1–6 and optional Bonus 2/2 with fixed approved vocabulary. The active technical pulses are quarter=480 ticks for 2/4–4/4 (2/3/4 per bar), eighth=240 ticks for all X/8 (3/6/9 per bar), and half=960 ticks for 2/2 (2 per bar); defaults are 100 BPM for X/4 and 2/2 and 180 BPM for every X/8 meter, with a global 30–300 BPM range. The musical 6/8 `3+3` and 9/8 `3+3+3` groupings remain distinct from the technical pulse. Quiz count and assessment quotas are not owner-approved policy. Long-form older requirements preserve historical text where it conflicts with current decisions; this summary makes no test-pass or physical-audio validation claim.

## Stack and architecture

The existing React 19, Vite 7, TypeScript, Wouter, Express, tRPC, Drizzle/MySQL, Tailwind 4, Radix UI, Framer Motion, pnpm, and Vitest project structure is retained. Note Reading is isolated under `client/src/modules/note-reading/`; shared module/session/scoring contracts live under `client/src/features/training/`; the module registry lives at `client/src/app/moduleRegistry.ts`. Active practice sessions stay in memory. Optional aggregate progress and two non-sensitive preferences (auto-advance and independent ledger counts) are stored locally; other setup choices remain in memory.

Notation is rendered from structured note events with [VexFlow 5](https://github.com/vexflow/vexflow), a TypeScript-authored music-engraving library that supports SVG and standard treble/bass clefs, staff notes, and ledger-line rendering. The installed package is pinned in `package.json`/`pnpm-lock.yaml`. See the [VexFlow overview](https://www.vexflow.com/) and its [StaveNote API documentation](https://www.vexflow.com/build/docs/stavenote.html). The music theory and exercise generator are kept separate from the renderer so exercises, answers, and pitch validation share the same note data.

## Note Reading preferences

Auto-advance defaults ON and is available as a switch in setup and practice. Answers score immediately (+10 correct, +0 incorrect), retain feedback and correct-answer highlighting for 900ms, then advance. The next/results button skips the wait; turning OFF keeps feedback until the button is pressed. Final Challenge/Daily feedback is never skipped. Turning ON during feedback starts a fresh 900ms delay. Session/question identity checks and timer cleanup prevent duplicate or stale transitions.

Ledger lines above and below the staff are independently configurable from0 through4, default1/1. The staff-only action selects0/0. Valid diatonic positions are inclusive `-2 * below .. 8 + 2 * above`; this includes all inner lines/spaces and the outside-staff adjacent spaces for an extended side, but not a space beyond the outermost selected ledger line. The existing music-theory conversion and VexFlow renderer remain unchanged. Both ledger counts are included in daily seeds; older service consumers without custom counts retain the legacy range behavior.

## Requirements

- Node.js 22 or later (the current workspace uses Node 22).
- pnpm 10.18.0, pinned as the project package manager.
- No environment variables are required for the public practice app.
- Existing backend/database helpers remain available for unrelated starter functionality but are not called by Note Reading; server/database resources remain optional and disabled in the current Manus project.

## Install and run

```bash
pnpm install --frozen-lockfile
pnpm dev:static
```

Vite serves the app at `http://localhost:3000` by default. `PORT` may override the port through the existing `dev:static` script. The root page is the training home; `/note-reading` opens the module directly.

## Checks and production build

```bash
pnpm check
pnpm test
pnpm build:static
```

`pnpm check` runs TypeScript diagnostics. `pnpm test` runs Vitest suites for shared session transitions, music-theory mapping, note generation, pitch validation, and UI interactions. `pnpm build:static` creates the production static site under `dist/public/`.

The starter's independent Express/backend build remains available as `pnpm build`, which also produces `dist/index.js`; `pnpm start` runs that Express server. Database migration commands `pnpm db:migrate` and `pnpm db:push` are retained for the existing starter schema but are not required for this practice module.

## Environment variables

The Note Reading frontend requires **no** environment variables. `.env.example` lists every environment-variable name referenced by the existing optional starter backend; secret values are deliberately blank. To configure that unrelated backend locally, copy the example to `.env` and provide only the values required by the feature you enable. The names are `NODE_ENV`, `PORT`, `DATABASE_URL`, `MANUS_PROJECT_ID`, `MANUS_JWT_SECRET`, `MANUS_OAUTH_API_URL`, `MANUS_OAUTH_PORTAL_URL`, `OWNER_OPEN_ID`, `MANUS_API_URL`, `MANUS_API_KEY`, `MANUS_API_BROWSER_KEY`, `MANUS_ANALYTICS_ENDPOINT`, and `MANUS_ANALYTICS_WEBSITE_ID`. Never commit a populated `.env` file or expose credentials. The public static practice application does not read these backend variables.

## Deployment preparation

The application can be served as a static Vite build with `dist/public/` as the output directory. A backend-enabled deployment can use the existing Dockerfile and Express service if a future feature actually requires it. Before publishing, configure the corresponding hosting/build target for the intended environment and confirm public route fallback behavior. This documentation does not publish or deploy the application.

## Privacy and pricing

The first two years of the training service are free. The Note Reading module contains no subscription, checkout, paywall, artificial practice limit, mandatory account, or ad. Individual practice and optional aggregate statistics are stored locally in the browser; the module does not send them to the server.

## Shared platform foundation

The application has one explicit typed catalog in `client/src/app/moduleRegistry.ts`. Its active registrations supply a path and lazy page; metadata-only Coming Soon entries cannot supply either. Landing cards, shared header navigation and `App.tsx` routes consume this catalog. Note Reading and Rhythm Training are active modules; Rhythm Training is registered at `/rhythm-training` and contains Tap Rhythm plus an in-page visual Quiz (not a separate Quiz route). Chord Recognition remains Coming Soon, without a training engine. The active page routes are `/`, `/note-reading`, and `/rhythm-training`.

`client/src/features/training/` owns generic session/scoring/result contracts, `ResultSummary.tsx` scalar presentation, and `progress.ts` local aggregate persistence. Shared sessions no longer require clef/range strings: these remain in Note Reading's module-local setup. Every live `TrainingModule` must provide its own typed Zod configuration schema; each module validates its configuration at session startup. Difficulty metadata is optional and must only advertise levels whose behavior is actually implemented by that module. Note Reading continues to use its real custom-ledger configuration; there is no new difficulty selector or generic difficulty engine.

`client/src/app/TrainingShell.tsx` supplies the reusable header/navigation/footer. Module pages keep their own setup, exercise data, feedback, title/copy and actions; the shared result summary receives only `TrainingResult`. Note Reading's theory, VexFlow, piano, Web Audio, generation, validation, daily seeding, preferences and900ms auto-advance remain module-owned and unchanged. Rhythm Training's Tap and in-page Quiz implementations remain under `client/src/modules/rhythm-training/`.

Aggregate progress preserves `thaikeyboard-music-training-progress-v1` and the legacy scalar fields, safely normalizes corrupted data and repairs it when a valid completed result is recorded. Landing totals are platform totals, not invented per-module history. Consecutive duplicate recording is prevented using `lastSessionId`; cross-tab atomicity, arbitrary historical replay deduplication, session history and account/cloud synchronization are deliberately not implemented.

For any future module: place its types/schema/engine/page/tests under its own `client/src/modules/<id>/`, use the generic training contracts, change its catalog registration to active with its real lazy page/path, synchronize `client/public/manus-routes.json`, and run `pnpm check`, `pnpm test`, `pnpm build:static` and `pnpm build`. No router or shared-shell rewrite, dynamic plugin framework, new technology stack, mandatory account or payment system is required. Documentation and GitHub source synchronization do not deploy the application.
