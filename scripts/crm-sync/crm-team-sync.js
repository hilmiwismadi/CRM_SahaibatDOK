/**
 * SYNC: personal CRM (Mapping, local + VPS 103.93.162.31:3000 — same data,
 * mirrored) -> team CRM (https://sales.sahaibat.com/crm, /lead-engine).
 *
 * Lives in Mapping/scripts/crm-sync/ alongside:
 *   - sync-log.json        — when the last sync ran + what it found. ALWAYS
 *                             read this first for the incremental query's
 *                             start date, and ALWAYS append a new entry
 *                             after a run (see its own fields for the shape).
 *   - build-import-csv.mjs — turns a psql JSON export into the CSV
 *                             /lead-engine's import box wants (derives
 *                             city/province from the address string).
 *   - imports/<date>.csv   — the CSVs actually pasted into /lead-engine,
 *                             one per sync date, kept for the record.
 *
 * These are TWO SEPARATE systems with separate databases. "Mapping" is
 * where leads get scraped/tracked solo (pipeline_stage: new/contacted/
 * responded/meeting_aligned/...). Nothing that happens there is visible to
 * the team until it's promoted+staged in sales.sahaibat.com (stage:
 * kontak/prospek/demo/batal), which is a completely separate Postgres DB
 * hosted on Vercel/NextAuth — there is NO direct DB access to it, only its
 * own API, authenticated via your browser session.
 *
 * HOW TO RUN A SYNC (repeat this whole flow each time — full SOP is in
 * Context/2.LeadPipelineScripts.md, this is the condensed version):
 *   1. Check sync-log.json's lastSyncAt, then query the personal CRM for
 *      what changed SINCE then (never re-pull everything past "new" —
 *      that's a one-time snapshot query, not a repeatable one):
 *        ssh -i VPS_DW/DWSSH.pem DzakiWismadi@103.93.162.31 \
 *          "docker exec -i mapping-db-1 psql -U sahaibat -d sahaibat_mapping" <<'SQL'
 *        SELECT name, replace(coalesce(phone_normalized,''),'+62','0') AS phone_mobile,
 *               regexp_replace(coalesce(phone_office,''),'[^0-9]','','g') AS phone_office
 *        FROM leads WHERE pipeline_stage <> 'new' AND updated_at > '<lastSyncAt>'
 *        ORDER BY name;
 *        SQL
 *   2. Run this script (paste into DevTools console on sales.sahaibat.com,
 *      logged in) with MY_LEADS left as-is from last time, to see who's
 *      already synced (`alreadyOk`) vs genuinely new (`notFound`).
 *   3. For everyone in `notFound`: they don't exist in the team CRM at all
 *      yet (not a lead, not even a candidate). Re-query just those names
 *      with the row_to_json query in build-import-csv.mjs's header comment,
 *      run that script to get imports/<today>.csv, paste it into "Import
 *      candidates (CSV)" on /lead-engine, THEN re-run this script so it can
 *      promote+stage them.
 *   4. For everyone in `duplicateConflict`: DO NOT retry. Move them out of
 *      MY_LEADS into KNOWN_CONFLICTS below with the right `kind` — see the
 *      comment above KNOWN_CONFLICTS.
 *   5. Update MY_LEADS below to today's new-lead list (append, or replace
 *      old fully-resolved entries — either is safe, already-correct
 *      entries are skipped) and append a new run entry to sync-log.json.
 *
 * Promote+stage logic re-checks current state via the API every run, so
 * it's safe to re-run — partial failures just get retried next time.
 *
 * Snapshot as of 2026-09-21: 30 leads identified as behind (6 already
 * candidates in /lead-engine, 24 not present anywhere — see
 * imports/2026-09-21.csv for those 24).
 *
 * 2026-09-22 addition: 24 leads had WA chat activity today; 4 were already
 * promoted+staged correctly (last run worked), 20 not present at all yet —
 * see imports/2026-09-22.csv for those 20.
 *
 * 2026-09-24 addition (incremental query, updated_at > 2026-09-22): 28
 * leads checked, 22 already correct, 6 not present at all yet — see
 * imports/2026-09-24.csv for those 6. CSV built but NOT yet imported as of
 * this addition — see sync-log.json's 2026-09-24 entry (status
 * "csv-built-pending-import") before assuming these are done.
 */

