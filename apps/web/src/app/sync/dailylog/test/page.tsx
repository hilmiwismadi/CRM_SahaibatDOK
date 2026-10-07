"use client";

import { useRef, useState } from "react";
import AppSidebar from "../../../components/AppSidebar";
import SyncTabs from "../../SyncTabs";

// Static, one-off script for 2026-10-01 (the 6 leads that already have a
// Ringkasan Claude) so it can be pasted without going through the date picker
// and localStorage of /sync/dailylog. Delete this page once the real flow
// covers stage changes.
const SCRIPT = "/**\n * DAILY ACTIVITY LOG — 2026-10-01. Edit the \"body\" (and \"kind\", if not\n * WhatsApp) for each lead below, then paste this WHOLE block into DevTools\n * Console on sales.sahaibat.com (must be logged in), on any page. Skips any\n * entry whose body is still empty. Logs via POST /api/leads/{id}/activities\n * — same endpoint the \"Log\" button in the Edit-lead Activity form uses.\n */\nconst ENTRIES = [\n  { name: \"Dr. S. Hendradewi, Sp THT, MSI\", norm_phone: \"089618900025\", kind: \"whatsapp\", body: \"Konfirmasi dengan Mas Iwan, dia bersedia wawancara siang ini jam 11-12.\" },\n  { name: \"Klinik Cita Sehat Yogyakarta (Pleret)\", norm_phone: \"085868580799\", kind: \"whatsapp\", body: \"Dijawab ramah, tapi minta info instansi + surat riset sebelum lanjut - perlu di-follow up.\" },\n  { name: \"Klinik Pratama PKU Muhammadiyah Imogiri\", norm_phone: \"082131061552\", kind: \"whatsapp\", body: \"Cuma ucapan terima kasih atas konfirmasi sebelumnya, tidak ada progres baru.\" },\n  { name: \"Klinik Rawat Inap Solo Peduli\", norm_phone: \"082211119605\", kind: \"whatsapp\", body: \"Nanya format wawancara (chat/online), ditawarin online call biar lebih gampang - belum ada jawaban final.\" },\n  { name: \"Klinik Wiwit\", norm_phone: \"085100898240\", kind: \"whatsapp\", body: \"Cuma ucapan terima kasih atas info, tidak ada progres baru.\" },\n  { name: \"Praktik Mandiri Dokter Cempaka\", norm_phone: \"0895326767866\", kind: \"whatsapp\", body: \"Rencana follow up besok siang buat konfirmasi ketersediaan.\" },\n];\n\nfunction normPhone(p) {\n  if (!p) return \"\";\n  let d = String(p).replace(/\\D/g, \"\");\n  if (d.startsWith(\"62\")) d = \"0\" + d.slice(2);\n  if (d.startsWith(\"8\")) d = \"0\" + d;\n  return d;\n}\n\nasync function run() {\n  const todo = ENTRIES.filter((e) => e.body.trim());\n  if (todo.length === 0) {\n    console.log(\"Nothing to log — every entry's body is still empty.\");\n    return;\n  }\n\n  const leadsRes = await fetch(\"/api/leads\", { credentials: \"include\", cache: \"no-store\" });\n  const leadsData = await leadsRes.json();\n  const leadsArr = leadsData.leads || leadsData;\n\n  const report = { logged: [], notFound: [], failed: [] };\n\n  for (const e of todo) {\n    const lead = leadsArr.find((x) => normPhone(x.phone) === e.norm_phone);\n    if (!lead) {\n      report.notFound.push(e.name);\n      continue;\n    }\n    const res = await fetch(`/api/leads/${lead.id}/activities`, {\n      method: \"POST\",\n      credentials: \"include\",\n      headers: { \"content-type\": \"application/json\" },\n      body: JSON.stringify({ kind: e.kind, body: e.body, outcome: \"outbound\" }),\n    });\n    if (!res.ok) {\n      report.failed.push({ name: e.name, status: res.status });\n      continue;\n    }\n    report.logged.push(e.name);\n  }\n\n  console.log(\"=== Daily activity log report ===\");\n  console.log(`Logged: ${report.logged.length}`, report.logged);\n  console.log(`Not found in CRM: ${report.notFound.length}`, report.notFound);\n  console.log(`Failed: ${report.failed.length}`, report.failed);\n  return report;\n}\n\nrun();\n";

export default function DailyLogTestPage() {
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
        <h1 className="mb-1 text-lg font-bold text-slate-900">CRM Sync — Test Script</h1>
        <p className="mb-4 text-sm text-slate-500">
          Script log 2026-10-01 (6 lead yang sudah punya Ringkasan Claude). Klik Copy, lalu paste ke DevTools Console di
          sales.sahaibat.com (harus sudah login). Jangan dijalankan dua kali — tidak ada dedupe.
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
