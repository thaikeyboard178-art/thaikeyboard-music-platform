# Rhythm Training — seven-meter canonical runtime and Phase 2 generator/notation

> **Phạm vi tài liệu:** Generator hiện dùng tám level policy với bốn-meter curriculum legacy; canonical-to-SVG runtime có seven-meter gate riêng đã triển khai. Đây không phải curriculum V1 mới đã hoạt động. Khung chính thức là 6 Level + Bonus; [D-07 trong Decision Review](docs/Decision-Review.md) giữ Multiple Choice core và bắt đầu Tap Rhythm từ Level 3, tăng độ khó qua Level 4/5/6 và optional Bonus 2/2. Level 1–2 dùng Multiple Choice + Listen & Identify, chưa có Tap. Xem [Curriculum V1](docs/Curriculum-V1.md) và [đặc tả hiện hành](docs/Rhythm-Training-V1-Specification.md). Việc sửa tài liệu không triển khai curriculum/Tap/audio, không bắt đầu Phase 3 và không kích hoạt frontend.

This is an inert module library, not an activated frontend training feature. Rhythm Training remains Coming Soon. Phase1 provides canonical music theory; Phase2 adds seeded pattern/choice generation and a Rhythm-owned VexFlow notation adapter. No exercise UI, exercise modes, audio scheduler/playback, tap capture, metronome, microphone or MIDI has been implemented. This phase does not deploy anything.

The mandatory seven-meter canonical-to-SVG runtime gate now has executable coverage in `runtime/sevenMeterRuntime.test.ts`. Canonical validation, pulse/grid/structural accents, timeline, notation projection and real VexFlow rendering support all seven exact meters. The existing eight generator policies still allow their original four-meter curriculum; this update does not migrate generator curricula or activate the frontend. Historical Phase1/Phase2 records describe their earlier four-meter scope, not the new gate.

## Canonical authority

`RhythmPattern` contains one supported meter, pulse-labeled tempo and ordered complete measures. Each segment has a unique ID, note/rest kind and written duration descriptor. IntegerPPQ480 duration math and segment order determine every position. Single dots are allowed on half/quarter/eighth values only; ordinary articulation is the only implemented V1 marking. Notes share a neutral fixed-pitch role; no pitch/MIDI field is needed in this phase.

`validateRhythmPattern(unknown)` returns a structured valid/invalid result. `requireValidRhythmPattern` throws `RhythmValidationError` on invalid input and otherwise returns a copied, deeply frozen canonical pattern. Cached imported `ticks` and `onset` are checked, never authoritative, and stripped. Unknown positions, tuplets, swing and unsupported fields are rejected rather than coerced.

Every measure must be exact: 2/4=960, 3/4=1440, 4/4=1920, 3/8=720, 6/8=1440, 9/8=2160, 2/2=1920 ticks. 3/8 has three independent 240-tick eighth pulses, not one compound beat. 6/8 has two and 9/8 three 720-tick dotted-quarter pulses; 2/2 has two 960-tick half-note pulses. `ticksToSeconds` is pure arithmetic, not playback: `(ticks/pulseTicks)*(60/pulseBpm)`. A 4/4 bar at quarter60 lasts4s; 6/8 at dotted-quarter60 and 2/2 at half60 each last2s.

## Tie and timeline APIs

Tie groups need at least two contiguous note segments. They can cross a barline only when both bars remain complete. Rests, gaps, singleton/reused noncontiguous groups and accented continuation attacks are invalid. `deriveRhythmTimeline` uses only validated patterns. It returns immutable segment positions, onsets and coalesced sounding **tick spans**, not scheduled sound. Tied continuations and rests have no onset.

The default teaching grid is120 ticks (sixteenths). Optional240/480 grids must divide the pulse and represent every boundary exactly. Compound6/8 has three eighth cells or six sixteenth cells per pulse; a480 grid is not a valid compound pulse subdivision. Grid errors do not change canonical durations.

`deriveMeterStructure(meter, subdivisionTicks)` supplies immutable pulse positions, exact requested-grid subdivision positions and structural `strong|medium|weak` points. `deriveRhythmTimeline` carries this structure; `projectRhythmNotation` and SVG note/rest metadata preserve its separate `structuralAccent`. Explicit segment articulation remains `accent: normal|strong` unchanged. Eighth-grid hierarchy is 3/8 S-w-w, 6/8 S-w-w|M-w-w, 9/8 S-w-w|M-w-w|M-w-w; 4/4 has its secondary medium at tick960 and 2/2 its second weak pulse at960. Structural accents never invent attacks on rests or tied continuations. Eighth notation is separate flags in3/8, beam groups3+3 in6/8,3+3+3 in9/8 and4+4 per half pulse in2/2.

## Signature contracts

`notationSignature` ignores IDs, property order and tempo, normalizes default accent/articulation and tie-group names, and preserves written note/rest/tie structure. `onsetSignature` and `soundingSignature` include pulse BPM, meter and complete length. They compare intended data, not measured audio or perceptual device equivalence. A whole note and two tied halves share onset/sounding signatures but differ in notation. A quarter plus a dotted-half rest and a whole note share onsets, but not sounding spans.

