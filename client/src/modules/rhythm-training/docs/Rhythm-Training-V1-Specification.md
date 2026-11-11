# Rhythm Training V1 — Functional and Technical Specification

## Presentation decisions — APPROVED OWNER DECISION, 2026-11-11

Nguồn: chủ sản phẩm xác nhận lúc03:04:52 +07:00. Ba mục trước đây PROPOSED đã chuyển sang **APPROVED**; quyết định presentation không cấp quyền triển khai runtime.

**Beam notation — APPROVED.** Quy tắc này áp dụng cho grouping **eighth notes**:3/8 mỗi móc đơn hiển thị riêng bằng **flag**, không beam ba móc đơn, thể hiện3 phách đơn độc lập.6/8 beam từng nhóm 3 theo **3+3**, không qua ranh giới hai phách phức.9/8 beam từng nhóm 3 theo **3+3+3**, không qua ranh giới ba phách phức. Sixteenth notes, rests và mixed-duration patterns theo notation rules phù hợp nhưng không được làm mất ranh giới phách/phách phức; không tự suy rộng rule ba móc đơn thành rule ba sounding attacks bỏ qua rest. Những ví dụ secondary-beam/rest/mixed chi tiết chưa quy định được ghi riêng, không hỏi lại grouping eighth đã chốt.

**Counting — APPROVED.** Đây là ba phương thức presentation/reference, không phải ba exercise kinds hay shared-session modes mới.

| Phương thức | Quyết định đã chốt |
|---|---|
| App Voice Counting | App tự đọc **số bằng tiếng Anh mặc định**, ví dụ **One, Two, Three...**; không dùng Vietnamese-first voice hoặc một syllable tiếng Việt bắt buộc làm default |
| Visual Counting | Hiện **con số tương ứng vị trí đếm**; người học tự đếm bằng ngôn ngữ muốn, **không bắt buộc tiếng Anh** |
| Metronome | Âm **tick, tick, tick...**, **không cần đọc số hoặc syllable** |

Không đồng nhất ngôn ngữ hiển thị số với ngôn ngữ phát âm tự động. English-default app voice không ép ngôn ngữ tự đếm hoặc đổi Vietnamese-first UI copy. Vị trí phách/subdivision vẫn từ canonical data; không suy đổi technical pulse hoặc tự tạo chuỗi phonetic subdivision chưa được quy định.

**Accent presentation — APPROVED.** Được dùng **Text-based** (Mạnh–Vừa–Nhẹ hoặc Mạnh–Nhẹ–Nhẹ tùy meter; có thể phân biệt font weight, độ đậm, ranh giới nhóm) hoặc **Symbol-based** (gạch nối, gạch dưới hoặc ký hiệu đồ họa; được phép dùng màu phân biệt cấp trọng âm). **Không bắt buộc phối hợp chữ + ký hiệu + màu**. **Nếu dùng màu**, phải đảm bảo **độ tương phản và khả năng nhận biết**; không tự thêm blanket rule bắt buộc chữ hoặc cấm màu-only trái quyết định. Strong=Mạnh, Medium=Vừa, Weak=Nhẹ; giữ hierarchy Mạnh>Vừa>Nhẹ và các vector3/8 `Sww`,6/8 `Sww|Mww`,9/8 `Sww|Mww|Mww`.

Giữ nguyên curriculum placement, meter semantics, technical pulse, subdivision, PPQ480 và **existing `segment.accent` schema**. Không sửa VexFlow, source/test, audio engine, UI/catalog/route activation, database, shared architecture, dependencies/infra, Note Reading hoặc WordPress; không deploy. APPROVED tài liệu không phải implementation/test-pass/teacher signoff. Xem [Decision Review](./Decision-Review.md).

> **Đính chính Level 6 đã chốt bởi chủ sản phẩm — 2026-11-11:** 3/8 là Simple Triple với3 phách đơn móc đơn, **Mạnh – Nhẹ – Nhẹ**; không có một phách phức. 6/8 có 2 phách phức, **Mạnh – Nhẹ – Nhẹ | Vừa – Nhẹ – Nhẹ**. 9/8 có 3 phách phức, **Mạnh – Nhẹ – Nhẹ | Vừa – Nhẹ – Nhẹ | Vừa – Nhẹ – Nhẹ**. Mỗi phách phức=đen chấm dôi720 ticks gồm 3 phách đơn/subdivisions móc đơn240 ticks. Bar-level accent=Mạnh đầu ô; secondary beat accent=Vừa đầu các phách phức sau; Mạnh > Vừa > Nhẹ là quan hệ đã được xác nhận, không còn chờ hỏi lại. `S`=Mạnh, `M`=Vừa, `w`=Nhẹ: `Sww`, `Sww\|Mww`, `Sww\|Mww\|Mww`; cấp phách phức `S-M`, `S-M-M`. Trong3/8, mỗi móc đơn là một phách đơn độc lập, không phải subdivision của một phách phức giả. Beam notation, ba phương thức counting và accent presentation đã APPROVED theo quyết định03:04:52 +07:00; xem [Decision Review](./Decision-Review.md). Không hỏi lại hoặc khôi phục ba đề xuất cũ. Đính chính này chỉ sửa tài liệu, không sửa code/runtime hoặc tự triển khai gain/velocity/UI.

**Specification status: approved owner decisions recorded; implementation remains separate.** This specification preserves the seven-meter V1 contract and prior approved music/presentation decisions, and records the D-07 Multiple Choice/Tap Rhythm progression decision. The current canonical-to-SVG seven-meter gate is implemented; this document does not imply that generator policies, Tap Rhythm, audio, or exercise UI are implemented or active. This documentation update changes only this Markdown file; it does not authorize runtime implementation, testing, or activation.

The recommended product decision is to build Rhythm Training as a rhythm-owned module hosted by the existing THAIKEYBOARD training shell. The module should reuse the shared session lifecycle, exercise-level scalar scoring, aggregate progress recording, result summary, and catalog conventions, but should not import Note Reading internals or force Rhythm Training into Note Reading’s theory, generator, components, audio, piano, preferences, or layout. Rhythm-specific notation, exact rhythm mathematics, generation, audio scheduling, tap validation, diagnostics, and detailed feedback remain local to `modules/rhythm-training/`. The public product should expose only the two shared session wrappers **Free** and **Challenge** in V1; the four items Multiple Choice, Tap Rhythm, Listen & Identify, and Count the Beat are local rhythm exercise kinds, not new shared session modes.

## D-07 — Multiple Choice and Tap Rhythm progression — APPROVED OWNER DECISION, 2026-11-11

Approved by the product owner in the 14:14 +07:00 message on 2026-11-11. See [Decision Review, D-07](./Decision-Review.md). Multiple Choice remains a core kind for notation, values, rhythmic structures, and theory. Tap Rhythm is one of the four existing local exercise kinds, not a fifth kind, and supplies practical performance training. Preserve six Levels plus optional Bonus, the seven approved meters, PPQ 480, and all prior approved music/presentation and shared-session decisions.

| Level / track | Approved Tap / exercise direction |
|---|---|
| Level 1 | Multiple Choice and Listen & Identify only. No Tap exercises, Tap assessments, or ungraded Tap worked examples. |
| Level 2 | Multiple Choice and Listen & Identify only. No Tap exercises, Tap assessments, or ungraded Tap worked examples. |
| Level 3 | Introduce practical Tap Rhythm in 2/4, 3/4, and 4/4. |
| Level 4 | Dots and ties; Tap Rhythm plus Multiple Choice. |
| Level 5 | Advanced Tap Rhythm with sixteenths and advanced combinations. |
| Level 6 | One unified level for Tap Rhythm in 3/8, 6/8, and 9/8. |
| Bonus | Optional Tap Rhythm progression in 2/2 Alla Breve. |

In Tap Rhythm, the learner sees a rhythmic pattern, follows the exercise's metronome/reference timing, and taps screen onset positions. Evaluation compares actual tap timestamps with expected onset timestamps, in order and one-to-one, and identifies early, late, matched, missing, and extra events. Equal tap count alone is not correctness. Timing Accuracy (%) is required as a separate Tap measure; it is distinct from the existing +10/+0 Exercise Points and shared session `accuracy` / `averageResponseTimeMs`. Its formula, timing windows, and grades are not approved here. Other unresolved timing and guidance choices are listed in Section 13. This decision changes curriculum requirements only; it does not implement Tap, audio, or UI. The full approved record is linked above.

## 1. Scope, product contract, and terminology

Rhythm Training V1 is intended for piano and general music learners, especially beginners who need a gradual path from note/rest values and pulse to compound meter, ties, and syncopation. It teaches five related abilities: recognizing notation and values, understanding beats and subdivisions, reading and interpreting patterns, listening to a pattern and identifying it, and reproducing onset patterns by tapping. It does not claim to measure every aspect of performance. In particular, Tap Rhythm assesses the timing of attack/onset events only; it does not assess how long a key, pointer, or keyboard Space key is held. Duration comprehension is assessed through notation, counting, listening with duration-aware sound, and tie/rest interpretation.

The product is free to use and does not require mandatory registration, payment, subscription, server storage, microphone recognition, or MIDI. The design does not add a new framework, plugin registry, shared session mode, server API, database schema, or capability plugin. The eventual activation route is future-only: it may be added to the existing catalog and static route manifest only after implementation approval and the V1 release gate. Until then, Rhythm exercise UI/audio/Tap remains inactive and there is no active frontend route; Chord Recognition remains Coming Soon and unchanged.

The terms in this specification are intentionally precise. A **measure** is a bar whose written durations must exactly fill its meter. A **pulse** is the felt beat unit used for tempo and counting. In 2/4, 3/4, and 4/4, the pulse is the quarter note. In 3/8, the pulse is the eighth note and the bar contains three simple-triple pulses. In 6/8 and 9/8, the pulse is the dotted quarter: 6/8 has two compound-duple pulses and 9/8 has three compound-triple pulses. In 2/2, the pulse is the half note and the bar contains two alla-breve pulses [1] [29]. Pulse meaning is explicit in the meter definition, not inferred from the numerator or denominator. A **teaching group** is an instructional overlay of three eighth notes; it must not erase the meter’s relative pulse identity. A **tick** is an integer unit in the canonical rhythm timeline. A **segment** is one ordered written note or rest inside a measure. A tied note consists of adjacent note segments sharing a tie group; only the first segment is an attack. An **onset** is an attack event, not a note release or a continuation of a tie.

The product must distinguish three kinds of result. The shared result is one scalar session result with one completed exercise equal to one answer. Rhythm-local detail is a diagnostic explanation of onset errors, duration concepts, meter, ties, and subskills. A provisional curriculum readiness recommendation is a coaching signal, not a shared score, hard lock, or validated educational standard.

## 2. Existing facts, reuse, new work, and necessary change

The following are verified facts from the supplied read-only source context, not fresh test claims. The project is `/home/ubuntu/notnhac`, existing repository `thaikeyboard178-art/thaikeyboard-music-platform`, branch `main`, baseline commit `8348e1366be87febd58de90752fc1a5d847d397c`, with clean status at the recorded inspection. The canonical-to-SVG seven-meter gate is now implemented; its prior 565-test evidence is historical and no tests are run by this update. The generator still has eight legacy, data-only curriculum levels and four-meter policies (2/4, 3/4, 4/4, 6/8). Tap Rhythm, audio, and exercise UI are not active. The library remains inert/Coming Soon without an active frontend route; Chord Recognition remains Coming Soon and unchanged. The historical 436/436 Phase 2 result across 40 files remains historical evidence, not a fresh run or proof of the current Tap/audio/UI state. This specification does not rerun tests.

