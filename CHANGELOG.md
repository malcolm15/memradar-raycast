# MemRadar Changelog

## [Initial Version] - 2026-09-21

### Added

- Repository scaffold, manifest, and store assets.
- Licensing pre-flight that verifies Keepa attribution and the monthly history boundary before publishing.

## [Search Memory Prices] - 2026-09-21

### Added

- `Search Memory Prices`: search tracked RAM and SSD products by name, brand or ASIN, with current price and buy state in the list and a detail pane carrying the all-time low and high with their dates, the 90-day average, tracked days and the monthly price history.

## [Full price history view] - 2026-09-21

### Changed

- Enter on a product now opens its full price history rather than the website. Deep products show the last 24 months in full plus one line per earlier year, with that year's low, high and closing price.
- Open on MemRadar moved to Cmd+Enter in the list, and is the first action inside the history view.

### Changed

- The price history reads newest first throughout: recent months first, then earlier years below.

## [Show Market Overview] - 2026-09-21

### Added

- `Show Market Overview`: DDR5, DDR4, NVMe and SATA with their median price, median price per gigabyte, and the change over one month, three months, six months and a year, each with the number of products it was measured across. The detail pane carries the method note, so "these are medians and the periods are not comparable" travels with the figures.
