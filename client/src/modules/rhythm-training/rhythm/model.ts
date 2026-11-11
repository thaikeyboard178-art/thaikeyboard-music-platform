import { z } from "zod";

const identifier = z
  .string()
  .min(1)
  .refine(
    value => value.trim() === value && !/\s/.test(value),
    "Identifiers must be nonempty and contain no whitespace"
  );

export const writtenDurationSchema = z
  .object({
    denominator: z.union([
      z.literal(1),
      z.literal(2),
      z.literal(4),
      z.literal(8),
      z.literal(16),
    ]),
    dots: z.union([z.literal(0), z.literal(1)]),
  })
  .strict();

export const rhythmMeterSchema = z.union([
  z.object({ numerator: z.literal(2), denominator: z.literal(4) }).strict(),
  z.object({ numerator: z.literal(3), denominator: z.literal(4) }).strict(),
  z.object({ numerator: z.literal(4), denominator: z.literal(4) }).strict(),
  z.object({ numerator: z.literal(3), denominator: z.literal(8) }).strict(),
  z.object({ numerator: z.literal(6), denominator: z.literal(8) }).strict(),
  z.object({ numerator: z.literal(9), denominator: z.literal(8) }).strict(),
  z.object({ numerator: z.literal(2), denominator: z.literal(2) }).strict(),
]);

// Optional import caches are checked and removed by validateRhythmPattern.
// They are never authoring authorities and never survive canonical normalization.
export const rhythmPatternInputSchema = z
  .object({
    id: identifier,
    meter: rhythmMeterSchema,
    tempo: z.object({ pulseBpm: z.number().finite().positive() }).strict(),
    measures: z
      .array(
        z
          .object({
            id: identifier,
            segments: z
              .array(
                z
                  .object({
                    id: identifier,
                    kind: z.enum(["note", "rest"]),
                    duration: writtenDurationSchema,
                    tieGroupId: identifier.optional(),
                    accent: z.enum(["normal", "strong"]).optional(),
                    articulation: z
                      .enum(["ordinary", "staccato", "tenuto"])
                      .optional(),
                    ticks: z.number().int().positive().optional(),
                    onset: z.boolean().optional(),
                  })
                  .strict()
              )
              .min(1),
          })
          .strict()
      )
      .min(1),
  })
  .strict();
