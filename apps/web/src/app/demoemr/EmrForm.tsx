"use client";

import type { ReactNode } from "react";
import { FIELD_LABEL, PATIENT, bmi } from "./data";
import type { FieldId, RxRow, SkinId } from "./data";

export interface FormProps {
  skin: SkinId;
  values: Record<FieldId, string>;
  rx: RxRow[];
  filled: Set<string>;
  active: string | null;
  onChange: (id: FieldId, v: string) => void;
  onRx: (i: number, k: keyof RxRow, v: string) => void;
}

// Satu form pemeriksaan, tiga "kulit" - supaya terlihat seperti EMR yang
// sudah dipakai klinik, bukan produk DOK.
interface Theme {
  page: string;
  card: string;
  cardTitle: string;
  label: string;
  input: string;
  th: string;
  td: string;
  btn: string;
  btnGhost: string;
}

const THEMES: Record<SkinId, Theme> = {
  cloud: {
    page: "bg-slate-50 text-slate-800",
    card: "rounded-xl border border-slate-200 bg-white p-4 shadow-sm",
    cardTitle: "mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800",
    label: "mb-1 block text-xs font-medium text-slate-500",
    input:
      "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100",
    th: "bg-slate-50 px-3 py-2 text-left text-xs font-medium text-slate-500",
    td: "border-t border-slate-100 p-1.5",
    btn: "rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white",
    btnGhost: "rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600",
  },
  desktop: {
    page: "bg-[#e9edf0] text-[#1f2933] text-[12px]",
    card: "border border-[#9aa5ae] bg-[#f4f6f7] p-2",
    cardTitle:
      "-mx-2 -mt-2 mb-2 border-b border-[#9aa5ae] bg-gradient-to-b from-[#dfe6eb] to-[#c9d3da] px-2 py-1 text-[12px] font-bold text-[#243b4a]",
    label: "mb-0.5 block text-[11px] text-[#243b4a]",
    input:
      "w-full border border-[#8b97a1] bg-white px-1.5 py-[3px] text-[12px] outline-none focus:border-[#2b6f8f] focus:bg-[#fffef0]",
    th: "border border-[#8b97a1] bg-[#7fa3ba] px-1.5 py-1 text-left text-[11px] font-bold text-white",
    td: "border border-[#b4bec6] p-0.5",
    btn: "border border-[#2b6f8f] bg-gradient-to-b from-[#4b9bbd] to-[#2b6f8f] px-3 py-1 text-[12px] text-white",
    btnGhost: "border border-[#8b97a1] bg-gradient-to-b from-white to-[#d9e0e5] px-3 py-1 text-[12px]",
  },
  webadmin: {
    page: "bg-[#ecf0f5] text-[#333]",
    card: "border-t-[3px] border-[#3c8dbc] bg-white p-3 shadow-[0_1px_1px_rgba(0,0,0,.1)]",
    cardTitle: "mb-3 border-b border-[#f4f4f4] pb-2 text-[16px] font-normal text-[#333]",
    label: "mb-1 block text-[13px] font-bold text-[#333]",
    input:
      "w-full border border-[#d2d6de] bg-white px-2.5 py-1.5 text-[13px] outline-none focus:border-[#3c8dbc]",
    th: "border border-[#f4f4f4] bg-[#f9f9f9] px-2 py-1.5 text-left text-[13px] font-bold",
    td: "border border-[#f4f4f4] p-1",
    btn: "border border-[#367fa9] bg-[#3c8dbc] px-3 py-1.5 text-[13px] text-white",
    btnGhost: "border border-[#ddd] bg-[#f4f4f4] px-3 py-1.5 text-[13px] text-[#444]",
  },
};

