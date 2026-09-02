# Scraper Guide

> Status: filled in during Milestone 2 (see plan). This is a placeholder so
> the link from ARCHITECTURE.md isn't dead.

Will cover: running `gosom/google-maps-scraper` via `scripts/run-scrape.*`,
flag reference (`-input`/`-geo`/`-radius`/`-zoom`/`-grid-bbox`/`-dburl`/`-c`),
the block-risk trade-off (recommend `-c 2`–`3`, proxy flags exist but proxy
infra is out of scope for MVP), and how a run lands in `stg_scrape_results`
for the admin "Import" step.
