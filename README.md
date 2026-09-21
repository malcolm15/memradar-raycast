# MemRadar for Raycast

Search RAM and SSD prices with a decade of history, from [MemRadar](https://memradar.com).

## Commands

_Not built yet. This repository currently holds the scaffold, the licensing pre-flight, and the store assets._

## About the data

Prices and history come from MemRadar, which tracks consumer RAM and SSD prices at US retail.

- **Updated once a day.** memradar.com itself refreshes prices six times a day, so figures here can be up to 24 hours behind the site. Every view shows the date its data was computed. This is not a live feed.
- **Medians, never means**, for anything computed across a segment.
- **Price history is sourced from Keepa** (keepa.com) under licence, and is published at one point per month with Keepa's written permission. Figures are computed by MemRadar from that history.

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
