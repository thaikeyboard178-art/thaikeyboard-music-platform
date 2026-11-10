import type { RhythmPattern, RhythmSegment } from "../types";
import { durationToTicks } from "./durations";
import { deriveMeter, ticksToSeconds } from "./meters";
import { rhythmPatternInputSchema } from "./model";
import { deriveTieRoles, inspectTies } from "./ties";

export type RhythmIssue = Readonly<{
  code: string;
  path: string;
  message: string;
  expectedTicks?: number;
  actualTicks?: number;
}>;

export type RhythmValidationResult =
  | Readonly<{ valid: true; pattern: RhythmPattern; totalTicks: number }>
  | Readonly<{ valid: false; issues: readonly RhythmIssue[] }>;

export class RhythmValidationError extends Error {
  readonly issues: readonly RhythmIssue[];
  constructor(issues: readonly RhythmIssue[]) {
    super(
      issues
        .map(issue => `${issue.code} at ${issue.path}: ${issue.message}`)
        .join("; ")
    );
    this.name = "RhythmValidationError";
    this.issues = issues;
  }
}

export function validateRhythmPattern(input: unknown): RhythmValidationResult {
  const parsed = rhythmPatternInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      valid: false,
      issues: parsed.error.issues.map(issue => ({
        code: "SCHEMA_INVALID",
        path: issue.path.map(String).join(".") || "pattern",
        message: issue.message,
      })),
    };
  }
  const pattern = parsed.data;
  const meter = deriveMeter(pattern.meter);
  const issues: RhythmIssue[] = [];
  const measureIds = new Set<string>();
  const segmentIds = new Set<string>();
  const flattened: { segment: RhythmSegment; path: string; onset?: boolean }[] =
    [];

  pattern.measures.forEach((measure, measureIndex) => {
    const measurePath = `measures.${measureIndex}`;
    if (measureIds.has(measure.id))
      issues.push({
        code: "DUPLICATE_MEASURE_ID",
        path: `${measurePath}.id`,
        message: "Measure IDs must be unique",
      });
    measureIds.add(measure.id);
    let sum = 0;
    let validDurations = true;
    measure.segments.forEach((segment, segmentIndex) => {
      const path = `${measurePath}.segments.${segmentIndex}`;
      flattened.push({ segment, path, onset: segment.onset });
      if (segmentIds.has(segment.id))
        issues.push({
          code: "DUPLICATE_SEGMENT_ID",
          path: `${path}.id`,
          message: "Segment IDs must be unique throughout the pattern",
        });
      segmentIds.add(segment.id);
      if (
        segment.articulation !== undefined &&
        segment.articulation !== "ordinary"
      )
        issues.push({
          code: "UNSUPPORTED_ARTICULATION",
          path: `${path}.articulation`,
          message: "V1 supports ordinary articulation only",
        });
      if (segment.kind === "rest" && segment.accent === "strong")
        issues.push({
          code: "REST_ACCENT",
          path: `${path}.accent`,
          message: "A silent rest cannot request an accented attack",
        });
      try {
        const ticks = durationToTicks(segment.duration);
        sum += ticks;
        if (segment.ticks !== undefined && segment.ticks !== ticks)
          issues.push({
            code: "CACHED_TICKS_MISMATCH",
            path: `${path}.ticks`,
            message: "Cached ticks disagree with the authoritative duration",
            expectedTicks: ticks,
            actualTicks: segment.ticks,
          });
      } catch (error) {
        validDurations = false;
        issues.push({
          code: "DURATION_UNSUPPORTED",
          path: `${path}.duration`,
          message: error instanceof Error ? error.message : "Invalid duration",
        });
      }
    });
    if (validDurations && sum !== meter.measureTicks)
      issues.push({
        code:
          sum < meter.measureTicks
            ? "MEASURE_UNDERFILLED"
            : "MEASURE_OVERFILLED",
        path: measurePath,
        message: "Every measure must contain exactly its meter capacity",
        expectedTicks: meter.measureTicks,
        actualTicks: sum,
      });
  });

  const segments = flattened.map(item => item.segment);
  const tieIssues = inspectTies(segments).issues;
  for (const issue of tieIssues)
    issues.push({
      code: issue.code,
      path: `${flattened[issue.index].path}.tieGroupId`,
      message: issue.message,
    });
  if (tieIssues.length === 0) {
    const roles = deriveTieRoles(segments);
    for (const item of flattened) {
      const expectedOnset =
        item.segment.kind === "note" &&
        (roles.get(item.segment.id) === "none" ||
          roles.get(item.segment.id) === "start");
      if (item.onset !== undefined && item.onset !== expectedOnset)
        issues.push({
          code: "CACHED_ONSET_MISMATCH",
          path: `${item.path}.onset`,
          message: "Cached onset contradicts rest/tie-derived attack status",
        });
    }
  }
  const totalTicks = meter.measureTicks * pattern.measures.length;
  try {
    if (!Number.isSafeInteger(totalTicks))
      throw new RangeError("Pattern length exceeds safe integer ticks");
    ticksToSeconds(totalTicks, pattern.meter, pattern.tempo.pulseBpm);
  } catch {
    issues.push({
      code: "NONFINITE_TIMELINE",
      path: "tempo",
      message: "Pattern duration cannot be projected to finite seconds",
    });
  }
  if (issues.length > 0) return { valid: false, issues: Object.freeze(issues) };

  const canonical: RhythmPattern = Object.freeze({
    id: pattern.id,
    meter: Object.freeze({ ...pattern.meter }),
    tempo: Object.freeze({ ...pattern.tempo }),
    measures: Object.freeze(
      pattern.measures.map(measure =>
        Object.freeze({
          id: measure.id,
          segments: Object.freeze(
            measure.segments.map(segment =>
              Object.freeze({
                id: segment.id,
                kind: segment.kind,
                duration: Object.freeze({ ...segment.duration }),
                ...(segment.tieGroupId !== undefined
                  ? { tieGroupId: segment.tieGroupId }
                  : {}),
                ...(segment.accent !== undefined
                  ? { accent: segment.accent }
                  : {}),
                ...(segment.articulation !== undefined
                  ? { articulation: segment.articulation }
                  : {}),
              })
            )
          ),
        })
      )
    ),
  });
  return Object.freeze({ valid: true, pattern: canonical, totalTicks });
}

export function requireValidRhythmPattern(input: unknown): RhythmPattern {
  const result = validateRhythmPattern(input);
  if (!result.valid) throw new RhythmValidationError(result.issues);
  return result.pattern;
}
