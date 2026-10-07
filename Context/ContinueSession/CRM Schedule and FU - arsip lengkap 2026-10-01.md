# CRM Schedule and FU — Session Notes (resume file)

Written 2026-10-01 for a session that ran 2026-09-29 → 2026-10-01. Purpose: a fresh Claude session can continue without the original chat. Companion file: `CRM Map n Scrape.md` (same folder) — covers VPS access, deploy procedure and the `/map` work; read §1–3 of it first, this file does not repeat them.

User context: BD/Sales at SahAIbat DOK; Claude acts as sales strategist, not copywriter (memory `user_role_sahaibat`). User writes Indonesian — answer in Indonesian.

## 0. CHECKPOINT 2026-10-01 (sesi lanjutan: fitur Jadwal) — baca ini dulu
**Ringkasan (bahasa manusia).** Atas permintaan user dibuat halaman **`/schedule`** (kalender seperti GCal: tampilan Bulan + Minggu, panel Agenda hari terpilih, daftar Terlambat) yang menampilkan follow up **dan** appointment (Demo GMeet / Visit / Lainnya). Popup "Pengingat Follow Up" di sidebar punya tombol "📅 Jadwal" ke halaman itu. Follow up sekarang bisa diberi **jam spesifik** (opsional) dari 3 tempat: prompt follow up di `/chat`, ⏰ Tunda di sidebar, form di `/schedule`. Semua sudah **live di prod** dan migrasi DB sudah diterapkan.

**Insiden saat deploy (pelajaran).** Kode baru ter-rebuild ke prod (container `web` restart) *sebelum* migrasi DB dijalankan → `GET /api/conversations` 500 (Prisma P2022, kolom `follow_up_has_time` tidak ada) dan `/chat` tidak bisa memuat chat. Penyebab: migrasi manual ditolak classifier izin, lalu user yang menjalankannya via `!`. Pulih setelah migrasi (verifikasi: conversations/schedule/follow-up-reminders = 200, `/schedule` = 200). **Urutan deploy ke depan: migrasi DB dulu (additive), baru rebuild web.** Klasifier menolak `tar|ssh` upload, `docker exec psql`, dan rebuild untuk "Production Deploy" sampai user menjalankan/mengizinkan — jangan akali, minta user jalankan dengan `!`.

**Yang dibangun (semua di `apps/web`, sudah di VPS):**
- DB (migrasi `20261001120000_schedule_appointments`, sudah di `_prisma_migrations`): kolom `wa_contacts.follow_up_has_time bool default false`; tabel baru `lead_appointments` (id, lead_id, kind demo_gmeet|visit|other, starts_at, duration_min, location, note, status scheduled|done|cancelled, created/updated_at).
- Semantik jam: `followUpAt` date-only = tanggal itu 00:00 UTC (`hasTime=false`, baca hari dari string ISO `slice(0,10)`); timed = ISO instant (client kirim `new Date(local).toISOString()`; server menganggap ada jam bila string mengandung "T").
- API: `GET /api/schedule?from&to` (semua follow up aktif + appointment dalam range), `GET /api/schedule/lead-search?q=` (membawa `waContactId`; follow up butuh kontak WA, appointment tidak), `POST /api/schedule/appointments`, `PATCH|DELETE /api/schedule/appointments/[id]`. `flag` & `follow-up` (snooze) menerima datetime; `follow-up-reminders` & `conversations` mengembalikan `followUpHasTime`.
- Membuat appointment otomatis menyalakan flag `appointment` (+ log `tag_change`) pada semua wa_contact lead itu; flag **tidak** dimatikan saat appointment dibatalkan/selesai (flag tetap manual).
- Activity baru di `lead_activities`: `appointment_scheduled|done|cancelled` (label + warna di `/reports/history`).
- UI: `src/app/schedule/{page,Modals,utils}.tsx`, perubahan `AppSidebar.tsx`, `chat/page.tsx`, `translations.ts` (kunci `sched*`, `reminderTimeOptional`, `chatFollowUpTimeLabel`, `activityAppointment*`).
- Catatan teknis: file `schema.prisma`, `AppSidebar.tsx`, `translations.ts` di VPS berakhiran **CRLF** — edit lewat Python mengubahnya ke LF; sudah dikembalikan ke CRLF sebelum upload. Jaga ini agar diff tetap kecil. Backup pra-deploy: VPS `~/Mapping/.deploy-backup-20261001/` (`src-pre-schedule.tgz`, `db-pre-schedule.dump`).

