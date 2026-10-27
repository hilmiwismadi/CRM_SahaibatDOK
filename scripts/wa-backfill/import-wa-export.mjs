// Mengubah file JSON dari wa-export.js menjadi SQL backfill untuk tabel wa_messages.
//
//   node import-wa-export.mjs wa-export-202610141530.json [--out backfill.sql] [--accept-manual]
//
// SQL yang dihasilkan:
//   - idempotent: ON CONFLICT (wa_message_id) DO NOTHING (ID pesan WA Web = ID pesan Baileys,
//     jadi pesan yang sudah tercatat CRM tidak dobel);
//   - satu transaksi; DEFAULT-nya ROLLBACK (dry run + laporan). Jalankan dengan -v apply=1 untuk COMMIT;
//   - punya pengaman: kalau ada pesan yang seharusnya tumpang-tindih dengan data CRM tapi
//     TIDAK ADA satu pun ID yang cocok, transaksi dibatalkan (format ID beda -> bakal dobel);
//   - mencatat lead_activities (wa_message_sent / wa_message_received) HANYA untuk pesan yang
//     benar-benar baru, created_at = waktu pesan (bukan waktu import).
//
// Jalankan di VPS (SOP yang sama dengan sync_daily_summaries):
//   scp -i VPS_DW/DWSSH.pem backfill.sql DzakiWismadi@103.93.162.31:/tmp/backfill.sql
//   ssh ... "docker exec -i mapping-db-1 psql -U sahaibat sahaibat_mapping -v ON_ERROR_STOP=1 < /tmp/backfill.sql"            # dry run
//   ssh ... "docker exec -i mapping-db-1 psql -U sahaibat sahaibat_mapping -v ON_ERROR_STOP=1 -v apply=1 < /tmp/backfill.sql"  # COMMIT
import { readFileSync, writeFileSync } from "node:fs";

const [, , inFile, ...rest] = process.argv;
if (!inFile) { console.error("pakai: node import-wa-export.mjs <export.json> [--out file.sql] [--accept-manual]"); process.exit(1); }
const outFile = rest.includes("--out") ? rest[rest.indexOf("--out") + 1] : inFile.replace(/\.json$/i, "") + ".backfill.sql";
const acceptManual = rest.includes("--accept-manual");

const data = JSON.parse(readFileSync(inFile, "utf8"));
if (!data.chats || !Array.isArray(data.chats)) { console.error("format tidak dikenal: tidak ada chats[]"); process.exit(1); }

const TRUSTED = new Set(["jid", "composer", "title-digits", "title-name"]);
const rows = [];
const report = [];
const seen = new Set();

for (const c of data.chats) {
  const r = { phone: c.phone, name: c.name, status: c.status, verified: c.verified, msgs: 0, skipped: "", warnings: c.warnings || [] };
  report.push(r);
  if (c.status !== "ok") { r.skipped = c.status; continue; }
  if (!/^\+\d{8,15}$/.test(c.phone || "")) { r.skipped = "format nomor tidak valid"; continue; }
  if (!TRUSTED.has(c.verified) && !(c.verified === "manual" && acceptManual)) { r.skipped = `chat belum terverifikasi (${c.verified}) — cek headerTitle="${c.headerTitle}", pakai --accept-manual bila sudah diperiksa`; continue; }
  for (const m of c.messages || []) {
    if (!m.id || !/^[A-Za-z0-9]+$/.test(m.id)) continue;
    if (m.type === "other") continue; // pesan sistem / tak dikenal
    const ts = new Date(m.ts);
    if (Number.isNaN(ts.getTime())) continue;
    const key = c.phone + "|" + m.id;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({
      phone: c.phone, mid: m.id, dir: m.fromMe ? "outbound" : "inbound",
      body: m.text ?? null, mtype: m.type || "text",
      sent: ts.toISOString().replace("T", " ").replace("Z", "").slice(0, 19), // UTC, timestamp tanpa zona (sama seperti kolom sent_at)
      approx: Boolean(m.approxTime),
    });
    r.msgs++;
  }
}

const lit = (s) => {
  if (s === null || s === undefined) return "NULL";
  let tag = "q", i = 0;
  while (String(s).includes(`$${tag}$`) || String(s).endsWith("$")) tag = "q" + ++i;
  return `$${tag}$${s}$${tag}$`;
};

