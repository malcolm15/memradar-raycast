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
 * The monthly history, readable at Detail width. A deep product carries 129
 * months (G.SKILL RipjawsV, back to 2015), and 129 table rows is a wall of
 * numbers nobody reads. So: the last `recentMonths` in full, then one line per
 * earlier year with its low, high and year-end price, which keeps the decade
 * of shape without the scroll.
 */
export function historyMarkdown(product: Product, recentMonths = 24): string {
  const history = product.history_monthly ?? [];
  if (!history.length) return "_No recorded history._";

  const recent = history.slice(-recentMonths);
  const earlier = history.slice(0, Math.max(0, history.length - recentMonths));
  const parts: string[] = [];

  if (earlier.length) {
    const byYear = new Map<string, number[]>();
    for (const [month, price] of earlier) {
      const year = month.slice(0, 4);
      if (!byYear.has(year)) byYear.set(year, []);
      byYear.get(year)?.push(price);
    }
    parts.push(`### ${byYear.size === 1 ? "Earlier year" : "Earlier years"}`, "");
    parts.push("| Year | Low | High | Year end |", "| --- | --- | --- | --- |");
    for (const [year, prices] of byYear) {
      parts.push(
        `| ${year} | ${money(Math.min(...prices))} | ${money(Math.max(...prices))} | ${money(prices[prices.length - 1])} |`,
      );
    }
    parts.push("");
  }

  parts.push(`### Last ${recent.length} months`, "");
  parts.push("| Month | Price |", "| --- | --- |");
  for (const [month, price] of [...recent].reverse()) {
    parts.push(`| ${monthLabel(month)} | ${money(price)} |`);
  }
  return parts.join("\n");
}

/** The narrow side pane gets fewer rows and no yearly block. */
export function historyTable(product: Product, maxRows = 12): string {
  const history = product.history_monthly ?? [];
  if (!history.length) return "_No recorded history._";
  const rows = [...history].reverse().slice(0, maxRows);
  const lines = ["| Month | Price |", "| --- | --- |", ...rows.map(([m, v]) => `| ${monthLabel(m)} | ${money(v)} |`)];
  if (history.length > rows.length) {
    lines.push("", `_${history.length} months recorded; press Enter for the full history._`);
  }
  return lines.join("\n");
}
