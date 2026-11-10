const UINT32_RANGE = 0x1_0000_0000;

/**
 * A small, platform-independent PRNG. It intentionally has no clock or
 * ambient-randomness input: the complete stream is derived from `seed`.
 */
export function createSeededRandom(seed: string): () => number {
  if (typeof seed !== "string" || seed.length === 0) {
    throw new RangeError("A nonempty seed is required.");
  }

  let state = 0x811c9dc5;
  for (let index = 0; index < seed.length; index += 1) {
    state ^= seed.charCodeAt(index);
    state = Math.imul(state, 0x01000193) >>> 0;
  }
  // Avoid the absorbing all-zero state for the xorshift stream.
  if (state === 0) state = 0x9e3779b9;

  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / UINT32_RANGE;
  };
}

/** Return a shuffled copy; the input array is never modified. */
export function seededShuffle<T>(
  items: readonly T[],
  random: () => number
): T[] {
  const output = [...items];
  for (let index = output.length - 1; index > 0; index -= 1) {
    const value = random();
    const bounded = Number.isFinite(value)
      ? Math.min(0.9999999999999999, Math.max(0, value))
      : 0;
    const swapIndex = Math.floor(bounded * (index + 1));
    [output[index], output[swapIndex]] = [output[swapIndex], output[index]];
  }
  return output;
}
