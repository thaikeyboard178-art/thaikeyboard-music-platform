# Chord Recognition / Chord Training

The real learner page is registered at `/chord-recognition` through the existing application catalog. Visual Recognition and Ear Training have independent configuration and in-memory sessions. Switching methods preserves the other method's current question; reference collapse preserves its independent selectors and the exercise state.

## Source boundaries

`types.ts` defines the immutable canonical data shared by Chord theory, generator, notation and audio. `theory/` owns chord formulae and diatonic spelling, chord-member inversions, slash bass and suggested hand voicings. `curriculum/` owns six complexity levels; `generation/` creates seeded questions and non-equivalent answers. `notation/` renders the actual pitches with VexFlow 5; `components/ChordPiano.tsx` uses the same MIDI pitches with optional note labels. These do not import Note Reading internals.

`audio/playback.ts` owns Melody, Harmony and Both note schedules, a lazy reusable AudioContext, and cancellation. It calls only the existing low-level `scheduleRhythmVoice` helper; it does not use or modify the Rhythm transport, count-in, matcher or scoring. Sound is synthesized, not external MIDI hardware or a claim of sampled concert-piano quality. The initial play is free; replay settings permit 1, 3 or unlimited additional plays.

`practice/` owns answer/skip/stop transitions and basic results. Accuracy is correct divided by answered; skipped, unseen and unanswered questions are not wrong. No score weights, reward, penalty or per-Level final grading is defined. Chord results are local browser records, separate by Visual/Ear and Level. Storage failures do not discard the current result. Recent history is bounded to 50 sessions, with no account/cloud synchronization.

## Suggested voicing

The reference explicitly separates full chord structure from **Cách chơi gợi ý trên Piano / Suggested Piano Voicing**. A suggested voicing is not the only valid way to play a chord. It includes the specified C Major, Cm9 and Cm9/G cases, LH/RH display and audition, note-label toggle, and independently selectable slash bass. Collapsing the reference does not reset a practice session.

## Verification

Run `pnpm test`, `pnpm check`, `pnpm build:static`, `pnpm build` and `git diff --check` from the repository root. The implementation manifest is in `docs/Implementation-Manifest.md`. Automated scheduler/SVG tests do not verify listening quality on physical speakers or Safari/iOS audio behavior; those require device testing.
