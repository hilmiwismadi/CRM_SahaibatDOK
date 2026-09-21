"use client";

import { useCallback, useEffect, useState } from "react";
import AppSidebar from "@/app/components/AppSidebar";
import { CATEGORY_LABELS, CATEGORY_COLORS, type LeadCategory } from "@/lib/leadSegmentation";

interface LeadOption {
  id: string;
  name: string;
  address: string | null;
  category: string | null;
  tagCategory: LeadCategory;
  // Raw flags behind tagCategory's single winning badge — see
  // leadSegmentation.ts's CATEGORY_ORDER; a lead can have several of these
  // true at once (e.g. Further Contact AND an unanswered message), and the
  // lead list below shows a chip for every one that applies, not just the
  // canonical pick.
  appointment: boolean;
  declined: boolean;
  needsOtherContact: boolean;
  needsFollowUp: boolean;
  letterSent: boolean;
  needsReply: boolean;
  repliedByBot: boolean;
  noReplyAfterPitch: boolean;
  nonResponsive: boolean;
  noWaAccount: boolean;
}

// Every tag chip a lead row can show, in leadSegmentation's CATEGORY_ORDER
// (minus "untouched"/"active", which aren't real tags — a lead with none
// of these true just falls back to tagCategory's label, see leadRowTags()).
const TAG_CHIP_ORDER: { key: LeadCategory; flag: keyof LeadOption }[] = [
  { key: "no_wa_account", flag: "noWaAccount" },
  { key: "appointment", flag: "appointment" },
  { key: "declined", flag: "declined" },
  { key: "needs_reply", flag: "needsReply" },
  { key: "replied_by_bot", flag: "repliedByBot" },
  { key: "needs_other_contact", flag: "needsOtherContact" },
  { key: "needs_follow_up", flag: "needsFollowUp" },
  { key: "letter_sent", flag: "letterSent" },
  { key: "no_reply_after_pitch", flag: "noReplyAfterPitch" },
  { key: "non_responsive", flag: "nonResponsive" },
];

function leadRowTags(lead: LeadOption): { key: LeadCategory; label: string; color: string }[] {
  const chips = TAG_CHIP_ORDER.filter(({ flag }) => lead[flag] === true).map(({ key }) => ({
    key,
    label: CATEGORY_LABELS[key],
    color: CATEGORY_COLORS[key],
  }));
  if (chips.length > 0) return chips;
  return [{ key: lead.tagCategory, label: CATEGORY_LABELS[lead.tagCategory], color: CATEGORY_COLORS[lead.tagCategory] }];
}

interface SenderInfo {
  namaBD: string;
  whatsappBD: string;
  emailBD: string;
}

const SENDER_STORAGE_KEY = "sahaibat-letter-sender";

// Falls back to the current BD's own info so the form is ready to submit
// the first time this loads in a browser, before anything gets saved to
// localStorage — matches the placeholders already shown in the fields.
const DEFAULT_SENDER: SenderInfo = {
  namaBD: "M. H. Dzaki Wismadi",
  whatsappBD: "0818 0925 2706",
  emailBD: "hilmi.d@sahaibat.com",
};

const JABATAN_OPTIONS = ["Direktur", "dr. Penanggung Jawab", "Kepala Klinik", "Pimpinan Klinik/Puskesmas", "Manager Operasional"];

/**
 * Opens a URL in a new tab without stealing focus — mirrors the dashboard's
 * lead-row context menu so BD staff can peek at a lead's chat without
 * losing their place in the letter form.
 */
