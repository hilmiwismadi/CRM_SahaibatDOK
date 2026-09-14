/**
 * Run this by pasting into the browser DevTools Console while logged in
 * on https://sales.sahaibat.com/crm (or /lead-engine — either page works,
 * it just calls the site's own API with your session cookies).
 *
 * What it does, for the 82 leads listed in MY_LEADS below:
 *   1. If a lead is still an unpromoted candidate on /lead-engine,
 *      promote it to the CRM (PATCH /api/lead-candidates/{id} action=promote).
 *   2. Once it's a CRM lead (either just-promoted or already was),
 *      make sure its stage is "kontak" (Contacted) — except the 5 leads
 *      in DEMO_PHONES, which get "demo" (Demo) instead.
 *
 * Safe to re-run: it re-checks current state from the API every time and
 * skips anything already correct, so partial failures (see note below)
 * don't need manual bookkeeping — just run it again later.
 *
 * KNOWN BLOCKER (as of 2026-09-14): promoting a candidate currently fails
 * server-side with a 500 —
 *   {"error":"null value in column \"id\" of relation \"facilities\" violates
 *   not-null constraint"}
 * This is a bug in sales.sahaibat.com itself (not fixable from here) and
 * affects every candidate promotion site-wide, not just these leads. Until
 * whoever maintains that app fixes it, this script will promote nothing —
 * it'll report each failure and move on. The stage-fixing step for leads
 * ALREADY in the CRM works fine independent of this bug.
 */

