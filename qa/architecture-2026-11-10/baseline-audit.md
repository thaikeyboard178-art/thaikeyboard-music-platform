# Architecture Baseline Audit — 2026-11-10

## Scope and baseline

This is a synthesis of the supplied architecture findings only. It does not re-inspect source, rerun tests, or propose a stack, product, or infrastructure redesign.

The baseline is a working, Note Reading-only React 19/Vite/TypeScript/Wouter implementation. The recorded QA evidence reports **17 test files and 141 passing tests**, with a clean TypeScript check (`qa/architecture-2026-11-10/tests-before.log`, `typecheck-before.log`). No source edits were made for this audit.

The right baseline principle is: **preserve the working Note Reading leaf module and make only small neutral boundary changes before a second real module is implemented.** Rhythm Training and Chord Recognition remain future/Coming Soon metadata, not implementations.

## What already works and should not change

### Note Reading is a sound leaf module

Note Reading is internally contained under `client/src/modules/note-reading`. Its non-test imports use its own components, pages, notation, services, configuration, module, and types, plus the generic training layer and ordinary React/UI/audio/notation/Zod dependencies. It does not import sibling modules, server routing, accounts, payments, or persistence features.

The dependency direction is correct: `client/src/modules/note-reading/module.ts` consumes the shared training layer; the shared training layer does not depend on Note Reading. Keep the host composition boundary at `client/src/app/moduleRegistry.ts` for now. Do not introduce plugin infrastructure or dynamic discovery for one active module.

### Shared exercise and result contracts are already generic

Keep and reuse:

- `client/src/features/training/types.ts:7-19,21-35` for scalar `TrainingResult`, generic exercise/answer types, and `TrainingModule<TConfig, TExercise, TAnswer, TResult>`.
- `client/src/features/training/session.ts:36-126` for generic session transitions, answer de-duplication, scoring, timing, completion, and result conversion.
- `client/src/features/training/session.test.ts:4-58` as the shared behavior baseline.
- `client/src/modules/note-reading/module.ts:7-22` as the module adapter boundary.

The shared session behavior is already the compatibility contract: correct answers score **+10 by default**, incorrect answers score **0**, there is no negative marking, repeated submission of the current exercise is a no-op, planned completion is respected, speed sessions can be manually finished, and `toTrainingResult` contains no note payload.

Do not create a second Note Reading result type, move `NoteEvent` into `features/training`, or redesign the session state machine.

### Note Reading-specific behavior is correctly local

Keep all of the following in Note Reading:

- `NoteEvent`, `NoteAnswer`, `NoteExercise`, clef/range/accidental/pitch/key-signature contracts in `client/src/modules/note-reading/types.ts`.
- Zod setup validation in `client/src/modules/note-reading/configuration.ts`.
- Ledger range typing/validation and generation in `notation/musicTheory.ts` and `services/exercises.ts`.
- VexFlow, virtual piano, audio, MIDI-data projections, and note-theory validation.
- Daily seeding and Note Reading preferences.
- Auto-advance default **ON** and the exact **900ms** delay in `services/preferences.ts`, `services/useAutoAdvance.ts`, and the existing UX/regression tests.
- Independent asymmetric ledger bounds **0..4**, including all 25 combinations and custom cases such as 4/0 and 4/2.
- Note Reading’s caller-side session/exercise identity guards, stale timer protection, manual continuation, final feedback, retry behavior, and local-only progress model.

The existing Note Reading tests and recorded 141-test baseline are regression coverage, not targets for broad rewriting.

## Findings that matter at the shared boundary

### 1. Shared session metadata is the real structural coupling

`client/src/features/training/session.ts:3-34` currently requires `clefConfiguration` and `noteRange` in every `SessionConfiguration` and `TrainingSession`. Shared session operations do not read these values, and `toTrainingResult` omits them. The sole current initializer is `client/src/modules/note-reading/pages/NoteReadingPage.tsx:146-154`.

The coupling is both note-specific and semantically weak: the page supplies a human-facing `ledgerRangeLabel` under the shared field named `noteRange`, while actual generation uses independent `LedgerRange` values in `client/src/modules/note-reading/services/exercises.ts:54-100`. These values are historical/session metadata, not generic session behavior.