**Reuse — existing platform context.** The existing `TrainingShell` provides the header, catalog-driven navigation, mobile menu, and footer. The existing explicit module catalog has active entries with metadata, path, and lazy page, while Coming Soon entries have no page/path. The existing `TrainingModule<TConfig,TExercise,TAnswer,TResult>` contract, generic session lifecycle, exercise-level answer submission, shared +10 correct/+0 wrong default scoring, completion guards, aggregate progress recording, `TrainingResult`, and `ResultSummary` are the intended integration boundaries. The existing application shell and coral brand styling are also reusable. Standard browser DOM pointer/keyboard events and the Web Audio API are available platform capabilities; this proposal does not require a new audio dependency or AudioWorklet.

**New Rhythm functionality.** The module must develop its own exact rhythm model, meter and pulse derivation, validator, seeded generator, ambiguity filter, notation projection, audio timeline projection, Web Audio scheduler, count-in, tap capture/matching, local exercise state machine, rhythm feedback, level catalog, and tests. It must also provide Vietnamese-first user-facing copy while retaining clear canonical English identifiers internally where useful. Detailed onset and duration diagnostics belong to a Rhythm-owned result detail view.

**Necessary shared change.** No shared API change is expected for V1. The only expected host changes after approval are the normal future catalog registration, active route/page binding, and corresponding static-manifest binding for a genuinely implemented module. Those are integration registrations, not a foundation redesign. No shared session-mode union expansion, shared `TrainingResult` field, shared progress schema migration, Note Reading change, database change, account requirement, server change, deployment, WordPress change, or new plugin/capability system is necessary. If a later implementation audit finds an actual mismatch, the smallest additive change must be preferred and this design must be re-approved.

Architecture decisions in the remainder of this document use the same labels: **Reuse** means an existing boundary is used unchanged; **New Rhythm** means code and behavior belong inside the future Rhythm module; **Necessary Shared Change** means a host edit required only when the approved implementation is ready. A decision marked **Proposal** is not a statement that the feature works.

## 3. B. Cấu trúc bài học chính thức và progression

The approved V1 curriculum has six ordered Levels plus one optional Bonus track. Level access remains exploratory in V1: no mandatory locks, paywalls, or hard progression gates. Each Level and the Bonus track contains **Lessons**, **Practice**, and an **Assessment**. These are curriculum/content units, not new shared session modes; the four local exercise kinds remain Multiple Choice, Tap Rhythm, Listen & Identify, and Count the Beat. A teacher or product owner may tune practice quantities and coaching thresholds after learner/device pilot, but may not reorder or redistribute the approved content without a new curriculum decision.

The current implementation does not yet contain this curriculum. The existing eight legacy levels remain data-only and unchanged in code; the table below is the approved replacement specification for future content work.

| Cấp độ / track | Nhóm kiến thức chính | Meters | Lessons | Practice | Assessment |
|---|---|---|---|---|---|
| Level 1 | Nốt đen, nốt trắng, nốt tròn; **dấu lặng đen (quarter rest only)** | 4/4 teaching scaffold | Identify values and the quarter rest; understand a four-quarter bar | Multiple Choice and Listen & Identify only | Recognition assessment using only the Level 1 vocabulary; no Tap assessment or Tap worked example |
| Level 2 | Nốt móc đơn, dấu lặng đơn, chia đôi phách | Formal 4/4 teaching scaffold; 2/4 and 3/4 deferred to Level 3 | Pair eighths and eighth rests; subdivide one quarter into two | Multiple Choice and Listen & Identify only | Eighth-note/eighth-rest recognition in 4/4; no Tap assessment or Tap worked example |
| Level 3 | Nhịp đơn | 2/4, 3/4, 4/4 | Recognize signatures, count beats, understand accents and bar length | Analyze and perform patterns in all three simple meters; introduce practical Tap Rhythm | Combined assessment covering all three signatures and their simple-triple/duple distinctions; Tap begins in these meters |
| Level 4 | Dấu chấm dôi và nối trường độ | Simple meters already taught: 2/4, 3/4, 4/4; no new meter | Add a dot as half of the undotted duration; distinguish ties from re-attacks; dotted eighth remains deferred | Dots first, ties second, then controlled dot/tie combinations with rests; Tap Rhythm plus Multiple Choice | Duration, tie-attack, and exact-bar assessment; no dotted-eighth requirement before Level 5 |
| Level 5 | Nốt móc kép, tổ hợp tiết tấu, tiết tấu nâng cao | Simple meters 2/4, 3/4, 4/4; controlled consolidation, not early Level6 or Bonus meters | Read sixteenth grids and combine prior vocabulary; consolidate the former advanced/syncopation material without creating new Levels 7/8 | Sixteenth combinations, rests, dots, ties, and advanced Tap Rhythm | Integrated advanced-rhythm assessment across prior vocabulary and sixteenth combinations |
| Level 6 | **Grouping in Threes** as one unified knowledge group | 3/8, 6/8, 9/8 | Progress from one group of three eighths to two and then three groups, preserving meter identity | Compare group counts/accents and analyze notes, rests, dots, and ties across all three signatures; Tap Rhythm in this one unified Level | One combined assessment covering 3/8, 6/8, and 9/8 |
| Bonus | Nhịp 2/2 (Alla Breve), optional learner progression | 2/2 | Understand two half-note pulses and compare 2/2 with 4/4 | Half-pulse counting, notation/value transfer, and optional Tap Rhythm | Bonus assessment for half-pulse understanding and 2/2-versus-4/4 recognition |

### Level 1 — Black, half, and whole notes; quarter rest only

**Objectives.** The learner identifies the black/quarter note, half note, whole note, and the quarter rest; understands that the quarter rest occupies one quarter-note duration while remaining silent; and follows a steady four-quarter teaching scaffold. Level 1 must not introduce half rests, whole rests, dots, ties, eighths, sixteenths, compound grouping, or syncopation. The quarter rest is the only rest vocabulary in this Level.

**Lessons.** Lessons introduce one note value at a time in the order quarter, half, whole, followed by the quarter rest. They show barline placement, duration accumulation, and the distinction between a sounding note and a silent rest of one quarter duration. Count language is a simple numbered quarter pulse.

**Practice.** Use Multiple Choice for value and duration recognition and Listen & Identify for clearly separated note/rest examples. These are the only exercise kinds in Level 1; there are no Tap exercises, Tap assessments, or ungraded Tap worked examples at this Level. Generated material uses 4/4, quarter-aligned starts, exact bars, and no rest other than a quarter rest.

**Assessment.** The assessment uses Multiple Choice and Listen & Identify to cover note-value recognition, whole/half/quarter duration arithmetic, and quarter-rest recognition. There is no Tap assessment or ungraded Tap worked example. It must not grade vocabulary that has not been taught. A readiness signal is coaching-only and does not gate access or alter shared scoring.

### Level 2 — Eighth notes, eighth rests, and binary quarter subdivision

**Objectives.** The learner divides one quarter pulse into two equal eighth positions, reads paired eighth notes and eighth rests, and preserves exact duration when a rest replaces an attack. Level 2 uses binary subdivision only; it does not introduce dots, ties, sixteenths, or compound grouping.

**Lessons.** Lessons demonstrate the quarter pulse, its two eighth subdivisions, paired eighth notation, and the corresponding eighth rest in a formal 4/4 teaching scaffold. Formal 2/4 and 3/4 meter transfer is deferred to Level 3; Level 2 does not pre-teach their simple-meter identity. The learner distinguishes an eighth rest from an absent or shortened duration.

**Practice.** Use Multiple Choice and Listen & Identify to compare quarter notes with two eighths, note/eighth-rest combinations, and identical durations with different onset placements. Level 2 uses these two exercise kinds only; there are no Tap exercises or ungraded Tap worked examples.

**Assessment.** The assessment uses Multiple Choice and Listen & Identify to cover eighth-note and eighth-rest recognition, binary subdivision concepts, and exact bar filling in 4/4; it includes no Tap assessment. Formal 2/4 and 3/4 coverage begins in Level 3. Dots, ties, sixteenths, and compound-meter groupings are excluded.

### Level 3 — Simple Meter: 2/4, 3/4, and 4/4

**Objectives.** The learner recognizes time signatures, counts beats, understands teaching accents, distinguishes bar lengths, and analyzes/practices rhythm patterns in the unified simple-meter group. The three signatures are not independent courses: 2/4 has two quarter-note pulses, 3/4 has three, and 4/4 has four.

**Lessons.** Lessons introduce the common quarter-note pulse and compare 2/4, 3/4, and 4/4 side by side. They teach the approved structural labels: 2/4 `S-W`, 3/4 `S-W-W`, and 4/4 `S-W-M-W` where a medium stress is shown, while keeping exact pulse counts and bar capacity explicit. The learner practices reading the numerator/denominator as meter information rather than as a generic duration shortcut.

**Practice.** Practice rotates all three signatures through Multiple Choice, Count the Beat, Listen & Identify, and Tap Rhythm. Items compare equal written values across different bar lengths, locate rests and eighth subdivisions, and identify strong/weak positions without flattening the signatures into one generic pattern.

**Assessment.** The assessment is a combined simple-meter check containing 2/4, 3/4, and 4/4. It tests signature recognition, beat counting, accent interpretation, bar-capacity arithmetic, and pattern analysis. A learner should demonstrate transfer across all three signatures; the assessment is not a separate course test for each signature.

### Level 4 — Dots and ties

**Objectives.** The learner understands that a dot adds half of the undotted duration and that a tie joins adjacent written segments into one sustained sounding event. Dotted eighth is explicitly deferred until the Level 5 sixteenth grid under the retained duration policy. Level 4 may use dotted quarter and dotted half where the selected meter permits them, but it does not require dotted eighth.

**Lessons.** Lessons teach dots without ties, ties without dots, and then controlled combinations. They distinguish a tie continuation from a second attack, preserve rest duration, and use exact tick arithmetic. Cross-bar ties remain complete validated fixtures, not a reason to change onset-only Tap Rhythm scoring.

**Practice.** Practice begins with duration and notation Multiple Choice, then Listen & Identify with duration-aware gates, Count the Beat for dotted coordinates and tie continuations, and Tap Rhythm only for genuine onset starts. Each item adds at most one new difficulty source until the learner has seen the source in isolation.

**Assessment.** The assessment checks dotted-duration arithmetic, tie-group identity, rest handling, and attack count. It explicitly excludes dotted-eighth mastery until Level 5 and must not claim that onset tapping measures held duration.

### Level 5 — Sixteenths, combinations, and advanced rhythms

**Objectives.** The learner reads four sixteenth positions per quarter pulse, combines sixteenths with quarters, eighths, rests, dots, and ties, and consolidates controlled advanced rhythm material formerly represented by legacy Levels 7/8. This is consolidation within Level 5, not creation of new Levels 7/8. Tuplets, swing, mixed meter, polyrhythm, and arbitrary unsupported cross-pulse ties remain excluded.

