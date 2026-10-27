---
type: concept
status: aktif
updated: 2026-10-27
code: [apps/web/src/lib/crmStageMapping.ts, packages/shared/src/types.ts]
tables: [pipeline_stage_defs]
tags: [konsep]
---

# Konsep: Tiga Kosakata Stage

Ada **tiga** sistem stage yang sering tertukar.

## 1. `leads.pipeline_stage` (Mapping, internal)
Menurut [[ARCHITECTURE]]: `new` → `contacted` → `responded` → `meeting_aligned` → `client_deciding_trial` → `trial_rejected` / `trial_accepted` → `offer_payment` (trial: cek kesehatan 3 hari, pindah ke offer_payment setelah 25 hari).
- Otomatis: `new`→`contacted` (outbound pertama, `waSend.ts`), →`responded` (inbound pertama, bridge).
- Praktiknya hampir tidak dimajukan manual; **tag** ([[K-classifyLead]]) yang menggerakkan kerja.

## 2. Stage CRM tim (`sales.sahaibat.com`)
prospek → kontak → demo → uji_coba → konversi, plus `batal`. UI: Prospect, Contacted, Demo, Trial, Paid, Lost.
- Aturan sync: **hanya naik** (prospek < kontak < demo < uji_coba < konversi), `batal` dilindungi.

## 3. Saran stage dari tag (`crmStageMapping.ts`)
`CATEGORY_TO_CRM_STAGE`: hanya Prospect / Contacted / Demo / Lost (trial/paid sengaja dikecualikan). **Hanya saran**: `/sync/dailylog` menampilkannya, tidak menulis ke CRM tim. Tabel lengkap: [[01-Glossary]].

## 4. Pipeline generik di job desc
[[1.SalesJobDesc]] memakai 11 tahap konseptual (New Lead … Paid / Lost): model mental, bukan data.

Sumber: [[CRM Sync Pipeline]], [[0.CRMSahaibatUnderstanding]] (Goal 1).

← [[MOC-Sync-CRM-Tim]] · [[pipeline_stage_defs]]