**Minimal recommendation:** before adding the first non-note production module, stop requiring these fields in the generic session contract. The smallest change is to remove them from the shared `SessionConfiguration`/`TrainingSession` shape and remove the corresponding Note Reading initializer/test arguments; keep the working state machine unchanged. Do not replace them with a generic metadata bag speculatively.

If compatibility with an externally serialized legacy session shape is later demonstrated, the low-risk transitional variant is to retain the two fields as optional/deprecated compatibility properties while new modules omit them. That compatibility step is not otherwise justified by the supplied source findings; do not preserve required note-shaped inputs merely for hypothetical consumers.

A future module may use a typed module-local configuration/context only when it has a concrete need. Do not add a generalized context system now.

### 2. Configuration ownership is already mostly right

`client/src/modules/note-reading/configuration.ts:4-14` and `types.ts:37-56` keep Note Reading’s setup opaque and module-owned, even though the object combines generation inputs, answer UI, session policy, daily identity, and auto-advance preferences. That is acceptable at this baseline. Those fields must not be promoted into shared training types.

Before a second module is active, adopt one small convention: every active module owns its configuration type and Zod schema beside the module, and its schema is a required typed `TrainingModule.configSchema` boundary validated once at module/session startup. This is a contract-hardening change, not a shared form builder, field dictionary, defaults system, or generic setup renderer.

Keep Note Reading’s existing schema and setup behavior unchanged while making validation guaranteed for future active modules.

### 3. Difficulty metadata is not implemented behavior

`TrainingDifficulty` and the `difficulties` list are currently capability-looking metadata. Note Reading advertises beginner/intermediate/advanced in `client/src/modules/note-reading/module.ts:7-22`, but the supplied findings show no difficulty selector, mapping, validation behavior, or generator interpretation. The registry only copies the list.

Do not build a difficulty engine, resolver, preset catalog, or mode matrix. Minimal recommendation: make difficulty metadata optional/non-prescriptive (or remove the required field) until a real module implements a local difficulty ID and behavior. When that happens, its local configuration/generator owns the semantics. Do not claim functional levels without an actual mapping.

`ExerciseMode` and the existing free/challenge/speed/daily transitions are sufficiently generic for now. Do not split or generalize them before Rhythm or Chord has concrete differing requirements.

## Minimal practical implementation recommendation

Implement only the following small changes, preferably in this order:

1. **Neutralize the session contract before the second real module.** Remove the required note-named `clefConfiguration` and `noteRange` fields from `client/src/features/training/session.ts:3-34`, update the Note Reading initializer/tests, and leave scoring, timing, guards, completion, and result conversion unchanged. If a real compatibility consumer is found later, use optional/deprecated fields temporarily rather than inventing note-shaped values for new modules.
2. **Make module configuration validation explicit.** Require a typed module-owned Zod schema at the `TrainingModule` boundary; keep Note Reading’s existing `configuration.ts` and page validation semantics. Add only a focused non-note-shaped session/config regression test proving creation, +10/+0 scoring, and duplicate-submission identity preservation without note fields.
3. **Make difficulty honest.** Treat `difficulties` as optional capability metadata until a module implements it, or remove the required contract field. Leave Note Reading’s current generation and setup behavior alone; do not add difficulty behavior as part of this audit.
4. **Extract one generic progress boundary.** Add a small service/type under `client/src/features/training` that reads, normalizes, and records the existing aggregate progress using `TrainingResult` (or its scalar subset), not `NoteExercise`. Preserve the exact key `thaikeyboard-music-training-progress-v1` and fields `sessionsCompleted`, `questionsAnswered`, and `correctAnswers`. Keep local-only storage and unavailable-storage tolerance.
5. **Harden only the storage boundary.** Normalize malformed JSON, null/non-object roots, missing/non-finite/negative/fractional counters, and allow a valid result to repair malformed stored data. Preserve same-session idempotence and `lastSessionId` compatibility. Do not add a replay ledger or completed-ID history unless a concrete future requirement needs cross-tab/non-consecutive replay safety.
6. **Optionally extract only generic result statistics.** If reducing duplication is useful, extract a small component accepting `TrainingResult`. Keep Note Reading title/subtitle, feedback, retry/setup actions, and result copy in `NoteReadingPage.tsx`.
7. **Unify shell/catalog navigation with a small typed app catalog.** Replace the disconnected `Map<string, object>`/unchecked generic registry usage with a typed catalog at the app boundary. Use active versus coming-soon entries: active Note Reading has its stable ID, metadata, route, and live page/module binding; Rhythm Training and Chord Recognition are metadata-only with an absent route and no page/module implementation. Keep the existing registry mechanism, explicit registration, and duplicate-ID check.
8. **Share only the site shell pieces that are actually duplicated.** Extract a lightweight header/nav/footer (or equivalent) while preserving the existing `site-header`, `header-inner`, wordmark, nav, landing/training layout, and footer classes in `client/src/index.css`. Feed active navigation from the catalog; render Coming Soon entries as non-link text/cards, never `href`s.
9. **Keep routing truthful.** Preserve only `/` and `/note-reading`. Have executable route declarations use the active catalog identity where practical, and keep `client/public/manus-routes.json` synchronized with active routes. Do not emit fake Rhythm/Chord routes and do not add a new router or route-generation framework.
10. **Add focused contract tests only.** Cover catalog uniqueness/status, active-route selection, non-link Coming Soon rendering, manifest exclusion, shared progress normalization/recording, and the non-note session case. Retain existing Note Reading behavior tests rather than broadening or rewriting them.

