"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n/context";
import { formatDate } from "@/lib/i18n/locale";

interface UnlinkedContact {
  id: string;
  phoneNormalized: string | null;
  displayName: string | null;
  lastMessageAt: string;
  lastMessageBody: string | null;
  messageCount: number;
}

// Surfaces wa_contacts that messaged in but never matched a lead — see
// apps/wa-bridge/src/whatsapp/db-writer.ts's listUnlinkedContacts doc
// comment. This is a personal WhatsApp number shared with the bridge, so
// most of these are the account owner's friends/family; the occasional
// genuine new lead who wrote in before ever being scraped/added to the
// CRM can be promoted here before the retention purge drops it.
export default function UnlinkedContactsButton({ onPromoted }: { onPromoted: (leadId: string) => void }) {
  const { locale, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [contacts, setContacts] = useState<UnlinkedContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [nameDraft, setNameDraft] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    fetch("/api/wa/unlinked-contacts")
      .then((r) => r.json())
      .then((d) => setContacts(d.contacts ?? []))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (open) load();
  }, [open]);

  async function handlePromote(id: string) {
    const name = (nameDraft[id] ?? "").trim();
    if (!name) return;
    setPending(id);
    setError(null);
    try {
      const res = await fetch(`/api/wa/unlinked-contacts/${id}/promote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t.unlinkedPromoteFailed);
        return;
      }
      setOpen(false);
      onPromoted(data.leadId);
    } catch {
      setError(t.unlinkedPromoteFailed);
    } finally {
      setPending(null);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
      >
        {t.unlinkedButton}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div
            className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <h3 className="text-base font-semibold text-slate-900">{t.unlinkedTitle}</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="shrink-0 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label={t.close}
              >
                ✕
              </button>
            </div>
            <p className="mb-4 text-xs text-slate-400">{t.unlinkedDesc}</p>

            {loading && <div className="text-sm text-slate-400">{t.loading}</div>}
            {!loading && contacts.length === 0 && <div className="text-sm text-slate-400">{t.unlinkedEmpty}</div>}

            <div className="space-y-3">
              {contacts.map((c) => (
                <div key={c.id} className="rounded-lg border border-slate-100 p-3">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-slate-900">
                      {c.displayName ?? c.phoneNormalized ?? t.convUnknown}
                    </span>
                    <span className="shrink-0 text-[11px] text-slate-400">
                      {formatDate(c.lastMessageAt, locale, { day: "2-digit", month: "short" })}
                    </span>
                  </div>
                  {c.phoneNormalized && <div className="mb-1 text-xs text-slate-400">{c.phoneNormalized}</div>}
                  <div className="mb-2 truncate text-xs text-slate-500">{c.lastMessageBody ?? t.convMedia}</div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder={t.unlinkedNamePlaceholder}
                      value={nameDraft[c.id] ?? ""}
                      onChange={(e) => setNameDraft((d) => ({ ...d, [c.id]: e.target.value }))}
                      className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none focus:border-cyan-500"
                    />
                    <button
                      type="button"
                      disabled={pending === c.id || !(nameDraft[c.id] ?? "").trim()}
                      onClick={() => handlePromote(c.id)}
                      className="shrink-0 rounded-lg bg-cyan-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-cyan-700 disabled:opacity-50"
                    >
                      {pending === c.id ? "…" : t.unlinkedPromoteAction}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {error && <div className="mt-3 text-xs text-red-600">{error}</div>}
          </div>
        </div>
      )}
    </>
  );
}
