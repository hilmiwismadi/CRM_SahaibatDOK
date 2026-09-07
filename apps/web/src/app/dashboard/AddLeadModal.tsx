"use client";

import { useEffect, useState } from "react";
import { BUSINESS_TYPES } from "./types";
import type { LeadEditData } from "./LeadModal";

export default function AddLeadModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (data: LeadEditData) => Promise<void>;
}) {
  const [mounted, setMounted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<LeadEditData>({
    name: "",
    category: "",
    address: "",
    phoneRaw: "",
    phoneOffice: "",
    businessType: "",
    instagramUrl: "",
    notes: "",
  });

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  function handleClose() {
    setMounted(false);
    setTimeout(onClose, 120);
  }

  async function handleSubmit() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await onSubmit(form);
      handleClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      onClick={handleClose}
      className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 transition-opacity duration-150 ${
        mounted ? "opacity-100" : "opacity-0"
      }`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-md rounded-2xl bg-white shadow-2xl transition-all duration-150 ${
          mounted ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-bold text-slate-900">Add Lead Manually</h2>
          <button
            onClick={handleClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-3 px-6 py-5">
          <LabeledInput label="Name *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Klinik Sehat Sentosa" autoFocus />
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Business type</label>
            <select
              value={form.businessType}
              onChange={(e) => setForm({ ...form, businessType: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-cyan-500"
            >
              <option value="">—</option>
              {BUSINESS_TYPES.map((b) => (
                <option key={b.key} value={b.key}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>
          <LabeledInput label="Category" value={form.category} onChange={(v) => setForm({ ...form, category: v })} placeholder="Klinik / Dokter Praktik Mandiri" />
          <LabeledInput label="WA / Mobile phone" value={form.phoneRaw} onChange={(v) => setForm({ ...form, phoneRaw: v })} placeholder="0812xxxxxxx" />
          <LabeledInput label="Office / landline phone" value={form.phoneOffice} onChange={(v) => setForm({ ...form, phoneOffice: v })} placeholder="(024) 3545000" />
          <LabeledInput label="Instagram" value={form.instagramUrl} onChange={(v) => setForm({ ...form, instagramUrl: v })} placeholder="https://instagram.com/..." />
          <LabeledInput label="Address" value={form.address} onChange={(v) => setForm({ ...form, address: v })} placeholder="Jl. Contoh No. 1, Jakarta" />
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-cyan-500"
            />
          </div>
          <p className="text-xs text-slate-400">
            Manually-added leads have no map coordinates — they won&apos;t appear on the Map page.
          </p>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button onClick={handleClose} className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-50">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !form.name.trim()}
            className="rounded-lg bg-cyan-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-cyan-700 active:scale-95 disabled:opacity-50"
          >
            {saving ? "Adding…" : "Add Lead"}
          </button>
        </div>
      </div>
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  placeholder,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-cyan-500"
      />
    </div>
  );
}
