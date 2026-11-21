import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { defineModuleCatalog, getActiveTrainingModules, getTrainingModule, getTrainingModules, type ModuleRegistration } from "./moduleRegistry";
import { noteReadingModule } from "../modules/note-reading/module";

const active = getActiveTrainingModules()[0];
describe("explicit module catalog", () => {
  it("has three real active modules", () => {
    expect(getTrainingModules().map(({ id, status }) => [id, status])).toEqual([["note-reading", "active"], ["rhythm-training", "active"], ["chord-recognition", "active"]]);
    expect(getActiveTrainingModules().map(({ path }) => path)).toEqual(["/note-reading", "/rhythm-training", "/chord-recognition"]);
    expect(active.id).toBe(noteReadingModule.id);
    for (const module of getTrainingModules().filter((m) => m.status === "coming-soon")) {
      expect("Page" in module).toBe(false);
      expect("path" in module).toBe(false);
      expect("generateExercise" in module).toBe(false);
    }
  });
  it("has safe metadata lookup rather than caller-chosen engine types", () => {
    expect(getTrainingModule("note-reading")?.status).toBe("active");
    expect(getTrainingModule("unknown")).toBeUndefined();
    expect(Object.isFrozen(getTrainingModules())).toBe(true);
  });
  it("rejects duplicate module IDs", () => {
    expect(() => defineModuleCatalog([active, active])).toThrow(/duplicate module id/);
  });
  it("rejects duplicate and invalid active routes", () => {
    expect(() => defineModuleCatalog([active, { ...active, id: "test-module" }])).toThrow(/duplicate active module route/);
    expect(() => defineModuleCatalog([{ ...active, path: "https://example.test" }])).toThrow(/active module route/);
  });
  it("rejects forged Coming Soon page/route bindings at runtime", () => {
    const { Page: _Page, path: _path, ...metadata } = active;
    const future = { ...metadata, id: "future-fixture", status: "coming-soon" as const };
    expect(() => defineModuleCatalog([{ ...future, path: "/fake" } as unknown as ModuleRegistration])).toThrow(/cannot register/);
    expect(() => defineModuleCatalog([{ ...future, Page: active.Page } as unknown as ModuleRegistration])).toThrow(/cannot register/);
  });
  it("supports an additional active registration without changing the router", () => {
    const example = { ...active, id: "test-fixture", path: "/test-fixture", name: "Test fixture" };
    const modules = defineModuleCatalog([active, example]);
    expect(modules.filter((m) => m.status === "active").map((m) => m.path)).toEqual(["/note-reading", "/test-fixture"]);
  });
  it("keeps the static manifest in sync with only real active page routes", () => {
    const manifest = JSON.parse(readFileSync(resolve("client/public/manus-routes.json"), "utf8"));
    expect(manifest.routes.map((r: { path: string }) => r.path)).toEqual(["/", ...getActiveTrainingModules().map((m) => m.path)]);
  });
  it("does not let shared training production code import a module implementation", () => {
    const folder = resolve("client/src/features/training");
    for (const name of readdirSync(folder).filter((n) => /\.tsx?$/.test(n) && !n.includes(".test."))) {
      expect(readFileSync(resolve(folder, name), "utf8")).not.toMatch(/from\s+["'][^"']*modules\//);
    }
  });
});