const MY_LEADS = [
  // --- already candidates in /lead-engine, just need promote+stage ---
  { name: "Klinik Arda 24 Jam", norm_phone: "081213333530" },
  // "Klinik Pratama Telkomedika Yogyakarta" (081111500115), "Klinik
  // Medikatama Jogja" (089607130429), "Klinik Amanah HealthCare"
  // (081392456664), "Klinik Pratama Realino" (08112637366), and "Praktik
  // Mandiri drg. Nanik Ismawati" (085747071538) intentionally removed —
  // see KNOWN_CONFLICTS below, do not re-add without resolving the
  // ownership/duplicate-phone conflict first.

  // --- not present at all yet -> import crm-team-import-2026-09-21.csv first ---
  { name: "KLINIK ANUGERAH TAMANTIRTO BANTUL", norm_phone: "085122602935" },
  { name: "Klinik Barokah", norm_phone: "085100102366" },
  { name: "Klinik Bona Mitra Keluarga Yogyakarta", norm_phone: "08112486168" },
  { name: "Klinik Dan Apotik Sehat Migoenani", norm_phone: "082220044220" },
  { name: "Klinik DOKTER Nur Fitri Widiningrum", norm_phone: "085727523536" },
  { name: "Klinik Dokter Yos Benito", norm_phone: "087838933311" },
  { name: "Klinik Graha Amanah", norm_phone: "081391989253" },
  { name: "Klinik Ibumil Permata Bunda", norm_phone: "082242623333" },
  { name: "Klinik Ihsan Dutomulyono", norm_phone: "088225321950" },
  { name: "KLINIK, LABORATORIUM, APOTEK dan ALAT KESEHATAN ASTA MEDIKA", norm_phone: "08112642552" },
  { name: "Klinik Medika Farma", norm_phone: "082225248471" },
  { name: "Klinik Medika Utama", norm_phone: "08112778776" },
  { name: "Klinik Pratama BKM Ali Maksum", norm_phone: "088233249444" },
  { name: "Klinik Pratama D'Maryam", norm_phone: "081909690529" },
  { name: "Klinik Pratama Husada Raharja", norm_phone: "081229182096" },
  { name: "Klinik Pratama Mitra Medika", norm_phone: "085179807474" },
  { name: "Klinik Pratama PKU Muhammadiyah Umbulharjo", norm_phone: "085159990136" },
  { name: "Klinik Pratama Rawat Jalan Ibnu Abbas Klaten", norm_phone: "0816215500" },
  { name: "Klinik Pratama Sang Timur", norm_phone: "085954947516" },
  { name: "Klinik Pratama Sri Panuntun", norm_phone: "081327728630" },
  { name: "KLINIK RAMADHAN", norm_phone: "085899919163" },
  { name: "Klinik Utama Ultra Medica Yogyakarta", norm_phone: "082314895401" },
  { name: "Prima Medika Tamsis", norm_phone: "081390313322" },
  { name: "rumahgigiku klaten", norm_phone: "08113526161" },

  // --- 2026-09-22 batch: leads chatted today (WA), not present at all yet
  // -> import crm-team-import-2026-09-22.csv first ---
  { name: "dr. Siti Nurjanah", norm_phone: "087899947606" },
  { name: "Dr tri yuli pramana,sp pd-kgeh", norm_phone: "081227609732" },
  { name: "Griya waru sehat", norm_phone: "081399938892" },
  { name: "Klinik Ayya Shovja", norm_phone: "085725258051" },
  { name: "Klinik Banyubiru", norm_phone: "081336143694" },
  { name: "Klinik dokter Purwo Handoko", norm_phone: "085601350600" },
  { name: "Klinik Griya Husada 4", norm_phone: "082138517148" },
  { name: "Klinik Mirza Medika", norm_phone: "081215325670" },
  { name: "KLINIK PRATAMA 24 JAM AMAL SEHAT (Dr. ISTI WIDODO)", norm_phone: "082134851114" },
  { name: "Klinik Pratama Asy-Syifa", norm_phone: "081325668796" },
  { name: "Klinik Pratama dr. Ervina", norm_phone: "0882006069857" },
  { name: "Klinik Utama Mulia Kasih", norm_phone: "085100088263" },
  { name: "Klinik Utama Nareswari by dr. Flora", norm_phone: "087835350027" },
  { name: "Narraya Klinik Solo", norm_phone: "085601602577" },
  { name: "Praktek Mutiara Penumping", norm_phone: "0887433338000" },
  { name: "Praktek Umum dr Wulan ( Dokter Home Care )", norm_phone: "085642930137" },
  { name: "Praktik dr. Harri Haryana, SpKFR", norm_phone: "08122605042" },
  { name: "Praktik Mandiri Bidan Mamik Widiyanti", norm_phone: "082338473020" },
  { name: "Praktik Mandiri drh. ENDAH PURWATI", norm_phone: "081931477774" },
  { name: "Praktik Mandiri dr. Yulin Arditawati, Sp.GK", norm_phone: "085877574314" },

  // --- 2026-09-24 batch: incremental (updated_at > 2026-09-22), not
  // present at all yet -> import imports/2026-09-24.csv first ---
  { name: "drg. Dedeh Sugiharti", norm_phone: "082221634443" },
  { name: "Klinik Faris Medika", norm_phone: "0816747340" },
  { name: "Klinik Griya Sehat", norm_phone: "08887700700" },
  { name: "Klinik Harist Kartasura Sukoharjo Solo", norm_phone: "081329098645" },
  { name: "Klinik Meira Medical Center", norm_phone: "081229898641" },
  { name: "KUKIS (Klinik Utama Kasih Ibu Sehati)", norm_phone: "081229989299" },
];

