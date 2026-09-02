# Scraper Guide

Uses [gosom/google-maps-scraper](https://github.com/gosom/google-maps-scraper)
(MIT, Docker-based). Flags and output format below are verified against the
actual tool (`docker run --rm gosom/google-maps-scraper -h` and a real run),
not just its docs — some upstream docs/source comments are out of date
(e.g. the Postgres flag is `-dsn`, used for its own internal job queue, not
a way to write into a table you define — see "Why not `-dsn`" below).

## 1. Write a queries file

One search per line, plain text. Google Maps interprets the whole line as
a search box query — put the location in the text itself:

```text
# scrape-queries/yogyakarta-dokter-praktik-mandiri.txt
dokter praktik mandiri Yogyakarta
```

Multiple lines run as separate searches in the same job. Splitting a broad
area into several narrower queries (e.g. per district) generally finds more
listings than one broad query, at the cost of more requests.

## 2. Run it

```powershell
.\scripts\run-scrape.ps1 -QueriesFile .\scrape-queries\yogyakarta-dokter-praktik-mandiri.txt -Name yogyakarta-dokter-praktik-mandiri
```

```bash
./scripts/run-scrape.sh -q ./scrape-queries/yogyakarta-dokter-praktik-mandiri.txt -n yogyakarta-dokter-praktik-mandiri
```

Writes NDJSON (one JSON object per line) to
`scrape-output/<name>.json`. First run pulls the `gosom/google-maps-scraper`
image and a Playwright browser cache (~several hundred MB, one-time).

**Windows note**: run this from PowerShell, not Git-Bash — Git-Bash's
automatic path translation mangles the `-v host:container:mode` Docker
volume syntax (we hit this: it turned `/queries.txt` into a stray directory
named `queries.txt;C`). `run-scrape.ps1` exists specifically so you don't
have to think about this; `run-scrape.sh` is for the VPS (Linux, no path
translation issue).

### Flags used, and why

| Flag | Default here | Why |
|---|---|---|
| `-json` | on | NDJSON output — one line per result, streams as it scrapes, easy to import line-by-line |
| `-depth` | 3 | max scroll depth into results; higher = more results per query but slower and more requests |
| `-c` | 2 | concurrency. **Keep this low.** No built-in throttling — higher concurrency scrapes faster but raises block risk. Building real proxy infrastructure is out of scope for MVP; `-proxies`/`-proxies-file` exist if you ever need them |
| `-lang id` | on | Indonesian-language results (categories, open hours days, etc.) |
| `-exit-on-inactivity 3m` | on | stops the container automatically once no new results for 3 minutes, instead of hanging |
| `-geo` / `-radius` / `-zoom` | optional (`-Geo`/`-g`) | only needed if the query text alone doesn't scope the search tightly enough |

### Why not `-dsn`

`-dsn` + `-produce` is gosom's own **internal job queue** — it creates and
manages its own Postgres schema for seeding/consuming scrape jobs, not a
way to land rows into a table you control. We considered it during initial
planning but confirmed via `--help` and a real test run that it doesn't fit
"write into `stg_scrape_results`". Plain NDJSON file output +
`POST /api/admin/import-staging` is simpler and gives the same result for a
single-user tool.

## 3. Import into leads

Either via the admin UI at `/admin/scrapes` (start the web app, fill in the
file name + a query description, click Import), or directly:

```powershell
Invoke-RestMethod -Uri http://localhost:3000/api/admin/import-staging -Method POST -ContentType "application/json" -Body (@{ fileName = "yogyakarta-dokter-praktik-mandiri.json"; queryText = "dokter praktik mandiri Yogyakarta" } | ConvertTo-Json)
```

What happens (see `apps/web/src/lib/gosomEntry.ts` and
`upsertLeadsFromStaging.ts`):

1. The NDJSON file is parsed and every row lands in `stg_scrape_results`,
   tagged with a `scrape_jobs` row.
2. Each staging row is upserted into `leads`, keyed on `google_place_id`
   (gosom's Google Place ID — the only stable natural key; addresses/phones
   can be reformatted between scrapes).
3. **Verified**: re-importing the same file updates scrape-sourced columns
   (name, address, phone, rating, …) but never touches `pipeline_stage`,
   `notes`, or any other CRM-owned field — a lead you've already worked
   is safe to re-scrape without losing that work.
4. Rows missing a `google_place_id` or lat/lng are skipped (counted, not
   silently dropped) — can't dedupe or place them on the map without those.
5. `leads.phone_normalized` is computed at import time via
   `packages/shared/src/phone.ts`, so WhatsApp linking (Milestone 4) has
   something to match against immediately.

## Verified real run

`dokter praktik mandiri Yogyakarta`, `-depth 1 -c 1`: 20 results, mostly
genuine independent-practice doctors around Yogyakarta/Sleman with WA-usable
phone numbers, in well under a minute. Confirms the query approach works
without needing geo/radius tuning for this ICP.
