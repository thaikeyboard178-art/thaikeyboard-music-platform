# Rhythm Training — Phase 1 canonical foundation

This is a pure music-theory module, not a frontend training feature. Rhythm Training remains Coming Soon. No UI, notation renderer, question generator, exercise modes, audio scheduler, tap capture, microphone or MIDI has been implemented. Nothing is deployed.

## Canonical authority

`RhythmPattern` contains one supported meter, pulse-labeled tempo and ordered complete measures. Each segment has a unique ID, note/rest kind and written duration descriptor. IntegerPPQ480 duration math and segment order determine every position. Single dots are allowed on half/quarter/eighth values only; ordinary articulation is the only implemented V1 marking. Notes share a neutral fixed-pitch role; no pitch/MIDI field is needed in this phase.

`validateRhythmPattern(unknown)` returns a structured valid/invalid result. `requireValidRhythmPattern` throws `RhythmValidationError` on invalid input and otherwise returns a copied, deeply frozen canonical pattern. Cached imported `ticks` and `onset` are checked, never authoritative, and stripped. Unknown positions, tuplets, swing and unsupported fields are rejected rather than coerced.

Every measure must be exact:2/4=960,3/4=1440,4/4=1920,6/8=1440 ticks. The6/8 meter has two720-tick dotted-quarter pulses grouped3+3 eighth units, not six quarter beats. `ticksToSeconds` is pure arithmetic, not playback: `(ticks/pulseTicks)*(60/pulseBpm)`. A4/4 bar at quarter60 lasts4s;6/8 at dotted-quarter60 lasts2s.

## Tie and timeline APIs

Tie groups need at least two contiguous note segments. They can cross a barline only when both bars remain complete. Rests, gaps, singleton/reused noncontiguous groups and accented continuation attacks are invalid. `deriveRhythmTimeline` uses only validated patterns. It returns immutable segment positions, onsets and coalesced sounding **tick spans**, not scheduled sound. Tied continuations and rests have no onset.

The default teaching grid is120 ticks (sixteenths). Optional240/480 grids must divide the pulse and represent every boundary exactly. Compound6/8 has three eighth cells or six sixteenth cells per pulse; a480 grid is not a valid compound pulse subdivision. Grid errors do not change canonical durations.

## Signature contracts

`notationSignature` ignores IDs, property order and tempo, normalizes default accent/articulation and tie-group names, and preserves written note/rest/tie structure. `onsetSignature` and `soundingSignature` include pulse BPM, meter and complete length. They compare intended data, not measured audio or perceptual device equivalence. A whole note and two tied halves share onset/sounding signatures but differ in notation. A quarter plus a dotted-half rest and a whole note share onsets, but not sounding spans.

## Executable fixtures and examples

`rhythm/fixtures.ts` includes full4/4 quarter–eighth–eighth–quarter-rest–quarter (`480+240+240+480+480=1920`),3/4 dotted-quarter–eighth–quarter-rest (`720+240+480=1440`) and6/8 dotted-quarter–eighth–eighth–eighth-rest (`720+240+240+240=1440`). It includes dotted-eighth/sixteenth, all-rest, intra-bar, three-member and cross-bar ties. Full4/4 cross-bar T1 spans absolute ticks1440..2400 with no attack at1920; compound T1 spans1200..1680 with no attack at1440.

Deliberately invalid fixtures cover under/over-filled bars, a whole note in3/4 or6/8, six quarters in6/8, a rest tie, a singleton, a noncontiguous tie and an underfilled cross-bar tie. Tests use independent hardcoded tick expectations and check structured rejection reasons.

## Scope and later work

All new Phase1 source/tests/documentation live in this directory. The only external production dependency is the existing Zod package. No Note Reading internal imports, shared scoring/session changes, catalog/routes edits, dependency or infrastructure changes are needed. Phase1 scope tests assert inert Coming Soon metadata and unchanged declared routes; a future activation approval must explicitly update that assertion.

Run existing `pnpm check`, `pnpm test`, `pnpm build:static`, and `pnpm build` at the project root. Phase2 generator and VexFlow notation require a new explicit approval. This phase does not claim rendering/audio parity or real-device timing has been tested.