**Yang perlu dicek user / belum diverifikasi:**
1. Belum diklik di browser (hanya `tsc`, eslint file baru, dan HTTP 200 endpoint). Cek: Ctrl+F5 → `/schedule` Bulan & Minggu, klik item, "+ Tambah jadwal" (Follow up, Demo GMeet, Visit), ubah jadwal, ✓ Selesai/Batalkan, tombol "📅 Jadwal" di sidebar, input jam di ⏰ Tunda dan prompt `/chat`.
2. Membuat appointment menyalakan tag Appointment lead (masuk kolom Appointment di kanban) — pastikan itu perilaku yang diinginkan; jangan tes dengan lead asli tanpa niat.
3. Lint: `chat/page.tsx` baris ~50 & ~57 punya 2 error react-hooks yang sudah ada sebelumnya (bukan dari perubahan ini).
4. Zona waktu: tampilan memakai zona browser; follow up date-only aman untuk UTC+ (WIB), bisa meleset sehari di zona UTC−.
5. Perubahan **belum di-commit** ke git (VPS & lokal), tercampur dengan pekerjaan sesi lain — pisahkan saat commit.
6. Belum ada item nav "Jadwal" di sidebar utama (hanya via tombol di popup / URL `/schedule`) — tanyakan user.

**Ide lanjutan (belum dikerjakan):** drag-and-drop/klik slot kosong untuk membuat jadwal, kirim undangan/link GMeet otomatis, notifikasi appointment hari-H di popup sidebar, tampilan hari (day view), bulk "tunda semua".

## 1. What this session was about
The user listed 19 improvement notes for the Mapping CRM (`http://103.93.162.31:3000`). Work: (a) map every FE page → API endpoint, (b) guess where each note belongs, (c) analyse pitch responses from the prod DB, (d) implement the notes whose instructions were certain, (e) rebuild the **Pengingat Follow Up** (sidebar reminder) feature, (f) started documenting the team CRM `sales.sahaibat.com` (paused — see §8).

## 2. Mapping app: page → API map (apps/web/src/app)
| FE route | Main files | APIs used |
|---|---|---|
| `/map` | `map/MapView.tsx` | `GET /api/leads`, `GET/PATCH /api/leads/[id]`, `/api/leads/[id]/activities` |
| `/dashboard` | `dashboard/page.tsx`, `LeadModal`, `AddLeadModal` | `/api/leads`, `/api/leads/filter-options`, `/api/pipeline-stages` |
| `/chat` | `chat/page.tsx`, `ConversationList`, `Composer`, `MessageThread`, `UnlinkedContacts` | `GET /api/conversations?q=`, `PATCH /api/conversations/[id]/flag`, `.../replied`, `.../follow-up` (new), `GET/POST /api/leads/[id]/messages`, `/api/leads/[id]/contacts`, `/api/templates`, `/api/wa/*` |
| `/letters` | `letters/page.tsx`, `LetterDocument.tsx` | `GET /api/leads`, `POST /api/leads/[id]/quick-tag {action:"letterSent"}`, `POST /api/letters/generate` (returns PDF download only) |
| `/templates` | `templates/page.tsx` | `/api/templates` |
| `/reports/overview` | | `/api/reports/sales-summary`, `/segmentation` |
| `/reports/kanban/overview`, `/daily` | `reports/kanban/*`, `shared.tsx` | `/api/reports/segmentation`; daily uses `GET /api/reports/kanban-history?days=60`; drag uses `quick-tag` |
| `/reports/history` | `reports/history/page.tsx` | `/api/reports/activity-log`, `/chat-activity` |
| Sidebar (every page) | `components/AppSidebar.tsx` | `GET /api/leads/follow-up-reminders` (polled 60s), `PATCH /api/conversations/[id]/follow-up` |

