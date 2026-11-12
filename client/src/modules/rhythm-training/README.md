# Rhythm Training V1


> **Current owner-approved policy (2026-11-12):** The active mapping is L1 basic notes/rests; L2 eighth/binary subdivision; L3 merged simple-meter material plus dots/ties/mixed durations; L4 sixteenths/subdivision; L5 controlled complex combinations; L6 3/8, 6/8, 9/8; optional Bonus 2/2 unchanged. For X/8, each eighth is the 240-tick technical pulse for BPM/counting (3/6/9 per bar), distinct from unchanged grouping/accent/beaming; 6/8 and 9/8 use exact independent 720-tick groups. Tap BPM is 30–300 and changeable only while idle before Play. Tap and visual-only Quiz have a separate chooser; Quiz uses unique eligible question IDs and four A–D choices mapped by option ID. Tap earns a completed graded award of `roundHalfUp(10 × TimingAccuracyPercent / 100)` (integer 0–10) in one cumulative in-memory session; confirmed graded Skip deducts 5 once with a zero floor, while Practice/replay Skip is penalty-free. This replaces the former fixed Tap award only; other callers retain +10/+0. See [Decision Review](docs/Decision-Review.md) and [current curriculum](docs/Curriculum-V1.md). This is approved policy, not an implementation/test/physical listening claim; human browser/device/headphone listening has not been performed.

Rhythm Training is registered at **`/rhythm-training`** by `client/src/app/moduleRegistry.ts` and listed in `client/public/manus-routes.json`. Its page entry is `pages/RhythmTrainingPage.tsx`. The two learner-facing activities are **Tap Rhythm** and an independent, visual-only **Rhythm Quiz**. Quiz is an in-page screen implemented by `pages/RhythmQuizScreen.tsx`, not a separate `/rhythm-quiz` route; it uses notation/choice questions and requires neither audio nor tapping. There is no Lesson, Listen & Identify, or Count the Beat user flow.

Tap is presented for Levels 1–6 and optional Bonus 2/2, using the approved level vocabulary. The page provides setup, practice, and result screens. The current approved pulse policy is quarter-note pulses for 2/4–4/4, eighth-note pulses for all X/8 meters (240 ticks; 3/6/9 per bar), and half-note pulses for 2/2 (960 ticks; 2 per bar). Defaults are 100 BPM for X/4 and 2/2, 180 BPM for all X/8 meters; the global range is 30–300 BPM. Musical grouping remains 6/8 `3+3` and 9/8 `3+3+3`, independently of technical pulse.

## Source map

- `curriculum/curriculum.ts` and `generation/levels.ts`: level vocabulary and generation policies.
- `rhythm/meters.ts`, `rhythm/validate.ts`, `rhythm/deriveTimeline.ts`: canonical meter pulses, exact tick validation, and derived event timing.
- `generation/generator.ts` and `exercises/tapRhythm.ts`: generated rhythm patterns and Tap targets.
- `exercises/tapMatcher.ts`: ordered one-to-one primary matching, residual far-tap diagnostic association, Early/Late/Missing/Extra classifications, and Formula B timing accuracy.
- `audio/transport.ts`, `audio/tapClock.ts`, `audio/tapInput.ts`, and `audio/tapEngine.ts`: browser audio scheduling, clock mapping, input capture, collection, and attempt lifecycle.
- `notation/` and `components/`: rendered rhythm notation and the Tap page's visual controls/results.
- `quiz/questionBank.ts`, `quiz/session.ts`, and `pages/RhythmQuizScreen.tsx`: visual Quiz items, per-level selection, answer flow, and summary.

Formula B, T2-B, approved matching, clock/capture, collection/drain, and marker rules are specified in [the approved owner decisions](docs/Tap-Rhythm-V1-Phase-4A.2-Owner-Decisions.md); the current Tap point award/replay/Skip rules are in [Decision Review](docs/Decision-Review.md). Non-Tap callers retain shared `+10/+0` scoring. Quiz question count and assessment quotas are implementation/configuration details, not owner-approved policy; no quota change is approved. See also [active curriculum decisions](docs/Curriculum-V1.md), [decision review](docs/Decision-Review.md), [meter and notation requirements](docs/Meter-and-Notation-Requirements.md), and [generation and assessment requirements](docs/Generation-and-Assessment-Requirements.md). Older long-form sections remain historical where they conflict with these active decisions.

## Project checks

From the repository root, the available project check commands are:

```bash
pnpm check
pnpm test
pnpm build:static
pnpm build
```

These commands are listed separately from feature descriptions. This README does not claim a current test pass or physical browser/device audio validation.
