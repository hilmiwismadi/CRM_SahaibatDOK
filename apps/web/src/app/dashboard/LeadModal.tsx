"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BUSINESS_TYPES, businessTypeLabel, type Lead, type StageDef } from "./types";

export interface LeadEditData {
  name: string;
  category: string;
  address: string;
  phoneRaw: string;
  phoneOffice: string;
  businessType: string;
  instagramUrl: string;
  notes: string;
}

export default function LeadModal({
  lead,
  stages,
  onClose,
  onSave,
  onStageChange,
}: {
  lead: Lead;
  stages: StageDef[];
  onClose: () => void;
  onSave: (id: string, data: LeadEditData) => Promise<void>;
  onStageChange: (id: string, toStage: string) => Promise<void>;
}) {
  const [mounted, setMounted] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<LeadEditData>({
    name: lead.name,
    category: lead.category ?? "",
    address: lead.address ?? "",
    phoneRaw: lead.phoneRaw ?? "",
    phoneOffice: lead.phoneOffice ?? "",
    businessType: lead.businessType ?? "",
    instagramUrl: lead.instagramUrl ?? "",
    notes: lead.notes ?? "",
  });

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    setForm({
      name: lead.name,
      category: lead.category ?? "",
      address: lead.address ?? "",
      phoneRaw: lead.phoneRaw ?? "",
      phoneOffice: lead.phoneOffice ?? "",
      businessType: lead.businessType ?? "",
      instagramUrl: lead.instagramUrl ?? "",
      notes: lead.notes ?? "",
    });
  }, [lead]);

  function handleClose() {
    setMounted(false);
    setTimeout(onClose, 120);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(lead.id, form);
      setEditing(false);
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
        className={`max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl transition-all duration-150 ${
          mounted ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
          <div>
            {editing ? (
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="rounded-lg border border-slate-200 px-2 py-1 text-base font-bold text-slate-900 outline-none focus:border-cyan-500"
              />
            ) : (
              <h2 className="text-base font-bold text-slate-900">{lead.name}</h2>
            )}
            <div className="mt-1 flex items-center gap-2">
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
                style={{ backgroundColor: lead.pipelineStageDef.color }}
              >
                {lead.pipelineStageDef.label}
              </span>
              <span className="text-xs text-slate-400">
                Scraped {new Date(lead.firstScrapedAt).toLocaleDateString("id-ID")}
              </span>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-4 px-6 py-5">
          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Business type</div>
            {editing ? (
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
            ) : (
              <div className="text-sm text-slate-700">{businessTypeLabel(lead.businessType)}</div>
            )}
          </div>

          <Field label="Category" editing={editing} value={form.category} onChange={(v) => setForm({ ...form, category: v })} display={lead.category ?? "—"} />
          <Field label="WA / Mobile phone" editing={editing} value={form.phoneRaw} onChange={(v) => setForm({ ...form, phoneRaw: v })} display={lead.phoneNormalized ?? lead.phoneRaw ?? "—"} />
          <Field label="Office / landline phone" editing={editing} value={form.phoneOffice} onChange={(v) => setForm({ ...form, phoneOffice: v })} display={lead.phoneOffice ?? "—"} />

          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Instagram</div>
            {editing ? (
              <input
                value={form.instagramUrl}
                onChange={(e) => setForm({ ...form, instagramUrl: e.target.value })}
                placeholder="https://instagram.com/..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-cyan-500"
              />
            ) : lead.instagramUrl ? (
              <a href={lead.instagramUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-cyan-700 hover:underline">
                {lead.instagramUrl}
              </a>
            ) : (
              <div className="text-sm text-slate-700">—</div>
            )}
          </div>

          <Field label="Address" editing={editing} value={form.address} onChange={(v) => setForm({ ...form, address: v })} display={lead.address ?? "—"} multiline />
          <Field label="Notes" editing={editing} value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} display={lead.notes ?? "No notes yet."} multiline />

          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Rating</div>
            <div className="text-sm text-slate-700">
              {lead.rating ? `${lead.rating} ★ (${lead.reviewCount ?? 0} reviews)` : "No ratings yet"}
            </div>
          </div>

          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Pipeline stage</div>
            <select
              value={lead.pipelineStage}
              onChange={(e) => onStageChange(lead.id, e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-cyan-500"
            >
              {stages.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
          <div className="flex gap-2">
            <Link
              href={`/chat?leadId=${lead.id}`}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Open Chat
            </Link>
            <Link
              href={`/chat?leadId=${lead.id}&openInfo=1`}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Contact Chain
            </Link>
          </div>
          {editing ? (
            <div className="flex gap-2">
              <button
                onClick={() => setEditing(false)}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-cyan-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-cyan-700 active:scale-95 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700 active:scale-95"
            >
              Edit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  editing,
  value,
  display,
  onChange,
  multiline,
}: {
  label: string;
  editing: boolean;
  value: string;
  display: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <div>
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      {editing ? (
        multiline ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-cyan-500"
          />
        ) : (
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-cyan-500"
          />
        )
      ) : (
        <div className="whitespace-pre-wrap text-sm text-slate-700">{display}</div>
      )}
    </div>
  );
}
