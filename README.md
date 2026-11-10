# THAIKEYBOARD Music Training — Đọc nốt nhạc

Vietnamese-first, responsive music-practice application. The initial public module teaches note reading in treble (Sol) and bass (Fa) clefs with a standard engraved staff, multiple-choice answers, keyboard shortcuts, and an interactive two-octave virtual piano. Practice modes include unlimited free practice, 10/20/30/50-question challenges, timed speed practice, and a deterministic daily challenge. Core practice does not require an account, server, database, payment, or secret.

## Stack and architecture

The existing React 19, Vite 7, TypeScript, Wouter, Express, tRPC, Drizzle/MySQL, Tailwind 4, Radix UI, Framer Motion, pnpm, and Vitest project structure is retained. Note Reading is isolated under `client/src/modules/note-reading/`; shared module/session/scoring contracts live under `client/src/features/training/`; the module registry lives at `client/src/app/moduleRegistry.ts`. A live practice session and setup choices stay in memory; only optional aggregate practice statistics are stored in the browser's local storage.

Notation is rendered from structured note events with [VexFlow 5](https://github.com/vexflow/vexflow), a TypeScript-authored music-engraving library that supports SVG and standard treble/bass clefs, staff notes, and ledger-line rendering. The installed package is pinned in `package.json`/`pnpm-lock.yaml`. See the [VexFlow overview](https://www.vexflow.com/) and its [StaveNote API documentation](https://www.vexflow.com/build/docs/stavenote.html). The music theory and exercise generator are kept separate from the renderer so exercises, answers, and pitch validation share the same note data.

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
