import type { TrainingModule } from "@/features/training/types";
import { toTrainingResult } from "@/features/training/session";
import { noteReadingConfigurationSchema } from "./configuration";
import { generateExercise, validateNoteAnswer } from "./services/exercises";
import type { NoteAnswer, NoteExercise, NoteReadingConfiguration } from "./types";

export const noteReadingModule: TrainingModule<NoteReadingConfiguration, NoteExercise, NoteAnswer> = {
  id: "note-reading",
  name: "Đọc nốt nhạc",
  description: "Nhận diện nốt trên khuông với khóa Sol và khóa Fa.",
  configSchema: noteReadingConfigurationSchema,
  generateExercise: (configuration, random) => generateExercise({
    clef: configuration.clef,
    range: configuration.range,
    ledgerRange: configuration.ledgerRange,
    exerciseId: `note-${Date.now()}`,
    index: 1,
  }, random),
  validateAnswer: (exercise, answer) => validateNoteAnswer(exercise.note, answer),
  createResult: (session) => toTrainingResult(session),
  difficulties: ["beginner", "intermediate", "advanced"],
};
