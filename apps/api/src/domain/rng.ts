import type { SeededRandom } from "../engine/types";

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashToSeed(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function createSeededRandom(seed: number, cursor = 0): SeededRandom {
  const rand = mulberry32(seed);
  let cursorValue = cursor;

  for (let i = 0; i < cursor; i += 1) {
    rand();
  }

  const nextFloat = (): number => {
    cursorValue += 1;
    return rand();
  };

  const nextInt = (max: number): number => {
    if (max <= 0) {
      return 0;
    }
    return Math.floor(nextFloat() * max);
  };

  const pick = <T>(input: T[]): T => input[nextInt(input.length)];

  const pickMany = <T>(input: T[], count: number): T[] => {
    const copy = [...input];
    const out: T[] = [];
    while (copy.length > 0 && out.length < count) {
      const idx = nextInt(copy.length);
      out.push(copy[idx]);
      copy.splice(idx, 1);
    }
    return out;
  };

  return {
    seed,
    nextFloat,
    nextInt,
    pick,
    pickMany,
    getCursor: () => cursorValue,
  };
}

export function snapshotCursor(rng: SeededRandom): number {
  return rng.getCursor();
}