**Lessons.** Lessons introduce the sixteenth grid, then combine it with previously mastered values. Dotted eighth is introduced here because it is represented naturally against the sixteenth grid. Advanced lessons add controlled offbeat/syncopated placements and selected tie/rest combinations only after their component grids are stable.

**Practice.** Practice progresses from one sixteenth subdivision group to mixed one-bar combinations, then to controlled advanced patterns. The generator uses a difficulty budget, keeps pulse boundaries readable, and reuses the four local exercise kinds. Old advanced content may be consolidated here, but no new curriculum levels named Level 7 or Level 8 are created.

**Assessment.** The assessment combines sixteenth reading, rest placement, dots, ties, and controlled advanced/syncopated patterns. It evaluates exact bar arithmetic, onset positions, and meter-aware interpretation while preserving the existing one whole-exercise +10/+0 scoring rule.

### Level 6 — Grouping in Threes (one unified knowledge group)

**Objectives.** The learner understands one, two, and three groups of three eighth notes while preserving the distinct theory of 3/8, 6/8, and 9/8. This is one knowledge group, not three independent courses. The exact progression is:

1. Recognize one group of three eighths: 3/8.
2. Expand to two groups: 6/8.
3. Expand to three groups: 9/8.
4. Compare the number of groups and the locations of teaching accents.
5. Analyze patterns containing notes, rests, dots, and ties.
6. Complete combined practice and assessment across all three signatures.

**Lessons.** The owner-confirmed convention replaces earlier proposals:3/8 Simple Triple has3 simple eighth-note beats, `Sww`;6/8 Compound Duple has2 compound dotted-quarter beats, each containing3 eighth subdivisions, `Sww|Mww`;9/8 Compound Triple has3 compound dotted-quarter beats, `Sww|Mww|Mww`. `S`=Mạnh/strong, `M`=Vừa/medium, `w`=Nhẹ/weak. Bar-level accent is strong at the bar start; secondary compound-beat accents are medium. No equal strong accent at every group start and no fictional compound beat for3/8. This music convention is approved by the product owner, not awaiting teacher reconfirmation.

**Practice.** Practice follows the six-step sequence above. It first identifies group count, then compares pulse/group starts, then analyzes notes and rests, and finally adds dots and ties. Count the Beat and notation overlays must show both the teaching group and the technical pulse identity. Tap Rhythm uses the exact meter pulse timeline; it must not convert 3/8 to a single 720-tick pulse or treat 6/8/9/8 as six/nine independent quarter-like beats.

**Assessment.** One combined assessment covers 3/8, 6/8, and 9/8. It tests group-count recognition, structural accents, simple-versus-compound classification, exact bar capacity, and patterns with notes, rests, dots, and ties. It is not three independent course assessments. The 3/8/6/8/9/8 differences must remain visible in feedback and metadata.

The former source label “3/8 phách chính1” is superseded: 3/8 has three independent 240-tick simple beats at 0, 240 and 480. Its APPROVED eighth-note presentation uses individual flags, with no beam joining the three notes. Counting has English-default app voice, numeric visual self-counting in any learner language, and a tick-only metronome. Accent may be text-based or symbol-based, with optional contrasting, recognizable color. No renewed presentation or music-semantics approval is needed; implementation remains separate.

### Bonus — 2/2 Alla Breve (optional learner progression)

**Objectives.** The learner understands two half-note pulses in one 2/2 bar, compares the half-pulse feel with 4/4, and recognizes that the Bonus is optional while remaining a V1-supported feature. The two pulse starts are 0 and 960 ticks, with `S-W` teaching accents.

**Lessons.** Lessons introduce the half-note pulse, two-pulse bar, and the relationship between four quarter-note units and two half-note pulses. They explicitly label tempo as half-note BPM and compare 2/2 with 4/4 without treating equal 1920-tick capacity as equal pulse semantics.

**Practice.** Practice uses notation/value comparison, Count the Beat on half-pulse positions, Listen & Identify with duration-aware gates, and optional Tap Rhythm on the 0/960 pulse timeline. It remains outside the required six-Level progression and must not be silently treated as Level 4.

**Assessment.** The Bonus assessment checks half-pulse recognition, 2/2-versus-4/4 comparison, exact bar filling, and strong/weak interpretation. It is available as a V1-supported optional learner progression, not a mandatory graduation requirement.

### Curriculum tempo and counting policy

Tempo labels retain their existing units: quarter for 2/4, 3/4 and 4/4; eighth for 3/8; dotted quarter for 6/8 and 9/8; half for 2/2. Preserve the shared +10/+0 scoring contract; D-07 additionally requires separate Tap Timing Accuracy (%), while its formula, matching windows/grades, latency compensation, and calibration remain open. Historical Tap timing values elsewhere are explicitly provisional, not current scoring policy. APPROVED counting presentation has English-default app-spoken numbers, numeric visual self-counting in the learner’s preferred language, and a tick metronome without required numbers or syllables. Numeric display is not automatic voice language; UI copy may remain Vietnamese-first.

## 4. Canonical rhythm model and exact mathematics

**Proposal — New Rhythm:** Use an integer tick representation with `PPQ = 480` ticks per quarter note. PPQ is the canonical resolution, not a floating-point duration. A quarter note is 480 ticks, a half is 960, a whole is 1920, an eighth is 240, and a sixteenth is 120. A dotted value is the undotted duration plus half of that duration: dotted quarter 720, dotted half 1440, dotted eighth 360. The model rejects any duration descriptor whose exact tick result is not representable under the allowed V1 grid. Rhythm arithmetic remains integer-only; floating-point seconds are an audio projection, never the bar-validity authority.

The canonical authoring authority remains the ordered duration descriptor, not both an editable tick count and an editable beat position. Measure and segment IDs are unique within a pattern; the immutable exercise snapshot has its own ID/seed and graded tempo. The following contract is a future design seam, not an implemented source file:

```ts
type RhythmExerciseKind =
  | "multiple-choice" | "tap-rhythm" | "listen-identify" | "count-beat";
type RhythmMeter =
  | { numerator: 2 | 3 | 4; denominator: 4 }
  | { numerator: 3; denominator: 8 }
  | { numerator: 6; denominator: 8 }
  | { numerator: 9; denominator: 8 }
  | { numerator: 2; denominator: 2 };
type WrittenDuration = {
  denominator: 1 | 2 | 4 | 8 | 16;
  dots: 0 | 1;
};
type RhythmSegment = {
  id: string;
  kind: "note" | "rest";
  duration: WrittenDuration;
  tieGroupId?: string;
  accent?: "normal" | "strong";
  articulation?: "ordinary" | "staccato" | "tenuto";
};
type RhythmPattern = {
  id: string;
  meter: RhythmMeter;
  tempo: { pulseBpm: number };
  measures: { id: string; segments: RhythmSegment[] }[];
};
type RhythmExercise = {
  id: string;
  seed: string;
  levelId: string;
  kind: RhythmExerciseKind;
  pattern: RhythmPattern;
  expectedAnswer: unknown; // replaced by the kind-specific answer union
};
```

The implementation should make exercise/answer payloads discriminated unions. Choice and listening payloads carry a stable correct option ID and validated options; Count the Beat carries an exact expected coordinate set; Tap Rhythm carries normalized tap timestamps, attempt ID, and timing-confidence metadata. `expectedAnswer: unknown` is an abbreviated design seam, not permission for an unvalidated payload. The module-owned Zod schema and musical validator validate these unions before use.

For denominator `d`, undotted ticks are `480 * 4 / d`; one dot multiplies that exact duration by `3/2`. Derived ticks must be positive safe integers. V1 permits one dot on half, quarter, and, from Level 5, eighth values, with no dotted sixteenth/whole vocabulary, no tuplets/double dots/swing, and only vocabulary enabled by the selected level. Articulation fields reserve explicit meaning: V1 generates and accepts ordinary articulation only. Accent changes gain, never onset time, and explicit segment accent must remain distinct from structural meter accent. All rhythm notes use one neutral fixed-pitch timbre; there is no pitch-recognition or MIDI field.

Ticks, absolute start/end and beat/measure coordinates belong to a derived read-only view. If an imported fixture includes cached ticks, the validator compares them with the duration formula and rejects discrepancies; it never chooses whichever value happens to fit. For all-rest bars, use explicit meter-compatible rest values. Do not coerce a 1920-tick whole rest into a 1440-tick bar. Special conventional whole-measure-rest glyph handling remains deferred unless a separate renderer fixture proves its meter-dependent duration.

A derived segment view adds `absoluteStartTicks`, `absoluteEndTicks`, `measureOffsetTicks`, `pulseIndex`, `subdivisionIndex`, `pulseTicks`, `onset: true|false`, `tieRole: none|start|continue|end|single`, and an answer identity. It records its subdivision grid explicitly. `subdivisionTicks` is 120 for sixteenths, 240 for eighths, or 480 for quarter-only questions, subject to the selected meter's available grid. `subdivisionIndex` is local to a pulse, not a whole-measure cell ordinal. For3/8 eighths on grid240 it is `[0,0,0]`; sixteenths on grid120 have `[0,1,0,1,0,1]`. For2/2 quarters on grid480 it is `[0,1,0,1]`; eighths on grid240 have `[0,1,2,3,0,1,2,3]`. `pulseIndex=floor(measureOffsetTicks/pulseTicks)`; pulse offset is the remainder; subdivision coordinates derive from that offset and grid, never independently assigned. For 3/8, `pulseTicks=240`, pulse starts are `[0,240,480]`, and sixteenths are 2+2+2 inside the three simple-triple pulses. For 6/8, `pulseTicks=720`, pulse starts are `[0,720]`, and eighths are grouped 3+3. For 9/8, `pulseTicks=720`, pulse starts are `[0,720,1440]`, and eighths are grouped 3+3+3; teaching group starts do not erase the three dotted-quarter pulse identities. For 2/2, `pulseTicks=960`, pulse starts are `[0,960]`; quarter/eighth/sixteenth coordinates are relative to each half pulse, with four eighth subdivisions or eight sixteenth subdivisions per half pulse. Notation beam layers are a separate presentation plan, not these pulse coordinates. Ties and durations remain tick-based across either teaching overlay.

A note attacks when it is not a rest and is either untied or the first segment of a tie group. A tied continuation is never a second attack. A rest has no attack and still consumes its full duration. A tie group must consist of adjacent note segments with the same `tieGroupId`; it may cross a barline only by making the final segment of one bar adjacent to the first segment of the next. Ties to rests, non-adjacent tie members, mismatched pitch roles, or second attacks are invalid in V1.

### Explicit seven-meter registry contract

The seven-meter registry is immutable and exact-pair keyed. It must not infer pulse duration from numerator alone, denominator alone, or a simple/compound shortcut. V1 supports **seven meter pairs total**: six core meters (2/4, 3/4, 4/4, 3/8, 6/8, 9/8) plus the optional but supported Bonus meter 2/2.

