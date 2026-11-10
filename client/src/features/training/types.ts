import type { z } from "zod";
import type { TrainingSession } from "./session";

export type ExerciseMode = "free" | "challenge" | "speed" | "daily";
export type TrainingDifficulty = "beginner" | "intermediate" | "advanced";

export type TrainingResult = {
  sessionId: string;
  moduleId: string;
  mode: ExerciseMode;
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  accuracy: number;
  totalScore: number;
  averageResponseTimeMs: number;
  startedAt: number;
  completedAt: number;
};

export type TrainingExercise<TData = unknown> = {
  id: string;
  data: TData;
};

export type TrainingModule<TConfig, TExercise, TAnswer, TResult = TrainingResult | null> = {
  id: string;
  name: string;
  description: string;
  configSchema?: z.ZodType<TConfig>;
  generateExercise: (config: TConfig, random?: () => number) => TExercise;
  validateAnswer: (exercise: TExercise, answer: TAnswer) => boolean;
  createResult: (session: TrainingSession<TExercise>) => TResult;
  difficulties: readonly TrainingDifficulty[];
};
