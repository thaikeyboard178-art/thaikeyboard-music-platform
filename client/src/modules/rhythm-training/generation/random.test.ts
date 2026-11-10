import { describe, expect, it } from "vitest";
import { createSeededRandom, seededShuffle } from "./random";

describe("seeded rhythm randomness", () => {
  it("replays the exact stream for the same seed and varies a changed seed", () => {
    const left = createSeededRandom("alpha");
    const right = createSeededRandom("alpha");
    const changed = createSeededRandom("beta");
    const first = Array.from({ length: 24 }, () => left());
    const second = Array.from({ length: 24 }, () => right());
    const third = Array.from({ length: 24 }, () => changed());
    expect(second).toEqual(first);
    expect(third).not.toEqual(first);
    expect(first.every(value => value >= 0 && value < 1)).toBe(true);
  });

  it("shuffles a copy without changing the input", () => {
    const input = [1, 2, 3, 4, 5] as const;
    const output = seededShuffle(input, createSeededRandom("shuffle"));
    expect(input).toEqual([1, 2, 3, 4, 5]);
    expect(output).toHaveLength(input.length);
    expect([...output].sort()).toEqual([...input]);
    expect(output).toEqual(seededShuffle(input, createSeededRandom("shuffle")));
  });

  it("rejects an empty seed at the deterministic boundary", () => {
    expect(() => createSeededRandom("")).toThrow(RangeError);
  });
});