| Meter | Class and technical pulse | Bar capacity (ticks) | Pulse starts (ticks) | Teaching group / accent metadata |
|---|---|---:|---|---|
| 2/4 | Simple duple; quarter pulse 480 | 960 | `[0,480]` | `[1,1]`; `S-W` |
| 3/4 | Simple triple; quarter pulse 480 | 1440 | `[0,480,960]` | `[1,1,1]`; `S-W-W` |
| 4/4 | Simple quadruple; quarter pulse 480 | 1920 | `[0,480,960,1440]` | `[1,1,1,1]`; `S-W-M-W` teaching overlay |
| 3/8 | Simple triple; eighth pulse 240 | 720 | `[0,240,480]` | teaching group count `1`; teaching string `3/8 Sww`; technical pulses remain 3, accents `S-W-W` |
| 6/8 | Compound duple; dotted-quarter pulse 720 | 1440 | `[0,720]` | groups `3+3`; teaching string `6/8 Sww&#124;Mww`; structural pulses `S-M` |
| 9/8 | Compound triple; dotted-quarter pulse 720 | 2160 | `[0,720,1440]` | groups `3+3+3`; teaching string `9/8 Sww&#124;Mww&#124;Mww`; structural pulses `S-M-M` |
| 2/2 Bonus | Alla breve; half pulse 960 | 1920 | `[0,960]` | `[1,1]`; `S-W` |

The supplied technical matrix is normative and must be retained in any implementation-facing copy:

| Parameter | 3/8 | 6/8 | 9/8 |
|---|---:|---:|---:|
| Bar capacity | 720 | 1440 | 2160 ticks |
| Number of eighth notes | 3 | 6 | 9 |
| Number of groups of three | 1 | 2 | 3 |
| One eighth-note duration | 240 | 240 | 240 ticks |
| Technical pulse count | 3 | 2 | 3 |
| Technical pulse duration | 240 | 720 | 720 ticks |
| Pulse starts | `[0,240,480]` | `[0,720]` | `[0,720,1440]` |
| Classification | simple triple | compound duple | compound triple |
| Teaching group emphasis | `3/8 Sww` | `6/8 Sww&#124;Mww` | `9/8 Sww&#124;Mww&#124;Mww` |

The source label “3/8 phách chính=1” is superseded by the owner-confirmed3 simple eighth beats. Do not adopt a720-tick compound pulse or ask again to resolve that music convention. Illustrative group count and semantic beat count are different concepts.

The confirmed music convention has four distinct concepts: subdivision/phách đơn (eighth 240 inside compound beats, or an independent simple beat in 3/8), compound beat/phách phức (dotted quarter 720 in 6/8 and 9/8), bar-level accent (Mạnh at tick 0), and secondary beat accent (Vừa at later compound starts). The vectors remain 3/8 Sww, 6/8 Sww|Mww and 9/8 Sww|Mww|Mww; compound-beat vectors remain S-M and S-M-M. Eighth flags/grouping, the three counting methods and the two accent forms are now APPROVED, not pending proposals. None changes canonical data or the existing segment.accent schema.

`MeterInfo` may expose readonly derived metadata such as `measureTicks`, `pulseTicks`, `pulseUnit`, `pulseCount`, `pulseStarts`, `groups`, `structuralAccents`, and an explicit notation/beam plan. These are derived from the registry and are not caller-editable fields in serialized `RhythmMeter`. The public serialized meter remains the exact numerator/denominator pair. The future Zod schema must accept exactly these seven pairs and reject unsupported pairs such as 3/2, 6/4, and 5/8.

Meter capacity is derived from the explicit definition and the validator requires exact equality. The authoritative conversion remains:

```text
seconds = (ticks / pulseTicks) * (60 / BPM)
```

Thus a 240-tick 3/8 pulse lasts one second at 60 eighth-pulse BPM, a 720-tick 3/8 bar lasts three seconds at that tempo, a 720-tick 6/8 or 9/8 dotted-quarter pulse lasts one second at 60 dotted-quarter BPM, a 1440-tick 6/8 bar lasts two seconds, and a 2160-tick 9/8 bar lasts three seconds at that tempo. A 960-tick 2/2 pulse lasts one second at 60 half-pulse BPM, and a 1920-tick 2/2 bar lasts two seconds. The same conversion is used for notation-derived event positions, future audio gates, metronome pulses, count-in pulses, and expected onset positions.

For any measure, the validator computes the sum of ordered segment ticks and requires exact equality with the selected capacity. It rejects underfilled and overfilled measures, zero or negative durations, malformed dotted descriptors, contradictory ticks, unsupported meters, unsupported tuplets, unsupported swing, mixed meter, polyrhythm, and unsupported articulation semantics. It also validates that notation descriptors and tick values agree. A schema validator may use Zod at the Rhythm boundary, but exact arithmetic and musical constraints must be enforced by Rhythm-owned validation logic rather than by schema shape alone.

### Required canonical examples

**Complete 3/8 examples.** Three eighths are 240 + 240 + 240 = 720 ticks; one dotted quarter is 720; three eighth rests fill 720 with no onsets. Two eighths total 480 and must reject as underfill; four eighths total 960 and must reject as overfill. Note starts 0, 240 and 480 and pulse indices 0, 1 and 2 remain independent simple beats. APPROVED eighth notation requires one separate flag per note and no beam joining the three. Canonical validity is not a claim that the renderer has been updated.

**Complete 2/2 examples.** Two half notes are `960 + 960 = 1920` ticks. Four quarter notes are `4 * 480 = 1920` ticks. Eight eighth notes are `8 * 240 = 1920` ticks. Three quarters total 1440 and must reject as underfilled. Five quarters total 2400 and must reject as overfilled. Four quarter starts are 0, 480, 960, and 1440 with pulse indices 0, 0, 1, and 1. Eight eighth starts are 0 through 1680 in 240-tick steps, with four eighths inside each half pulse.

**Complete 4/4 example.** One valid measure contains quarter note, two eighth notes, quarter rest, and quarter note:

```text
4/4 capacity = 4 * 480 = 1920
quarter note       480   starts 0,     attacks at 0
paired eighth      240   starts 480,  attacks at 480
paired eighth      240   starts 720,  attacks at 720
quarter rest       480   starts 960,  no attack
quarter note       480   starts 1440, attacks at 1440
sum = 480 + 240 + 240 + 480 + 480 = 1920
```

The pulse positions are 0, 1, 1.5, 2, and 3 quarter beats in measure-relative terms. The rest occupies its exact duration and has no target at its start.

**Complete 3/4 example.** One valid measure contains dotted quarter note, eighth note, and quarter rest:

```text
3/4 capacity = 3 * 480 = 1440
dotted quarter  720   starts 0,   attacks at 0
eighth          240   starts 720, attacks at 720
quarter rest    480   starts 960, no attack
sum = 720 + 240 + 480 = 1440
```

The dotted duration is explicit: 720 ticks equals one and a half quarter beats. The remaining 720 ticks are exactly an eighth plus a quarter rest.

**Complete 6/8 example.** One valid compound-duple measure contains a dotted-quarter note, two eighth notes, and an eighth rest:

```text
6/8 capacity = 6 * 240 = 1440
dotted quarter  720   starts 0,    attacks at 0; pulse group 1 = 0..720
(eighth)        240   starts 720,  attack at 720; pulse group 2 begins
(eighth)        240   starts 960,  attack at 960
eighth rest     240   starts 1200, no attack
sum = 720 + 240 + 240 + 240 = 1440
```

The full bar is grouped 3+3 eighth units. The second pulse, ticks 720 through 1440, has three subdivisions. The rest occupies the final subdivision. The dotted-quarter BPM governs each 720-tick pulse; it is not six independent quarter-like beats [2]. A dotted half fills a 6/8 bar; a whole note does not.

**Complete 9/8 example.** One valid compound-triple measure contains three dotted-quarter note/rest spans, represented here as three groups of three eighth units:

```text
9/8 capacity = 9 * 240 = 2160
(eighth)        240   starts 0,    attack at 0; group 1 / pulse 1
(eighth)        240   starts 240,  attack at 240
(eighth rest)   240   starts 480,  no attack
(dotted quarter)720   starts 720,  attack at 720; group 2 / pulse 2
(eighth)        240   starts 1440, attack at 1440; group 3 / pulse 3
(eighth)        240   starts 1680, attack at 1680
(eighth rest)   240   starts 1920, no attack
sum = 240 + 240 + 240 + 720 + 240 + 240 + 240 = 2160
```

The 9/8 compound-beat starts remain 0, 720 and 1440 with grouping 3+3+3 and accents Mạnh, Vừa, Vừa; other eighth subdivisions are Nhẹ. APPROVED eighth beam groups do not cross 720 or 1440. Text-based or symbol-based accent presentation with optional contrasting, recognizable color is approved; numerical gain/velocity is not inferred from presentation and is not implemented. 9/8 is neither one 2160-tick pulse nor nine primary quarter-like beats.

The existing 4/4, 3/4, and 6/8 rules remain valid and their duration, rest, tie, attack, and bar-capacity semantics continue to apply to all seven supported meters.

**Tie example.** Preserve the prior complete cross-bar 4/4 tie fixture. The same rule applies to 3/8 and 2/2: a tie continuation at the next segment or barline has no attack, the gate spans the contiguous tie group, and a rest between tie members is invalid. A 3/8 cross-bar fixture may span `[480,960)` when a final 240-tick eighth is tied into the next bar; a 2/2 cross-bar fixture may span `[960,2880)` when a final half pulse is tied across bars. These are proposed fixtures, not implementation evidence.

## 5. Generation, notation, and audio parity

**New Rhythm — generation proposal.** The generator is seeded and meter-aware. A level configuration supplies allowed meters, explicit meter capabilities, duration vocabulary, rest policy, tie policy, dot policy, maximum difficulty sources, meter-labeled tempo band, exercise kind balance, and answer/distractor rules. It fills measures from a permitted exact-duration vocabulary, validates every measure, derives attacks, and computes a canonical answer signature. It must reject invalid measures before they reach a mode. It must also reject distractors that are equivalent under the canonical representation, visually identical, audibly indistinguishable for the requested task, or different only in an excluded property.

The generator must preserve the exact requested meter. It must not coerce every non-6/8 meter to denominator 4, classify compound meter by numerator 6, or classify 3/8 as compound because its denominator is 8. Fine-grid and syncopation budgets must use `pulseTicks`, pulse count, and explicit capability metadata. Existing exact-fill, rest, tie, cross-bar, and all-rest validator rules remain authoritative. A canonical all-rest 3/8 bar is valid validator/notation material, although the current generator deliberately rejects all zero-onset generated patterns, not only Tap items; that policy must remain an explicit future choice rather than silently invalidating the canonical fixture.

Adding 3/8 and 2/2 to default pools changes seeded default outputs. The future implementation must either preserve a legacy policy/default-pool version or explicitly document that policy expansion changes old default seeds. Same configuration and same policy version must remain deterministic. No cross-meter fallback or equivalent filler is allowed merely to satisfy a choice count.

**New Rhythm — notation projection proposal.** A single validated derived segment view is passed to a Rhythm-owned VexFlow 5 adapter. The adapter maps canonical note/rest descriptors to `StaveNote`, durations, dots, beams, and `StaveTie` arcs [6] [7] [8] [9]. Strict voice/tick checks are secondary assertions; they do not replace the canonical validator. Beam grouping must be an explicit meter-aware presentation plan separate from the semantic pulse metadata.