## Executable fixtures and examples

`rhythm/fixtures.ts` includes full4/4 quarter–eighth–eighth–quarter-rest–quarter (`480+240+240+480+480=1920`),3/4 dotted-quarter–eighth–quarter-rest (`720+240+480=1440`) and6/8 dotted-quarter–eighth–eighth–eighth-rest (`720+240+240+240=1440`). It includes dotted-eighth/sixteenth, all-rest, intra-bar, three-member and cross-bar ties. Full4/4 cross-bar T1 spans absolute ticks1440..2400 with no attack at1920; compound T1 spans1200..1680 with no attack at1440.

Deliberately invalid fixtures cover under/over-filled bars, a whole note in3/4 or6/8, six quarters in6/8, a rest tie, a singleton, a noncontiguous tie and an underfilled cross-bar tie. Tests use independent hardcoded tick expectations and check structured rejection reasons.

## Scope and later work

All new source/tests/documentation live in this directory. External production dependencies are the already installed Zod and VexFlow packages; no dependency was added. There are no Note Reading internal imports, shared scoring/session changes, catalog/routes edits, or infrastructure changes. The existing scope tests retain their inert Coming Soon and unchanged-route assertions; their allowlist additionally permits the installed VexFlow package.

Run existing `pnpm check`, `pnpm test`, `pnpm build:static`, and `pnpm build` at the project root. Phase3 requires new explicit approval. Phase2 proves canonical-to-notation tick parity but does not claim audio, timing scheduler, tap or real-device auditory/perceptual validation.

## Phase2 public APIs

`generateRhythmPattern({ seed, level, meter?, bars?, pulseBpm?, focus? })` returns a newly copied immutable canonical pattern. It uses a seed-only PRNG, exact-fill search, canonical validation and a level audit. There are eight data-only policies in `generation/levels.ts`; supported focus, meters, rest limits and pulse-BPM bands are explicit. No exercise mode, mastery/account gate or shared scoring semantics are implemented. `assertLevelConstraints` also rejects valid-but-out-of-curriculum external patterns. Level5 introduces fine-grid notation in one pulse per bar; Level6 uses6/8 with720-tick felt pulses; Level7 permits one offbeat sustain across a pulse per bar and can reuse known ties. Ordinary paired subdivisions are not incorrectly counted as new syncopation. Level8 accepts at most two interacting dot/tie/fine/syncopation sources; compound pulse-defining dots are not a new dot source, but a dotted eighth is.

`generateRhythmChoices({ ...generationConfig, count?:2|3|4, discrimination?:"sounding"|"onsets" })` returns target, stable correct option ID, deterministic option order and rejection-count evidence. All options share meter, pulse BPM and complete length. Canonical notation, visible structure and intended sounding tick spans must be distinct; onset-only discrimination additionally requires different onset signatures. IDs, tempo-only cues, accent-only differences, split rests and sustained-versus-tied equivalents cannot serve as distractors. `selectRhythmChoices` applies the same guards to an explicit fixture pool. These are data APIs, not listening/tap modes or playback.

Candidate search is bounded at256 attempts. `InsufficientDistinctChoicesError` explicitly reports requested/available/attempt counts rather than returning duplicates. A fixed one-bar2/4 dots-only vocabulary has only three accepted sounding shapes under introductory pulse constraints; request three choices, change the context, or handle the structured four-choice failure. When meter is unspecified, four-option dots/combined sets default to4/4 for diversity; an explicitly requested meter is never silently changed.

`projectRhythmNotation(input)` passes a validated derived timeline into immutable note/rest/dot, beam and tie data. Beam groups are pulse-contained:6/8 is3+3,3/4 is2+2+2 for six eighths. Rests and barlines break beams; dotted eighth plus sixteenth can share a pulse beam. `renderRhythmNotation(container, input, { width?, measuresPerRow? })` creates real VexFlow5 SVG and returns projection plus strict voice/actual TickContext fraction parity reports. Neutral fixed B4 placement with percussion clef avoids importing pitch-recognition theory. Beam objects are attached before note drawing so flags are not duplicated. Cross-bar ties on different rows become two partial arcs; internal barlines are single and the pattern ends with a final barline. Natural content layout and reserved final flag/dot space prevent clipping; SVG scales uniformly to the requested width instead of stretching glyphs. Extremely narrow requested multi-bar layouts may be small; comfortable learner-facing sizing remains a future UI decision.

`notation/examples.ts` provides complete4/4,3/4,6/8 and cross-bar fixtures. The adapter can render valid all-rest patterns (including the exact dotted-half rest in6/8); question generation deliberately excludes zero-attack patterns to avoid silent-answer ambiguity. Tests cover every Phase1 valid/invalid fixture and generated notation parity at320px/1040px. Browser evidence is generated outside application routes; no catalog activation is implied.
