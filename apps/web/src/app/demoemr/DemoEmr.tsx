"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import EmrForm from "./EmrForm";
import {
  AGENTS, EXTRACTED, EXTRACTED_RX, FILL_ORDER, FIELD_LABEL, PATIENT, SKINS, TRANSCRIPT, bmi,
} from "./data";
import type { FieldId, Line, RxRow, SkinId } from "./data";

type Phase = "idle" | "recording" | "extracting" | "review" | "filling" | "done";

const EMPTY_VALUES = Object.keys(FIELD_LABEL).reduce(
  (o, k) => ({ ...o, [k]: "" }),
  {} as Record<FieldId, string>,
);
const EMPTY_RX: RxRow[] = [0, 1, 2].map(() => ({ obat: "", dosis: "", aturan: "", jumlah: "" }));

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export default function DemoEmr() {
  const [skin, setSkin] = useState<SkinId>("cloud");
  const [values, setValues] = useState(EMPTY_VALUES);
  const [rx, setRx] = useState<RxRow[]>(EMPTY_RX);
  const [filled, setFilled] = useState<Set<string>>(new Set());
  const [active, setActive] = useState<string | null>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [lines, setLines] = useState<Line[]>([]);
  const [agentsDone, setAgentsDone] = useState(0);
  const [overwrite, setOverwrite] = useState(false);
  const [stats, setStats] = useState({ filled: 0, skipped: 0 });
  const [panelOpen, setPanelOpen] = useState(true);
  const run = useRef(0);
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: 1e6, behavior: "smooth" });
  }, [lines.length]);

  // Stop any running animation when leaving the page.
  useEffect(() => () => { run.current++; }, []);

  const reset = useCallback(() => {
    run.current++;
    setValues(EMPTY_VALUES);
    setRx(EMPTY_RX);
    setFilled(new Set());
    setActive(null);
    setPhase("idle");
    setLines([]);
    setAgentsDone(0);
    setStats({ filled: 0, skipped: 0 });
  }, []);

  async function start(fast: boolean) {
    const id = ++run.current;
    const alive = () => run.current === id;
    setPhase("recording");
    setLines([]);
    for (let i = 0; i < TRANSCRIPT.length; i++) {
      await sleep(fast ? 120 : 1300);
      if (!alive()) return;
      setLines(TRANSCRIPT.slice(0, i + 1));
    }
    await sleep(fast ? 100 : 500);
    if (!alive()) return;
    setPhase("extracting");
    setAgentsDone(0);
    for (let i = 1; i <= AGENTS.length; i++) {
      await sleep(fast ? 90 : 520);
      if (!alive()) return;
      setAgentsDone(i);
    }
    await sleep(300);
    if (!alive()) return;
    setPhase("review");
  }

  async function fillEmr() {
    const id = ++run.current;
    const alive = () => run.current === id;
    setPhase("filling");
    let ok = 0;
    let skipped = 0;
    for (const f of FILL_ORDER) {
      const isRx = f.startsWith("rx");
      const current = isRx ? Object.values(rx[Number(f.slice(2))]).join("") : values[f as FieldId];
      if (current && !overwrite) {
        skipped++;
        continue;
      }
      setActive(f);
      document.getElementById(`f-${f}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
      await sleep(420);
      if (!alive()) return;
      if (isRx) {
        const i = Number(f.slice(2));
        setRx((r) => r.map((row, j) => (j === i ? EXTRACTED_RX[i] : row)));
      } else {
        setValues((v) => ({ ...v, [f]: EXTRACTED[f as FieldId] }));
      }
      setFilled((s) => new Set(s).add(f));
      ok++;
    }
    setActive(null);
    setStats({ filled: ok, skipped });
    setPhase("done");
  }

  const busy = phase === "recording" || phase === "extracting" || phase === "filling";
  const imt = bmi(EXTRACTED.bb, EXTRACTED.tb);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <style>{`
        @keyframes demoemr-pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(6,182,212,.55) } 50% { box-shadow: 0 0 0 7px rgba(6,182,212,0) } }
        .demoemr-pulse { animation: demoemr-pulse 1s ease-in-out infinite; }
        @keyframes demoemr-bar { 0%,100% { transform: scaleY(.25) } 50% { transform: scaleY(1) } }
      `}</style>

      {/* Header demo (bukan bagian dari EMR) */}
      <header className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-3">
          <div className="min-w-0">
            <h1 className="text-base font-semibold text-slate-900">Demo DOK Companion</h1>
            <p className="text-xs text-slate-500">
              Simulasi ekstensi DOK mengisi EMR yang sudah dipakai klinik. Data pasien fiktif.
            </p>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500">EMR klinik:</span>
            <div className="flex overflow-hidden rounded-lg border border-slate-200">
              {SKINS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  disabled={busy}
                  title={s.hint}
                  onClick={() => { setSkin(s.id); reset(); }}
                  className={`min-h-9 px-3 text-xs font-medium disabled:opacity-50 ${
                    skin === s.id ? "bg-cyan-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={reset}
              className="min-h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Reset
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] p-3 sm:p-4">
        <p className="mb-2 text-[11px] text-slate-500">
          Tampilan EMR di bawah adalah tiruan generik yang terinspirasi pola UI EMR populer ({SKINS.find((s) => s.id === skin)?.hint}), bukan produk aslinya.
        </p>

        {/* Bingkai browser */}
        <div className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-lg">
          <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-100 px-3 py-2">
            <div className="hidden gap-1.5 sm:flex">
              <span className="h-3 w-3 rounded-full bg-red-400" />
              <span className="h-3 w-3 rounded-full bg-amber-400" />
              <span className="h-3 w-3 rounded-full bg-green-400" />
            </div>
            <div className="min-w-0 flex-1 truncate rounded-md bg-white px-3 py-1 text-xs text-slate-500">
              🔒 emr.kliniksehat.id/rawat-jalan/pemeriksaan/{PATIENT.rm}
            </div>
            <button
              type="button"
              onClick={() => setPanelOpen((o) => !o)}
              title="DOK Companion"
              aria-label="Buka/tutup DOK Companion"
              className={`flex h-8 w-8 items-center justify-center rounded-md ${panelOpen ? "bg-cyan-100" : "hover:bg-slate-200"}`}
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-cyan-600 text-[9px] font-bold text-white">DOK</span>
            </button>
          </div>

          <div className="flex flex-col lg:h-[calc(100vh-190px)] lg:min-h-[560px] lg:flex-row">
            {panelOpen && (
              <aside className="order-first border-b border-slate-200 bg-slate-900 text-slate-100 lg:order-last lg:w-[360px] lg:shrink-0 lg:overflow-y-auto lg:border-b-0 lg:border-l">
                <Companion
                  phase={phase}
                  lines={lines}
                  agentsDone={agentsDone}
                  overwrite={overwrite}
                  setOverwrite={setOverwrite}
                  stats={stats}
                  imt={imt}
                  transcriptRef={transcriptRef}
                  onStart={() => start(false)}
                  onSkip={() => start(true)}
                  onFill={fillEmr}
                  onReset={reset}
                />
              </aside>
            )}

            <div className="min-w-0 flex-1 lg:overflow-y-auto">
              <EmrChrome skin={skin}>
                <EmrForm
                  skin={skin}
                  values={values}
                  rx={rx}
                  filled={filled}
                  active={active}
                  onChange={(id, v) => setValues((s) => ({ ...s, [id]: v }))}
                  onRx={(i, k, v) => setRx((r) => r.map((row, j) => (j === i ? { ...row, [k]: v } : row)))}
                />
              </EmrChrome>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ---------------------------- EMR chrome per skin ---------------------------- */

function EmrChrome({ skin, children }: { skin: SkinId; children: React.ReactNode }) {
  if (skin === "desktop") {
    return (
      <div className="bg-[#e9edf0]">
        <div className="flex items-center gap-2 bg-gradient-to-b from-[#2f6f8c] to-[#1f4f66] px-2 py-1 text-[12px] font-semibold text-white">
          SIMRS Klinik - Pemeriksaan Rawat Jalan
        </div>
        <div className="flex gap-3 overflow-x-auto border-b border-[#9aa5ae] bg-[#dde3e8] px-2 py-0.5 text-[11px] text-[#243b4a]">
          {["Master", "Pendaftaran", "Rawat Jalan", "Farmasi", "Kasir", "Laporan", "Bridging"].map((m) => (
            <span key={m} className={`whitespace-nowrap px-1 ${m === "Rawat Jalan" ? "font-bold underline" : ""}`}>{m}</span>
          ))}
        </div>
        <div className="flex gap-0.5 overflow-x-auto bg-[#cfd7dd] px-2 pt-1 text-[11px]">
          {["Pemeriksaan (SOAP)", "Riwayat", "Penunjang", "Resume", "Berkas"].map((tab, i) => (
            <span
              key={tab}
              className={`whitespace-nowrap border border-b-0 border-[#9aa5ae] px-3 py-1 ${i === 0 ? "bg-[#f4f6f7] font-bold" : "bg-[#b9c4cc]"}`}
            >
              {tab}
            </span>
          ))}
        </div>
        {children}
      </div>
    );
  }
  if (skin === "webadmin") {
    return (
      <div className="flex min-h-full bg-[#ecf0f5]">
        <nav className="hidden w-44 shrink-0 bg-[#222d32] text-[13px] text-[#b8c7ce] md:block">
          <div className="bg-[#1a2226] px-4 py-3 text-[11px] font-bold uppercase text-[#4b646f]">Menu</div>
          {["Dashboard", "Pendaftaran", "Rawat Jalan", "Rekam Medis", "Apotek", "Kasir", "Laporan"].map((m) => (
            <div
              key={m}
              className={`px-4 py-2.5 ${m === "Rawat Jalan" ? "border-l-[3px] border-[#3c8dbc] bg-[#1e282c] text-white" : ""}`}
            >
              {m}
            </div>
          ))}
        </nav>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between bg-[#3c8dbc] px-4 py-2.5 text-white">
            <b className="text-[15px]">Klinik Sehat</b>
            <span className="text-xs">{PATIENT.dokter}</span>
          </div>
          <div className="bg-[#ecf0f5] px-4 pt-3 text-[18px] font-light">
            Pemeriksaan <small className="text-[12px] text-[#777]">Rawat Jalan › SOAP</small>
          </div>
          {children}
        </div>
      </div>
    );
  }
  return (
    <div className="flex min-h-full bg-slate-50">
      <nav className="hidden w-52 shrink-0 border-r border-slate-200 bg-white p-3 text-sm md:block">
        <div className="mb-4 flex items-center gap-2 px-2 font-semibold text-blue-700">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-xs text-white">K</span>
          Klinik Sehat
        </div>
        {["Beranda", "Pendaftaran", "Antrian", "Rawat Jalan", "Farmasi", "Kasir", "Laporan"].map((m) => (
          <div
            key={m}
            className={`rounded-lg px-3 py-2 ${m === "Rawat Jalan" ? "bg-blue-50 font-medium text-blue-700" : "text-slate-600"}`}
          >
            {m}
          </div>
        ))}
      </nav>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
          <div className="text-sm text-slate-500">Rawat Jalan / <span className="font-medium text-slate-800">Pemeriksaan</span></div>
          <div className="text-xs text-slate-500">{PATIENT.dokter}</div>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ------------------------------ DOK Companion ------------------------------ */

interface CompanionProps {
  phase: Phase;
  lines: Line[];
  agentsDone: number;
  overwrite: boolean;
  setOverwrite: (v: boolean) => void;
  stats: { filled: number; skipped: number };
  imt: string | null;
  transcriptRef: React.RefObject<HTMLDivElement | null>;
  onStart: () => void;
  onSkip: () => void;
  onFill: () => void;
  onReset: () => void;
}

function Companion(p: CompanionProps) {
  const { phase } = p;
  const btn = "min-h-11 w-full rounded-lg px-4 text-sm font-semibold transition";
  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-600 text-[10px] font-bold text-white">DOK</span>
        <div className="min-w-0 leading-tight">
          <div className="text-sm font-semibold">DOK Companion</div>
          <div className="truncate text-[11px] text-cyan-300">● EMR terdeteksi: Klinik Sehat</div>
        </div>
      </div>

      <div className="mb-3 rounded-lg bg-slate-800 px-3 py-2 text-xs text-slate-300">
        Pasien aktif: <b className="text-white">{PATIENT.nama}</b> • {PATIENT.umur} • {PATIENT.penjamin}
      </div>

      {phase === "idle" && (
        <div className="space-y-3">
          <p className="text-sm text-slate-300">
            Dokter konsultasi seperti biasa. DOK mendengarkan, menyusun SOAP, lalu mengisi form EMR ini langsung, tanpa ketik ulang.
          </p>
          <button type="button" onClick={p.onStart} className={`${btn} bg-cyan-600 text-white hover:bg-cyan-500`}>
            ● Mulai rekam konsultasi
          </button>
          <button type="button" onClick={p.onSkip} className="w-full text-center text-xs text-slate-400 underline">
            Lewati rekaman (percepat demo)
          </button>
        </div>
      )}

      {(phase === "recording" || p.lines.length > 0) && phase !== "idle" && (
        <div className="mb-3">
          <div className="mb-1.5 flex items-center gap-2 text-xs text-slate-400">
            {phase === "recording" ? (
              <>
                <span className="flex h-4 items-end gap-0.5">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <span
                      key={i}
                      className="h-4 w-0.5 origin-bottom rounded bg-red-400"
                      style={{ animation: `demoemr-bar .8s ease-in-out ${i * 0.12}s infinite` }}
                    />
                  ))}
                </span>
                Merekam & transkrip…
              </>
            ) : (
              <>✓ Transkrip selesai ({p.lines.length} turn)</>
            )}
          </div>
          <div
            ref={p.transcriptRef}
            className={`space-y-1.5 overflow-y-auto rounded-lg bg-slate-950/60 p-2 text-xs ${phase === "recording" ? "max-h-64" : "max-h-24"}`}
          >
            {p.lines.map((l, i) => (
              <div key={i} className={l.who === "D" ? "text-cyan-200" : "text-slate-300"}>
                <b>{l.who === "D" ? "Dokter" : "Pasien"}:</b> {l.text}
              </div>
            ))}
          </div>
        </div>
      )}

      {phase === "extracting" && (
        <div className="space-y-1.5">
          <div className="text-xs text-slate-400">Agen klinis menyusun SOAP…</div>
          {AGENTS.map((a, i) => (
            <div key={a} className="flex items-center gap-2 text-sm">
              <span className={i < p.agentsDone ? "text-emerald-400" : "text-slate-600"}>{i < p.agentsDone ? "✓" : "○"}</span>
              <span className={i < p.agentsDone ? "text-slate-100" : "text-slate-500"}>{a}</span>
            </div>
          ))}
        </div>
      )}

      {(phase === "review" || phase === "filling" || phase === "done") && (
        <div className="space-y-3">
          <div className="rounded-lg bg-slate-800 p-3 text-xs">
            <div className="mb-1 font-semibold text-cyan-300">Diagnosis (ICD-10)</div>
            <div className="text-sm text-white">{EXTRACTED.dx}</div>
            <div className="mt-2 flex items-center gap-2 text-slate-300">
              <span>Keyakinan BPJS</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded bg-slate-700">
                <span className="block h-full w-[92%] bg-emerald-400" />
              </span>
              <b className="text-emerald-300">92%</b>
            </div>
            <div className="mt-1 text-[11px] text-slate-400">Kasus non-spesialistik, layak ditangani di FKTP.</div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-slate-800 p-2.5">
              <div className="text-slate-400">IMT (dihitung)</div>
              <div className="text-sm font-semibold text-white">{p.imt} kg/m²</div>
              <div className="text-[10px] text-slate-500">Rumus deterministik, bukan tebakan AI</div>
            </div>
            <div className="rounded-lg bg-slate-800 p-2.5">
              <div className="text-slate-400">Resep</div>
              <div className="text-sm font-semibold text-white">{EXTRACTED_RX.length} obat</div>
              <div className="text-[10px] text-slate-500">Cek interaksi: tidak ada</div>
            </div>
          </div>

          <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-2.5 text-[11px] text-amber-200">
            Dokter tetap yang memutuskan: semua isian bisa dikoreksi di form sebelum disimpan.
          </div>

          {phase === "review" && (
            <>
              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={p.overwrite}
                  onChange={(e) => p.setOverwrite(e.target.checked)}
                  className="h-4 w-4"
                />
                Timpa field yang sudah terisi
              </label>
              <button type="button" onClick={p.onFill} className={`${btn} bg-cyan-600 text-white hover:bg-cyan-500`}>
                Isi ke EMR ▸
              </button>
            </>
          )}

          {phase === "filling" && (
            <div className="rounded-lg bg-slate-800 px-3 py-2.5 text-sm text-cyan-200">Mengisi form EMR…</div>
          )}

          {phase === "done" && (
            <>
              <div className="rounded-lg bg-emerald-500/15 p-3 text-sm text-emerald-200">
                ✓ {p.stats.filled} bagian terisi
                {p.stats.skipped > 0 && <> • {p.stats.skipped} dilewati (sudah ada isi)</>}
                <div className="mt-1 text-[11px] text-emerald-300/80">
                  Konsultasi → form lengkap dalam ±45 dtk. Input manual biasanya 5–8 menit (ilustrasi).
                </div>
              </div>
              <div className="text-[11px] text-slate-400">
                Tanda <b className="rounded bg-cyan-600 px-1 text-white">DOK</b> di label menunjukkan field yang diisi DOK. Periksa, koreksi bila perlu, lalu klik Simpan di EMR.
              </div>
              <button type="button" onClick={p.onReset} className={`${btn} border border-slate-600 text-slate-200 hover:bg-slate-800`}>
                Ulangi demo
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