// Phones in this set land on stage "demo" instead of "kontak". Empty this
// week — add norm_phone values here if any of the batch should be "demo".
const DEMO_PHONES = new Set([]);

// Leads deliberately left OUT of MY_LEADS because the team CRM's own
// dedup-by-phone rejected the promote with error:"duplicate". Two different
// root causes end up looking identical here:
//   1. Owned by a TEAMMATE (owner !== you) — a real ownership conflict,
//      e.g. a chain clinic sharing one hotline number across branches.
//      Resolve by talking to the owner.
//   2. Owned by YOU already (owner === hilmi.d@sahaibat.com), under a
//      DIFFERENT business name — this is a scraped-data quality issue
//      (the phone number got associated with the wrong business name in
//      one of the two records, or a landline was recycled/reused), not a
//      teammate conflict. Resolve by checking which name is correct in
//      /crm and fixing/merging there — re-running this script won't help.
// Either way: kept here as a log so the next person running this script
// knows why they're missing, instead of re-adding them and hitting the
// same 409.
const KNOWN_CONFLICTS = [
  {
    name: "Klinik Pratama Telkomedika Yogyakarta / Klinik dan Apotek TelkoMedika Yogyakarta",
    norm_phone: "081111500115",
    conflictsWith: "Klinik dan Apotek TelkoMedika Malang (THC Malang)",
    owner: "shindyfarrah@sahaibat.com",
    stage: "prospek",
    kind: "teammate-ownership",
    seenAt: "2026-09-21",
  },
  {
    name: "Klinik Medikatama Jogja",
    norm_phone: "089607130429",
    conflictsWith: "Klinik Pratama Medikatama",
    owner: "septi@sahaibat.com",
    stage: "kontak",
    leadId: "7c56f65e-b6cc-4b76-b4f2-f0bc9db7d0fa",
    kind: "teammate-ownership",
    seenAt: "2026-09-22",
  },
  {
    name: "Klinik Amanah HealthCare (Persalinan 24 Jam)",
    norm_phone: "081392456664",
    conflictsWith: "Primary Clinic 24 Hours Firdaus",
    owner: "hilmi.d@sahaibat.com",
    stage: "kontak",
    leadId: "84850a16-319c-4d0b-83f0-efbea90f5b2d",
    kind: "own-lead-wrong-name",
    seenAt: "2026-09-22",
  },
  {
    name: "Klinik Pratama Realino",
    norm_phone: "08112637366",
    conflictsWith: "Primary Clinic 24 Hours Firdaus",
    owner: "hilmi.d@sahaibat.com",
    stage: "kontak",
    leadId: "84850a16-319c-4d0b-83f0-efbea90f5b2d", // same leadId as Amanah HealthCare above — one existing lead's phone matches two different candidate names
    kind: "own-lead-wrong-name",
    seenAt: "2026-09-22",
  },
  {
    name: "Praktik Mandiri drg. Nanik Ismawati",
    norm_phone: "085747071538",
    conflictsWith: "Klinik Pratama Makmur Jaya 3",
    owner: "hilmi.d@sahaibat.com",
    stage: "kontak",
    leadId: "3327aad1-48ab-418f-9cfe-aac9f58ca0c5",
    kind: "own-lead-wrong-name",
    seenAt: "2026-09-22",
  },
];