The APPROVED eighth-note beam plan is: 3/8 gives every eighth its own flag, without a three-note beam; 6/8 uses 3+3 and 9/8 uses 3+3+3, with no beam crossing compound-beat boundaries. This replaces the optional 3/8 bar-wide proposal without changing technical pulse, accents, tempo or count coordinates. Sixteenths, rests and mixed-duration patterns follow appropriate notation rules and preserve beat/compound-beat boundaries; detailed secondary-beam/rest/mixed examples not specified remain review details. Retain the existing 2/2 contract (eighth primary groups 4+4; sixteenth groups 8+8, with secondary quarter-subgroups 4+4 | 4+4). A valid tie does not itself require a beam break but cannot justify crossing an approved boundary. A rest creates no attack and a tied continuation creates no new attack. No source or renderer changes occur here.

Structural meter accents remain separate from explicit segment accents. The approved reference overlay is3/8 `S-W-W`,6/8 `S-M` at compound starts and `Sww|Mww` on eighth positions,9/8 `S-M-M` and `Sww|Mww|Mww`;2/2 remains unchanged `S-W`. No structural accent silently mutates `segment.accent` or creates an attack at a rest/tie continuation. No schema/source changes occur in this correction.

**New Rhythm — duration-aware audio projection proposal.** The same derived view schedules one attack for each untied note or tie-group start, no attack for rests, and one gate release at the end of each note or tie group. A rest is silent for its full duration. A tie does not become a series of ambiguous clicks. Listening exercises use a bounded sustained timbre/envelope; a gated tone is held for the written duration and released at the duration/group end. The pattern tone lane and metronome lane are separate so a learner can distinguish the musical pattern from reference pulses. A metronome may accent the first pulse of a bar, but it must not conceal rests or create a false attack for a tie continuation. In future 3/8 audio, reference pulses are three 240-tick eighth pulses; in 6/8 they are two 720-tick dotted-quarter pulses; in 9/8 they are three 720-tick dotted-quarter pulses; in 2/2 they are two 960-tick half pulses.

A pre-release parity fixture must compare canonical segments, notation event positions, and audio event positions. If notation says a tied continuation starts at a tick but audio emits a new attack there, the fixture fails. If audio gate ends before a dotted duration, the fixture fails. The new-meter parity fixtures are proposed and not implemented in this review.

## 6. Four exercise kinds and lifecycle

The four kinds share a local rhythm exercise state machine but differ in answer capture. Proposed local states are `setup`, `ready`, `countIn`, `playing`, `collecting`, `feedback`, `complete`, `aborted`, and `audioUnavailable`. A new exercise begins in setup, obtains or resumes audio only after user gesture when required, displays the instructions and target, and enters ready. A user action begins count-in or the question playback. At the end of a completed question, the local validator produces a rhythm answer result. Exactly one shared exercise-level answer is then submitted for that completed graded exercise. A replay or unscored retry never submits another shared answer. An aborted attempt submits no answer and no score.

The UI must show whether the current action is practice/replay, a graded attempt, or an unscored retry. Any retry does not increase the original shared award; retry limits are kind-specific and remain unresolved for Tap Rhythm. A completed graded exercise is worth exactly +10 if the exercise-level result is correct and +0 if incorrect. There is no partial credit engine, no per-tap shared counting, and no separate score for each subpart. Local diagnostics may report missing, extra, early, late, duration, meter, tie, or syncopation issues without changing the +10/+0 rule.

### A. Multiple Choice

**Screen interaction.** The screen presents a notation panel or a concise theory question and two to four answer choices as native buttons. Choices must be keyboard-operable, visibly focused, large enough for touch, and labeled in Vietnamese-first copy. A notation question may ask for duration, meter, beat position, rest meaning, tie attack count, or matching pattern. The module must avoid importing Note Reading’s internal theory or presentation.

**Lifecycle.** The exercise loads a validated canonical pattern, displays the question, waits for one choice, disables duplicate submission, validates it, shows feedback, and permits next, replay, or unscored retry according to the local flow. If the user changes tempo or display visibility in a way that affects an active audio-backed question, the attempt is aborted before any answer/score is committed.

**Audio.** Audio is optional for purely visual questions and required for audio comparison questions. If audio is used, initialization occurs after a user gesture and the scheduler uses the canonical audio projection. A blocked or interrupted context shows a recovery action rather than silently marking an answer wrong.

**Validation and feedback.** Validation compares the selected choice’s canonical answer identity, not a label string or rendered pixel. Feedback explains the relevant concept: for example, “dotted quarter = quarter + half of quarter,” “6/8 has two dotted-quarter pulses,” or “the second tied segment does not attack.” The feedback may show a corrected notation and a pulse/subdivision overlay.

**Scoring and retry.** The first completed graded response is converted to one shared correct/wrong result and +10/+0. Replay and retry do not rescore. A wrong answer may be reviewed and retried locally, but the original award remains fixed.

**Mobile.** Choice buttons must be touch-safe with no hover-only meaning [25] [26]. Orientation changes during an active audio attempt should abort and require a new visible start gesture if timing could be affected. A mobile screen must preserve the meter label, notation legibility, and feedback without making the learner infer duration from an inaccessible animation.

### B. Tap Rhythm

**Screen interaction.** The learner sees the rhythmic pattern (notation or a visual grid), meter label, and a large screen tap surface, and follows the exercise's metronome/reference timing to tap intended onset positions. Supported inputs are pointer down, touch through Pointer Events, and Space keydown. Microphone and MIDI are not implemented. Space key repeats are ignored [23]. Pointer events are deduplicated so a touch does not become both pointer and click input. `pointercancel`, pointer loss, blur, hidden tab, context interruption, output-route change, tempo change, or scheduler starvation aborts the active attempt without penalty.

**Lifecycle.** Preserve attempt-generation isolation, monotonic event-time capture, one evaluation per completed attempt, and abort-without-score behavior for technical interruption or cancellation. Replays/retries never rescore a completed graded exercise; if offered, a replay or retry is ungraded. The precise count-in, reference/replay availability and limits, collection boundary, and whether metronome guidance continues throughout each exercise (or is removed for advanced work) are unresolved technical decisions, not defaults approved here. Matching/clock implementation proposals appear separately as clearly labelled NON-APPROVED hypotheses.

**Audio.** The metronome/reference is scheduled from `AudioContext.currentTime`, with a bounded look-ahead wakeup. The DOM event timestamp is used for input; the audible click timestamp is never substituted for the physical event timestamp. Count-in and pattern tone are separate lanes. If the pattern contains ties, the second segment is not an attack target. Rests are silent; a reference click may indicate pulse but must not be mistaken for a target.

**Validation.** Tap matching evaluates actual tap timestamps against expected rhythmic onset timestamps, in order and one-to-one; a tap or target cannot be reused. It reports early, late, matched, missing, and extra events. Equal tap count alone is not correct. **Timing Accuracy (%) is required** as a rhythm-local Tap result, separate from Exercise Points (+10/+0) and the shared session `TrainingResult.accuracy` and `averageResponseTimeMs`. The exact percentage formula, tolerance windows, grades, and rule mapping a Tap result to correct/incorrect Exercise Points are not approved and require separate technical specification and approval. No Tap pass threshold is established here.

**Feedback.** Show required Timing Accuracy (%) separately from +10/+0 Exercise Points and shared session accuracy/response-time metrics, together with a timeline or beat-grid overlay for target onsets, matched taps, early/late direction, missing targets, and extra taps. Do not infer a formula, tolerance, or grade that has not been approved. Explain whether an error concerns onset placement, pulse/subdivision, or a tie/rest. Never claim that tapping proves a learner held a sound for its written duration.

**Scoring and retry.** Preserve the shared whole-exercise +10/+0 contract, submitted once for a completed graded exercise; never award per-tap shared points. The Tap correctness rule that determines correct versus incorrect points remains open pending approval of timing criteria. Any replay/ungraded retry does not rescore. Choosing a new tempo or changing visibility/notation mode during an active attempt aborts it without answer or score; it cannot be treated as a wrong response.

**Mobile.** Use a large touch target and avoid requiring precise small hit areas. Prevent accidental scroll while the tap surface is active without trapping the rest of the page. Pointer cancellation is a normal abort path [22] [24] [27]. Bluetooth/audio output latency is not assumed fair or constant; the UI should identify degraded technical confidence and may classify the attempt ungraded rather than punitive.

### C. Listen & Identify

**Screen interaction.** The learner hears a rhythm pattern and selects the matching notation or pattern. The answer choices must be generated from distinct canonical signatures. The interface includes play, replay, stop, and submit controls, with a visible count of remaining unscored replays if the product chooses one; the recommended V1 policy is unlimited replay with no score change.

**Lifecycle and audio.** Playback begins only after a user gesture or an already-running context. The pattern schedule is generated from the canonical model. Stop cancels pending sources and invalidates the attempt generation token. Replay restarts the pattern without changing the graded answer state. Visibility loss or context interruption invalidates the active graded attempt and requires a new visible start/count-in rather than resuming mid-pattern.

The listening renderer must be duration-aware. It uses a gated tone with an explicit attack and release. A note’s tone lasts its written duration; a tied note group is one sustained gate through all tied segments; a rest emits no tone; a tie continuation emits no new attack. A click-only implementation is insufficient because it cannot distinguish same-onset/different-duration choices. Content generation must reject distractor pairs that remain indistinguishable on the target audio route. If device confidence is insufficient to distinguish a duration or rest, the item should be marked ungraded rather than punitive.

**Validation, feedback, scoring, retry, and mobile.** Choice identity is compared with the canonical signature. Feedback may show the waveform-like timing strip, onset marks, duration bars, tie grouping, and a slow replay. The shared score is one +10/+0 whole-exercise award. Replays cannot rescore. On mobile, playback controls must be large and announce audio state. If autoplay is blocked, show an explicit “Bắt đầu âm thanh” recovery action. Screen readers need state changes for playing, stopped, interrupted, and ready.

### D. Count the Beat

**Screen interaction.** The learner identifies beat positions, subdivisions, strong/weak pulses, or the compound grouping of a displayed rhythm. A coordinate grid may show pulse columns and subdivision cells, but the visual must not flatten 6/8 into six equal quarter beats. Controls should use native buttons, selectable grid cells with accessible labels, or a concise sequence input; the final selection method is a product choice within this design.

**Lifecycle and audio.** The exercise loads a canonical pattern, shows the meter and count labels, and optionally supplies an accent-only count-in or metronome. The learner selects one or more beat/subdivision answers, submits once, receives concept feedback, and may retry locally without rescore. Tempo changes or visibility changes during an active audio-backed count abort the attempt without penalty.

**Validation and feedback.** Validation compares derived pulse and pulse-local subdivision coordinates. In 6/8 pulse starts are 0 and 720; local eighth subdivision indices are `[0,1,2,0,1,2]`. In 9/8 pulse starts are 0, 720, and 1440; local eighth subdivision indices are `[0,1,2,0,1,2,0,1,2]`. A separate whole-bar display ordinal may show 0..8 grouped 0–2, 3–5, and 6–8, but it is not `subdivisionIndex`. In 3/8 pulse indices 0/1/2 occur at 0/240/480 and remain three technical pulses even when one teaching group is shown. In 2/2 quarter starts 0/480/960/1440 have pulse indices 0/0/1/1 and local quarter subdivision indices 0/1/0/1. Strong/weak labels derive from explicit meter grouping and relative hierarchy, not from a generic numerator. Feedback explains the relationship between written duration, onset position, pulse, and subdivision. A tie continuation can be identified as a written segment without a new onset.