const MY_LEADS = [
  {"name": "dokter praktek mandiri dr.Lisa Linda Sari pindah Lokasi ke pelemsewu RT 3, praktek lama ke utara masuk kampung rt 3", "norm_phone": "081326813850"},
  {"name": "Dr. dr. Yaltafit Abror Jeem, M. Sc", "norm_phone": "085643661294"},
  {"name": "dr. Fajar Waskito, Sp.KK (K), M.Kes", "norm_phone": "085100176095"},
  {"name": "Dr Gandi Setyawan", "norm_phone": "085747000009"},
  {"name": "Dr Shinta P, SPOG", "norm_phone": "0274582115"},
  {"name": "Intibios Lab, Klinik & Farmasi Semarang", "norm_phone": "082120006869"},
  {"name": "Klinik 24 Jam Dokter Keluarga Korpagama UGM", "norm_phone": "0895418930777"},
  {"name": "Klinik Aisya", "norm_phone": "082130000399"},
  {"name": "Klinik Amanah HealthCare (Persalinan 24 Jam)", "norm_phone": "081392456664"},
  {"name": "Klinik Bina Sehat Semarang", "norm_phone": "089603959680"},
  {"name": "Klinik Cita Sehat Semarang", "norm_phone": "085786555595"},
  {"name": "Klinik Dr. Rita GUGURKAN KANDUNGAN Sleman", "norm_phone": "085385433302"},
  {"name": "Klinik Gading", "norm_phone": "0274375396"},
  {"name": "Klinik Gigi Belle Dente I Dokter Gigi Terdekat Sleman Jogja", "norm_phone": "085117636387"},
  {"name": "Klinik Gigi Dentes Tridadi | Klinik Dokter Gigi Terdekat Jogja", "norm_phone": "087878896678"},
  {"name": "Klinik Idola", "norm_phone": "0274867312"},
  {"name": "KLINIK MATAHARI", "norm_phone": "02744461804"},
  {"name": "Klinik Medikatama Jogja", "norm_phone": "089607130429"},
  {"name": "Klinik Notokusumo", "norm_phone": "02745023738"},
  {"name": "Klinik PMI Kabupaten Sleman", "norm_phone": "081225808415"},
  {"name": "Klinik Pratama Adera", "norm_phone": "081180008812"},
  {"name": "Klinik Pratama Andamari", "norm_phone": "088905737861"},
  {"name": "Klinik Pratama Anugerah", "norm_phone": "081904154839"},
  {"name": "Klinik Pratama As-Waja", "norm_phone": "02744364000"},
  {"name": "Klinik Pratama Bakti Sejahtera", "norm_phone": "0882000236402"},
  {"name": "Klinik Pratama Chandra Brata 24 Jam", "norm_phone": "085848134956"},
  {"name": "Klinik Pratama Delima", "norm_phone": "085868536437"},
  {"name": "Klinik Pratama dr.Wisnu", "norm_phone": "082135342255"},
  {"name": "Klinik Pratama Kartika 0732 Sleman", "norm_phone": "0895320151370"},
  {"name": "Klinik Pratama Mutiara Bunda Ngaliyan", "norm_phone": "085642475063"},
  {"name": "Klinik Pratama Nadi Medika Gunungpati", "norm_phone": "081326148255"},
  {"name": "Klinik Pratama Panasea", "norm_phone": "0274566795"},
  {"name": "Klinik Pratama Parama Satwika", "norm_phone": "02742880475"},
  {"name": "Klinik Pratama Poltekkes Kemenkes Semarang", "norm_phone": "0895328806800"},
  {"name": "Klinik Pratama Poltekkes Kemenkes Yogyakarta", "norm_phone": "0274632629"},
  {"name": "Klinik Pratama Puri Saras", "norm_phone": "082223473435"},
  {"name": "Klinik Pratama Rawat Inap Dewi Mitra Husada (DMH)", "norm_phone": "0274869616"},
  {"name": "Klinik Pratama Realino", "norm_phone": "08112637366"},
  {"name": "Klinik Pratama Sandjojo Sehat", "norm_phone": "081225450496"},
  {"name": "Klinik Pratama Satria Gadingan", "norm_phone": "085100401890"},
  {"name": "Klinik Pratama Sembada Bersinar BNN Kabupaten Sleman", "norm_phone": "082327790909"},
  {"name": "Klinik Pratama SHAQI ( Bidan Sri Sukeni )", "norm_phone": "0895339281575"},
  {"name": "Klinik Pratama UIN Walisongo", "norm_phone": "081382257020"},
  {"name": "Klinik Sehat Sejahtera", "norm_phone": "02745015097"},
  {"name": "Klinik Utama Nurani", "norm_phone": "02746496135"},
  {"name": "Medico Dental Center", "norm_phone": "085747498973"},
  {"name": "Mitrakita Clinic Semarang", "norm_phone": "081215234547"},
  {"name": "Praktek dokter Alma", "norm_phone": "081393798999"},
  {"name": "Praktek Dokter mandiri dr. Kumalatus Sa'dea", "norm_phone": "082264029997"},
  {"name": "Praktek Dokter Nyeri dr. Alim , Sp.An, FIP, FSRM, Dipl.Pain, M.Sc.DM", "norm_phone": "081377002218"},
  {"name": "Praktek Dokter Umum V. Ida Widayati", "norm_phone": "0274513575"},
  {"name": "Praktek dr.Donytra A.W", "norm_phone": "081328212156"},
  {"name": "Praktek dr Ni Luh Putu Padmawati Sp KJ", "norm_phone": "08777551472"},
  {"name": "Praktik dr. Sherly Wira", "norm_phone": "085179793188"},
  {"name": "Praktik Mandiri Dokter dr. Mulia Suryandari", "norm_phone": "08815883288"},
  {"name": "Praktik Mandiri Dokter Fuad Habibi", "norm_phone": "087848125156"},
  {"name": "Praktik Mandiri Dokter Gigi drg. Cukup Rosyida Fathni", "norm_phone": "082134300518"},
  {"name": "Praktik Mandiri dr. Erika Dian Puspitasari", "norm_phone": "085742900140"},
  {"name": "Praktik Mandiri drg. Nanik Ismawati", "norm_phone": "085747071538"},
  {"name": "Praktik Mandiri Fisioterapi Sleman HASNANKURNIA", "norm_phone": "089617733533"},
  {"name": "Puskesmas Danurejan I", "norm_phone": "0274554805"},
  {"name": "Puskesmas Danurejan II Yogyakarta", "norm_phone": "0274554794"},
  {"name": "Puskesmas Depok II", "norm_phone": "0274887797"},
  {"name": "Puskesmas Depok III", "norm_phone": "0274512595"},
  {"name": "Puskesmas Gamping 1", "norm_phone": "02746499870"},
  {"name": "Puskesmas Gedongtengen Kota Yogayakarta", "norm_phone": "081391457272"},
  {"name": "Puskesmas Godean 2", "norm_phone": "02746486511"},
  {"name": "Puskesmas Gondokusuman I", "norm_phone": "0274555226"},
  {"name": "Puskesmas Gondokusuman II", "norm_phone": "0274548933"},
  {"name": "Puskesmas Gondomanan", "norm_phone": "0274419705"},
  {"name": "Puskesmas Jetis Kota Yogyakarta", "norm_phone": "0274554801"},
  {"name": "Puskesmas Kotagede 2 Yogyakarta", "norm_phone": "02744436871"},
  {"name": "Puskesmas Mantrijeron", "norm_phone": "0274388679"},
  {"name": "Puskesmas Mergangsan", "norm_phone": "08112632014"},
  {"name": "Puskesmas Mlati 2", "norm_phone": "0274865909"},
  {"name": "Puskesmas Ngampilan", "norm_phone": "0274371399"},
  {"name": "Puskesmas Pembantu Bener", "norm_phone": "0274622211"},
  {"name": "Puskesmas Sleman", "norm_phone": "0274868374"},
  {"name": "Puskesmas Tegalrejo", "norm_phone": "0274586841"},
  {"name": "Puskesmas Umbulharjo I", "norm_phone": "0274419704"},
  {"name": "Puskesmas Umbulharjo II Kota Yogyakarta", "norm_phone": "0274554793"},
  {"name": "Puskesmas Wirobrajan", "norm_phone": "0274414150"}
];

// The 5 leads tagged "Appointment" in the personal CRM (Mapping) -> should
// land on CRM stage "demo" instead of "kontak".
const DEMO_PHONES = new Set([
  "085747000009", // Dr Gandi Setyawan
  "081180008812", // Klinik Pratama Adera
  "085747498973", // Medico Dental Center
  "081328212156", // Praktek dr.Donytra A.W
  "08815883288",  // Praktik Mandiri Dokter dr. Mulia Suryandari
]);

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

  const report = { promoted: [], promoteFailed: [], staged: [], stageFailed: [], alreadyOk: [], notFound: [] };

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
        report.promoteFailed.push({ name: m.name, status: promoteRes.status, error: promoteBody?.error });
        continue;
      }
      report.promoted.push(m.name);
      leadHit = promoteBody?.lead || null;
      if (!leadHit) {
        // Promoted but response shape unexpected — re-fetch to find it.
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

  console.log("=== CRM sync report ===");
  console.log(`Already correct: ${report.alreadyOk.length}`);
  console.log(`Newly promoted: ${report.promoted.length}`);
  console.log(`Promote FAILED: ${report.promoteFailed.length}`, report.promoteFailed);
  console.log(`Stage updated: ${report.staged.length}`, report.staged);
  console.log(`Stage FAILED: ${report.stageFailed.length}`, report.stageFailed);
  console.log(`Not found in either list: ${report.notFound.length}`, report.notFound);
  return report;
}

run();
