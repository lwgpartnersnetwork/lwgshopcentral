// client/src/lib/currency.ts
import { createContext, useContext, useEffect, useMemo, useState } from "react";

type Currency = "NLE" | "USD";

type CurrencyCtx = {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  /** How many NLe = 1 USD (editable) */
  nlePerUsd: number;
  setNlePerUsd: (n: number) => void;
  /** Format a price that is stored in NLe in your DB */
  format: (priceNle: number | string) => string;
};

const Ctx = createContext<CurrencyCtx | null>(null);

const LS_KEY = "lwg.currency";
const DEFAULT = { currency: "NLE" as Currency, nlePerUsd: 20 }; // change anytime

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrency] = useState<Currency>(DEFAULT.currency);
  const [nlePerUsd, setNlePerUsd] = useState<number>(DEFAULT.nlePerUsd);

  // load saved settings
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s.currency) setCurrency(s.currency);
        if (s.nlePerUsd) setNlePerUsd(Number(s.nlePerUsd));
      }
    } catch {}
  }, []);

  // save on change
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ currency, nlePerUsd }));
    } catch {}
  }, [currency, nlePerUsd]);

  // formatter: values in DB are NLe
  const format = useMemo(() => {
    return (priceNle: number | string) => {
      const nle = Number(priceNle ?? 0);
      if (currency === "NLE") {
        return `NLe ${nle.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;
      }
      const usd = nlePerUsd > 0 ? nle / nlePerUsd : 0;
      return `$ ${usd.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    };
  }, [currency, nlePerUsd]);

  return (
    <Ctx.Provider
      value={{ currency, setCurrency, nlePerUsd, setNlePerUsd, format }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCurrency must be used inside CurrencyProvider");
  return ctx;
}
