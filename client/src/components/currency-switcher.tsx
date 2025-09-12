import { useCurrency } from "@/lib/currency";

export function CurrencySwitcher() {
  const { currency, setCurrency, nlePerUsd, setNlePerUsd } = useCurrency();

  return (
    <div className="flex items-center gap-2">
      {/* simple native <select> to avoid extra deps */}
      <select
        value={currency}
        onChange={(e) => setCurrency(e.target.value as any)}
        className="h-9 rounded-md border bg-background px-2 text-sm"
        aria-label="Currency"
      >
        <option value="NLE">NLe</option>
        <option value="USD">USD $</option>
      </select>

      {/* small, optional rate editor (only visible when USD is selectable) */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <span>1 USD =</span>
        <input
          type="number"
          step="0.01"
          value={nlePerUsd}
          onChange={(e) => setNlePerUsd(parseFloat(e.target.value))}
          className="h-7 w-20 rounded-md border bg-background px-2"
          aria-label="NLe per USD"
          title="Edit exchange rate"
        />
        <span>NLe</span>
      </div>
    </div>
  );
}

export default CurrencySwitcher;
