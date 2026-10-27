---
type: moc
status: aktif
updated: 2026-10-27
---

# Arsitektur Aplikasi

Monorepo npm workspaces: `apps/web` (Next 16.3.4, React 19, Prisma 5.22, Tailwind 4, SWR, leaflet, react-pdf), `apps/wa-bridge` (Fastify + Baileys, `pg`), `packages/shared` (normalisasi nomor, tipe).

## Note Brain
- [[MOC-Model-Data]]
- [[K-classifyLead]]
- [[K-Jalur-Kirim-WA]]
- [[K-Tipe-Aktivitas]]
- Fase 3 (belum dibuat): [[F-Auth]], [[F-Dashboard-Lead]], [[F-i18n]], [[S-Shared-Package]]

## Doc sumber
- [[ARCHITECTURE]]: inti masih benar, tapi tabel setelah 09-07 belum ada
- [[LOCAL_DEV]]: setup lokal (`--legacy-peer-deps`, port 5433)
- [[3.CRMConcept]]: brief awal (arsip, masalah @lid)
- [[CRM Schedule and FU - arsip lengkap 2026-10-01]] §2: peta page → API

## Titik rawan (berdampak luas kalau diubah)
1. Flag `wa_contacts` + `classifyLead` → ±12 file ([[K-classifyLead]])
2. String `lead_activities.type` ([[K-Tipe-Aktivitas]])
3. Jalur kirim WA ([[K-Jalur-Kirim-WA]])
4. Upsert staging ([[K-Kolom-CRM-Owned]])
5. `packages/shared/src/phone.ts`: dipakai web **dan** bridge (join lead ↔ WA)
6. Matcher `apps/web/src/proxy.ts` (gerbang auth)
7. `api/leads/route.ts`: dipakai dashboard, map, letters, dailylog
