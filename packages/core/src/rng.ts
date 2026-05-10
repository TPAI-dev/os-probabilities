const MASK_64 = (1n << 64n) - 1n;
const PCG32_MULTIPLIER = 6364136223846793005n;
const FNV_OFFSET = 14695981039346656037n;
const FNV_PRIME = 1099511628211n;

export class Pcg32 {
  private state = 0n;
  private readonly increment: bigint;

  public constructor(seed: string) {
    const initState = hashUtf8ToUint64(seed);
    const initSequence = hashUtf8ToUint64(`${seed}\u0000stream`);
    this.increment = ((initSequence << 1n) | 1n) & MASK_64;
    this.nextUint32();
    this.state = (this.state + initState) & MASK_64;
    this.nextUint32();
  }

  public nextUint32(): number {
    const oldState = this.state;
    this.state = (oldState * PCG32_MULTIPLIER + this.increment) & MASK_64;

    const xorshifted = Number((((oldState >> 18n) ^ oldState) >> 27n) & 0xffffffffn);
    const rotation = Number((oldState >> 59n) & 31n);
    return ((xorshifted >>> rotation) | (xorshifted << ((-rotation) & 31))) >>> 0;
  }

  public nextBigIntBelow(boundExclusive: bigint): bigint {
    if (boundExclusive <= 0n) {
      throw new Error("boundExclusive must be positive");
    }

    const words = Math.max(1, Math.ceil(bitLength(boundExclusive - 1n) / 32));
    const sampleSpace = 1n << BigInt(words * 32);
    const limit = sampleSpace - (sampleSpace % boundExclusive);

    while (true) {
      let value = 0n;
      for (let index = 0; index < words; index += 1) {
        value = (value << 32n) | BigInt(this.nextUint32());
      }

      if (value < limit) {
        return value % boundExclusive;
      }
    }
  }
}

export function deriveSeed(seed: string, tableId: string, drawIndex: number): string {
  return `os-probabilities/v1|${seed}|${tableId}|${drawIndex}`;
}

function bitLength(value: bigint): number {
  return value === 0n ? 0 : value.toString(2).length;
}

function hashUtf8ToUint64(value: string): bigint {
  const bytes = new TextEncoder().encode(value);
  let hash = FNV_OFFSET;

  for (const byte of bytes) {
    hash ^= BigInt(byte);
    hash = (hash * FNV_PRIME) & MASK_64;
  }

  return hash;
}