Key facts:
- Lead category is one canonical value from `src/lib/leadSegmentation.ts` (`classifyLead`, `CATEGORY_ORDER`, first match wins). Used by inbox, reports and kanban.
- `wa_contacts` holds the flags: `needsFollowUp`, `followUpAt`, `followUpNote` (new), `letterSent`, `noWaAccount`, `appointment`, `declined`, `needsOtherContact`, `repliedOverrideAt/Kind`.
- Every flag change writes `lead_activities` (`tag_change`). `/reports/kanban-history` counts **events** (not snapshots): the six tag columns have history only since `tag_change` logging started — older days show 0. `snooze` deliberately is NOT a `tag_change` so it isn't counted as a new follow-up.
- wa-bridge send path is **text only** (`lib/waSend.ts`, `apps/wa-bridge/src/routes/send.ts`); no media.

## 3. DONE and deployed to prod (2026-09-29)
All verified with `tsc --noEmit` and HTTP smoke tests; **not clicked through in a browser** (would mutate real leads).

| # | Change | Files |
|---|---|---|
| 8 | Tab title count now uses server `c.needsReply` (was counting raw inbound last-message → showed 31 vs 8) | `chat/page.tsx` |
| 13 | `/reports/kanban/daily` column order: Belum→Tersentuh, Tidak Ada Kontak WA, Perlu Lanjutan (FU, Further Contact, Letter Sent), Jawaban Pasti (Appointment, Declined), then right side: Non-Responsive, Not-Interested, Dijawab Bot, Perlu Diklasifikasi. `/reports/kanban/overview` was NOT changed | `reports/kanban/daily/page.tsx` |
| 6 | `/letters` dropdown "Semua / Sudah dikirim / Belum dikirim" (client-side on `letterSent`; still sits under the "Hanya Further Contact" checkbox, so uncheck it to see all leads) | `letters/page.tsx` |
| 4 | Chat textarea auto-grows (cap 320px) and is drag-resizable (`resize-y`); manual drag stops auto-grow until reload | `chat/Composer.tsx` |
| 2 | Reminder popup widened 280→360px, lead name wraps to 2 lines | `components/AppSidebar.tsx` |
| FU | **Pengingat Follow Up rebuild** — see §4 | see §4 |

## 4. Follow-up reminder feature (the main work)
User asked: 8 reminders were piling up; some were already done outside chat (untracked); needed snooze; wanted a short "what to do" note in the tooltip.

Behaviour (sidebar popup, `ReminderItem` component inside `AppSidebar.tsx`):
- Note shown under the lead name (grey box) + in hover tooltip (`title` = name + note). No note → "Belum ada catatan".
- **✓ Sudah**: closes the follow-up (`needsFollowUp=false`, clears `followUpAt/Note`) with optional "dilakukan lewat apa?" text. Logs `tag_change(false)` + `follow_up_done` {note, task, dueAt}.
- **⏰ Tunda**: Besok / 3 hari / 1 minggu / date picker → sets `followUpAt`, tag stays. Logs `follow_up_snoozed` {from,to}.
- **✎ Catatan**: edits `followUpNote` in place.
- `/chat` follow-up prompt ("Kapan mau di-follow up?") now also has a note textarea (max 300), prefilled from `item.followUpNote`.
- `/reports/history` shows labels/descriptions for `follow_up_done` and `follow_up_snoozed`.

