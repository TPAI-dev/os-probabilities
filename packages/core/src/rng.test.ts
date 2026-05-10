import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Pcg32, deriveSeed } from "./rng.js";

const golden = JSON.parse(readFileSync(new URL("../../../fixtures/determinism/golden-vectors.json", import.meta.url), "utf8")) as { rng: { seed: string; uint32: number[] }; seedDerivation: { seed: string; tableId: string; drawIndex: number; derivedSeed: string } };

describe("Pcg32", () => {
  it("returns stable uint32 vectors for fixed seeds", () => {
    const rng = new Pcg32(golden.rng.seed);
    expect([
      rng.nextUint32(),
      rng.nextUint32(),
      rng.nextUint32(),
      rng.nextUint32(),
      rng.nextUint32()
    ]).toEqual(golden.rng.uint32);
  });

  it("samples bigint bounds deterministically", () => {
    const first = new Pcg32("bounded").nextBigIntBelow(10_000_000_000_000_000_000n);
    const second = new Pcg32("bounded").nextBigIntBelow(10_000_000_000_000_000_000n);

    expect(second).toBe(first);
    expect(first).toBeGreaterThanOrEqual(0n);
    expect(first).toBeLessThan(10_000_000_000_000_000_000n);
  });

  it("matches the golden seed derivation contract", () => {
    expect(deriveSeed(
      golden.seedDerivation.seed,
      golden.seedDerivation.tableId,
      golden.seedDerivation.drawIndex
    )).toBe(golden.seedDerivation.derivedSeed);
  });
});
