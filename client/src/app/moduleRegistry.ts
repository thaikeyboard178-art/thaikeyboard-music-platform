import { noteReadingModule } from "@/modules/note-reading/module";
import type { TrainingDifficulty, TrainingModule } from "@/features/training/types";

export type ModuleMetadata = {
  id: string;
  name: string;
  description: string;
  difficulties: readonly TrainingDifficulty[];
};

const moduleRegistry = new Map<string, object>();

export function registerTrainingModule<TConfig, TExercise, TAnswer, TResult>(module: TrainingModule<TConfig, TExercise, TAnswer, TResult>): void {
  if (moduleRegistry.has(module.id)) throw new Error(`Training module already registered: ${module.id}`);
  moduleRegistry.set(module.id, module);
}

registerTrainingModule(noteReadingModule);

export function getTrainingModule<TConfig = unknown, TExercise = unknown, TAnswer = unknown, TResult = unknown>(
  moduleId: string,
): TrainingModule<TConfig, TExercise, TAnswer, TResult> | undefined {
  return moduleRegistry.get(moduleId) as TrainingModule<TConfig, TExercise, TAnswer, TResult> | undefined;
}

export function getTrainingModules(): ModuleMetadata[] {
  return [...moduleRegistry.values()].map((module) => {
    const value = module as ModuleMetadata;
    return { id: value.id, name: value.name, description: value.description, difficulties: value.difficulties };
  });
}
