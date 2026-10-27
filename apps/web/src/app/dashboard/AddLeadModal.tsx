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
      className={`fixed inset-0 z-[70] flex items-end justify-center bg-slate-900/40 transition-opacity duration-150 md:z-50 md:items-center md:p-4 ${
        mounted ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Phones: bottom sheet capped at 92dvh with a scrolling body (the form
          is taller than a phone screen). Desktop (md+): original dialog. */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl transition-all duration-150 md:block md:max-h-none md:max-w-md md:overflow-visible md:rounded-2xl ${
          mounted ? "translate-y-0 scale-100 opacity-100" : "translate-y-6 opacity-0 md:translate-y-0 md:scale-95"
        }`}
      >
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-slate-200 md:hidden" />
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-2 md:px-6 md:py-4">
          <h2 className="text-base font-bold text-slate-900">Add Lead Manually</h2>
          <button
            onClick={handleClose}
            aria-label="Close"
            className="-mr-2 flex h-11 w-11 items-center justify-center rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 md:m-0 md:inline-block md:h-auto md:w-auto"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-4 py-4 md:overflow-visible md:px-6 md:py-5">
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
          <LabeledInput label="WA / Mobile phone" value={form.phoneRaw} onChange={(v) => setForm({ ...form, phoneRaw: v })} placeholder="0812xxxxxxx" inputMode="tel" />
          <LabeledInput label="Office / landline phone" value={form.phoneOffice} onChange={(v) => setForm({ ...form, phoneOffice: v })} placeholder="(024) 3545000" inputMode="tel" />
          <LabeledInput label="Instagram" value={form.instagramUrl} onChange={(v) => setForm({ ...form, instagramUrl: v })} placeholder="https://instagram.com/..." inputMode="url" />
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

        <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 md:px-6 md:py-4">
          <button
            onClick={handleClose}
            className="min-h-11 rounded-lg px-4 py-1.5 text-sm font-medium text-slate-500 transition hover:bg-slate-50 md:min-h-0 md:px-3 md:text-xs"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !form.name.trim()}
            className="min-h-11 flex-1 rounded-lg bg-cyan-600 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-cyan-700 active:scale-95 disabled:opacity-50 md:min-h-0 md:flex-none md:text-xs"
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
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        inputMode={inputMode}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-cyan-500"
      />
    </div>
  );
}
