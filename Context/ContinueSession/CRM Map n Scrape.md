# CRM Map n Scrape — Session Notes (resume file)

Last updated: 2026-10-01. Written so a fresh Claude session can continue without the original chat.

## CHECKPOINT — baca ini dulu saat lanjut di session baru (diperbarui 2026-10-01)

**Apa yang terjadi (sesi 2026-09-30 → 2026-10-01)**
1. 09-30: `/map` diubah — pin berwarna status asli, legenda jadi filter 4 grup, dropdown Stage → Label (detail di §0, §4, §5). Sudah live.
2. 10-01: permintaan baru di `/chat` — tombol **Info Lead** di header chat (mis. "dr. Noor Alifah SpA" + nomor) harus membuka tooltip berisi rating, link Google Maps, dan info lain dari DB.
   - Kode sudah ditulis **lokal** di `Mapping/apps/web/src/app/chat/page.tsx` (komponen `LeadInfoCard`, popover hover/focus di tombol; klik tombol tetap toggle panel Contact Chain) dan `chat/types.ts` (field opsional tambahan di `LeadBrief`). Tidak ada perubahan backend — `GET /api/leads/[id]` sudah mengembalikan seluruh baris Lead.
   - Isi kartu (hanya baris yang datanya ada): rating+jumlah ulasan, kategori, tipe, harga, alamat, provinsi, telp kantor, email, link Google Maps/website/Instagram (tab baru), catatan. Baris "Stage" sengaja dibuang (hampir semua lead tetap "New").
   - **Deploy diblokir** oleh classifier izin Claude ("Production Deploy"); Claude tidak mencoba jalur lain. Backup + scp + rebuild belum dijalankan oleh Claude. Setelah itu `page.tsx` dan `types.ts` terdeteksi berubah di disk (types.ts kini punya `googlePlaceId` untuk lead manual `manual-<uuid>`; page.tsx berubah, isinya belum dibaca ulang) — kemungkinan diedit manual/sesi lain.

**Yang perlu dicek / dilakukan besok**
- [ ] **Status deploy `/chat` tidak diketahui.** Cek apakah Info Lead tooltip sudah live di http://103.93.162.31:3000/chat (Ctrl+F5). Jika belum: baca ulang `chat/page.tsx` + `types.ts` lokal (sudah berubah dari versi Claude), lalu deploy sesuai §3 — user menjalankan sendiri dengan `!`, atau menambah permission rule `ssh -i`/`scp -i` untuk VPS. Backup dulu file lama VPS (mis. ke `~/Mapping/.deploy-backup-20261001/`).
- [ ] Tes di browser: hover/fokus tombol Info Lead → kartu muncul, link Google Maps bisa diklik (kartu tidak hilang saat kursor pindah), lead tanpa data → "Belum ada info tambahan.", klik tombol masih toggle Contact Chain.
- [ ] Tes `/map`: klik legenda (4 grup + expand Later/Contacted) dan dropdown Label — belum pernah dites di browser.
- [ ] Konfirmasi asumsi: label menang atas "Tidak Ada Kontak WA"; Later default tertutup.
- [ ] Git: semua perubahan (map/label + chat info) belum di-commit; commit terpisah, jangan campur file sesi lain (lihat §0 "Soal log perubahan"). Opsional buat `docs/CHANGELOG.md`.
- [ ] Sisi scrape belum disentuh (§7).

---

## 0. Ringkasan progres (bahasa manusia) — terakhir diperbarui 2026-10-01
**Sudah selesai & live di http://103.93.162.31:3000/map**
1. Pin di peta sekarang berwarna sesuai status asli lead, bukan "pipeline stage" (yang tidak pernah dipakai, jadi hampir semua pin sama).
2. Legenda di kiri-bawah peta sekarang juga jadi filter: klik untuk tampil/sembunyikan. Ada 4 grup: Untouched, Tidak Ada Kontak WA, Later, Contacted (biru). Later dan Contacted bisa di-expand untuk lihat rinciannya (default tertutup). Tombol Show all / Hide all tersedia.
3. Di sidebar kanan, dropdown "Stage" diganti "Label": Dental, Aesthetic, Low rating, Government Affiliate, atau Other options (isi alasan di kotak teks). Lead yang diberi label otomatis masuk grup "Later" (pin ungu).
4. Database sudah ditambah 2 kolom (`label`, `label_note`) + endpoint baru; backup DB & file lama ada di VPS `~/Mapping/.deploy-backup-20260930/`.
5. Folder lokal `Mapping` sudah di-sync dari VPS sebagai backup.

**Belum / perlu dicek manusia**
- Klik legenda & dropdown Label belum dites langsung di browser (baru dites API + halaman terbuka OK). Cek manual dulu (Ctrl+F5).
- Keputusan yang masih asumsi: label menang atas "Tidak Ada Kontak WA"; Later default tertutup.
- Belum ada perubahan di sisi scrape.

