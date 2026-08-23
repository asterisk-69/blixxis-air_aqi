# India / UAE / Saudi Arabia Air Quality Harmonization — README

Built for the **BLiXXiS** climate intelligence prototype (Google Maps station
visualization, hotspot detection, forecasting, Gemini environmental analysis,
citizen reports, India-wide federated environmental intelligence).

## Source datasets

| Country | File | What it is | Temporal resolution | Rows (raw, long-format) |
|---|---|---|---|---|
| India | `3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69.csv` | CPCB-style real-time station feed, single pull at 2026-08-22 15:00 IST | **Real-time snapshot** (one moment in time, not a history) | 3,584 |
| UAE | `annual-average-of-air-pollutants-concentration-by-monitoring-station.csv` | Federal Competitiveness and Statistics Centre annual station averages | **Annual** (2013–2023) | 2,055 |
| Saudi Arabia | `saudi_arabia_3year_air_quality_complete.csv` | Station-level daily readings | **Daily** (2023–2026) | 2,434 |

These three temporal resolutions are fundamentally different and were **never
joined or merged** — each source was normalized independently and the results
were vertically concatenated, with `data_granularity` and `source_dataset`
preserved on every row so the difference stays visible downstream.

## Files in this deliverable

| File | Purpose |
|---|---|
| `schema_mapping.csv` | Column-by-column mapping from each source to the common schema, with unit/transformation/notes |
| `normalized_air_quality_india_uae_saudi.csv` | The combined harmonized dataset (3,216 rows) |
| `data_quality_report.csv` | Row counts, missingness, ranges, duplicates, and qualitative quality flags |
| `unit_conversion_notes.md` | Every unit decision and the one conversion actually performed |
| `normalization_pipeline.py` | The complete, reproducible pandas script that produced the two CSVs above |
| `README.md` | This file |

## Common schema

```
country, state_or_region, city, station_name, latitude, longitude,
date, year, data_granularity,
pm2_5, pm10, no2, so2, co, o3,
aqi, aqi_source, aqi_standard,
source_dataset, source_row_id, source_unit_notes
```

Plus source-specific fields that don't fit the common schema but were kept
rather than discarded: `nh3_min/max/avg` (India), `station_environment_type`
/ `original_source_detail` (UAE), `co_ug_m3_original` (Saudi Arabia), and
`*_min`/`*_max` range columns where the source provided them (India).

**Important — row semantics:** Each source is in a *long* format (one row per
station + pollutant reading). The pipeline pivots each source to *wide*
format (one row per station + date/year, pollutants as columns) before
concatenating. This is why `normalized_rows_after_transform` is lower than
the raw row count in the quality report — it reflects the pivot, not lost
data. Every value from the source is preserved as a column in the wide row.

## Units

Target units: PM2.5/PM10/NO2/SO2/O3 in µg/m³, CO in mg/m³.

- **UAE**: units are explicitly labeled per pollutant in the source and
  already match the targets. No conversion needed.
- **Saudi Arabia**: units are explicitly labeled (µg/m³ for everything). CO
  was converted µg/m³ → mg/m³ (÷1000, pure SI-prefix scaling). Everything
  else needed no conversion.
- **India**: the source has **no unit column at all**. Values are carried
  through unconverted, and every India row is flagged in `source_unit_notes`
  as *unit-unverified* — a plausible CPCB convention is documented but not
  applied as fact. See `unit_conversion_notes.md` for full detail.

## AQI

**None of the three raw files contain an AQI value.** `aqi` is null for all
3,216 rows and `aqi_source = "unavailable"` throughout. AQI was deliberately
**not calculated**, because:
- India's feed doesn't reliably provide every pollutant needed for CPCB's
  sub-index methodology at every station-timestamp.
- UAE is annual-average data, which isn't valid input for AQI methodologies
  designed around short-term (hourly/daily) exposure.
- Saudi Arabia has no O3 at all and almost no CO/NO2/SO2 coverage.

If AQI is added to this dataset in the future, note that **India (CPCB),
UAE, and Saudi Arabia use different national AQI breakpoint methodologies** —
any future AQI values from these countries would need `aqi_standard`
populated and should not be treated as directly comparable across countries.

## Known limitations (do not silently work around these downstream)

1. **India** pollutant units are unverified (see above).
2. **UAE** has no PM2.5 measurements and no station coordinates at all.
3. **Saudi Arabia** has no O3 measurements; CO/NO2/SO2 all come from a single
   mobile station (13 observations each) while PM2.5 dominates (2,220 obs).
4. **Saudi Arabia** `city` is missing for ~97% of rows and was not inferred.
5. One Saudi station (`MTHM Seyyar Araç-Tekirdağ-Muratlı`) has a `city` value
   of "Tekirdağ" (a city in Turkey) despite coordinates that fall inside Saudi
   Arabia — likely a mobile-unit naming artifact. Flagged, not corrected.
6. India's PM2.5 reading at "Dada Peer, Sasaram - BSPCB" (min 14 / max 500 /
   avg 311) is an extreme outlier — flagged, not removed.
7. The three datasets' temporal resolutions (real-time snapshot / annual /
   daily) are not comparable row-for-row.
8. No geocoding, city inference from coordinates, or AQI back-calculation was
   performed anywhere, per the project's core principles.

## Reproducing this pipeline

```bash
pip install pandas numpy
python3 normalization_pipeline.py
```

Expects the three source CSVs in the working directory; writes
`normalized_air_quality_india_uae_saudi.csv` and `data_quality_report.csv`.
