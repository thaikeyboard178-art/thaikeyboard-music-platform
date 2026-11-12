# THAIKEYBOARD Music Training — Note Reading Rebuild Plan

## Implementation approach

Keep the existing React 19, Vite 7, TypeScript, Express, tRPC, Drizzle/MySQL, Tailwind 4, Radix, Framer Motion, pnpm, and Vitest stack. Preserve the existing WebDev project, route shell, public configuration, platform helpers, server, and database schema/migrations. The Note Reading feature remains public and client-side; no account, database, payment, or backend service is required for practice. Do not change WebDev resource configuration or publish/deploy.

Replace the current single-page practice implementation with a module boundary under `client/src/modules/note-reading/`. Use VexFlow 5 as a pinned/persisted package dependency for standard SVG notation: it is TypeScript-authored, exposes browser SVG rendering, and supplies treble/bass clefs, stave notes, noteheads, stems, and ledger-line engraving. A structured `NoteEvent` (clef, letter, octave, diatonic position, semitone pitch, accidental, ID) is the single source for both VexFlow key spelling and answer/audio validation. Keep music theory conversion, range generation, seeded daily generation, scoring, and session reducers in pure modules, independently testable without React or browser rendering.

Create a small reusable `TrainingModule` contract and shared session/result/scoring types sized for this module, plus a module registry for the application shell. Avoid moving unrelated starter components or introducing a generic plugin framework. Model natural notes now, but reserve accidental and key-signature fields. Treat the piano as a separate audio/answer component: render at least two octaves of white and black keys; use user-gesture-triggered Web Audio oscillators with correct equal-tempered MIDI pitch. All answer paths share one guarded validation/score transition so no question can be scored twice and wrong answers never subtract points.

Provide free practice, configurable 10/20/30/50-question challenges, speed mode with response time and optional time limit, and date/config-seeded daily challenges. Keep live sessions and setup choices in memory; optionally persist aggregate non-sensitive practice statistics in local storage. Keep `client/public/manus-routes.json` synchronized with both `/` and `/note-reading`. Update README and a value-free `.env.example` with independent install, local run, test, build, environment-variable, and deployment-preparation instructions; no runtime secrets are added.

### Project structure

- `client/src/modules/note-reading/pages/`: `NoteReadingPage.tsx` composes setup, session, feedback, and results.
- `client/src/modules/note-reading/components/`: accessible setup controls and two-octave virtual piano.
- `client/src/modules/note-reading/notation/`: pure note spelling/pitch mapping and the VexFlow staff renderer.
- `client/src/modules/note-reading/services/`: range-safe exercise generation, answer validation, daily seeding, and Web Audio pitch playback.
- `client/src/modules/note-reading/configuration.ts` and `types.ts`: validated module configuration and structured note/exercise contracts.
- `client/src/modules/note-reading/**/*.test.ts(x)`: deterministic theory, generator, schema, audio-helper, and browser-DOM interaction coverage.
- `client/src/features/training/`: reusable module/session/result/scoring contracts and state transitions.
- `client/src/app/moduleRegistry.ts`: typed module registration for the existing Wouter application shell.
- `client/src/pages/Home.tsx` and `client/src/App.tsx`: training landing page and route shell; global responsive tokens/styles stay in `client/src/index.css`.
- `server/`, `shared/`, and `drizzle/`: existing Express/tRPC/Drizzle infrastructure and database schemas/migrations, retained without changes.
- `server/`, `shared/`, `drizzle/`: retained unchanged because no server-side practice/progress is required.

## Design direction

The user's brand brief sets the direction: clean, modern, friendly, educational without a childish tone; Vietnamese-first; ownable coral `#FF583B`. Apply that brief as an editorial practice studio rather than the existing small green dashboard aesthetic.

- **Design Movement**: Contemporary music-school editorial, with notation-paper clarity and restrained digital-product polish.
- **Core Principles**: Make the staff the visual focus; make each exercise action obvious; use clear feedback without penalty; keep controls calm, touch-friendly, and accessible.
- **Color Philosophy**: THAIKEYBOARD coral `#FF583B` is the energetic action/accent color, balanced by warm paper, ink, and measured green success tones; reserve red-tinted coral for errors so the brand accent remains friendly, not alarming.
- **Layout Paradigm**: A lesson-first canvas: compact top navigation, a prominent wide notation/practice stage, and a secondary configuration rail that collapses below the stage on narrow screens.
- **Signature Elements**: A distinctive coral keyboard-key mark in the wordmark; precise five-line music staff; compact numbered keyboard hints paired with answer controls.
- **Interaction Philosophy**: Changes are immediate and reversible before starting; answers resolve once, reveal the correct note, and offer a clear next action. Speed timing is visible but optional; no punitive score motion.
- **Animation**: Brief 140–220 ms opacity/translate transitions for question/feedback changes; gentle coral progress fill; no bouncing notes or continuous motion; respect `prefers-reduced-motion`.
- **Typography System**: Use the existing locally/system-available sans stack for Vietnamese legibility with a strong Manrope-like geometric heading face where available; clear hierarchy from page title to control labels to notation annotations. Do not make note glyphs depend on external fonts; VexFlow's bundled notation font handles them.
- **Brand Essence**: “THAIKEYBOARD Music Training helps Vietnamese learners read, hear, and play notes accurately, one focused exercise at a time.” Personality: precise, encouraging, practical.
- **Brand Voice**: Short, warm, action-led. Example: “Nhìn nốt — gọi tên — chơi đúng.” and “Sai một lượt cũng là thêm một lần nhớ.”
- **Wordmark & Logo**: THAIKEYBOARD wordmark accompanied by a compact coral key-top motif that echoes a notehead and key, while retaining the project’s existing favicon/platform-logo configuration unless intentionally updated.
- **Signature Brand Color**: THAIKEYBOARD coral `#FF583B`.