**Soal log perubahan (kondisi per 2026-10-01)**
- Tidak ada file CHANGELOG khusus di proyek. Riwayat resmi hanya `git log` (commit terakhir: `54a8928 feat(chat): follow-up date prompt...`, sebelum sesi ini).
- Perubahan sesi ini **belum di-commit** ke git (di VPS maupun lokal). `git status` juga menampilkan banyak file lain berstatus modified (chat, reports, schema, dll) dari pekerjaan sesi sebelumnya yang juga belum di-commit — jadi saat commit, pisahkan mana yang milik sesi ini (lihat daftar file di §5) dan mana milik sesi lain.
- Pencatatan tertulis perubahan sesi ini hanya ada di file ini (§0, §4, §5). Per lead, perubahan label tercatat di tabel `lead_activities` (type `label_change`).
- Next step yang disarankan: buat commit terpisah untuk fitur map/label, lalu (opsional) buat `docs/CHANGELOG.md`.

## 1. What this project is
SahAIbat BD/Sales CRM: scrapes clinic leads (Google Maps), shows them on a map (`/map`), chats via WhatsApp (`/chat`), reports/kanban (`/reports`), dashboard, letters. User is BD/Sales — act as sales strategist, not copywriter (see memory `user_role_sahaibat`).

Stack: Next.js 16 (app router, standalone build) + Prisma + Postgres/PostGIS + `wa-bridge` (Baileys WhatsApp), all in Docker Compose on a VPS.
**Next.js here has breaking changes** — `apps/web/AGENTS.md` says read `node_modules/next/dist/docs/` before writing Next-specific code.

## 2. Where things live
- **VPS**: `103.93.162.31`, user `DzakiWismadi`, SSH key `D:\Hilmi\Coding\Sahaibat\VPS_DW\DWSSH.pem` (credentials in `VPS_DW\Note.txt` — not copied here).
  - `ssh -i VPS_DW/DWSSH.pem DzakiWismadi@103.93.162.31` (allowed in Claude permissions: `ssh -i`/`scp -i` with that key).
  - Project at `~/Mapping`. Containers: `mapping-web-1` (:3000), `mapping-db-1` (postgis, 127.0.0.1:5433), `mapping-wa-bridge-1`. Other unrelated app: `jacked-app` (:8080) — don't touch.
  - Live URL: http://103.93.162.31:3000/map
