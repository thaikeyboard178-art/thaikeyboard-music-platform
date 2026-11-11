export type {
  RhythmMeter,
  WrittenDuration,
  RhythmSegment,
  RhythmMeasure,
  RhythmPattern,
  SegmentPosition,
  SoundingSpan,
  RhythmLevel,
  RhythmTrack,
  RhythmExerciseKind,
} from "./types";
export { PPQ, durationToTicks } from "./rhythm/durations";
export {
  deriveMeter,
  deriveMeterStructure,
  ticksToSeconds,
} from "./rhythm/meters";
export type {
  MeterInfo,
  MeterStructure,
  StructuralAccent,
} from "./rhythm/meters";
export {
  validateRhythmPattern,
  requireValidRhythmPattern,
  RhythmValidationError,
} from "./rhythm/validate";
export type { RhythmValidationResult, RhythmIssue } from "./rhythm/validate";
export { deriveRhythmTimeline } from "./rhythm/deriveTimeline";
export type { RhythmTimeline } from "./rhythm/deriveTimeline";
export {
  notationSignature,
  onsetSignature,
  soundingSignature,
} from "./rhythm/signatures";
export {
  generateRhythmPattern,
  assertLevelConstraints,
  patternMetrics,
} from "./generation/generator";
export type { RhythmGenerationConfig } from "./generation/generator";
export { LEVEL_POLICIES, BONUS_POLICY, policyForLevel } from "./generation/levels";
export type {
  RhythmFocus,
  LevelPolicy,
} from "./generation/levels";
export {
  answerSignatures,
  choiceRejectionReason,
} from "./generation/answerSignatures";
export type {
  RhythmAnswerSignatures,
  RhythmDiscrimination,
  ChoiceRejection,
} from "./generation/answerSignatures";
export {
  generateRhythmChoices,
  selectRhythmChoices,
  InsufficientDistinctChoicesError,
} from "./generation/choices";
export type { RhythmChoice, RhythmChoiceSet } from "./generation/choices";
export {
  RHYTHM_CURRICULUM,
  getRhythmCurriculum,
  getCurriculumUnit,
  isExerciseKindAllowed,
  requireExerciseKindAllowed,
} from "./curriculum/curriculum";
export type {
  CurriculumSection,
  CurriculumLesson,
  RhythmCurriculumUnit,
  MultipleChoiceFocus,
  CountBeatFocus,
} from "./curriculum/curriculum";
export {
  generateMultipleChoiceExercise,
  evaluateMultipleChoice,
} from "./exercises/multipleChoice";
export type {
  MultipleChoiceOption,
  MultipleChoiceExercise,
  MultipleChoiceAnswer,
  MultipleChoiceEvaluation,
} from "./exercises/multipleChoice";
export {
  generateCountBeatExercise,
  evaluateCountBeatAnswer,
} from "./exercises/countBeat";
export type {
  CountBeatExercise,
  CountBeatPosition,
  CountBeatEvent,
  CountBeatSemantics,
  CountBeatAnswer,
  CountBeatEvaluation,
} from "./exercises/countBeat";
export {
  createRhythmTrainingSession,
  submitRhythmExerciseAnswer,
} from "./exercises/scoring";
export type {
  RhythmGradedExercise,
  RhythmTrainingSession,
  RhythmSubmissionResult,
} from "./exercises/scoring";
export { projectRhythmNotation } from "./notation/projection";
export type { ImmutableRhythmNotationProjection } from "./notation/projection";
export {
  renderRhythmNotation,
  RhythmNotationRenderError,
} from "./notation/VexFlowRhythm";
export type {
  RhythmNotationRenderResult,
  RhythmNotationRenderOptions,
  RhythmNotationParityReport,
} from "./notation/VexFlowRhythm";
export {
  createRhythmAudioPlan,
  createListenPlaybackPlan,
} from "./audio/plan";
export type {
  AudioLane,
  RhythmAudioEvent,
  RhythmAudioPlan,
} from "./audio/plan";
export { scheduleRhythmVoice, validateVoiceSettings } from "./audio/voices";
export type { RhythmVoiceSettings, RhythmVoiceHandle } from "./audio/voices";
export { RhythmAudioTransport } from "./audio/transport";
export type {
  RhythmPlaybackState,
  RhythmAudioAbortReason,
  RhythmScheduledEvent,
  RhythmReferenceTiming,
  RhythmTransportOptions,
} from "./audio/transport";
export type { RhythmVisualCount } from "./audio/plan";
