import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import { Music2, Waves, Layers3, type LucideIcon } from "lucide-react";

type ModuleMetadata = {
  readonly id: string;
  readonly name: string;
  readonly englishName: string;
  readonly navLabel: string;
  readonly description: string;
  readonly tags: readonly string[];
  readonly Icon: LucideIcon;
};

export type ActiveModuleRegistration = ModuleMetadata & {
  readonly status: "active";
  readonly path: string;
  readonly Page: LazyExoticComponent<ComponentType>;
};

export type ComingSoonModuleRegistration = ModuleMetadata & {
  readonly status: "coming-soon";
  readonly path?: never;
  readonly Page?: never;
};

export type ModuleRegistration =
  | ActiveModuleRegistration
  | ComingSoonModuleRegistration;

// An explicit source catalog, not a plugin/discovery system. Inactive entries
// cannot bind pages or routes and never implement dummy TrainingModule methods.
export function defineModuleCatalog(
  entries: readonly ModuleRegistration[]
): readonly ModuleRegistration[] {
  const ids = new Set<string>();
  const paths = new Set<string>();
  for (const entry of entries) {
    const id = entry.id;
    if (!/^[a-z][a-z0-9-]*$/.test(entry.id) || ids.has(entry.id)) {
      throw new Error(`Invalid or duplicate module id: ${entry.id}`);
    }
    ids.add(entry.id);
    if (entry.status === "active") {
      if (
        !/^\/[a-z0-9-]+(?:\/[a-z0-9-]+)*$/.test(entry.path) ||
        paths.has(entry.path) ||
        !entry.Page
      ) {
        throw new Error(
          `Invalid or duplicate active module route: ${entry.path}`
        );
      }
      paths.add(entry.path);
    } else if (
      entry.status !== "coming-soon" ||
      entry.path !== undefined ||
      entry.Page !== undefined
    ) {
      throw new Error(
        `Coming Soon modules cannot register pages or routes: ${id}`
      );
    }
  }
  return Object.freeze(
    entries.map(entry =>
      Object.freeze({ ...entry, tags: Object.freeze([...entry.tags]) })
    )
  );
}

const modules = defineModuleCatalog([
  {
    id: "note-reading",
    name: "Đọc nốt nhạc",
    englishName: "Note Reading",
    navLabel: "Đọc nốt",
    description:
      "Luyện nhận diện nốt trên khuông với khóa Sol, khóa Fa và khuông mở rộng.",
    tags: ["Khóa Sol & Fa", "Piano ảo", "Thử thách hằng ngày"],
    Icon: Music2,
    status: "active",
    path: "/note-reading",
    Page: lazy(() => import("@/modules/note-reading/pages/NoteReadingPage")),
  },
  {
    id: "rhythm-training",
    name: "Luyện tiết tấu",
    englishName: "Rhythm Training",
    navLabel: "Tiết tấu",
    description:
      "Thực hành Tap Rhythm theo Level 1–6, luyện Bonus 2/2 tùy chọn và làm Rhythm Quiz.",
    tags: ["Tap Rhythm", "Level 1–6", "Rhythm Quiz", "Bonus 2/2"],
    Icon: Waves,
    status: "active",
    path: "/rhythm-training",
    Page: lazy(
      () => import("@/modules/rhythm-training/pages/RhythmTrainingPage")
    ),
  },
  {
    id: "chord-recognition",
    name: "Nhận diện hợp âm",
    englishName: "Chord Recognition",
    navLabel: "Hợp âm",
    description:
      "Nhận diện hợp âm bằng thị giác và thính giác; tra cứu cấu tạo và cách chơi gợi ý trên Piano.",
    tags: ["Visual Recognition", "Ear Training", "Level 1–6", "Chord Reference"],
    Icon: Layers3,
    status: "active",
    path: "/chord-recognition",
    Page: lazy(() => import("@/modules/chord-recognition/pages/ChordRecognitionPage")),
  },
]);

export function getTrainingModules(): readonly ModuleRegistration[] {
  return modules;
}

export function getActiveTrainingModules(): readonly ActiveModuleRegistration[] {
  return modules.filter(
    (module): module is ActiveModuleRegistration => module.status === "active"
  );
}

export function getTrainingModule(id: string): ModuleRegistration | undefined {
  return modules.find(module => module.id === id);
}
