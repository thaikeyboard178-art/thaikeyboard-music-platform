import { readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const moduleRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const projectRoot = resolve(moduleRoot, "../../../..");
function sourceFiles(folder: string): string[] {
  return readdirSync(folder, { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory()
      ? sourceFiles(resolve(folder, entry.name))
      : /\.tsx?$/.test(entry.name)
        ? [resolve(folder, entry.name)]
        : []
  );
}
const isUi = (path: string) =>
  ["pages", "components", "ui"].some(folder =>
    path.startsWith(`${moduleRoot}/${folder}/`)
  );
const isTest = (path: string) => /\.test\.tsx?$/.test(path);

describe("Phase1 core isolation with explicitly approved Phase5 UI integration", () => {
  it("retains core import boundaries and permits only explicit learner UI dependencies", () => {
    for (const path of sourceFiles(moduleRoot)) {
      const text = readFileSync(path, "utf8");
      const imports = [
        ...text.matchAll(/(?:from\s+|import\s*\()(["'])([^"']+)\1/g),
      ].map(match => match[2]);
      for (const specifier of imports) {
        if (specifier.startsWith("."))
          expect(
            resolve(dirname(path), specifier).startsWith(`${moduleRoot}/`)
          ).toBe(true);
        else
          expect(
            specifier === "zod" ||
              specifier === "vexflow" ||
              specifier === "vitest" ||
              specifier === "@/features/training/session" ||
              specifier.startsWith("node:") ||
              (isUi(path) &&
                [
                  "react",
                  "lucide-react",
                  "wouter",
                  "wouter/memory-location",
                  "@/app/TrainingShell",
                  "@testing-library/react",
                  "@testing-library/user-event",
                ].includes(specifier))
          ).toBe(true);
      }
    }
  });
  it("confines approved JSX to learner UI and playback/timer scheduling to audio or UI observation", () => {
    const production = sourceFiles(moduleRoot).filter(path => !isTest(path));
    for (const path of production) {
      if (path.endsWith(".tsx")) expect(isUi(path)).toBe(true);
      if (!path.startsWith(`${moduleRoot}/audio/`) && !isUi(path))
        expect(readFileSync(path, "utf8")).not.toMatch(
          /\bAudioContext\b|\bsetTimeout\s*\(|\bsetInterval\s*\(|\brequestAnimationFrame\s*\(/
        );
    }
  });
  it("keeps audio independent of shared scoring, frontend and Note Reading", () => {
    for (const path of sourceFiles(resolve(moduleRoot, "audio")).filter(
      path => !isTest(path)
    ))
      expect(readFileSync(path, "utf8")).not.toMatch(
        /features\/training|note-reading|submitSessionAnswer|submitRhythmExerciseAnswer|navigator\.mediaDevices|speechSynthesis/
      );
  });
  it("binds only the approved real Rhythm page and retains Chord metadata-only Coming Soon", () => {
    const catalog = readFileSync(
      resolve(projectRoot, "client/src/app/moduleRegistry.ts"),
      "utf8"
    );
    const entry = catalog.split('id: "rhythm-training",')[1].split("},")[0];
    expect(entry).toContain('status: "active"');
    expect(entry).toContain('path: "/rhythm-training"');
    expect(entry).toContain("rhythm-training/pages/RhythmTrainingPage");
    const chord = catalog.split('id: "chord-recognition",')[1].split("},")[0];
    expect(chord).toContain('status: "coming-soon"');
    expect(chord).not.toMatch(/\b(?:path|Page)\s*:/);
    const manifest = JSON.parse(
      readFileSync(
        resolve(projectRoot, "client/public/manus-routes.json"),
        "utf8"
      )
    );
    expect(
      manifest.routes.map((route: { path: string }) => route.path)
    ).toEqual(["/", "/note-reading", "/rhythm-training"]);
  });
  it("never implements a second input clock, matching or FormulaB inside the learner UI", () => {
    for (const path of sourceFiles(moduleRoot).filter(
      path => isUi(path) && !isTest(path)
    )) {
      const text = readFileSync(path, "utf8");
      expect(text).not.toMatch(
        /new\s+(?:AudioContext|NativeTapCapture|OutputClockBridge)\b|performance\.now\s*\(|getOutputTimestamp\s*\(|matchTapRhythm\s*\(|createTapTargets\s*\(/
      );
      expect(text).not.toMatch(
        /localStorage|indexedDB|mediaDevices|speechSynthesis|note-reading\//
      );
    }
  });
});