Files touched (all under `apps/web`):
- `prisma/schema.prisma` (+`followUpNote String? @map("follow_up_note")`), `prisma/migrations/20260929120000_wa_follow_up_note/migration.sql`
- `src/app/api/conversations/[id]/flag/route.ts` (accepts `followUpNote`, cleared when tag off, goes into `tag_change` payload)
- `src/app/api/conversations/[id]/follow-up/route.ts` **(new)** — `PATCH` with `{action:"done",note?}` | `{action:"snooze",until:"YYYY-MM-DD"}` | `{action:"note",note}`; 409 if no active follow-up, 400 bad input, 404 unknown id
- `src/app/api/leads/follow-up-reminders/route.ts`, `src/app/api/conversations/route.ts` (return `followUpNote`)
- `src/app/chat/types.ts`, `src/app/chat/page.tsx`, `src/app/components/AppSidebar.tsx`, `src/app/reports/history/page.tsx`, `src/lib/i18n/translations.ts` (id + en keys `reminder*`, `chatFollowUpNote*`, `activityFollowUp*`, `follow_up_done/snoozed`)

### DB change on prod (done, with consent)
- `ALTER TABLE wa_contacts ADD COLUMN follow_up_note TEXT;` applied in one transaction via `docker exec mapping-db-1 psql`, plus a row in `_prisma_migrations` (checksum `d974d9d7789da554f03eebf622e1587f6deff8100c887a6e2040b084da1c5f8d` = sha256 of the LF file). Prod web image has no prisma CLI and doesn't auto-migrate, so this manual route is the norm.
- Backups on VPS `~/Mapping/.deploy-backup-20260929/`: `db-pre-followup-note.dump` (pg_dump -Fc), `src-pre-followup.tgz` (9 originals), earlier per-file copies of Composer/chat/letters/kanban/sidebar originals. Rollback: restore files from the tgz, rebuild `web`; the extra column is harmless.
- Only `web` was rebuilt; `db` and `wa-bridge` untouched (WhatsApp session safe).

## 5. Analysis result: what happens after the pitch ("Perkenalkan saya Dzaki Wismadi…")
Read-only SELECTs on prod (pitch matched by body prefix; covers templates "If Replied - Pitch" and "Pitch Revised, Email 1st"). 110 pitched leads, all pitched **after** they had replied to the opener (replies are mostly CS greetings like "ada yang bisa kami bantu?").
- **56 (51%) silent after pitch**; 55 of them never got any follow-up from us (only 1 did). Age: 11 <1 day, 4 at 4–7d, 23 at 7–14d, 18 ≥14d.
- **54 (49%) continued**: first reply ≤10 min 30, 10–60 min 13, 1–24 h 11, **none after 24 h** (median 5 min) → if no reply within a day, it effectively never comes. 19 had 1 reply, 19 had 2–3, 7 had 4–6, 9 had 7+. 24 of them are waiting on **our** reply (last message inbound).
- Outcome tags among repliers: further_contact 18, needs_fu 12, declined 9, appointment 7, letter_sent 1, no_wa 1, untagged 6.
- Reply themes (rough keyword counts, overlapping): forwarded to others 22, refusal/apology 21, scheduling 13, asked official letter 11, asked who/what 7, asked email 6 → supports a "send research letter" FU for the silent group.
- Dashboard labels: "Not-Interested" (52) is really `no_reply_after_pitch` = replied before, silent after pitch (my count 56; gap of 4 not investigated — likely category priority/overrides). "Non-Responsive" (8) = never replied at all (needs first outbound >2 days old). Suggest relabeling "Not-Interested" → "Diam setelah Pitch".
- Caveats: "never followed up" only holds if messages sent from the phone are also stored in `wa_messages` (unverified: 3888 inbound vs 442 outbound rows); hour-of-day analysis dropped (timezone of stored timestamps unclear); n=110.