const values = rows.map((r) => `(${lit(r.phone)}, ${lit(r.mid)}, ${lit(r.dir)}, ${lit(r.body)}, ${lit(r.mtype)}, '${r.sent}'::timestamp, ${r.approx})`);

const sql = `-- Dihasilkan ${new Date().toISOString()} dari ${inFile}: ${rows.length} pesan, ${report.filter((r) => r.msgs).length} chat
\\set ON_ERROR_STOP on
BEGIN;
CREATE TEMP TABLE bf (phone text, mid text, dir text, body text, mtype text, sent_at timestamp, approx boolean) ON COMMIT DROP;
${values.length ? "INSERT INTO bf VALUES\n" + values.join(",\n") + ";" : "-- (tidak ada pesan)"}

-- Pengaman: pesan di file yang waktunya <= pesan terakhir yang SUDAH ada di CRM seharusnya tumpang-tindih.
DO $guard$
DECLARE overlap int; matched int;
BEGIN
  SELECT count(*) INTO overlap FROM bf b
   WHERE b.sent_at <= (SELECT max(m.sent_at) FROM wa_messages m JOIN wa_contacts c ON c.id = m.wa_contact_id WHERE c.phone_normalized = b.phone);
  SELECT count(*) INTO matched FROM bf b WHERE EXISTS (SELECT 1 FROM wa_messages m WHERE m.wa_message_id = b.mid);
  RAISE NOTICE 'pesan di zona tumpang-tindih: %, ID yang sudah ada di CRM: %', overlap, matched;
  IF overlap >= 5 AND matched = 0 THEN
    RAISE EXCEPTION 'Ada % pesan di zona tumpang-tindih tapi 0 ID cocok -> format ID WA Web berbeda dari CRM, import dibatalkan agar tidak dobel', overlap;
  END IF;
END $guard$;

-- Kontak yang nomornya belum ada di wa_contacts (tidak ditulis, hanya dilaporkan)
SELECT DISTINCT b.phone AS phone_tanpa_wa_contact FROM bf b WHERE NOT EXISTS (SELECT 1 FROM wa_contacts c WHERE c.phone_normalized = b.phone);

WITH ins AS (
  INSERT INTO wa_messages (id, wa_contact_id, wa_message_id, direction, body, message_type, raw_payload, sent_at)
  SELECT gen_random_uuid(), c.id, b.mid, b.dir, b.body, b.mtype,
         jsonb_build_object('source', 'wa-web-backfill', 'approxTime', b.approx), b.sent_at
  FROM bf b
  JOIN LATERAL (SELECT id FROM wa_contacts WHERE phone_normalized = b.phone ORDER BY id LIMIT 1) c ON true
  ON CONFLICT (wa_message_id) DO NOTHING
  RETURNING wa_contact_id, wa_message_id, direction, sent_at
), act AS (
  INSERT INTO lead_activities (id, lead_id, type, payload, created_at)
  SELECT gen_random_uuid(), wc.lead_id,
         CASE ins.direction WHEN 'inbound' THEN 'wa_message_received' ELSE 'wa_message_sent' END,
         jsonb_build_object('waContactId', ins.wa_contact_id, 'waMessageId', ins.wa_message_id, 'source', 'wa-web-backfill'),
         ins.sent_at
  FROM ins JOIN wa_contacts wc ON wc.id = ins.wa_contact_id
  WHERE wc.lead_id IS NOT NULL
  RETURNING 1
)
SELECT (SELECT count(*) FROM ins) AS pesan_baru_masuk,
       (SELECT count(*) FROM bf) - (SELECT count(*) FROM ins) AS sudah_ada_dilewati,
       (SELECT count(*) FROM act) AS lead_activities_baru;

\\if :{?apply}
  COMMIT;
  \\echo 'COMMIT: tersimpan'
\\else
  ROLLBACK;
  \\echo 'DRY RUN: di-ROLLBACK (tambahkan -v apply=1 untuk menyimpan)'
\\endif
`;

writeFileSync(outFile, sql);
console.table(report.map((r) => ({ phone: r.phone, name: (r.name || "").slice(0, 28), status: r.status, verified: r.verified || "", pesan: r.msgs, catatan: r.skipped || r.warnings.join("; ").slice(0, 70) })));
console.log(`\nSQL: ${outFile} — ${rows.length} pesan dari ${report.filter((r) => r.msgs).length} chat; dilewati: ${report.filter((r) => r.skipped).length} chat`);