**Scoring and mobile.** One completed exercise maps to +10 or +0; there is no per-cell score. On mobile, coordinate cells must be large, scroll-safe, and keyboard accessible. The user must be able to review the meter label while selecting an answer. Audio failure may allow a visual-only Count the Beat question when audio is not required; an audio-dependent question must not silently become punitive if the context is unavailable.

## 7. Audio and timing architecture

**New Rhythm — Web Audio scheduling proposal.** Use one reusable online `AudioContext`, initialized or resumed from an explicit user gesture [11] [14] [15] [20]. `latencyHint: "interactive"` is a preference, not a guarantee. Schedule source nodes against `AudioContext.currentTime` [11] [16] [21]. JavaScript timers are only bounded look-ahead wakeups; they are not the musical clock. The scheduler maintains a generation token for each attempt. Stop, replay, tempo change, visibility loss, interruption, route change, or starvation invalidates the prior generation so late callbacks cannot emit sound or accept input into a new attempt.

Pattern tones, tie-chain gates, metronome clicks, and count-in pulses use separate logical lanes and gain controls. The scheduler needs a bounded future horizon and wakeups frequent enough to refill it. A former unapproved implementation example used 100–200ms; this numerical horizon is a provisional technical proposal, not an approved value. It detects a wakeup that misses the selected horizon. A starved graded attempt is invalidated and shown as technical/ungraded; it is never converted into an incorrect learner result. Ordinary timers may be delayed in hidden tabs, so hidden-page scheduling is not trusted.

**Tempo semantics.** Tempo is immutable during a graded attempt. If the learner chooses a different tempo before starting, the canonical target timeline is regenerated. If the learner changes tempo during playback or collection, the current attempt is aborted without answer or score. BPM is meter-aware: quarter-note BPM for 2/4, 3/4, and 4/4; eighth-note BPM for 3/8; dotted-quarter BPM for 6/8 and 9/8; and half-note BPM for 2/2. Count-in labels must preserve these pulse names and must not relabel 3/8 as a 720-tick pulse. The exact conversion is `seconds = (ticks / pulseTicks) * (60 / BPM)`. The scheduler uses the same conversion for count-in, target onset, metronome, gate start, and gate end. This is a future contract, not an audio implementation claim.

**Retained timing invariant.** Capture actual input events on a monotonic clock, preserve event order, compare those timestamps to expected onset timestamps, and abort without score when a technical interruption invalidates timing. The following clock conversion, latency, freshness, and calibration details are a historical technical proposal — **PROVISIONAL / NON-APPROVED**, not current requirements or approved calibration policy.

**Historical clock-mapping proposal — PROVISIONAL / NON-APPROVED.** Normalize DOM event.timeStamp into the performance.now() origin, capturing it at handler entry rather than React render or audible monitor-click time. Reject implausible/nonmonotonic timestamps; a performance.now() handler timestamp is a lower-confidence fallback. With a valid fresh output timestamp `{contextTime:C, performanceTime:P}`, target audio timeA maps to `expectedPerformanceMs(A) = P + 1000*(A-C)`, and input timestampT maps inversely to `tapAudioTime(T) = C + (T-P)/1000` [11] [17]. For example C=5s,P=10000ms,A=5.5s predicts audible target10500ms; a tap10530ms has signed error+30ms before uniform calibration. Never add baseLatency/outputLatency again to this direct mapping. This proposal does not settle device-latency compensation or calibration policy.

Without a valid output timestamp, the proposal snapshots currentTime=C0 and performance.now()=P0 together and uses `expectedPerformanceMs(A) ≈ P0 + 1000*(A-C0+L)`, equivalently `tapAudioTime(T) ≈ C0+(T-P0)/1000-L`. L is a supported finite latency estimate in seconds, using baseLatency plus outputLatency when both apply [18] [19]. This is a degraded estimate, not hardware measurement. Missing estimates do not prove zero latency. The 250ms bound and 500ms freshness interval are historical hypotheses only — **PROVISIONAL / NON-APPROVED**; no latency-compensation, calibration, or confidence thresholds are settled.

Historical calibration proposal — **PROVISIONAL / NON-APPROVED**: an optional eight-pulse tapping step; median mapped signed offset after excluding false/missing taps; at least six usable pulses; tentative rejection above 120ms or on excessive dispersion; uniform offset applied only to a later attempt, never fitted to a graded answer. Any such values and procedure are hypotheses, not selected policy. Whether to calibrate, how to compensate latency, and what confidence policy to use remain open. Calibration cannot prove physical contact timing or eliminate changing Bluetooth delay, and offset may include learner alignment bias as well as device delay.

**Historical ordered-matching/window proposal — PROVISIONAL / NON-APPROVED; not an approved Tap pass rule.** Preserve the ordered one-to-one matching invariant: compare ordered expected onset timestamps and actual tap timestamps, never reuse an event, and explicitly identify matched, early, late, missing, and extra events. The former proposal defined localIOI as the smaller positive neighboring expected gap, used `Wmax(i)=min(180ms,0.45*localIOI(i))`, and proposed `Wpass(i)=min(cap, fraction*localIOI(i))`: introductory 100ms/0.30, core 70ms/0.25, advanced 50ms/0.20. These figures and any passing-window use are non-approved hypotheses, not current thresholds. Exact tolerance windows remain open.

The historical proposal also included ordered dynamic programming with match, missing-target, and extra-tap transitions; a proposed cost `min(abs(t-e)/Wpass,1.5)`; deterministic tie-breaking; and an on-time ratio `onTimeTargets / expectedTargets`. Its proposed 0.80/0.90/0.95 ratios, zero-false-extra condition, rounding rule, and any grade/pass interpretation are **PROVISIONAL / NON-APPROVED** and are not approved thresholds or an accuracy formula. Do not use these values as current criteria. Exact Timing Accuracy (%) formula, matching windows, and grades require separate approval. All-rest material is not a graded Tap item unless a future approved rule defines that case.

Historical examples based on those non-approved hypotheses — **PROVISIONAL / NON-APPROVED**: at quarter-note 120 BPM, a sixteenth gap is 125ms, yielding a 56.25ms candidate window and 31.25ms core passing window; at a 500ms quarter gap, proposed introductory windows are 180ms candidate and 100ms passing. These examples do not establish current windows or pass criteria.

Any future error diagnostic must define its unit, event population, matching policy, missing/extra treatment, window, and denominator. A matched-event signed error or absolute-error summary, matched ratio, missing count, extra count, and technical confidence are historical diagnostic proposals, not approved Timing Accuracy (%) formula or grades. Do not map a Tap diagnostic or Timing Accuracy (%) into shared `averageResponseTimeMs`, which remains the shared wall-clock time from question start to answer submission.

**Lifecycle and browser/mobile limits.** A visible user gesture starts or resumes audio. On `visibilitychange` to hidden [13], the safest V1 behavior is to invalidate an active graded attempt and require a visible gesture and fresh count-in. `AudioContext` states `suspended`, `interrupted`, or `closed` are surfaced in the UI. A phone call, screen lock, orientation change, output-route change, Bluetooth reconnection, or browser interruption invalidates the active attempt if timing fairness is affected. A replay cancels all old sources before scheduling a new generation. The scheduler does not promise 1 ms mobile or Bluetooth timing. Technical confidence must be part of local diagnostics and acceptance decisions.

## 8. UI screens and user flows

**Landing page — proposal, New Rhythm using Reuse shell.** The page uses `TrainingHeader` and `TrainingFooter`, the existing coral visual language, and a Rhythm-owned main content layout. It explains the five learning goals, presents Free and Challenge entry points, and links to the six-Level curriculum and optional Bonus exploration. It does not show an active catalog entry until implementation approval and release gate. The copy is Vietnamese-first, with concise terms for pulse, subdivision, rest, tie, and dotted duration. No Note Reading internal component or theory service is imported.

**Level selection — proposal, New Rhythm.** The page lists six ordered Levels plus the optional Bonus 2/2 track with objectives, Lessons, Practice, Assessment, suggested exercise kinds, and a proposed readiness indicator. It must say that readiness is a recommendation, not a mandatory lock. A learner can explore a level without a server account. If optional local mastery is later approved, it is a minimal Rhythm-owned local service and is not required to render the curriculum.

**Setup and ready state — proposal, New Rhythm.** Setup shows level, meter, labeled tempo pulse, exercise kind, audio status, replay/feedback policy, and a clear start button. It states that Tap Rhythm scores onset timing only and does not measure hold duration. It provides a visible audio recovery action when the context is suspended. The ready state makes the expected input and keyboard Space shortcut clear and preserves the current meter label.

**Exercise screen — proposal, New Rhythm.** The desktop layout may place notation and instruction on the left with controls and the tap surface on the right. Mobile stacks the meter/notation, playback controls, and large tap area vertically. It includes a progress indicator that reflects completed exercises, not individual taps. Accessible metronome/reference, replay, stop, and submit/finish controls may be provided according to the separately approved Tap guidance/replay policy; this proposal does not select continuous metronome behavior or replay limits. The beat cursor is advisory and must not imply that playback continues after a hidden-tab invalidation.

**Feedback screen — proposal, New Rhythm.** Feedback separates shared correctness from local diagnosis. It shows “correct/incorrect” for the whole exercise, the +10/+0 award when applicable, and a rhythm-specific explanation. Tap feedback must include the required Timing Accuracy (%) separately from shared accuracy and Exercise Points, along with an onset timeline, early/late information, missing and extra events, and technical confidence; its formula, tolerance, and grade remain open. Listen feedback includes duration/tie/rest explanation. Count feedback includes pulse/subdivision coordinates. The screen offers next, review, and unscored retry. It never suggests that a per-tap percentage is the shared session accuracy.

**Results screen — Reuse plus New Rhythm detail.** The existing `ResultSummary` renders the shared scalar result: total questions, correct/incorrect, shared accuracy, total score, and shared wall-clock average response time. Tap Rhythm additionally requires a separate rhythm-local Timing Accuracy (%) measure; its formula and grades remain open and it must not replace or be conflated with shared accuracy or `averageResponseTimeMs`. A Rhythm-owned detail area may show onset diagnostics, subskill recommendations, meter coverage, duration/tie concepts, and suggested review levels. These details do not mutate shared `TrainingResult`. Result recording uses the existing aggregate progress service; no per-level history is required for launch.

A standard flow is: landing → level → setup → audio gesture/ready → count-in or question → answer capture → local validation → one shared submission for the completed exercise → feedback → next or unscored retry → results. A technical interruption flow is: active attempt → hidden/context/route/starvation event → visible aborted state → new gesture and fresh count-in → new attempt with no wrong score. A tempo/display-change flow is: setup change before start is accepted; the same change during an active graded attempt aborts without answer/score.

## 9. Proposed module folder and file structure