## 6. NOT done yet (backlog)
Follow-up related first:
1. **`/followups` page** (#3, #15–16): table of silent-after-pitch leads (56) + leads awaiting our reply (24): days since pitch, number of FUs, last message, suggested action; reschedule/done/snooze there too. Endpoint idea `GET /api/followups` or `/api/reports/followup-analysis`, reuse `lib/noReplyAfterPitch.ts`, `lib/nonResponsive.ts`. **User's spec sentence was cut off** ("…merekap list tabel leads yang") — ask them to finish it before building.
2. Bulk handling for many stacked reminders (e.g. "tunda semua") — not requested, only an idea.
3. Existing 8 reminders have no notes yet; user clicks ✓ Sudah / ✎ Catatan themselves.

Other notes: #5 tooltip-labelling bug in `/chat` (guess: right-click context menu clipped at screen edge, `chat/page.tsx` ~470–620; needs reproduction); #7 lead/map details inside `/chat` panel without going to `/map`; #9/#10 send PDF/file from CRM (needs media in wa-bridge `send.ts` + upload endpoint; risk: wa-bridge restart/re-pairing); #11/#12 auto-increment letter number + badge "Surat No. X" (counter table; `letters/generate/route.ts`; `letter_generated` activity already stores `nomorSurat`); #14 notes/status log (`POST /api/leads/[id]/notes` → `lead_activities` type `note`); #17/#18 non-WA analysis and cold-call plan (`noWaAccount`, `leads.phone_office`); #19 sync to team CRM — user confirmed **no API exists**, so stays manual (`scripts/crm-sync/crm-team-sync.js` pasted in DevTools of sales.sahaibat.com; idea: a Mapping-side delta + CSV export command).
Small pending decisions: whether `/reports/kanban/overview` column order should match daily; `app/layout.tsx` still has default title "Create Next App".

## 7. Gotchas for the next session
- Source of truth is the VPS (`~/Mapping`); local `D:\Hilmi\Coding\Sahaibat\Mapping` was re-synced from it on 2026-09-30, and the harness reported `AppSidebar.tsx`, `translations.ts`, `schema.prisma` changed on disk after my last edit. A grep on 2026-10-01 still found `followUpNote` / `reminderDone` in them — but diff local vs VPS before editing.
- `apps/web/AGENTS.md`: Next.js 16 has breaking changes; read `node_modules/next/dist/docs/` before Next-specific code (my edits used only plain React + existing route patterns).
- Type-check: `cd apps/web && ../../node_modules/.bin/tsc --noEmit -p .` (after `../../node_modules/.bin/prisma generate`). Docker Desktop was not running locally, so no local DB.
- On Windows, `tar` treats `C:` as a remote host: write tarballs to a POSIX path (`/c/Users/...`), and quote `[id]` paths.
- Permissions: `D:\Hilmi\Coding\Sahaibat\.claude\settings.local.json` allows `Bash(ssh -i VPS_DW/DWSSH.pem:*)` and `Bash(scp -i VPS_DW/DWSSH.pem:*)`. Use those literal prefixes (no variables) so the rule matches. An earlier deploy attempt was blocked by the auto-mode classifier before the rule existed; do not work around denials.
- `VPS_DW\Note.txt` holds a console password that was accidentally printed in a past session transcript — user should rotate it. Never print it.
- Don't click "💬 Send intro WhatsApp" on sales.sahaibat.com (sends a real message); browser tab 1789771160 may still be open on a client page with an empty "Add a route" form (nothing saved).

## 8. sales.sahaibat.com (team CRM) — partial notes, doc NOT written
User wanted `Mapping/Context/CRMSync/0.CRMSahaibatUnderstanding.md` documenting `/crm`, `/clients/<uuid>`, `/lead-engine` with all user inputs. Done so far (session was logged in as hilmi.d@sahaibat.com, role "Inside Sales Specialist"); the request was then redirected to the improvement list.
- Global nav: Learn (onboarding, academy, assessment, glossary, faq) · Product (/product, /product/dok|konsensus|kader|kasih) · Market (/healthcare-system, /doctors) · Sell (/lead-engine, /crm, /inbox, /letters, /social-desk, /pricing, /commission, /sales-kpi, /people, /playbook/dok|approach-doctors|approach-ngos) · Support (/tickets) · My work (/today, /dashboard, /tasks, /timesheet, /expenses, /profile); EN/ID toggle.
- **/crm** (381 leads: Prospect 191, Contacted 181, Demo 7, Trial 1, Paid 0, Lost 1). KPI cards (paid this month, on trial, open pipeline, CSR/NGO value won). Filters: search, stage chips, response (Any / 🔥 asked profile-meeting / 💬 responded / ⏳ no reply yet), size (Solo / Clinic 2–4 / 5+), sort (Newest / Most interested / Best fit), DOK (Either / Complete / AI Companion / Not established), "Filter by city". Table columns LEAD · SEGMENT · DEAL · STAGE (inline select) · RESPONSE · VALUE; row icons 💬 send intro WhatsApp (1:1) · 📄 `/letters?lead=<id>` · 📞 `tel:` · 📷 IG · ✎ edit · 🗑 delete.
  - **+ Add lead / Edit lead** fields: Contact name, Clinic/organization, Segment (Solo doctor / Klinik Pratama / Clinic network / NGO-Puskesmas), Deal type (DOK monthly / DOK annual / CSR-NGO partnership), Stage (values prospek, kontak, demo, uji_coba, konversi, batal), Phone/WhatsApp, Email, Address, Website, Instagram, TikTok, Facebook, LinkedIn, Notes. Edit also has an **Activity** logger: outcome (📤 contacted/no reply · 📄 asked profile/letter · 💬 asked question · 💰 pricing · 🤝 demo → sets Demo · 🚫 not interested → sets Lost) + channel (Call/WhatsApp/Meeting/Email/Note) + free text + Log.
- **/clients/<uuid>**: status select; 💬 Open conversation, 📞 Call, 🚀 Track onboarding (no message), 💬 Start welcome journey, Edit in CRM (`/crm?edit=<id>`); case counters; "Why this clinic" (Lead Engine score, hints); Details incl. owner and **Transfer lead** (rep select: Bakhri, Septi, Shindy + optional reason; quotes/commissions stay with old rep); **People** (Add a person: name, role text, role select Owner/Founder/Director/Clinical director/PJ = can decide; Clinic manager/Operations = usually; Doctor = influences; Admin/Reception = routes; "Not known yet"; "Confirmed by a person"; phone; WhatsApp; email; "elsewhere?" = duplicate-phone check across clinics; "Link another location" = clinic search); **Getting to the decision-maker** (5 stage buttons: Not looked into / Stuck at reception / Decision-maker named / reached / Refused to route us + "What you learned" text); "Who runs this clinic" → Search for people (web search); **Ways in** → Add a route (target, type warm_intro/direct/professional_social/gatekeeper, channel whatsapp/phone/email/instagram/linkedin/facebook/referral/in_person, value); Programme → Set a programme; "Before the meeting" → Look them up (web search); Journey; Support cases; Customer & subscription → Record customer details; WhatsApp nurture.
- Not opened yet: `/lead-engine` (entirely), "Set a programme", "Record customer details", Transfer lead flow, `/inbox`, `/letters`. Interesting for sync (#19): Mapping stage names vs team stages (prospek/kontak/demo/uji_coba/konversi/batal) — see `scripts/crm-sync/`.
- A separate older CRM exists at `103.93.135.160` (CRM_Grad, FastAPI + React + SQLite, user `SalesAV`, key `~/.ssh/CRMSales.pem`); explored read-only earlier, not related to the Mapping app.

## 9. How to resume
0. Baca §0 (checkpoint 2026-10-01) dulu; tes manual fitur `/schedule` oleh user adalah prioritas pertama, lalu perbaiki bug yang ditemukan.
1. Read this file and `CRM Map n Scrape.md`.
2. Confirm prod state: `curl http://103.93.162.31:3000/api/leads/follow-up-reminders` (should include `followUpNote`), and `ssh -i VPS_DW/DWSSH.pem DzakiWismadi@103.93.162.31 "docker ps"` (web/db/wa-bridge up).
3. Ask the user: (a) finish the truncated #15–18 spec, (b) feedback after trying ✓ Sudah / ⏰ Tunda / ✎ Catatan, (c) whether to match `/reports/kanban/overview` order, (d) whether to continue the sales.sahaibat.com documentation.
4. Next suggested build: `/followups` page (§6.1), then #7 and #11/#12.
