import { DECIMAL_SCALE } from "./constants.js";

const DECIMAL_PATTERN = /^-?(?:0|[1-9]\d*)(?:\.(\d{1,6}))?$/;

export interface ParsedDecimal {
  ok: true;
  value: bigint;
}

export interface DecimalParseFailure {
  ok: false;
  message: string;
}

export type DecimalParseResult = ParsedDecimal | DecimalParseFailure;

export function parseDecimal(value: unknown): DecimalParseResult {
  if (typeof value !== "number" && typeof value !== "string") {
    return { ok: false, message: "expected a decimal number or string" };
  }

  if (typeof value === "number" && !Number.isFinite(value)) {
    return { ok: false, message: "expected a finite decimal number" };
  }

  const raw = String(value);
  if (!DECIMAL_PATTERN.test(raw)) {
    return {
      ok: false,
      message: "expected a decimal with at most 6 fractional digits"
    };
  }

  const negative = raw.startsWith("-");
  const unsigned = negative ? raw.slice(1) : raw;
  const [wholeRaw, fractionRaw = ""] = unsigned.split(".");
  const whole = BigInt(wholeRaw ?? "0") * DECIMAL_SCALE;
  const fraction = BigInt(fractionRaw.padEnd(6, "0"));
  const scaled = whole + fraction;

  return { ok: true, value: negative ? -scaled : scaled };
}

export function requireDecimal(value: unknown, label: string): bigint {
  const parsed = parseDecimal(value);
  if (!parsed.ok) {
    throw new Error(`${label}: ${parsed.message}`);
  }
  return parsed.value;
}

export function multiplyScaled(left: bigint, right: bigint): bigint {
  return (left * right) / DECIMAL_SCALE;
}

export function formatScaled(value: bigint): string {
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const whole = absolute / DECIMAL_SCALE;
  const fraction = absolute % DECIMAL_SCALE;
  const fractionText = fraction.toString().padStart(6, "0").replace(/0+$/, "");
  const text = fractionText.length === 0 ? whole.toString() : `${whole.toString()}.${fractionText}`;
  return negative ? `-${text}` : text;
}
