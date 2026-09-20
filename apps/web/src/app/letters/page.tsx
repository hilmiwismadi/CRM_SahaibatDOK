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
}

interface SenderInfo {
  namaBD: string;
  whatsappBD: string;
  emailBD: string;
}

const SENDER_STORAGE_KEY = "sahaibat-letter-sender";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function loadSavedSender(): SenderInfo {
  try {
    const raw = window.localStorage.getItem(SENDER_STORAGE_KEY);
    if (!raw) return { namaBD: "", whatsappBD: "", emailBD: "" };
    const parsed = JSON.parse(raw);
    return {
      namaBD: typeof parsed.namaBD === "string" ? parsed.namaBD : "",
      whatsappBD: typeof parsed.whatsappBD === "string" ? parsed.whatsappBD : "",
      emailBD: typeof parsed.emailBD === "string" ? parsed.emailBD : "",
    };
  } catch {
    return { namaBD: "", whatsappBD: "", emailBD: "" };
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
  const [jabatanPenerima, setJabatanPenerima] = useState("Direktur");
  const [sender, setSender] = useState<SenderInfo>({ namaBD: "", whatsappBD: "", emailBD: "" });

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setSender(loadSavedSender());
  }, []);

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
                      className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                        isActive ? "bg-cyan-50 ring-1 ring-cyan-200" : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-900">{lead.name}</div>
                        <div className="truncate text-xs text-slate-500">
                          {lead.category ?? "—"} {lead.address ? `· ${lead.address}` : ""}
                        </div>
                      </div>
                      <span
                        className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
                        style={{ backgroundColor: CATEGORY_COLORS[lead.tagCategory] }}
                      >
                        {CATEGORY_LABELS[lead.tagCategory]}
                      </span>
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
                    <Field label="Nama Penerima (opsional)">
                      <input
                        value={namaPenerima}
                        onChange={(e) => setNamaPenerima(e.target.value)}
                        placeholder="dr. Nama Penerima"
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-cyan-500"
                      />
                    </Field>
                    <Field label="Jabatan Penerima">
                      <input
                        value={jabatanPenerima}
                        onChange={(e) => setJabatanPenerima(e.target.value)}
                        placeholder="Direktur"
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-cyan-500"
                      />
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
              <p className="mb-3 text-xs text-slate-400">Diingat otomatis di browser ini untuk surat berikutnya.</p>
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