function normPhone(p) {
  if (!p) return "";
  let d = String(p).replace(/\D/g, "");
  if (d.startsWith("62")) d = "0" + d.slice(2);
  if (d.startsWith("8")) d = "0" + d;
  return d;
}

async function run() {
  const leadsRes = await fetch("/api/leads", { credentials: "include", cache: "no-store" });
  const leadsData = await leadsRes.json();
  const leadsArr = leadsData.leads || leadsData;

  const candRes = await fetch("/api/lead-candidates?status=all", { credentials: "include", cache: "no-store" });
  const candData = await candRes.json();
  const candArr = candData.candidates || candData.leads || candData;

  const report = { promoted: [], promoteFailed: [], duplicateConflict: [], staged: [], stageFailed: [], alreadyOk: [], notFound: [] };

  for (const m of MY_LEADS) {
    const wantStage = DEMO_PHONES.has(m.norm_phone) ? "demo" : "kontak";

    let leadHit = leadsArr.find((x) => normPhone(x.phone) === m.norm_phone);

    if (!leadHit) {
      const candHit = candArr.find((x) => normPhone(x.phone) === m.norm_phone);
      if (!candHit) {
        report.notFound.push(m.name);
        continue;
      }
      const promoteRes = await fetch(`/api/lead-candidates/${candHit.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "promote" }),
      });
      const promoteBody = await promoteRes.json().catch(() => null);
      if (!promoteRes.ok) {
        // "duplicate" = the team CRM already has this phone number claimed by
        // someone else (e.g. a chain clinic's shared hotline). This is an
        // ownership conflict to resolve with the owner, not a retryable
        // failure — keep it out of promoteFailed so it doesn't get confused
        // with actual bugs/500s.
        if (promoteBody?.error === "duplicate" && promoteBody?.conflict) {
          report.duplicateConflict.push({ name: m.name, ...promoteBody.conflict });
        } else {
          report.promoteFailed.push({ name: m.name, status: promoteRes.status, error: promoteBody?.error });
        }
        continue;
      }
      report.promoted.push(m.name);
      leadHit = promoteBody?.lead || null;
      if (!leadHit) {
        const refetch = await fetch("/api/leads", { credentials: "include", cache: "no-store" });
        const refetchData = await refetch.json();
        const refetchArr = refetchData.leads || refetchData;
        leadHit = refetchArr.find((x) => normPhone(x.phone) === m.norm_phone);
      }
      if (!leadHit) {
        report.stageFailed.push({ name: m.name, error: "promoted but could not locate new lead id" });
        continue;
      }
    }

    if (leadHit.stage === wantStage) {
      report.alreadyOk.push(m.name);
      continue;
    }

    const stageRes = await fetch(`/api/leads/${leadHit.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ stage: wantStage }),
    });
    const stageBody = await stageRes.json().catch(() => null);
    if (!stageRes.ok) {
      report.stageFailed.push({ name: m.name, status: stageRes.status, error: stageBody?.error });
      continue;
    }
    report.staged.push({ name: m.name, stage: wantStage });
  }

  console.log("=== CRM team sync report ===");
  console.log(`Already correct: ${report.alreadyOk.length}`);
  console.log(`Newly promoted: ${report.promoted.length}`, report.promoted);
  console.log(`Promote FAILED: ${report.promoteFailed.length}`, report.promoteFailed);
  console.log(`Duplicate/ownership conflict (needs manual resolution, not a bug): ${report.duplicateConflict.length}`, report.duplicateConflict);
  console.log(`Stage updated: ${report.staged.length}`, report.staged);
  console.log(`Stage FAILED: ${report.stageFailed.length}`, report.stageFailed);
  console.log(`Not found (import the CSV first): ${report.notFound.length}`, report.notFound);
  if (KNOWN_CONFLICTS.length) {
    console.log(`(${KNOWN_CONFLICTS.length} lead(s) intentionally excluded from MY_LEADS — see KNOWN_CONFLICTS at top of file)`, KNOWN_CONFLICTS);
  }
  // Plain-text dump so the FULL report (including nested error objects) can
  // be copy-pasted out of the console — logging objects as console.log args
  // only copies as "{...}" placeholders, not their actual contents.
  console.log("=== Full report JSON (copy this if sharing failures) ===");
  console.log(JSON.stringify(report, null, 2));
  return report;
}

run();
