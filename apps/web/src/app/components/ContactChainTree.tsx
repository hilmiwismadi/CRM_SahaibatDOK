"use client";

import { useState, type CSSProperties, type ReactElement } from "react";

export interface ContactChainNodeItem {
  id: string;
  parentId: string | null;
  displayName: string | null;
  phoneNormalized: string | null;
  role: string | null;
  handoffNote: string | null;
  isRoot: boolean;
  waContactId: string | null;
}

export interface AddContactInput {
  parentId: string;
  displayName: string;
  phoneRaw: string;
  role?: string;
  handoffNote?: string;
}

function buildChildrenMap(nodes: ContactChainNodeItem[]) {
  const byParent = new Map<string | null, ContactChainNodeItem[]>();
  for (const n of nodes) {
    const key = n.parentId;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(n);
  }
  return byParent;
}

function NodeRow({
  node,
  depth,
  isActive,
  busy,
  onActivate,
  onAddChild,
}: {
  node: ContactChainNodeItem;
  depth: number;
  isActive: boolean;
  busy: boolean;
  onActivate: (id: string) => void;
  onAddChild: (parentId: string) => void;
}) {
  return (
    // Indent via a CSS variable so phones can use a tighter step (deep
    // handoff chains otherwise squeeze the row to nothing at 375px).
    <li
      style={{ "--depth": depth } as CSSProperties}
      className="ml-[calc(var(--depth)*16px)] py-1 max-md:ml-[calc(min(var(--depth),6)*12px)]"
    >
      {/* Phones: info on top, full-width action buttons underneath. */}
      <div
        className={`flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 max-md:flex-col max-md:items-stretch ${
          isActive ? "bg-cyan-50" : ""
        } ${depth > 0 ? "max-md:border-l-2 max-md:border-slate-100" : ""}`}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="truncate text-sm font-medium text-slate-800 max-md:max-w-full">
              {node.displayName ?? node.phoneNormalized ?? "Unnamed contact"}
            </span>
            {node.isRoot && (
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">root</span>
            )}
            {isActive && (
              <span className="rounded bg-cyan-600 px-1.5 py-0.5 text-[10px] text-white">active</span>
            )}
          </div>
          <div className="text-xs text-slate-400 max-md:break-words">
            {node.phoneNormalized ?? "no phone"}
            {node.role ? ` · ${node.role}` : ""}
          </div>
          {node.handoffNote && (
            <div className="mt-0.5 text-xs italic text-slate-400">&ldquo;{node.handoffNote}&rdquo;</div>
          )}
        </div>
        <div className="flex shrink-0 gap-1 max-md:gap-2">
          {!isActive && (
            <button
              disabled={busy}
              onClick={() => onActivate(node.id)}
              className="rounded border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 max-md:min-h-[44px] max-md:flex-1 max-md:rounded-lg max-md:bg-white max-md:text-sm"
            >
              Set active
            </button>
          )}
          <button
            disabled={busy}
            onClick={() => onAddChild(node.id)}
            className="rounded border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 max-md:min-h-[44px] max-md:flex-1 max-md:rounded-lg max-md:bg-white max-md:text-sm"
          >
            + Handoff
          </button>
        </div>
      </div>
    </li>
  );
}

export default function ContactChainTree({
  contacts,
  activeContactId,
  onActivate,
  onAdd,
}: {
  contacts: ContactChainNodeItem[];
  activeContactId: string | null;
  onActivate: (contactId: string) => Promise<void>;
  onAdd: (data: AddContactInput) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [addingUnderId, setAddingUnderId] = useState<string | null>(null);
  const [form, setForm] = useState({ displayName: "", phoneRaw: "", role: "", handoffNote: "" });

  const byParent = buildChildrenMap(contacts);

  async function handleActivate(id: string) {
    setBusy(true);
    try {
      await onActivate(id);
    } finally {
      setBusy(false);
    }
  }

  async function handleAddSubmit() {
    if (!addingUnderId || !form.displayName.trim() || !form.phoneRaw.trim()) return;
    setBusy(true);
    try {
      await onAdd({
        parentId: addingUnderId,
        displayName: form.displayName.trim(),
        phoneRaw: form.phoneRaw.trim(),
        role: form.role.trim() || undefined,
        handoffNote: form.handoffNote.trim() || undefined,
      });
      setForm({ displayName: "", phoneRaw: "", role: "", handoffNote: "" });
      setAddingUnderId(null);
    } finally {
      setBusy(false);
    }
  }

  function renderLevel(parentId: string | null, depth: number): ReactElement[] {
    const children = byParent.get(parentId) ?? [];
    return children.flatMap((node) => [
      <NodeRow
        key={node.id}
        node={node}
        depth={depth}
        isActive={node.id === activeContactId}
        busy={busy}
        onActivate={handleActivate}
        onAddChild={(id) => setAddingUnderId(id)}
      />,
      ...renderLevel(node.id, depth + 1),
    ]);
  }

  return (
    <div>
      <ul className="flex flex-col">{renderLevel(null, 0)}</ul>

      {addingUnderId && (
        <div className="mt-3 rounded-lg border border-slate-200 p-3">
          <div className="mb-2 text-xs font-semibold text-slate-500">Add handoff contact</div>
          <div className="flex flex-col gap-2">
            <input
              placeholder="Name"
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              autoComplete="off"
              className="rounded border border-slate-200 px-2 py-1.5 text-sm max-md:min-h-[44px] max-md:rounded-lg max-md:px-3"
            />
            <input
              placeholder="Phone number"
              value={form.phoneRaw}
              onChange={(e) => setForm({ ...form, phoneRaw: e.target.value })}
              type="tel"
              inputMode="tel"
              autoComplete="off"
              className="rounded border border-slate-200 px-2 py-1.5 text-sm max-md:min-h-[44px] max-md:rounded-lg max-md:px-3"
            />
            <input
              placeholder="Role (e.g. admin_staff, marketing)"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="rounded border border-slate-200 px-2 py-1.5 text-sm max-md:min-h-[44px] max-md:rounded-lg max-md:px-3"
            />
            <input
              placeholder="Handoff note (optional)"
              value={form.handoffNote}
              onChange={(e) => setForm({ ...form, handoffNote: e.target.value })}
              className="rounded border border-slate-200 px-2 py-1.5 text-sm max-md:min-h-[44px] max-md:rounded-lg max-md:px-3"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setAddingUnderId(null)}
                className="rounded px-3 py-1.5 text-xs text-slate-500 max-md:min-h-[44px] max-md:flex-1 max-md:rounded-lg max-md:border max-md:border-slate-200 max-md:text-sm"
              >
                Cancel
              </button>
              <button
                disabled={busy}
                onClick={handleAddSubmit}
                className="rounded bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40 max-md:min-h-[44px] max-md:flex-1 max-md:rounded-lg max-md:text-sm"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
