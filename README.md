# MemRadar for Raycast

Search RAM and SSD prices with a decade of history, from [MemRadar](https://memradar.com).

## Commands

### Search Memory Prices

Search every tracked RAM and SSD product by name, brand or ASIN. Each row shows the current price and whether it is a good time to buy.

Press Enter on a product for its full price history: the all-time low and high with the dates they were set, the 90-day average the buy state is measured against, how long it has been tracked, and the monthly prices. Products tracked for years show their recent months in full, then one line per earlier year with that year's low, high and closing price, newest first throughout. Months with no recorded price are omitted rather than filled in. Cmd+Enter opens the product on memradar.com; Cmd+D toggles a compact side pane in the list.

The product list is downloaded once per session and searched locally, so typing makes no network requests.

### Show Market Overview

How each segment has moved: DDR5, DDR4, NVMe and SATA, with the median price, the median price per gigabyte, and the change over one month, three months, six months and a year. Each change states how many products it was measured across, since a window compares only the products present at both ends.

## About the data

Prices and history come from MemRadar, which tracks consumer RAM and SSD prices at US retail.

- **Updated once a day.** memradar.com itself refreshes prices six times a day, so figures here can be up to 24 hours behind the site. Every view shows the date its data was computed. This is not a live feed.
- **Medians, never means**, for anything computed across a segment.
- **Price history is sourced from Keepa** (keepa.com) under license, and is published at one point per month with Keepa's written permission. Figures are computed by MemRadar from that history.

The extension reads two files and nothing else:

- `https://memradar.com/data/raycast-v1-market.json`
- `https://memradar.com/data/raycast-v1-products.json`

It never fetches finer-grained history than one point per month. `npm run preflight` enforces that before every publish.

## Development

```
npm install
npm run dev        # opens in Raycast
npm run preflight  # licensing and attribution checks
```

Built against `@raycast/api` 1.x, macOS only.

## Licence

MIT. Data remains subject to MemRadar's and Keepa's terms.
