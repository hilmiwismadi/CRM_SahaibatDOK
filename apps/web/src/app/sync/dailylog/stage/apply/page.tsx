"use client";

import { useRef, useState } from "react";
import AppSidebar from "@/app/components/AppSidebar";
import SyncTabs from "../../../SyncTabs";

// One-off stage-sync script for 2026-10-01. Defaults to a dry run; see the
// header comment inside the script. Delete once stage sync is a real feature
// of /sync/dailylog.
const SCRIPT = "/**\n * STAGE SYNC — 2026-10-01. Paste WHOLE block into DevTools Console on\n * sales.sahaibat.com (logged in). APPLY MODE - THIS WILL CHANGE STAGES (was: DRY RUN: prints the plan and\n * changes NOTHING. To apply, set APPLY = true below and paste again.\n *\n * Rules: only raises stage (prospek < kontak < demo < uji_coba < konversi);\n * never lowers; never touches a lead already at \"batal\" (Lost) or at\n * uji_coba/konversi. \"batal\" is only set from prospek/kontak.\n * PATCH /api/leads/{id} {stage} — same call crm-team-sync.js already used.\n */\nconst APPLY = true;\n\nconst ENTRIES = [\n  { name: \"Dr Ahmad Faisal Spesialis Anak Boyolali Praktik Mandiri\", norm_phone: \"081246405556\", want: \"kontak\" }, // Perlu Diklasifikasi\n  { name: \"Dr. Magdalena S\", norm_phone: \"085329056629\", want: \"kontak\" }, // Follow Up\n  { name: \"dr. Nina Wirdyaningsih Martika\", norm_phone: \"082138442475\", want: \"kontak\" }, // Perlu Diklasifikasi\n  { name: \"dr. Noor Alifah SpA\", norm_phone: \"081393720718\", want: \"kontak\" }, // Perlu Diklasifikasi\n  { name: \"Dr. S. Hendradewi, Sp THT, MSI\", norm_phone: \"089618900025\", want: \"kontak\" }, // Perlu Diklasifikasi\n  { name: \"Klinik 24 JAM dr.Arief Wahyu Soekarno\", norm_phone: \"082225155873\", want: \"kontak\" }, // Perlu Diklasifikasi\n  { name: \"Klinik Adi Sehat\", norm_phone: \"081332998301\", want: \"kontak\" }, // Perlu Diklasifikasi\n  { name: \"Klinik Cita Sehat Yogyakarta (Pleret)\", norm_phone: \"085868580799\", want: \"kontak\" }, // Further Contact\n  { name: \"Klinik Dr. Adrian dan Dr. Primanda\", norm_phone: \"085725512020\", want: \"kontak\" }, // Perlu Diklasifikasi\n  { name: \"Klinik dr. MARIA\", norm_phone: \"082133244226\", want: \"kontak\" }, // Perlu Diklasifikasi\n  { name: \"Klinik Griya Sehat\", norm_phone: \"081225908626\", want: \"kontak\" }, // Perlu Diklasifikasi\n  { name: \"Klinik Inusa Bantul\", norm_phone: \"085111301966\", want: \"kontak\" }, // Perlu Diklasifikasi\n  { name: \"Klinik Mari Sehat Plesungan\", norm_phone: \"085135333355\", want: \"kontak\" }, // Perlu Diklasifikasi\n  { name: \"Klinik Mitra Medicare\", norm_phone: \"081333026825\", want: \"kontak\" }, // Perlu Diklasifikasi\n  { name: \"Klinik Naranda\", norm_phone: \"081350490509\", want: \"kontak\" }, // Perlu Diklasifikasi\n  { name: \"Klinik Pratama Asy-Syifa\", norm_phone: \"081325668796\", want: \"kontak\" }, // Further Contact\n  { name: \"Klinik pratama gita husada\", norm_phone: \"085138585992\", want: \"kontak\" }, // Perlu Diklasifikasi\n  { name: \"Klinik pratama ikhsan medika\", norm_phone: \"082323216241\", want: \"kontak\" }, // Perlu Diklasifikasi\n  { name: \"Klinik Pratama Kinasih\", norm_phone: \"082325685664\", want: \"kontak\" }, // Belum Dijawab\n  { name: \"Klinik Pratama PKU Muhammadiyah Imogiri\", norm_phone: \"082131061552\", want: \"batal\" }, // Reject\n  { name: \"KLINIK PRATAMA RAWAT INAP PKU MUHAMMADIYAH CAWAS\", norm_phone: \"081228391575\", want: \"kontak\" }, // Perlu Diklasifikasi\n  { name: \"Klinik Pratama Saras Mustika\", norm_phone: \"085740782119\", want: \"kontak\" }, // Follow Up\n  { name: \"KLINIK PRATAMA SOLO MEDICARE\", norm_phone: \"082133640025\", want: \"kontak\" }, // Dijawab Bot\n  { name: \"Klinik Rawat Inap Solo Peduli\", norm_phone: \"082211119605\", want: \"kontak\" }, // Perlu Diklasifikasi\n  { name: \"KLINIK SAMRATULANGI [dr. Aminah Alaydrus , SpKK. & dr. A. Laqif Alaydrus, SpOG(Kfer)]\", norm_phone: \"085647422653\", want: \"kontak\" }, // Follow Up\n  { name: \"Klinik Teduh\", norm_phone: \"08112957992\", want: \"kontak\" }, // Follow Up\n  { name: \"Klinik Triyola\", norm_phone: \"085141718008\", want: \"kontak\" }, // Further Contact\n  { name: \"KLINIK UMUM PRATAMA BINA SEHAT\", norm_phone: \"083107393282\", want: \"kontak\" }, // Perlu Diklasifikasi\n  { name: \"Klinik Utama Ultra Medica Boyolali\", norm_phone: \"082313307551\", want: \"kontak\" }, // Perlu Diklasifikasi\n  { name: \"Klinik Wiwit\", norm_phone: \"085100898240\", want: \"kontak\" }, // Follow Up\n  { name: \"Klinik Yofandra\", norm_phone: \"08122610885\", want: \"kontak\" }, // Follow Up\n  { name: \"PRAKTEK DOKTER KLINIKU CAWAS\", norm_phone: \"085713474209\", want: \"kontak\" }, // Perlu Diklasifikasi\n  { name: \"Praktek dokter THT Boyolali\", norm_phone: \"08176489083\", want: \"kontak\" }, // Dijawab Bot\n  { name: \"praktek dr Kurniawan Eko Y\", norm_phone: \"085642304118\", want: \"demo\" }, // Appointment\n  { name: \"Praktek Keperawatan Mandiri Suwito Muryani\", norm_phone: \"085228006429\", want: \"kontak\" }, // Perlu Diklasifikasi\n  { name: \"Praktek mandiri dokter hapsari\", norm_phone: \"087836884426\", want: \"kontak\" }, // Follow Up\n  { name: \"Praktek Mandiri drg. Afika Dian E\", norm_phone: \"082127043300\", want: \"kontak\" }, // Perlu Diklasifikasi\n  { name: \"Praktik Dokter (dr. Dea Pristy Amanda, M.M., M.A.R.S.)\", norm_phone: \"082220567726\", want: \"kontak\" }, // Further Contact\n  { name: \"Praktik Mandiri Bidan Siti Maryam\", norm_phone: \"081904793260\", want: \"demo\" }, // Appointment\n  { name: \"Praktik Mandiri Dokter Cempaka\", norm_phone: \"0895326767866\", want: \"kontak\" }, // Further Contact\n  { name: \"Praktik Mandiri Dokter dr. Mulia Suryandari\", norm_phone: \"08815883288\", want: \"demo\" }, // Appointment\n];\n\nconst RANK = { prospek: 1, kontak: 2, demo: 3, uji_coba: 4, konversi: 5 };\n\nfunction normPhone(p) {\n  if (!p) return \"\";\n  let d = String(p).replace(/\\D/g, \"\");\n  if (d.startsWith(\"62\")) d = \"0\" + d.slice(2);\n  if (d.startsWith(\"8\")) d = \"0\" + d;\n  return d;\n}\n\nasync function run() {\n  const leadsRes = await fetch(\"/api/leads\", { credentials: \"include\", cache: \"no-store\" });\n  const leadsData = await leadsRes.json();\n  const leadsArr = leadsData.leads || leadsData;\n\n  const plan = [];\n  const skipped = [];\n  const notFound = [];\n  for (const e of ENTRIES) {\n    const lead = leadsArr.find((x) => normPhone(x.phone) === e.norm_phone);\n    if (!lead) { notFound.push(e.name); continue; }\n    const cur = lead.stage;\n    if (cur === e.want) { skipped.push({ name: e.name, why: \"already \" + cur }); continue; }\n    if (cur === \"batal\") { skipped.push({ name: e.name, why: \"currently Lost (batal), not overridden\" }); continue; }\n    if (e.want === \"batal\") {\n      if (RANK[cur] > 2) { skipped.push({ name: e.name, why: \"want Lost but currently \" + cur }); continue; }\n    } else if (!(RANK[e.want] > RANK[cur])) {\n      skipped.push({ name: e.name, why: \"no downgrade: \" + cur + \" -> \" + e.want }); continue;\n    }\n    plan.push({ id: lead.id, name: e.name, from: cur, to: e.want });\n  }\n\n  console.log(\"=== Stage sync \" + (APPLY ? \"APPLY\" : \"DRY RUN\") + \" ===\");\n  console.table(plan.map((p) => ({ name: p.name, from: p.from, to: p.to })));\n  console.log(\"Skipped:\", skipped.length, skipped);\n  console.log(\"Not found in CRM:\", notFound.length, notFound);\n  if (!APPLY) { console.log(\"Dry run only. Set APPLY = true and paste again to apply \" + plan.length + \" changes.\"); return; }\n\n  const report = { changed: [], failed: [], journeyAuto: 0, journeyNone: 0 };\n  async function activityCount(id) {\n    try {\n      const r = await fetch(\"/api/leads/\" + id + \"/activities\", { credentials: \"include\", cache: \"no-store\" });\n      const j = await r.json();\n      return (j.activities || j).length;\n    } catch { return null; }\n  }\n  for (const p of plan) {\n    const before = await activityCount(p.id);\n    const res = await fetch(\"/api/leads/\" + p.id, {\n      method: \"PATCH\",\n      credentials: \"include\",\n      headers: { \"content-type\": \"application/json\" },\n      body: JSON.stringify({ stage: p.to }),\n    });\n    if (!res.ok) { report.failed.push({ name: p.name, status: res.status }); continue; }\n    const after = await activityCount(p.id);\n    if (before != null && after != null) { if (after > before) report.journeyAuto++; else report.journeyNone++; }\n    report.changed.push(p.name + \": \" + p.from + \" -> \" + p.to);\n  }\n  console.log(\"Changed:\", report.changed.length, report.changed);\n  console.log(\"Failed:\", report.failed.length, report.failed);\n  console.log(\"Journey entry created automatically for \" + report.journeyAuto + \" / none for \" + report.journeyNone);\n  return report;\n}\n\nrun();\n";