- **Local mirror (backup)**: `D:\Hilmi\Coding\Sahaibat\Mapping` — synced from the VPS on 2026-09-30 via `tar` over ssh (excluded `node_modules`, `.next`, `.deploy-backup-*`). Before that the local folder was an empty shell. Local `node_modules` are stale → run `npm install` before local dev. Local also has the VPS's `.git`.
- **Source of truth is the VPS** (it's what runs). Workflow used: edit locally → `scp` to VPS → rebuild `web`. Re-sync local from VPS if the VPS was edited elsewhere.

## 3. Deploy procedure (web only)
```
scp -i VPS_DW/DWSSH.pem <file> DzakiWismadi@103.93.162.31:Mapping/<path>
ssh ... "cd ~/Mapping && docker compose build web && docker compose up -d --no-deps web"
```
- Build takes >10 min; run it detached on the VPS (`nohup sh -c '... > /tmp/build.log'`) and poll `/tmp/build.log` for `DONE`, otherwise the local tool times out/gets killed.
- Only rebuild `web`. **Never** `docker compose down -v` or touch the `wa-session` volume (forces WhatsApp re-pairing; see `docs/DEPLOY.md`).
- No node on the VPS host: DB migrations are applied manually (see §5).
- Paths with `[id]` need quoting over ssh/scp — upload to a plain path then `mv` on the VPS.
- Backups made on the VPS: `~/Mapping/.deploy-backup-20260930/` (`MapView.tsx` original, `MapView.v2.tsx` = after label feature/before group legend, `schema.prisma`, `db-pre-label.dump` full pg_dump).

## 4. Work done in this session (2026-09-30)
### Problem
`/map` pins were colored by `pipelineStage`, but reps never advance it (1226/1367 leads sit at "New"), so only ~3 colors showed (grey, near-identical sky/cyan, brown). Legend (pipeline stages) was useless.

### Change A — Real status + legend-as-filter
- Pin color/legend/filter now based on `tagCategory` (already returned by `GET /api/leads`, computed in `src/lib/leadSegmentation.ts` — same classification as `/reports/kanban`).
- Final design (latest iteration, user request): four top-level groups in the bottom-left legend:
  | Group | Rule | Color |
  |---|---|---|
  | Untouched | `tagCategory === "untouched"` | slate `#94a3b8` |
  | Tidak Ada Kontak WA | `noWaAccount` or no `phoneNormalized` | brown `#8B4513` |
  | Later | lead has a `label` | purple `#7c3aed` |
  | Contacted | everything else | blue `#3b82f6` |
  - Precedence: label (Later) > no WA > untouched > contacted.
  - **Later** expands → Dental / Aesthetic / Low rating / Government Affiliate / Other options (with counts, each toggleable).
  - **Contacted** expands → Appointment, Reject, Awaiting Reply, Replied by Bot, Further Contact, Follow Up, Letter Sent, Not-Interested, Non-Responsive, Needs Review (toggleable; all drawn blue). Both sub-lists start minimized.
  - Click a row to show/hide on pins AND the left lead list; counts shown; Show all (clears all hidden sets) / Hide all (hides the 4 groups).
  - Left panel stage pills removed; shows "Showing X of Y".
  - Drawer badge: `Contacted · <status>` / `Later · <label>` / group name.

### Change B — "Label" (reason for not contacting yet)
- Drawer's "Stage" dropdown replaced by **Label**: — No label —, Dental, Aesthetic, Low rating, Government Affiliate, Other options (shows textarea + "Save reason"; reason required, max 500 chars). Non-"other" options save immediately.
- DB: new columns `leads.label`, `leads.label_note` (migration `20260930100000_lead_label`, applied manually via psql and recorded in `_prisma_migrations`).
- API: `PUT /api/leads/[id]/label` body `{label: "dental"|"aesthetic"|"low_rating"|"government_affiliate"|"other"|null, note?}`; logs `lead_activities` type `label_change` (payload `{from,to,note}`), shown in the drawer Activity list.
- Staging-import upsert does not touch these columns (CRM-owned).
- Tested via curl against the live API (set/clear label, other-without-reason → 400); test activity rows were deleted.

## 5. Files touched (relative to `Mapping/`)
- `apps/web/src/app/map/MapView.tsx` — legend/filter/groups, label UI, drawer, activity rendering (main file; most future map work happens here).
- `apps/web/src/app/api/leads/[id]/label/route.ts` — NEW label endpoint.
- `apps/web/prisma/schema.prisma` — added `label`, `labelNote` to `Lead`.
- `apps/web/prisma/migrations/20260930100000_lead_label/migration.sql` — NEW.
- (10-01, belum deploy) `apps/web/src/app/chat/page.tsx` — `LeadInfoCard` + hover popover pada tombol Info Lead; `apps/web/src/app/chat/types.ts` — field opsional tambahan di `LeadBrief`.
- Unchanged but relevant: `src/lib/leadSegmentation.ts` (status categories/labels/colors), `src/app/api/leads/route.ts` (returns all lead fields + `tagCategory`; new columns flow through automatically), `src/app/api/leads/[id]/route.ts` (PATCH stage — still exists, no longer used by /map UI), `src/app/reports/kanban/*`.

### How to apply a future DB migration (no node on VPS)
```
scp migration.sql → VPS, then:
docker exec -i mapping-db-1 psql -U sahaibat sahaibat_mapping -v ON_ERROR_STOP=1 < migration.sql
docker exec mapping-db-1 psql -U sahaibat sahaibat_mapping -c "insert into _prisma_migrations (id, checksum, finished_at, migration_name, applied_steps_count) values (gen_random_uuid()::text, '<sha256 of file>', now(), '<migration_name>', 1)"
```
Also update `schema.prisma` and rebuild `web` (build runs `prisma generate`).

## 6. Decisions / open questions
- Label wins over no-WA (assumption — user chose "Later" to mean deliberately set aside). Confirm if they want otherwise.
- Later is minimized by default too (user only specified Contacted).
- Map-only colors differ from Kanban `CATEGORY_COLORS` (now moot — contacted statuses are all blue).
- Labels UI is English; "Tidak Ada Kontak WA" kept Indonesian. Map page does not use the i18n context.
- Pins for a lead with an unsaved "Other" selection turn purple immediately (local state) before the reason is saved.
- Not browser-verified: API and page load (HTTP 200) verified, but legend click behavior was not exercised in a browser — worth a quick manual check.

## 7. "Scrape" side (not touched this session)
Scraping pipeline lives in `scrape-queries/`, `scrape-output/`, `scripts/`, `apps/web/src/app/admin/scrapes`, import via `POST /api/admin/import-staging` (reads `scrape-output/<file>.json`, mounted into the web container). `src/lib/upsertLeadsFromStaging.ts` must never overwrite CRM-owned fields (pipelineStage, notes, label, etc.). Nothing was changed here; see `docs/ARCHITECTURE.md` and `Context/` on the VPS for details.

## 8. Housekeeping notes
- The VPS has an old `.deploy-backup-20260929` (previous session's backup) alongside the new one.
- Claude killed a background local build once due to low laptop memory — not a failure; build had completed on the VPS.
- Next ideas (not requested yet): show label on the pin itself, label filter chips in left list, backfill/bulk-label tool, sync Context docs back to VPS.
