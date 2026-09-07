"use client";

import { useCallback, useEffect, useState } from "react";
import AppSidebar from "@/app/components/AppSidebar";

interface Template {
  id: string;
  name: string;
  category: string;
  message: string;
  updatedAt: string;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", category: "general", message: "" });
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/templates");
    const data = await res.json();
    setTemplates(data.templates ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function startCreate() {
    setForm({ name: "", category: "general", message: "" });
    setEditingId(null);
    setCreating(true);
    setError(null);
  }

  function startEdit(t: Template) {
    setForm({ name: t.name, category: t.category, message: t.message });
    setEditingId(t.id);
    setCreating(false);
    setError(null);
  }

  function cancelForm() {
    setCreating(false);
    setEditingId(null);
    setError(null);
  }

  async function handleSubmit() {
    setError(null);
    const url = editingId ? `/api/templates/${editingId}` : "/api/templates";
    const method = editingId ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Failed to save template");
      return;
    }
    cancelForm();
    load();
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this template?")) return;
    await fetch(`/api/templates/${id}`, { method: "DELETE" });
    load();
  }

  const showForm = creating || editingId !== null;

  return (
    <div className="flex h-screen overflow-hidden bg-[#f7f8fa] text-slate-900">
      <AppSidebar active="templates" />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-900">Message Templates</h1>
            <p className="text-sm text-slate-500">Reusable messages selectable from the chat composer.</p>
          </div>
          <button
            onClick={startCreate}
            className="flex items-center gap-1.5 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-700 active:scale-95"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            New Template
          </button>
        </div>

        {showForm && (
          <div className="mb-6 max-w-xl rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">{editingId ? "Edit template" : "New template"}</h2>
            <div className="mb-3 flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="First Intro"
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-cyan-500"
              />
            </div>
            <div className="mb-3 flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Category</label>
              <input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="first_contact"
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-cyan-500"
              />
            </div>
            <div className="mb-4 flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Message</label>
              <textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                rows={4}
                placeholder="Permisi kak, apakah benar ini kontak..."
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-cyan-500"
              />
            </div>
            {error && <p className="mb-3 text-xs text-red-600">{error}</p>}
            <div className="flex justify-end gap-2">
              <button onClick={cancelForm} className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-50">
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!form.name.trim() || !form.message.trim()}
                className="rounded-lg bg-cyan-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-cyan-700 active:scale-95 disabled:opacity-50"
              >
                {editingId ? "Save" : "Create"}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-sm text-slate-400">Loading…</div>
        ) : templates.length === 0 ? (
          <div className="rounded-xl border border-slate-100 bg-white p-8 text-center text-sm text-slate-400 shadow-sm">
            No templates yet — create one to reuse in chat.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((t) => (
              <div
                key={t.id}
                className="flex flex-col rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition hover:shadow-md"
              >
                <div className="mb-1 flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-900">{t.name}</h3>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                    {t.category}
                  </span>
                </div>
                <p className="mb-3 line-clamp-4 flex-1 whitespace-pre-wrap text-xs text-slate-600">{t.message}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(t)}
                    className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="rounded-lg border border-red-100 px-2.5 py-1 text-xs font-medium text-red-500 transition hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