This is a planned folder structure, not a request to create files now. All Rhythm-owned logic remains under `client/src/modules/rhythm-training/` and does not import Note Reading internals.

```text
client/src/modules/rhythm-training/
  RhythmTrainingPage.tsx
  index.ts
  types.ts
  config.ts
  curriculum.ts
  exerciseKinds.ts
  sessionAdapter.ts
  stateMachine.ts
  components/
    RhythmLanding.tsx
    LevelSelection.tsx
    ExerciseSetup.tsx
    RhythmExercise.tsx
    NotationPanel.tsx
    PlaybackControls.tsx
    TapSurface.tsx
    CountGrid.tsx
    ChoiceList.tsx
    RhythmFeedback.tsx
    RhythmResultsDetail.tsx
  rhythm/
    durations.ts
    meters.ts
    model.ts
    deriveTimeline.ts
    validate.ts
    signatures.ts
    ties.ts
  generation/                 # existing Phase2 files retained/adapted
    random.ts
    levels.ts
    generator.ts
    answerSignatures.ts
    choices.ts
  notation/                   # existing Phase2 files retained/adapted
    projection.ts
    VexFlowRhythm.ts
    examples.ts
  audio/
    audioContext.ts
    scheduler.ts
    toneGate.ts
    metronome.ts
    countIn.ts
    clockMapping.ts
    calibration.ts
    lifecycle.ts
  input/
    tapCapture.ts
    pointerKeyboardDedup.ts
    visibilityAbort.ts
  validation/
    multipleChoice.ts
    tapMatcher.ts
    listenIdentify.ts
    countBeat.ts
    diagnostics.ts
  services/
    optionalLocalMastery.ts
  tests/
    durations.test.ts
    meters.test.ts
    validator.test.ts
    generator.test.ts
    notationAudioParity.test.ts
    tapMatcher.test.ts
    scheduler.test.ts
    lifecycle.test.ts
    browserAcceptance.md
```

The exact file names are proposals and may be refined during approved implementation. The boundary is mandatory: canonical rhythm data, generation, notation, audio, validation, and UI state are Rhythm-owned. The module may depend on shared training types at the adapter boundary, but must not import Note Reading’s theory, generator, components, VexFlow adapter, audio, piano, or preferences.

## 10. Actual foundation integration plan

**Reuse — module shell and navigation.** The future page should render within the existing `TrainingShell`, use catalog-driven header navigation, preserve mobile menu behavior, and follow current module layout/copy/action conventions. It should not create a second shell, router, or plugin registry.

**Reuse — shared module and session contract.** The future Rhythm adapter should satisfy `TrainingModule<TConfig,TExercise,TAnswer,TResult>` at the existing boundary. `generateExercise` returns a Rhythm-owned canonical exercise; `validateAnswer` validates the completed exercise answer at the adapter boundary; `createResult` and session lifecycle remain shared where practical. Because the generic session counts one completed exercise as one answer, a Tap Rhythm answer containing multiple taps remains one answer.

**Reuse — scoring.** Call the shared submit function once for each completed graded exercise. Pass correct or wrong and the existing response-time semantics. Use the existing +10 correct/+0 wrong behavior. Do not call submit on replay, aborted attempt, technical failure, tempo change, hidden-tab invalidation, or ungraded retry. Do not use one shared submission per tap.

**Reuse — progress and summary.** Call the existing `recordCompletedResult` with the final shared `TrainingResult` and render the existing `ResultSummary`. Its aggregate v1 progress is global-only. If product later requires subskill cards, add a minimal Rhythm-owned optional local service; do not migrate or overload the shared progress schema.

**Necessary Shared Change — future activation only.** After approval, implementation, tests, browser checks, and the V1 gate, add a real active module catalog entry with metadata, route/page binding, and matching static manifest path. The current Coming Soon metadata must remain inert until all four modes and real curriculum content are available. This is the only expected shared host change. Chord Recognition stays Coming Soon and unchanged.

The integration must not make a hardcoded Note Reading dependency. No shared API change is expected. No source edit is authorized by this document.

## 11. Testing strategy: theory correctness and timing correctness are separate

Testing must be split into two independent quality tracks because exact music theory can be correct while browser timing is unfair, and timing can be consistent while notation is wrong. Both tracks are required before activation.

### A. Music-theory and canonical-model tests

Pure tests must verify duration arithmetic for whole, half, quarter, eighth, sixteenth, dotted values, and rests. They must verify exact capacities and pulse metadata for all seven supported meters: 2/4 960/480 with two quarter pulses, 3/4 1440/480 with three, 4/4 1920/480 with four, 3/8 720/240 with three simple-triple pulses, 6/8 1440/720 with 3+3, 9/8 2160/720 with 3+3+3, and 2/2 1920/960. They must verify 3/8 S-W-W and simple-triple identity, 6/8 S-M and compound-duple identity, 9/8 S-M-M and compound-triple identity, and 2/2 S-W and alla-breve identity. They must cover the complete existing fixtures and the required new 3/8, 9/8, and 2/2 fixtures in Section 4 and the companion acceptance review. These tests are future requirements, not passing implementation claims. Owner-confirmed Level6 eighth-grid expected vectors are `[S,w,w]`, `[S,w,w,M,w,w]`, `[S,w,w,M,w,w,M,w,w]`; compound-beat vectors are `[S,M]` and `[S,M,M]`. Reject equal-strong group starts and a fictional compound3/8 interpretation; this is a future requirement, not test implementation.

Validator tests must reject underfilled and overfilled bars, unsupported meters, malformed dots, contradictory ticks, unsupported tuplets/swing/mixed meter/polyrhythm, invalid tie adjacency, ties through rests, second attacks on tie continuations, and non-adjacent tie groups. Derivation tests must prove that all positions come from ordered segment durations and that no independently editable beat-position field can diverge.

Generator tests must be seeded and deterministic for a given configuration/seed. They must verify level vocabulary, exact capacity, difficulty budgets, valid canonical signatures, and rejection of equivalent or ambiguous distractors. Notation/audio parity golden fixtures must compare attack and gate timing against the same derived timeline. VexFlow strict voice checks are assertions, not the source of truth.

### B. Timing and browser tests

Deterministic fake-clock/offline tests must verify tick-to-second conversion, pulse labels, count-in positions, scheduler event intent, tie gate duration, rest silence, generation cancellation, late callback rejection, ordered one-to-one matching, missing/extra event classification, and event timestamp normalization. Any windows or graded error costs must follow separate approval, not these inherited proposal hypotheses. Tests prove relative logic only, not real device latency fairness.

Browser integration tests must cover AudioContext resume after gesture, currentTime scheduling, stop/replay cancellation, tempo-abort, visibility abort, context suspension/interruption, output-route change handling where observable, pointerdown, touch/pointer deduplication, Space repeat suppression, pointercancel, blur, stale generation events, and audio-unavailable recovery. UI accessibility checks must cover keyboard focus, button semantics, target size, screen-reader state announcements, and mobile orientation behavior.

Manual acceptance must cover representative current desktop browsers, iOS/Android browsers, touch, mouse, keyboard, built-in speakers, headphones, and Bluetooth where available. It must explicitly record that Bluetooth and device output may be best-effort. Hidden-tab throttling, phone interruption, screen lock, autoplay blocking, orientation change, rapid replay, rapid tempo changes, multi-pointer input, and audio-route changes must be exercised. The result of a technically unreliable attempt must be ungraded/no-penalty, not an incorrect learner score.

After an approved implementation only, the project checks recorded in source context should be run: `pnpm check`, `pnpm test`, `pnpm build:static`, and `pnpm build`. This design task does not run them and does not claim fresh results. Historical evidence includes the prior 565-test run for the canonical-to-SVG seven-meter gate and the Phase 2 result of 436/436 tests across 40 files; neither is a new run or evidence that generator policies, Tap, audio, or UI are active.

## 12. Phases, dependencies, and acceptance criteria

**Current source status; content/framework and implementation approval are separate.** The repository has an implemented canonical-to-SVG seven-meter gate, with prior 565-test evidence (historical; no fresh tests in this documentation update). The generator still has eight legacy levels and four-meter policies. Tap Rhythm, audio, and exercise UI are not active. D-07 approves curriculum placement, not runtime implementation. No phase in this specification authorizes changing source or tests during this read-only review.

**Phase 0 — owner decision record and contract freeze.** The seven-meter curriculum/music convention and three presentation decisions (individual eighth flags/compound beams; English app voice/numeric visual self-counting/tick metronome; two accent forms with optional color) are approved; D-07 now also approves Multiple Choice/Tap progression. Do not reopen these decisions. Source/runtime adaptation, voice assets/detailed subdivision articulation, secondary-sixteenth/rest/mixed notation examples, duration-aware timbre/envelope, unresolved Tap timing/guidance details, and activation retain their separate technical decisions or implementation gates. Preserve exact PPQ/pulse/schema and unrelated established contracts; no source change occurs here.

**Phase 1 — remaining canonical integration and fixtures.** The canonical-to-SVG seven-meter gate is implemented. Future approved work must verify and complete any remaining Rhythm-owned type, exact tick arithmetic, validator, tie, signature, and fixture integration. Acceptance still requires all seven exact definitions, valid/invalid bars, exact cache guards, 3/8 simple-triple identity, 6/8 compound-duple identity, 9/8 compound-triple identity, 2/2 alla-breve identity, and no independently authored timing fields. These criteria are not fresh test claims.

**Phase 2 — generator and notation projection.** In a future approved implementation, add explicit meter capabilities to seeded generation, difficulty budgets, answer signatures, ambiguity rejection, VexFlow projection, approved beam plans, rests, dots, and ties. Acceptance requires deterministic policy-versioned seeds, valid exact-duration bars, no equivalent distractors, strict notation parity, and documented 3/8/6/8/9/8 grouping and 2/2/4/4 distinctions. The existing historical Phase 2 evidence must not be relabeled as new-meter support.

**Phase 3 — audio scheduler and timing mapper.** This remains future-only and is not started by this review. If approved later, it must add AudioContext lifecycle, currentTime look-ahead, tone gates, metronome/count-in lanes, explicit 3/8 eighth-pulse, 9/8 dotted-quarter-pulse, and 2/2 half-pulse timing, clock mapping, and any separately approved latency/calibration policy, plus cancellation, starvation detection, and deterministic timing tests. Technical failures remain ungraded/no-penalty.

**Phase 4 — four exercise kinds and local state machine.** This remains future-only. Multiple Choice, Tap Rhythm, Listen & Identify, and Count the Beat must use the seven-meter canonical model only after Phases 1–3 are approved and complete. Each completed exercise submits once; +10/+0 remains whole-exercise scoring; tap diagnostics remain local; no microphone/MIDI paths are added.

**Phase 5 — shell integration and UI acceptance.** This remains future-only. Add the page within `TrainingShell`, local route/page implementation, responsive screens, Vietnamese-first copy, focus behavior, and result detail only after Phase 4 and activation approval. Do not activate a catalog button during this review.

**Phase 6 — release gate and future activation.** Run project checks, browser/device matrix, theory/timing review, and content review only after all prior approved phases. Only then may normal catalog and static-manifest bindings be activated. Until that gate, Rhythm remains Coming Soon. No deploy, WordPress change, UI activation, audio activation, catalog activation, or Phase 3 work is part of this update.

