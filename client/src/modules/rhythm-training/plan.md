# Rhythm Training — approved Phase 1

Approved on 11 November 2026. Implement only the canonical model, exact duration arithmetic, meter/pulse derivation, validation, tie rules, structural/timing signatures, complete fixtures and automated music-theory tests. The approved specification is `/home/ubuntu/rhythm-training-design/Rhythm-Training-V1-Specification.md`.

Use PPQ480. Whole/half/quarter/eighth/sixteenth ticks are1920/960/480/240/120. Single dots are supported on half/quarter/eighth values; dotted whole/sixteenth, tuplets, swing and nonordinary articulation are unsupported in V1. Supported meters2/4,3/4,4/4,6/8;6/8 capacity1440 with two720-tick dotted-quarter pulses. Duration descriptors and segment order are authoritative; positions, onsets and tie spans are derived. Optional imported cached ticks/onsets must agree and are stripped from canonical output. Every bar is complete. Ties join at least two contiguous note segments and never generate a continuation onset.

## Structure

- `types.ts`: readonly canonical pattern/measure/segment/duration contracts, with no exercise-mode/UI/audio APIs.
- `rhythm/durations.ts`, `rhythm/meters.ts`: exact musical math, pulse groups and pure tick-to-seconds conversion only, not playback.
- `rhythm/model.ts`, `rhythm/validate.ts`, `rhythm/ties.ts`: schema boundary, structured validation, contiguous tie rules and normalized immutable canonical snapshots.
- `rhythm/deriveTimeline.ts`: validated segment coordinates and coalesced sounding tick spans, not an audio scheduler or renderer.
- `rhythm/signatures.ts`: stable ID-independent notation/onset/sounding signatures with documented tempo semantics; no question generator/distractor modes.
- `rhythm/fixtures.ts`: complete valid/invalid musical examples; colocated `.test.ts` files and `tests/` use existing Vitest discovery unchanged.
- Module-local `TODO.md` and `README.md`: scope and API examples. Execution logs and final handoff report live outside the repository under `/home/ubuntu/rhythm-phase1/`.

No source outside this module is edited. No catalog/static manifest activation, Note Reading imports/behavior changes, shared scoring/session change, dependency/infrastructure/schema change, UI, VexFlow renderer, audio scheduler, exercise modes, MIDI, microphone, WordPress or deployment. Rhythm stays Coming Soon. No new project/repository/branch. All four required checks must pass before a normal GitHub main commit/push. Stop at Phase1; Phase2 requires a new explicit approval.
