import { z } from "zod";
import { ledgerRangeSchema } from "./services/preferences";

export const noteReadingConfigurationSchema = z.object({
  clef: z.enum(["treble", "bass", "mixed"]),
  range: z.enum(["staff", "one-ledger", "extended"]),
  mode: z.enum(["free", "challenge", "speed", "daily"]),
  answerMethod: z.enum(["multiple-choice", "piano"]),
  questionCount: z.union([z.literal(10), z.literal(20), z.literal(30), z.literal(50)]),
  speedLimitSeconds: z.union([z.null(), z.literal(3), z.literal(5), z.literal(8)]),
  challengeDate: z.iso.date(),
  ledgerRange: ledgerRangeSchema.optional(),
  autoAdvance: z.boolean().optional(),
});
