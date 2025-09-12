// client/src/lib/currency.ts
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type CurrencyCode = "NLE" | "USD";

type CurrencyCtx = {
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  rateNLePerUsd: number;
  setRateNLePerUsd: (n: number) => void;
  format: (dbAmountNLe: number) => string; // DB assumed NLe
  toUsd: (nle: number) => number;
  toNLe: (usd: number) => number;
};

const CurrencyContext = createContext<CurrencyCtx | null>(null);

const LS_KEY_CUR = "currency.code";
const LS_KEY_RATE = "currency.nle_per_usd";

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrency] = useState<CurrencyCode>(() => {
    const saved = localStorage.getItem(LS_KEY_CUR) as CurrencyCode | null;
    return saved === "USD" ? "USD" : "NLE";
  });

  const [rateNLePerUsd, setRateNLePerUsd] = useState<number>(() => {
    const raw = localStorage.getItem(LS_KEY_RATE);
    const n = raw ? parseFloat(raw) : 25; // example default
    return Number.isFinite(n) && n > 0 ? n : 25;
  });

  useEffect(() => {
    localStorage.setItem(LS_KEY_CUR, currency);
  }, [currency]);

  useEffect(() => {
    localStorage.setItem(LS_KEY_RATE, String(rateNLePerUsd));
  }, [rateNLePerUsd]);

  const toUsd = useCallback(
    (nle: number) => (rateNLePerUsd ? nle / rateNLePerUsd : nle),
    [rateNLePerUsd],
  );
  const toNLe = useCallback(
    (usd: number) => usd * rateNLePerUsd,
    [rateNLePerUsd],
  );

  const format = useCallback(
    (dbAmountNLe: number) => {
      const nle = Number(dbAmountNLe ?? 0);
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
      setCurrency,
      rateNLePerUsd,
      setRateNLePerUsd,
      format,
      toUsd,
      toNLe,
    }),
    [currency, rateNLePerUsd, format, toUsd, toNLe],
  );

  // No JSX here -> safe to keep this file as .ts
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
