---
type: data
status: aktif
updated: 2026-10-27
tables: [pipeline_stage_defs]
tags: [data]
---

# `pipeline_stage_defs` (model `PipelineStageDef + PipelineTransitionDef`)

Mesin stage berbasis data (bukan enum). Juga mencakup tabel `pipeline_transition_defs`.

## Kolom penting
- `pipeline_stage_defs`: `key` (PK), `label`, `color`, `sort_order`, `is_terminal`
- `pipeline_transition_defs`: `from_key`, `to_key`, `label` (teks tombol), unik per pasangan

## Ditulis oleh
- Seed (`packages/shared/src/types.ts` `SEED_PIPELINE_STAGES`/`TRANSITIONS`)

## Dibaca oleh
- `api/pipeline-stages`, dashboard, map

## Migrasi
pipeline_stages

## ⚠️ Perhatian
Praktiknya stage jarang dimajukan; tag lebih dominan. Lihat [[K-Kosakata-Stage]].

## Backup JSON
✅ termasuk

← [[MOC-Model-Data]]
