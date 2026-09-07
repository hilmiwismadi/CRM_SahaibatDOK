"use client";

import { use, useCallback, useEffect, useState } from "react";
import ContactChainTree, { type AddContactInput, type ContactChainNodeItem } from "@/app/components/ContactChainTree";

export default function LeadContactsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [contacts, setContacts] = useState<ContactChainNodeItem[]>([]);
  const [activeContactId, setActiveContactId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch(`/api/leads/${id}/contacts`);
    const data = await res.json();
    setContacts(data.contacts ?? []);
    setActiveContactId(data.activeContactId ?? null);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleActivate(contactId: string) {
    await fetch(`/api/leads/${id}/contacts/active`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactId }),
    });
    await load();
  }

  async function handleAdd(data: AddContactInput) {
    await fetch(`/api/leads/${id}/contacts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    await load();
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h2 className="mb-1 text-base font-semibold text-slate-900">Contact chain</h2>
      <p className="mb-4 text-sm text-slate-500">
        Track who gave you this contact when it gets handed off — e.g. a doctor forwarding you to
        administrative or marketing staff. The highlighted node is who a message to this lead goes to.
      </p>

      {loading ? (
        <div className="text-sm text-slate-400">Loading…</div>
      ) : (
        <div className="rounded-xl border border-slate-100 bg-white p-4">
          <ContactChainTree
            contacts={contacts}
            activeContactId={activeContactId}
            onActivate={handleActivate}
            onAdd={handleAdd}
          />
        </div>
      )}
    </div>
  );
}
