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

describe("Phase1 scope boundaries", () => {
  it("imports only this module and existing schema/test/node utilities", () => {
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
              specifier.startsWith("node:")
          ).toBe(true);
      }
    }
  });
  it("contains no UI or playback runtime implementation", () => {
    const production = sourceFiles(moduleRoot).filter(
      path => !path.endsWith(".test.ts")
    );
    expect(production.some(path => path.endsWith(".tsx"))).toBe(false);
    for (const path of production)
      expect(readFileSync(path, "utf8")).not.toMatch(
        /\bAudioContext\b|\bsetTimeout\s*\(|\bsetInterval\s*\(|\brequestAnimationFrame\s*\(/
      );
  });
  it("retains metadata-only Coming Soon and no Rhythm page binding", () => {
    const catalog = readFileSync(
      resolve(projectRoot, "client/src/app/moduleRegistry.ts"),
      "utf8"
    );
    const entry = catalog.split('id: "rhythm-training",')[1].split("},")[0];
    expect(entry).toContain('status: "coming-soon"');
    expect(entry).not.toMatch(/\b(?:path|Page)\s*:/);
    const manifest = JSON.parse(
      readFileSync(
        resolve(projectRoot, "client/public/manus-routes.json"),
        "utf8"
      )
    );
    expect(
      manifest.routes.map((route: { path: string }) => route.path)
    ).toEqual(["/", "/note-reading"]);
  });
});