export default function DailyLogStagePage() {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  // Plain HTTP (no secure context) => navigator.clipboard is absent, so fall
  // back to select()+execCommand, same as /sync/dailylog.
  async function copy() {
    setCopyError(false);
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(SCRIPT);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        return;
      } catch {
        // fall through to legacy path
      }
    }
    const el = ref.current;
    if (!el) {
      setCopyError(true);
      return;
    }
    el.focus();
    el.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      setCopyError(true);
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f7f8fa] text-slate-900">
      <AppSidebar active="sync" />
      <div className="flex-1 overflow-y-auto p-6">
        <h1 className="mb-1 text-lg font-bold text-slate-900">CRM Sync — Stage Script</h1>
        <p className="mb-4 text-sm text-slate-500">
          MODE APPLY — script ini LANGSUNG mengubah stage di sales.sahaibat.com. Jalankan sekali saja setelah dry run di halaman /sync/dailylog/stage.
        </p>
        <SyncTabs />
        <div className="mb-2 flex items-center justify-end">
          <button
            onClick={copy}
            className="rounded-lg bg-cyan-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-cyan-700"
          >
            {copied ? "Tersalin ✓" : "Copy script"}
          </button>
        </div>
        {copyError && (
          <div className="mb-2 text-xs text-amber-600">
            Tidak bisa copy otomatis — teks sudah ke-select, tekan Ctrl+C manual.
          </div>
        )}
        <textarea
          ref={ref}
          readOnly
          value={SCRIPT}
          spellCheck={false}
          className="h-[70vh] w-full rounded-xl border border-slate-300 bg-white p-3 font-mono text-xs leading-relaxed"
        />
      </div>
    </div>
  );
}