## 13. Risks, browser limitations, and unresolved decisions
The six-Level curriculum, optional Bonus placement, Level 6 simple/compound/hierarchy semantics, three presentation decisions, and D-07 exercise progression are owner-approved. Previous proposals superseded by those decisions must not be reopened; no source implementation is authorized. The following Tap details remain explicitly open technical decisions and must not be silently settled:

- Exact Timing Accuracy (%) formula.
- Timing tolerance/matching windows.
- Performance grades (for example Excellent/Good/Needs Improvement).
- Whether metronome guidance remains audible throughout every Tap exercise.
- Whether advanced Tap exercises may remove continuous metronome guidance.
- Count-in and replay limits.
- Whether a separate reference performance is available in each exercise.
- Device latency compensation and calibration policy.

These unresolved timing details do not delay the approved curriculum placement. Unspecified advanced notation/voice details and unrelated content/pilot details also remain open.


Web Audio scheduling cannot remove all physical output latency. `outputLatency` is not universal, `baseLatency` is an estimate, Bluetooth and operating-system mixers add variable delay, touch contact timing is not perfectly observed, and hidden-page timers may be throttled. The design therefore refuses to promise universal millisecond fairness. A confidence-insufficient device/attempt is ungraded rather than punitive.

Autoplay and AudioContext suspension may prevent sound before a user gesture. Mobile browsers may interrupt audio on tab switches, calls, screen lock, route changes, or orientation changes. The safest V1 behavior is abort and restart with a new visible gesture and count-in. The UI must not silently continue a cursor or accept stale taps.

Audio duration distinctions can be inaudible on some devices or through some outputs. Listen & Identify must use gated duration-aware tones, reject indistinguishable distractors, and mark insufficient-confidence cases ungraded. This is a product quality risk, not a reason to replace duration with click-only sound.

Curriculum order, Bonus placement, Level 6 music convention, the three presentation policies, and D-07’s exercise progression are fixed by the owner. Quotas, thresholds, tempo/readiness, and pilots remain provisional, non-gating unless separately approved. Review may check unspecified secondary-beam/rest/mixed notation examples, voice assets/precise subdivision articulation, and UI visual tokens; it cannot reopen English-default app voice, the counting methods, or the two accent forms. Tap accuracy formula, timing windows, grades, metronome/reference/count-in/replay policy, and latency/calibration policy remain open as listed above.

The established contract retains PPQ 480, seven explicit meters, one-dot descriptors, derived positions, V1 gates, compatible rests, monotonic event-time capture, ordered one-to-one Tap matching, technical abort without penalty, and no-rescore replay behavior. Do not treat historical windows/ratios as approved. Timing Accuracy (%) is required separately from the +10/+0 exercise points and shared accuracy/average response time. Presentation is already approved: 3/8 eighth flags without beams; 6/8 and 9/8 beams within compound boundaries; English app voice/numeric self-counting/tick; text or symbol accents with optional contrasting, recognizable color. Keep 2/2 half-pulse grouping, controlled cross-pulse ties, complete cross-bar fixtures, and duration-aware distractor equivalence unchanged. Unspecified secondary-beam/rest/mixed examples, voice assets/timbre/envelope, latency/calibration policy, and optional mastery persistence remain separate details. Document approval is not runtime implementation permission.

The product must decide whether an audio failure permits a visual-only fallback for each exercise kind. The recommendation is yes only when audio is not part of the question; audio-dependent questions must be ungraded and recoverable. It must also decide the exact local mastery persistence shape if later needed; the recommendation remains a small Rhythm-owned local service without cloud/account requirements.

No shared session mode should be added for exercise kinds. No partial-credit scoring engine should be added. No per-tap shared score should be added. No capability plugin should be added. No difficulty framework should be generalized into the shared foundation for V1. No Note Reading dependency should be introduced. No production WordPress, server, database, deployment, payment, registration, microphone, or MIDI work belongs in this design.

## 14. Deduplicated references

The following references are numbered once and reused throughout this specification. References [1], [2] and [29] were previously checked in the earlier focused meter review; they are retained sources for simple/compound meter and alla breve, not fresh research in this curriculum-only task. References [11]–[28] are inherited from the original specification as retained audio/platform/accessibility sources, not fresh research for this read-only update. Local repository findings are cited by exact path and line in the companion impact review.

[1]: https://viva.pressbooks.pub/openmusictheory/chapter/simple-meter-and-time-signatures/ "Simple Meter and Time Signatures"

[2]: https://viva.pressbooks.pub/openmusictheory/chapter/compound-meters-and-time-signatures/ "Compound Meter and Time Signatures"

[3]: https://viva.pressbooks.pub/openmusictheory/chapter/notating-rhythm/ "Notating Rhythm"

[4]: https://viva.pressbooks.pub/cmus120emu/chapter/rhythmic-rest-values/ "Rhythmic and Rest Values"

[5]: https://www.musictheory.net/lessons/15 "Simple and Compound Meter"

[29]: https://pianote.com/blog/cut-time/ "Understanding Cut Time (Alla Breve)"

[6]: https://raw.githubusercontent.com/0xfe/vexflow/master/src/voice.ts "VexFlow source — Voice"

[7]: https://raw.githubusercontent.com/0xfe/vexflow/master/src/stavetie.ts "VexFlow source — StaveTie"

[8]: https://raw.githubusercontent.com/0xfe/vexflow/master/src/beam.ts "VexFlow source — Beam"

[9]: https://raw.githubusercontent.com/0xfe/vexflow/master/src/stavenote.ts "VexFlow source — StaveNote"

[10]: https://github.com/0xfe/vexflow "VexFlow official repository"

[11]: https://www.w3.org/TR/webaudio-1.1/ "Web Audio API 1.1"

[12]: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Advanced_techniques "Advanced techniques: Creating and sequencing audio"

[13]: https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API "Page Visibility API"

[14]: https://developer.mozilla.org/en-US/docs/Web/API/AudioContext "AudioContext"

[15]: https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay "Autoplay guide for media and Web Audio APIs"

[16]: https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/currentTime "BaseAudioContext: currentTime property"

[17]: https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/getOutputTimestamp "AudioContext: getOutputTimestamp() method"

[18]: https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/baseLatency "AudioContext: baseLatency property"

[19]: https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/outputLatency "AudioContext: outputLatency property"

[20]: https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/AudioContext "AudioContext: AudioContext() constructor"

[21]: https://developer.mozilla.org/en-US/docs/Web/API/AudioScheduledSourceNode "AudioScheduledSourceNode"

[22]: https://developer.mozilla.org/en-US/docs/Web/API/Element/pointercancel_event "Element: pointercancel event"

[23]: https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/repeat "KeyboardEvent: repeat property"

[24]: https://www.w3.org/WAI/WCAG21/Understanding/pointer-cancellation.html "Understanding Success Criterion 2.5.2: Pointer Cancellation"

[25]: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html "Understanding Success Criterion 2.5.8: Target Size (Minimum)"

[26]: https://www.w3.org/WAI/ARIA/apg/patterns/button/ "Button Pattern"

[27]: https://www.w3.org/TR/pointerevents4/ "Pointer Events Level 4"

[28]: https://developer.chrome.com/blog/autoplay/ "Autoplay policy in Chrome"

**Read-only platform evidence used for implementation facts:** the current snapshot and area findings in `/home/ubuntu/six-meter-review/`, plus `/home/ubuntu/rhythm-training-design/current-source-context.md` as historical platform API context; and `/home/ubuntu/upload/pasted_content_4.txt` as the historical six-meter request and `/home/ubuntu/upload/pasted_content_5.txt` as the current authoritative six-Level-plus-Bonus/seven-meter curriculum request. These local context files are not product dependencies; the application source was consulted read-only.

## 15. Approval record and implementation gate

The following status record preserves prior decisions and technical boundaries; it is not a request to re-approve settled decisions or authorization to implement. D-07 is an approved curriculum decision; Tap timing implementation details remain open as listed in Section 13.

1. The canonical-to-SVG seven-meter gate is implemented, with historical prior 565-test evidence (not a new test run). Generator policies remain four-meter/eight-legacy-level; Tap/audio/UI are inactive and the catalog remains Coming Soon.
2. Six ordered Levels plus optional Bonus 2/2 and the D-07 curriculum placement are owner-approved. Level 1 and Level 2 use Multiple Choice and Listen & Identify only; Tap begins at Level 3. See [Decision Review, D-07](./Decision-Review.md).
3. The seven-meter PPQ480 contract and pulse definitions remain fixed: 2/4=960/480 quarter, 3/4=1440/480 quarter, 4/4=1920/480 quarter, 3/8=720/240 eighth with three technical pulses, 6/8=1440/720 dotted-quarter with 3+3, 9/8=2160/720 dotted-quarter with 3+3+3, and 2/2=1920/960 half; do not infer pulse from numerator.
4. Retain one canonical derived segment timeline for validation, notation, audio, counting, and onset targets; reject duration/tick mismatches and invalid measures.
5. Retain tie groups as contiguous note segments with one attack at the first segment only; a tied continuation is never an attack, click, or Tap target.
6. Retain the four local exercise kinds under only the shared Free and Challenge session wrappers; do not add a shared session-mode union, partial credit, per-tap shared score, capability plugin, or generalized difficulty framework.
7. Preserve +10 for a correct and +0 for an incorrect completed exercise, once; replay/retry cannot rescore. The Tap rule mapping timing performance to correct/incorrect points remains open with the timing criteria.
8. Tap Rhythm is onset-only. It uses actual tap timestamps versus expected onsets and ordered one-to-one matching, and requires separate Timing Accuracy (%) reporting. Do not conflate it with Exercise Points or shared `accuracy`/`averageResponseTimeMs`; formula, windows, and grades are not approved. No microphone, MIDI, or hold-duration claim.
9. Duration-aware listening with rests and tie-chain sustain/release remains a technical design requirement/proposal, not a claim of active audio implementation.
10. Retain the existing Web Audio currentTime scheduling/clock-mapping architecture and generation/cancellation boundaries; D-07 does not redefine them. Device latency compensation/calibration policy, continuous metronome/reference behavior, count-in/replay limits, timing thresholds and the percentage formula remain open for separate technical specification/approval. Preserve monotonic event-time, one-to-one matching, technical abort/no-penalty and no-rescore invariants; no audio implementation is authorized here.
11. Retain the Vietnamese-first shell-compatible design and Rhythm-owned folder boundary under `client/src/modules/rhythm-training/`, without importing Note Reading internals; this is not UI implementation approval.
12. No shared API change is expected. Future catalog/route/static-manifest activation requires separate implementation approval, all four kinds, real content, testing, browser/device checks, and the V1 release gate.
13. Level 6 music semantics and all three presentation decisions remain APPROVED; do not ask again. Leave Chord Recognition and the Rhythm catalog unchanged. No source/dependency/schema/Git-history/configuration/WordPress/deployment changes are authorized. Historical test results are not new test passes.

**Recorded decisions:** the product owner has APPROVED the Level 6 music convention and all three presentation policies, and approved D-07 on 2026-11-11; see [Decision Review](./Decision-Review.md). Preserve product/runtime boundaries: no source/audio/UI/route activation or deployment in this documentation-only task.
