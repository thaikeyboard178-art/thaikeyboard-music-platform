# Chord theory core

`qualityCatalog.ts` is the authoritative 21-quality formula catalog. `spelling.ts` preserves diatonic letter function (including double accidentals) separately from pitch class. `createChord` keeps root, quality intervals, and chord tones distinct from a slash bass; its actual-pitch list includes a slash bass at the bass register. Inversions rotate chord members into strictly ascending MIDI pitches without changing the structure or root.

`eligibleQualities` is cumulative by curriculum level. Generation schedules the selected tier before earlier material, so each generated chunk begins with selected-level content and does not silently fall back. The generator uses a 30-question initial chunk for `questionCount: null`, validates its inputs, and caps explicit chunks at 10,000 questions.

Choice order is deterministically shuffled, quality distractors are filtered by pitch-class equivalence, and the generator throws a capacity error rather than repeating the immediately preceding pitch set. Augmented triads and fully diminished sevenths are generated only in root position because their pitch-class sets are symmetric under inversion. Full-name alternatives use the same root and exclude pitch-class-equivalent structures; the available `ChordQuestion` contract has no separate root-disambiguation hint field.

Suggested Piano Voicing remains separate from chord structure. It preserves the C Major, Cm9, and Cm9/G reference cases; when an extended slash voicing would otherwise span more than 19 semitones, it may fold a selected tone by an octave without changing its spelling or omitting the root from RH when LH bass differs from root. These voicings are suggestions, not unique required realizations.