## Explicit non-recommendations

Do **not** add or change:

- Rhythm Training or Chord Recognition gameplay, pages, generators, MIDI behavior, or placeholder routes.
- A plugin framework, dynamic module discovery, dependency injection, generic exercise engine, shared form builder, capability matrix, or mode engine.
- A shared difficulty resolver/preset catalog before actual difficulty semantics exist.
- Cross-module persisted configuration, backend progress, accounts, authentication, payments, subscriptions, WordPress, server/database/migrations, deployment, infrastructure, or new dependencies.
- Note theory, VexFlow, MIDI, ledger ranges, clefs, accidentals, answer methods, speed limits, challenge dates, or auto-advance settings in shared training types.
- A scoring-policy abstraction or answer-history redesign; preserve +10/+0/no-subtraction and duplicate guards.

## Source map

| Concern | Current source paths |
|---|---|
| Generic training/module/result contracts | `client/src/features/training/types.ts:7-35`; `client/src/features/training/session.ts:36-126` |
| Session coupling and invariants | `client/src/features/training/session.ts:3-34,63-126`; `client/src/features/training/session.test.ts:4-58` |
| Note Reading adapter/config/types | `client/src/modules/note-reading/module.ts:7-22`; `configuration.ts:4-14`; `types.ts:3-56`; `module.test.ts`; `configuration.test.ts` |
| Note Reading page/session wiring | `client/src/modules/note-reading/pages/NoteReadingPage.tsx:19-46,90-207,239-294` |
| Note generation and ledger/theory | `client/src/modules/note-reading/services/exercises.ts:37-166`; `notation/musicTheory.ts:61-183`; `services/ledgerRange.test.ts` |
| UX, timer, and regression contracts | `client/src/modules/note-reading/services/preferences.ts:4-35`; `services/useAutoAdvance.ts:3-30`; `pages/uxImprovements.test.tsx`; `pages/qaRegressions.test.tsx` |
| Rendering and note answer surfaces | `client/src/modules/note-reading/notation/VexFlowStaff.tsx`; `client/src/modules/note-reading/components/VirtualPiano.tsx`; `pages/NoteReadingPage.test.tsx` |
| Current registry and app composition | `client/src/app/moduleRegistry.ts:1-31`; `client/src/App.tsx:10-24`; `client/src/pages/Home.tsx:36-40,67-73` |
| Public route declaration | `client/public/manus-routes.json` |
| Shared shell styling | `client/src/index.css:36-50,102-109` |
| Baseline QA evidence | `qa/architecture-2026-11-10/tests-before.log`; `qa/architecture-2026-11-10/typecheck-before.log`; `qa/QA-Report.md:149-160` |
| Product/future-module constraints | `README.md:11-15`; `TODO.md:3,26-32`; `plan.md:7-11,19-22,48-53` |

## Bottom line

The current architecture is adequate for Note Reading and already has a useful generic training core. No Note Reading rewrite is warranted. The only structural issue that should be addressed before a second real module is the required note-specific session metadata. After that, the smallest worthwhile improvements are a required module-owned config schema, honest optional difficulty metadata, a hardened generic progress boundary, and a typed active/Coming Soon catalog used for shared shell navigation and truthful routes. Everything else is deferred until a concrete second module creates a real requirement.
