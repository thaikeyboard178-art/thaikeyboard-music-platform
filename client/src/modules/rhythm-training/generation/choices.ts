import type { RhythmPattern } from "../types";
import { requireValidRhythmPattern } from "../rhythm/validate";
import {
  assertLevelConstraints,
  generateRhythmPattern,
  type RhythmGenerationConfig,
} from "./generator";
import { createSeededRandom, seededShuffle } from "./random";
import { policyForLevel } from "./levels";
import { notationSignature } from "../rhythm/signatures";
import {
  answerSignatures,
  choiceRejectionReason,
  type ChoiceRejection,
  type RhythmAnswerSignatures,
  type RhythmDiscrimination,
} from "./answerSignatures";

export type RhythmChoice = Readonly<{
  id: string;
  canonicalIdentity: string;
  pattern: RhythmPattern;
  signatures: RhythmAnswerSignatures;
}>;
export type RhythmChoiceSet = Readonly<{
  seed: string;
  target: RhythmPattern;
  correctOptionId: string;
  correctCanonicalIdentity: string;
  choices: readonly RhythmChoice[];
  evidence: Readonly<{
    attemptedCandidates: number;
    rejectedCandidates: Readonly<
      Partial<Record<ChoiceRejection | "level-constraints", number>>
    >;
  }>;
}>;
export class InsufficientDistinctChoicesError extends Error {
  constructor(
    readonly requested: number,
    readonly available: number,
    readonly attempts: number
  ) {
    super(
      `Cannot form ${requested} distinct rhythm choices: only ${available} were found in ${attempts} candidates`
    );
    this.name = "InsufficientDistinctChoicesError";
  }
}
function validateOptions(count: number, discrimination: RhythmDiscrimination) {
  if (![2, 3, 4].includes(count))
    throw new RangeError("Choice count must be2,3 or4");
  if (discrimination !== "sounding" && discrimination !== "onsets")
    throw new RangeError("Unsupported choice discrimination policy");
}

// A deterministic selection seam accepts an explicit candidate pool for
// canonical fixtures/regressions. Invalid/equivalent candidates never become
// filler options. No grading/session/mode behavior belongs here.
export function selectRhythmChoices(
  targetInput: unknown,
  candidates: readonly unknown[],
  options: Readonly<{
    seed: string;
    count?: 2 | 3 | 4;
    discrimination?: RhythmDiscrimination;
  }>
): RhythmChoiceSet {
  const count = options.count ?? 4;
  const discrimination = options.discrimination ?? "sounding";
  validateOptions(count, discrimination);
  const random = createSeededRandom(options.seed);
  const target = requireValidRhythmPattern(targetInput);
  const selected: RhythmPattern[] = [target];
  const rejected: Partial<Record<ChoiceRejection, number>> = {};
  let attemptedCandidates = 0;
  for (const input of candidates) {
    if (selected.length === count) break;
    attemptedCandidates++;
    let reason: ChoiceRejection | null = null;
    for (const existing of selected) {
      reason = choiceRejectionReason(existing, input, discrimination);
      if (reason !== null) break;
    }
    if (reason !== null) {
      rejected[reason] = (rejected[reason] ?? 0) + 1;
      continue;
    }
    selected.push(requireValidRhythmPattern(input));
  }
  if (selected.length !== count)
    throw new InsufficientDistinctChoicesError(
      count,
      selected.length,
      attemptedCandidates
    );
  const choices = selected.map((pattern, index) =>
    Object.freeze({
      id: `option-${index + 1}`,
      canonicalIdentity: notationSignature(pattern),
      pattern,
      signatures: answerSignatures(pattern),
    })
  );
  return Object.freeze({
    seed: options.seed,
    target,
    correctOptionId: choices[0].id,
    correctCanonicalIdentity: notationSignature(target),
    choices: Object.freeze(seededShuffle(choices, random)),
    evidence: Object.freeze({
      attemptedCandidates,
      rejectedCandidates: Object.freeze(rejected),
    }),
  });
}

export function generateRhythmChoices(
  config: RhythmGenerationConfig &
    Readonly<{ count?: 2 | 3 | 4; discrimination?: RhythmDiscrimination }>
): RhythmChoiceSet {
  const count = config.count ?? 4;
  const discrimination = config.discrimination ?? "sounding";
  validateOptions(count, discrimination);
  createSeededRandom(config.seed);
  const focus = config.focus ?? policyForLevel(config.level).defaultFocus;
  // A one-bar2/4 dots-only question has only three permitted distinct sound
  // shapes. When the caller leaves meter open, use4/4 for dot/tie questions;
  // explicit smaller contexts still fail closed instead of relaxing vocabulary.
  const levelMeters = policyForLevel(config.level).allowedMeters;
  const defaultMeter =
    config.meter ??
    (count === 4 && (focus === "dots" || focus === "combined")
      ? levelMeters.find(
          meter => meter.numerator === 4 && meter.denominator === 4
        ) ?? levelMeters.at(-1)
      : undefined);
  const generationConfig: RhythmGenerationConfig = {
    seed: config.seed,
    level: config.level,
    ...(defaultMeter !== undefined ? { meter: defaultMeter } : {}),
    ...(config.bars !== undefined ? { bars: config.bars } : {}),
    ...(config.pulseBpm !== undefined ? { pulseBpm: config.pulseBpm } : {}),
    ...(config.focus !== undefined ? { focus: config.focus } : {}),
  };
  const target = generateRhythmPattern({
    ...generationConfig,
    seed: `${config.seed}/target`,
  });
  // Lock meter/tempo/bars selected by the target so none of those can act as a
  // trivial distractor cue. Vocabulary and pedagogical focus remain unchanged.
  const fixed = {
    ...generationConfig,
    meter: target.meter,
    pulseBpm: target.tempo.pulseBpm,
    bars: target.measures.length as 1 | 2,
  };
  const selected: RhythmPattern[] = [target];
  const rejected: Partial<
    Record<ChoiceRejection | "level-constraints", number>
  > = {};
  let attemptedCandidates = 0;
  const limit = 256;
  for (let attempt = 0; attempt < limit && selected.length < count; attempt++) {
    attemptedCandidates++;
    const candidate = generateRhythmPattern({
      ...fixed,
      seed: `${config.seed}/candidate/${attempt}`,
    });
    try {
      assertLevelConstraints(candidate, fixed);
    } catch {
      rejected["level-constraints"] = (rejected["level-constraints"] ?? 0) + 1;
      continue;
    }
    const reason = selected
      .map(existing =>
        choiceRejectionReason(existing, candidate, discrimination)
      )
      .find(item => item !== null);
    if (reason) {
      rejected[reason] = (rejected[reason] ?? 0) + 1;
      continue;
    }
    selected.push(candidate);
  }
  if (selected.length !== count)
    throw new InsufficientDistinctChoicesError(
      count,
      selected.length,
      attemptedCandidates
    );
  const choices = selected.map((pattern, index) =>
    Object.freeze({
      id: `option-${index + 1}`,
      canonicalIdentity: notationSignature(pattern),
      pattern,
      signatures: answerSignatures(pattern),
    })
  );
  return Object.freeze({
    seed: config.seed,
    target,
    correctOptionId: choices[0].id,
    correctCanonicalIdentity: notationSignature(target),
    choices: Object.freeze(
      seededShuffle(choices, createSeededRandom(`${config.seed}/order`))
    ),
    evidence: Object.freeze({
      attemptedCandidates,
      rejectedCandidates: Object.freeze(rejected),
    }),
  });
}
