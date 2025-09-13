// client/src/lib/currency.ts
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

/**
 * Optional build-time env (Vite): create client/.env with e.g.:
 *   VITE_DEFAULT_CURRENCY=NLE
 *   VITE_USD_RATE=22.50
 * These are baked at build time. LocalStorage still wins after the user changes it.
 */
const ENV_DEFAULT_CURRENCY =
  (typeof import.meta !== "undefined" &&
    (import.meta as any).env &&
    (import.meta as any).env.VITE_DEFAULT_CURRENCY) ||
  (typeof process !== "undefined" &&
    (process as any).env &&
    ((process as any).env.VITE_DEFAULT_CURRENCY ||
      (process as any).env.DEFAULT_CURRENCY)) ||
  "NLE";

const ENV_USD_RATE =
  (typeof import.meta !== "undefined" &&
    (import.meta as any).env &&
    (import.meta as any).env.VITE_USD_RATE) ||
  (typeof process !== "undefined" &&
    (process as any).env &&
    ((process as any).env.VITE_USD_RATE || (process as any).env.USD_RATE)) ||
  "25";

type CurrencyCode = "NLE" | "USD";

type CurrencyCtx = {
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  rateNLePerUsd: number;
  setRateNLePerUsd: (n: number) => void;
  /** DB amounts are assumed to be stored in NLe */
  format: (dbAmountNLe: number | string) => string;
  /** Convert NLe -> USD using current rate */
  toUsd: (nle: number) => number;
  /** Convert USD -> NLe using current rate */
  toNLe: (usd: number) => number;
};

const CurrencyContext = createContext<CurrencyCtx | null>(null);

const LS_KEY_CUR = "currency.code";
const LS_KEY_RATE = "currency.nle_per_usd";

/** tiny guards so we don't blow up on SSR / build */
const hasWindow = typeof window !== "undefined";
const safeGet = (k: string) => {
  try {
    if (!hasWindow || !("localStorage" in window)) return null;
    return window.localStorage.getItem(k);
  } catch {
    return null;
  }
};
const safeSet = (k: string, v: string) => {
  try {
    if (!hasWindow || !("localStorage" in window)) return;
    window.localStorage.setItem(k, v);
  } catch {
    // ignore
  }
};

function clampCurrency(c?: string | null): CurrencyCode {
  return c === "USD" ? "USD" : "NLE";
}

function parsePositiveFloat(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  // Initial currency: LS -> ENV -> "NLE"
  const [currency, setCurrency] = useState<CurrencyCode>(() => {
    const saved = safeGet(LS_KEY_CUR);
    return clampCurrency(saved ?? ENV_DEFAULT_CURRENCY);
  });

  // Initial rate: LS -> ENV -> 25
  const [rateNLePerUsd, setRateNLePerUsd] = useState<number>(() => {
    const saved = safeGet(LS_KEY_RATE);
    if (saved) return parsePositiveFloat(saved, 25);
    return parsePositiveFloat(ENV_USD_RATE, 25);
  });

  // Persist changes
  useEffect(() => {
    safeSet(LS_KEY_CUR, currency);
  }, [currency]);

  useEffect(() => {
    safeSet(LS_KEY_RATE, String(rateNLePerUsd));
  }, [rateNLePerUsd]);

  const toUsd = useCallback(
    (nle: number) => {
      const rate = rateNLePerUsd || 1;
      return nle / rate;
    },
    [rateNLePerUsd],
  );

  const toNLe = useCallback(
    (usd: number) => usd * (rateNLePerUsd || 1),
    [rateNLePerUsd],
  );

  const format = useCallback(
    (dbAmountNLe: number | string) => {
      const nle = Number(dbAmountNLe ?? 0);
      if (!Number.isFinite(nle))
        return currency === "USD" ? "$0.00" : "NLe 0.00";

      if (currency === "NLE") {
        return `NLe ${nle.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;
      }
      const usd = toUsd(nle);
      return `$${usd.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    },
    [currency, toUsd],
  );

  const value = useMemo(
    () => ({
      currency,
      setCurrency: (c: CurrencyCode) => setCurrency(clampCurrency(c)),
      rateNLePerUsd,
      setRateNLePerUsd: (n: number) =>
        setRateNLePerUsd(parsePositiveFloat(n, rateNLePerUsd || 25)),
      format,
      toUsd,
      toNLe,
    }),
    [currency, rateNLePerUsd, format, toUsd, toNLe],
  );

  // No JSX: keep this file .ts-friendly
  return React.createElement(
    CurrencyContext.Provider,
    { value },
    children as React.ReactNode,
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx)
    throw new Error("useCurrency must be used within <CurrencyProvider>");
  return ctx;
}
