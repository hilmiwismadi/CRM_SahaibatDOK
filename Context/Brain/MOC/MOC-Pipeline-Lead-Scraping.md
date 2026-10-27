---
type: moc
status: aktif
updated: 2026-10-27
---

# Pipeline Lead & Scraping

Alur: `scrape-queries/<region>.txt` → `scripts/run-scrape.*` (gosom) → `scrape-output/<region>.json` → `clean-scrape-region.mjs` → `/admin/scrapes` atau `POST /api/admin/import-staging` → [[scrape_jobs]] → [[leads]].

## Note Brain
- [[scrape_jobs]]
- [[K-Kolom-CRM-Owned]]
- [[leads]]
- Fase 3: [[F-Admin-Scrape-Import]]
- Fase 4: [[SOP-Scrape-Region]]

## Doc sumber
- [[SCRAPER_GUIDE]]: flag gosom
- [[3.ScrapingQueryPatterns]]: pola query, nama file = nama job
- [[2.LeadPipelineScripts]]: inventaris script (sebagian usang)
- [[10.VpsAccessAndDeploy]] §import: import 14 region 2026-10-07, filter `isNonClinic`
- `scrape-output/PROGRESS-2026-10-07.md`: checklist region
