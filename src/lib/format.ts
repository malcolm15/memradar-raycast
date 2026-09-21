import type { BuyState, Product } from "./types";

export function money(value: number): string {
  return `$${value.toFixed(2)}`;
}

/** "2026-09-21" -> "21 September 2026". Fixed locale: the store is US English. */
export function longDate(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

/** "2026-09" -> "Sep 2026", for the history table. */
export function monthLabel(month: string): string {
  const d = new Date(`${month}-01T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return month;
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

export const BUY_STATE_LABEL: Record<BuyState, string> = {
  good: "Good time to buy",
  typical: "In line with its 90-day average",
  elevated: "Price is elevated",
};

export function buyStateShort(state?: BuyState): string | undefined {
  if (!state) return undefined;
  return state === "good" ? "Good" : state === "typical" ? "Typical" : "Elevated";
}

/** Percent above the all-time low, the figure that makes a low meaningful. */
export function aboveLow(product: Product): string | undefined {
  if (!product.all_time_low || product.all_time_low.price_usd <= 0) return undefined;
  const pct = Math.round(((product.price_usd - product.all_time_low.price_usd) / product.all_time_low.price_usd) * 100);
  if (pct <= 0) return "at or below its all-time low";
  return `${pct}% above its all-time low`;
}

/**
 * The monthly history as a compact table, newest first. Capped for readability;
 * the count states how much history exists beyond the rows shown.
 */
export function historyTable(product: Product, maxRows = 24): string {
  const history = product.history_monthly ?? [];
  if (!history.length) return "_No recorded history._";
  const rows = [...history].reverse();
  const shown = rows.slice(0, maxRows);
  const lines = ["| Month | Price |", "| --- | --- |", ...shown.map(([m, v]) => `| ${monthLabel(m)} | ${money(v)} |`)];
  if (rows.length > shown.length) {
    lines.push("", `_Showing the most recent ${shown.length} of ${rows.length} months._`);
  }
  return lines.join("\n");
}