## Dependencies and constraints

Add VexFlow 5 for notation only and commit the resulting pnpm lockfile. Do not remove existing dependencies or replace the project stack. Do not add a database migration, account flow, payment flow, or secrets. Keep public route manifest valid and unchanged unless adding a real page route. Preserve `app.config.ts` and project integration. Run type checking, Vitest, production build, and browser-size checks; do not publish/deploy. Save the completed source as a normal update to canonical GitHub `main`, after fetching/integrating the current tip and rerunning affected checks. The project's WebDev auto-publish setting is false; no Publish operation is authorized.

## Focused UX improvements — 2026-11-10

Keep the current module, theory conversion, VexFlow adapter, shared scoring and platform infrastructure. Add a locally stored auto-advance boolean (default true) with accessible switches in setup and practice. Use a 900ms feedback interval shared by both answer methods. Keep a separate result-view acknowledgement so a completed finite session remains on final feedback until manual continuation or the feedback timer. Cancel timers on question/session/view/toggle changes; re-enabling during feedback starts a fresh 900ms interval. Manual continuation cancels pending work and transitions through guarded current-session state.

Add validated independent ledger counts 0..4 above/below (default 1/1), plus a staff-only action (0/0). New generation uses positions -2*below through 8+2*above inclusive; p=-1 and p=9 are included when that side has ledger extension. Do not include a space beyond the selected outermost ledger line. Preserve legacy range APIs/tests as backward-compatible service inputs, but replace the setup presets with independent controls; display the actual custom counts in session context and use them in daily seeding. Persist only these non-sensitive UX preferences locally, not active answers or session history. Existing VexFlow geometry already covers the full -8..16 range; retain it and validate extreme fixtures/resize rather than replacing the renderer. No new dependency, route, backend, migration or deployment.

## Shared platform foundation — 2026-11-10

Preserve Note Reading as the existing independent leaf module, its note theory/rendering/generation/audio/UX and the current stack. Remove only the unused clefConfiguration/noteRange inputs from the shared in-memory session contract; no stored sessions consume them and transition/scoring logic remains unchanged. Keep exercise/config/answer types local and make every active TrainingModule's typed Zod configSchema required. Difficulty is optional module-owned metadata, not three falsely advertised working modes; do not introduce a difficulty engine or change Note Reading's custom-range setup.

Replace the disconnected object Map with a small explicit typed app catalog in app/moduleRegistry.ts. Active registrations own a path and lazy React page; Coming Soon registrations cannot own a route/page or a live training engine. The sole active route remains /note-reading, with metadata-only Rhythm Training and Chord Recognition entries. Drive landing cards, header navigation and executable active routes from this catalog; guard duplicate ids/paths and check the static route manifest against it. No plugin discovery, registry mutation framework or build-time route generator.

Extract the duplicated header/footer into app/TrainingShell.tsx, preserving current CSS classes, module main element/ref and Note Reading lifecycle. Shared result statistics accept TrainingResult only; module copy/actions stay local. Extract local aggregate progress into features/training/progress.ts with the existing v1 key/counter names, safe normalization/repair and current consecutive-session idempotence. Present these counters as platform totals, not fabricated per-module history. No backend/account/progress sync, session replay ledger or new storage history.

Project structure additions: app/TrainingShell.tsx supplies brand/header/catalog navigation/footer; app/moduleRegistry.ts is the only active/future catalog; features/training/progress.ts owns generic local totals; features/training/ResultSummary.tsx presents scalar stats. Existing App.tsx/Home.tsx/NoteReadingPage.tsx become consumers. Keep modules/note-reading/configuration.ts and all domain services/notation/components; no Rhythm/Chord folders or MIDI integration. Shared/core, server, schema/migrations, package/lockfile, platform config and serving port stay unchanged. Save source and audit evidence to the same GitHub main history without publishing.


## Rhythm Training Quiz, Practice Layout & Metronome Completion — 2026-11-12

Keep this refinement inside `client/src/modules/rhythm-training/` (plus this plan and that module's TODO only); retain React/Vite/TypeScript/Vitest, add no dependency, do not change Note Reading, Chord, shared scoring/session architecture, database, routes, or deployment. Quiz Auto Next is setup-owned, defaults ON, and advances only after a submitted answer has updated the existing shared Rhythm Quiz session and its feedback has remained visible for 2,000 ms; OFF keeps manual Next. Use question identity and one-transition guards, cancel timers on view/session/question changes, and keep Skip/technical-abort paths separate. The Quiz result return stays in its existing action-row position and navigates directly to the existing `/rhythm-training` module home (the chooser screen), without starting a run. Move Tap's existing Setup return into the upper-right module heading, retaining the same home destination.

Recompose the existing Tap Practice workspace into four direct vertical regions: exercise identity (Level/meter/bars/mode), metronome and its one tempo display/controls/volume/visual counting, staff with the adjacent tap target, and the existing exercise controls. Preserve existing control handlers, notation, BPM behavior and markers.

For audio, preserve the canonical `createTapAttemptPlan` finite count-in-plus-exercise pulse grid and its `durationSeconds`. Grading still closes at the already-approved expected-onset/collection/drain boundary and keeps all target, clock bridge, matching, accuracy and score calculations unchanged; a successful result must not cancel the independent finite metronome plan before its musical end. The plan's own finite transport completion ends playback at full measure duration. Explicit stop, technical abort, visibility/clock failure, retry and disposal continue to cancel promptly; never add a Tap target or a pulse at a measure boundary.