function openInBackgroundTab(url: string) {
  const win = window.open(url, "_blank");
  win?.blur();
  window.focus();
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function loadSavedSender(): SenderInfo {
  try {
    const raw = window.localStorage.getItem(SENDER_STORAGE_KEY);
    if (!raw) return DEFAULT_SENDER;
    const parsed = JSON.parse(raw);
    return {
      namaBD: typeof parsed.namaBD === "string" && parsed.namaBD ? parsed.namaBD : DEFAULT_SENDER.namaBD,
      whatsappBD: typeof parsed.whatsappBD === "string" && parsed.whatsappBD ? parsed.whatsappBD : DEFAULT_SENDER.whatsappBD,
      emailBD: typeof parsed.emailBD === "string" && parsed.emailBD ? parsed.emailBD : DEFAULT_SENDER.emailBD,
    };
  } catch {
    return DEFAULT_SENDER;
  }
}

export default function LettersPage() {
  const [leads, setLeads] = useState<LeadOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [onlyFurtherContact, setOnlyFurtherContact] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [nomorSurat, setNomorSurat] = useState("");
  const [tanggal, setTanggal] = useState(todayISO());
  const [namaKlinik, setNamaKlinik] = useState("");
  const [namaPenerima, setNamaPenerima] = useState("");
  const [jabatanPenerima, setJabatanPenerima] = useState("");
  const [sender, setSender] = useState<SenderInfo>(DEFAULT_SENDER);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; lead: LeadOption } | null>(null);

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedSubject, setCopiedSubject] = useState(false);

  useEffect(() => {
    setSender(loadSavedSender());
  }, []);

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    const closeOnEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [contextMenu]);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (onlyFurtherContact) params.set("tag", "needs_other_contact");
    if (search.trim()) params.set("search", search.trim());
    const res = await fetch(`/api/leads?${params.toString()}`);
    const data = await res.json();
    setLeads(data.leads ?? []);
    setLoading(false);
  }, [onlyFurtherContact, search]);

  useEffect(() => {
    const timeout = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(timeout);
  }, [load, search]);

  const selected = leads.find((l) => l.id === selectedId) ?? null;

  function selectLead(lead: LeadOption) {
    setSelectedId(lead.id);
    setNamaKlinik(lead.name);
    setSuccess(null);
    setError(null);
  }

  // Lead-level equivalent of /chat's "Letter Sent" toggle — this page only
  // has a leadId per row (not a wa_contact id), so it goes through
  // /api/leads/[id]/quick-tag (same route the Kanban boards use to move a
  // lead by leadId) instead of /api/conversations/[id]/flag. Set-only (no
  // untag here): quick-tag's boolean actions no-op if already true, so
  // clicking again is harmless, just not a way to remove the tag.
  async function handleMarkLetterSent(lead: LeadOption) {
    setContextMenu(null);
    try {
      const res = await fetch(`/api/leads/${lead.id}/quick-tag`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "letterSent" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Gagal menandai Letter Sent.");
        return;
      }
      setSuccess(`Letter Sent ditandai untuk ${lead.name}.`);
      await load();
    } catch {
      setError("Gagal menandai Letter Sent — cek koneksi.");
    }
  }

  function updateSender(patch: Partial<SenderInfo>) {
    setSender((prev) => {
      const next = { ...prev, ...patch };
      try {
        window.localStorage.setItem(SENDER_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // per-viewer convenience only — fine to lose on private/blocked storage
      }
      return next;
    });
  }

  // Cover-email subject + body that go alongside the PDF attachment — same
  // placeholders as the letter itself (klinik name, sender info), kept as
  // copy-pasteable blocks since Gmail/Outlook compose windows aren't
  // something this app can write into directly.
  function emailKlinik(): string {
    return namaKlinik || selected?.name || "[Nama Klinik]";
  }

  function buildEmailSubject(): string {
    return `Tindak Lanjut Komunikasi – Mohon Partisipasi Riset ${emailKlinik()}`;
  }

  function buildEmailDraft(): string {
    const klinik = emailKlinik();
    const bd = sender.namaBD || "[Nama Business Development]";
    const wa = sender.whatsappBD || "[Nomor WhatsApp]";
    const email = sender.emailBD || "[Email]";
    return `Yth. ${klinik},

Menindaklanjuti komunikasi kami sebelumnya melalui WhatsApp, bersama email ini saya menyampaikan surat permohonan partisipasi riset dari SahAIbat untuk ${klinik}.

Saat ini kami sedang melakukan riset dan validasi langsung dengan tenaga kesehatan dan pengelola klinik untuk memahami alur kerja, kebutuhan administrasi, serta kendala dalam pengelolaan layanan dan data pasien. Masukan dari pihak klinik akan menjadi bahan penting dalam pengembangan sistem agar sesuai dengan kebutuhan di lapangan.

Kami berharap Bapak/Ibu berkenan menjadi narasumber dalam sesi diskusi singkat selama kurang lebih 20–30 menit. Waktu pelaksanaan sepenuhnya dapat menyesuaikan dengan ketersediaan pihak klinik.

Secara umum, sesi akan mencakup diskusi mengenai alur kerja klinik, demonstrasi singkat sistem yang sedang kami kembangkan, serta tanggapan dan masukan dari pihak klinik.

Surat permohonan partisipasi kami lampirkan sebagai informasi lebih lanjut.

Mohon kesediaan Bapak/Ibu untuk menginformasikan waktu yang sekiranya tersedia untuk sesi tersebut.

Terima kasih atas waktu dan kesediaannya.

Hormat saya,

${bd}
Business Development Manager
SahAIbat — sebuah brand dari Viantra Health
WhatsApp: ${wa}
Email: ${email}`;
  }

  async function handleCopySubject() {
    try {
      await navigator.clipboard.writeText(buildEmailSubject());
      setCopiedSubject(true);
      setTimeout(() => setCopiedSubject(false), 2000);
    } catch {
      setError("Gagal menyalin ke clipboard — salin manual dari kotak teks di atas.");
    }
  }

  async function handleCopyEmailDraft() {
    try {
      await navigator.clipboard.writeText(buildEmailDraft());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Gagal menyalin ke clipboard — salin manual dari kotak teks di atas.");
    }
  }

  async function handleGenerate() {
    if (!selected) return;
    setGenerating(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/letters/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: selected.id,
          nomorSurat,
          tanggal,
          namaPenerima,
          jabatanPenerima,
          namaKlinik: namaKlinik || selected.name,
          namaBD: sender.namaBD,
          whatsappBD: sender.whatsappBD,
          emailBD: sender.emailBD,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message =
          typeof data.error === "string"
            ? data.error
            : data.error?.fieldErrors?.namaBD?.[0] ?? "Gagal membuat surat.";
        throw new Error(message);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      const a = document.createElement("a");
      a.href = url;
      a.download = match?.[1] ?? `Surat-Undangan-Riset-${selected.name}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setSuccess(`Surat untuk ${selected.name} berhasil dibuat dan diunduh.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal membuat surat.");
    } finally {
      setGenerating(false);
    }
  }

  const canGenerate = Boolean(selected) && sender.namaBD.trim().length > 0 && !generating;

  return (
    <div className="flex h-screen overflow-hidden bg-[#f7f8fa] text-slate-900">
      <AppSidebar active="letters" />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mb-5">
          <h1 className="text-lg font-bold text-slate-900">Surat Undangan Riset</h1>
          <p className="text-sm text-slate-500">
            Generate PDF surat undangan riset dari template resmi untuk lead yang butuh kontak lanjutan.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
          {/* Lead picker */}
          <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari nama klinik/dokter…"
                  className="w-56 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-cyan-500"
                />
                <label className="flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-slate-600">
                  <input
                    type="checkbox"
                    checked={onlyFurtherContact}
                    onChange={(e) => setOnlyFurtherContact(e.target.checked)}
                    className="h-3.5 w-3.5 accent-cyan-600"
                  />
                  Hanya tag &quot;Further Contact&quot;
                </label>
              </div>
              <span className="text-xs text-slate-400">{leads.length} lead</span>
            </div>

            {loading ? (
              <div className="py-10 text-center text-sm text-slate-400">Memuat…</div>
            ) : leads.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400">
                {onlyFurtherContact
                  ? "Tidak ada lead bertag \"Further Contact\" saat ini."
                  : "Tidak ada lead yang cocok."}
              </div>
            ) : (
              <div className="max-h-[calc(100vh-220px)] divide-y divide-slate-100 overflow-y-auto">
                {leads.map((lead) => {
                  const isActive = lead.id === selectedId;
                  return (
                    <button
                      key={lead.id}
                      onClick={() => selectLead(lead)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setContextMenu({ x: e.clientX, y: e.clientY, lead });
                      }}
                      className={`flex w-full flex-col gap-1.5 rounded-lg px-3 py-2.5 text-left transition ${
                        isActive ? "bg-cyan-50 ring-1 ring-cyan-200" : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-900">{lead.name}</div>
                        <div className="truncate text-xs text-slate-500">
                          {lead.category ?? "—"} {lead.address ? `· ${lead.address}` : ""}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {leadRowTags(lead).map((chip) => (
                          <span
                            key={chip.key}
                            className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
                            style={{ backgroundColor: chip.color }}
                          >
                            {chip.label}
                          </span>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Letter form */}
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-slate-900">Detail Surat</h2>

              {!selected ? (
                <p className="text-xs text-slate-400">Pilih lead di sebelah kiri untuk mulai isi surat.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  <Field label="Nama Klinik/Fasilitas Kesehatan">
                    <input
                      value={namaKlinik}
                      onChange={(e) => setNamaKlinik(e.target.value)}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-cyan-500"
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Nama Penerima (opsional, biasanya kosong)">
                      <input
                        value={namaPenerima}
                        onChange={(e) => setNamaPenerima(e.target.value)}
                        placeholder="dr. Nama Penerima"
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-cyan-500"
                      />
                    </Field>
                    <Field label="Jabatan Penerima (opsional)">
                      <select
                        value={jabatanPenerima}
                        onChange={(e) => setJabatanPenerima(e.target.value)}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-cyan-500"
                      >
                        <option value="">(Kosongkan)</option>
                        {JABATAN_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Nomor Surat">
                      <input
                        value={nomorSurat}
                        onChange={(e) => setNomorSurat(e.target.value)}
                        placeholder="013/SAH-DOK/IX/2026"
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-cyan-500"
                      />
                    </Field>
                    <Field label="Tanggal">
                      <input
                        type="date"
                        value={tanggal}
                        onChange={(e) => setTanggal(e.target.value)}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-cyan-500"
                      />
                    </Field>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
              <h2 className="mb-1 text-sm font-semibold text-slate-900">Data Pengirim (Business Development)</h2>
              <p className="mb-3 text-xs text-slate-400">Sudah terisi default — ubah jika perlu. Diingat otomatis di browser ini untuk surat berikutnya.</p>
              <div className="flex flex-col gap-3">
                <Field label="Nama Business Development">
                  <input
                    value={sender.namaBD}
                    onChange={(e) => updateSender({ namaBD: e.target.value })}
                    placeholder="M. H. Dzaki Wismadi"
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-cyan-500"
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Nomor WhatsApp">
                    <input
                      value={sender.whatsappBD}
                      onChange={(e) => updateSender({ whatsappBD: e.target.value })}
                      placeholder="0818 0925 2706"
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-cyan-500"
                    />
                  </Field>
                  <Field label="Email">
                    <input
                      value={sender.emailBD}
                      onChange={(e) => updateSender({ emailBD: e.target.value })}
                      placeholder="hilmi.d@sahaibat.com"
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-cyan-500"
                    />
                  </Field>
                </div>
              </div>
            </div>

            {selected && (
              <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
                <h2 className="mb-1 text-sm font-semibold text-slate-900">Draft Email Pengantar</h2>
                <p className="mb-3 text-xs text-slate-400">
                  Kalimat pengantar untuk dikirim via email bersama lampiran PDF surat — sudah terisi otomatis dari data
                  di atas, tinggal salin dan tempel.
                </p>

                <Field label="Subject Email">
                  <input
                    readOnly
                    value={buildEmailSubject()}
                    onFocus={(e) => e.currentTarget.select()}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                  />
                </Field>
                <button
                  onClick={handleCopySubject}
                  className="mb-3 mt-2 flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-95"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <rect x="9" y="9" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
                    <path d="M5 15V5a2 2 0 0 1 2-2h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  {copiedSubject ? "Disalin!" : "Salin Subjek"}
                </button>

                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Isi Email
                </label>
                <textarea
                  readOnly
                  value={buildEmailDraft()}
                  rows={14}
                  className="w-full resize-y rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-700 outline-none transition focus:border-cyan-500"
                  onFocus={(e) => e.currentTarget.select()}
                />
                <button
                  onClick={handleCopyEmailDraft}
                  className="mt-2 flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-95"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <rect x="9" y="9" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
                    <path d="M5 15V5a2 2 0 0 1 2-2h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  {copied ? "Disalin!" : "Salin Teks"}
                </button>
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">{error}</div>
            )}
            {success && (
              <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                {success}
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="flex items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {generating ? "Membuat PDF…" : "Buat & Unduh Surat PDF"}
            </button>
          </div>
        </div>
      </div>

      {contextMenu && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ position: "fixed", top: contextMenu.y, left: contextMenu.x, zIndex: 100 }}
          className="min-w-[180px] overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          <div className="truncate px-3 py-1.5 text-xs font-medium text-slate-400">{contextMenu.lead.name}</div>
          <button
            onClick={() => {
              openInBackgroundTab(`/chat?leadId=${contextMenu.lead.id}`);
              setContextMenu(null);
            }}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-slate-700 transition hover:bg-slate-50"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0 text-slate-400">
              <path d="M4 4h16v12H8l-4 4V4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            </svg>
            Open Chat in New Tab
          </button>
          <div className="my-1 border-t border-slate-100" />
          <button
            onClick={() => handleMarkLetterSent(contextMenu.lead)}
            className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm text-slate-700 transition hover:bg-slate-50"
          >
            <span className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0 text-slate-400">
                <path d="M4 4h16v12H8l-4 4V4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                <path d="M8 9h8M8 12h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Tandai Letter Sent
            </span>
            {contextMenu.lead.letterSent && <span className="text-emerald-500">✓</span>}
          </button>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</label>
      {children}
    </div>
  );
}