function Banner({ skin }: { skin: SkinId }) {
  const p = PATIENT;
  if (skin === "desktop") {
    return (
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 border border-[#9aa5ae] bg-[#fdfdf3] p-2 text-[11px] sm:grid-cols-4">
        <span>No. RM : <b>{p.rm}</b></span>
        <span>Pasien : <b>{p.nama}</b></span>
        <span>Umur : <b>{p.umur}</b> / {p.jk}</span>
        <span>Cara Bayar : <b>{p.penjamin}</b></span>
        <span>No. Rawat : <b>2026/10/11/000{p.antrian.slice(-2)}</b></span>
        <span>Poli : <b>{p.poli}</b></span>
        <span>Dokter : <b>{p.dokter}</b></span>
        <span>No. Kartu : <b>{p.noKartu}</b></span>
      </div>
    );
  }
  if (skin === "webadmin") {
    return (
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 border-t-[3px] border-[#00a65a] bg-white p-3 text-[13px] shadow-[0_1px_1px_rgba(0,0,0,.1)]">
        <span><b>{p.nama}</b> <span className="text-[#777]">({p.rm})</span></span>
        <span>{p.jk}, {p.umur}</span>
        <span>{p.poli} • {p.dokter}</span>
        <span className="rounded-sm bg-[#00a65a] px-1.5 py-0.5 text-[11px] text-white">{p.penjamin}</span>
        <span className="rounded-sm bg-[#f39c12] px-1.5 py-0.5 text-[11px] text-white">Antrian {p.antrian}</span>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">BS</div>
      <div className="min-w-0">
        <div className="font-semibold text-slate-900">{p.nama}</div>
        <div className="text-xs text-slate-500">{p.rm} • {p.jk} • {p.umur} • Lahir {p.tglLahir}</div>
      </div>
      <div className="ml-auto flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700">{p.penjamin}</span>
        <span className="rounded-full bg-amber-50 px-2.5 py-1 font-medium text-amber-700">Antrian {p.antrian}</span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">{p.poli}</span>
      </div>
    </div>
  );
}

function Card({ t, title, children }: { t: Theme; title: string; children: ReactNode }) {
  return (
    <section className={t.card}>
      <h3 className={t.cardTitle}>{title}</h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export default function EmrForm(props: FormProps) {
  const { skin, values, rx, filled, active, onChange, onRx } = props;
  const t = THEMES[skin];

  const ring = (id: string) =>
    active === id
      ? " !border-cyan-500 !ring-4 !ring-cyan-300/60 demoemr-pulse"
      : filled.has(id)
        ? " !border-cyan-400 !bg-cyan-50/70"
        : "";

  const tag = (id: string) =>
    filled.has(id) ? (
      <span className="ml-1.5 rounded bg-cyan-600 px-1 py-px align-middle text-[9px] font-bold tracking-wide text-white">DOK</span>
    ) : null;

  const F = ({ id, area, rows = 2 }: { id: FieldId; area?: boolean; rows?: number }) => (
    <div className="min-w-0">
      <label className={t.label} htmlFor={`f-${id}`}>
        {FIELD_LABEL[id]}
        {tag(id)}
      </label>
      {area ? (
        <textarea
          id={`f-${id}`}
          rows={rows}
          value={values[id]}
          onChange={(e) => onChange(id, e.target.value)}
          className={t.input + ring(id) + " resize-y"}
        />
      ) : (
        <input
          id={`f-${id}`}
          value={values[id]}
          onChange={(e) => onChange(id, e.target.value)}
          className={t.input + ring(id)}
        />
      )}
    </div>
  );

  const b = bmi(values.bb, values.tb);

  return (
    <div className={`min-h-full space-y-3 p-3 sm:p-4 ${t.page}`}>
      <Banner skin={skin} />

      <Card t={t} title={skin === "desktop" ? "S - Subjek" : "Subjective (Anamnesis)"}>
        {F({ id: "keluhan" })}
        {F({ id: "rps", area: true, rows: 3 })}
        <div className="grid gap-3 sm:grid-cols-2">
          {F({ id: "rpd" })}
          {F({ id: "alergi" })}
        </div>
      </Card>

      <Card t={t} title={skin === "desktop" ? "O - Objek" : "Objective (Pemeriksaan)"}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {(["td", "nadi", "rr", "suhu", "spo2", "bb", "tb"] as FieldId[]).map((id) => F({ id }))}
        </div>
        {b && (
          <div className="text-[11px] opacity-70">IMT otomatis: {b} kg/m²</div>
        )}
        {F({ id: "pemfis", area: true, rows: 3 })}
      </Card>

      <Card t={t} title={skin === "desktop" ? "A - Asesmen" : "Assessment (Diagnosis)"}>
        {F({ id: "dx" })}
      </Card>

      <Card t={t} title={skin === "desktop" ? "P - Plan / Resep" : "Plan & E-Resep"}>
        {F({ id: "plan", area: true })}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse">
            <thead>
              <tr>
                <th className={t.th}>Nama obat</th>
                <th className={t.th}>Dosis</th>
                <th className={t.th}>Aturan pakai</th>
                <th className={t.th + " w-16"}>Jml</th>
              </tr>
            </thead>
            <tbody>
              {rx.map((r, i) => {
                const id = `rx${i}`;
                const cls = t.input + ring(id);
                return (
                  <tr key={i}>
                    <td className={t.td}><input id={`f-${id}`} className={cls} value={r.obat} onChange={(e) => onRx(i, "obat", e.target.value)} aria-label="Nama obat" /></td>
                    <td className={t.td}><input className={cls} value={r.dosis} onChange={(e) => onRx(i, "dosis", e.target.value)} aria-label="Dosis" /></td>
                    <td className={t.td}><input className={cls} value={r.aturan} onChange={(e) => onRx(i, "aturan", e.target.value)} aria-label="Aturan pakai" /></td>
                    <td className={t.td}><input className={cls} value={r.jumlah} onChange={(e) => onRx(i, "jumlah", e.target.value)} aria-label="Jumlah" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {F({ id: "edukasi", area: true })}
          {F({ id: "kontrol" })}
        </div>
        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <button type="button" className={t.btnGhost}>Batal</button>
          <button type="button" className={t.btn}>Simpan pemeriksaan</button>
        </div>
      </Card>
    </div>
  );
}
