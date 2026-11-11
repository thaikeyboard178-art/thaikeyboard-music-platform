import { describe, expect, it } from "vitest";
import { CROSS_BAR_TIE } from "../rhythm/fixtures";
import { assertLevelConstraints } from "./generator";

describe("level policy tie boundary", () => {
  it("rejects a canonical cross-bar tie at Level 5 while allowing it at Level 4", () => {
    const pattern = { ...CROSS_BAR_TIE, tempo: { pulseBpm: 80 } };
    const config = {
      seed: "cross-bar-policy",
      meter: pattern.meter,
      bars: 2 as const,
      pulseBpm: 80,
      focus: "ties" as const,
    };
    expect(() =>
      assertLevelConstraints(pattern, { ...config, level: 5 })
    ).toThrow(/Cross-bar ties are not enabled/);
    expect(() =>
      assertLevelConstraints(pattern, { ...config, level: 4 })
    ).not.toThrow();
  });
});
