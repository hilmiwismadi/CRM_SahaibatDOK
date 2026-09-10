"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AppSidebar from "@/app/components/AppSidebar";
import LeadModal, { type LeadEditData } from "./LeadModal";
import AddLeadModal from "./AddLeadModal";
import { BUSINESS_TYPES, businessTypeLabel, type Lead, type StageDef } from "./types";
import { CATEGORY_LABELS, CATEGORY_ORDER } from "@/lib/leadSegmentation";

/**
 * Opens a URL in a new tab without stealing focus from the dashboard — a
 * plain `window.open(url, "_blank")` opens in the foreground by default, so
 * right-clicking a lead to peek at its chat would otherwise yank the user
 * off the dashboard mid-triage. Immediately blurring the new tab and
 * refocusing this one (still inside the same click handler / user gesture)
 * keeps the dashboard on screen so they can keep working through other
 * leads, with the chat ready to switch to whenever they want it.
 */
function openInBackgroundTab(url: string) {
  // Deliberately omits noopener/noreferrer: this is an internal, same-origin
  // route, and blur()/focus() below need the actual window reference —
  // noopener forces window.open() to return null, which would silently
  // break the refocus trick.
  const win = window.open(url, "_blank");
  win?.blur();
  window.focus();
}

export default function DashboardPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stages, setStages] = useState<StageDef[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [provinces, setProvinces] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [provinceFilter, setProvinceFilter] = useState("all");
  const [businessTypeFilter, setBusinessTypeFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [groupByProvince, setGroupByProvince] = useState(false);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; lead: Lead } | null>(null);

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    const closeOnEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [contextMenu]);

  const load = useCallback(async () => {
    const qs = new URLSearchParams();
    if (search) qs.set("search", search);
    if (stageFilter !== "all") qs.set("stage", stageFilter);
    if (categoryFilter !== "all") qs.set("category", categoryFilter);
    if (cityFilter !== "all") qs.set("city", cityFilter);
    if (provinceFilter !== "all") qs.set("province", provinceFilter);
    if (businessTypeFilter !== "all") qs.set("businessType", businessTypeFilter);
    if (tagFilter !== "all") qs.set("tag", tagFilter);
    const res = await fetch(`/api/leads?${qs.toString()}`);
    const data = await res.json();
    setLeads(data.leads ?? []);
    setLoading(false);
  }, [search, stageFilter, categoryFilter, cityFilter, provinceFilter, businessTypeFilter, tagFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fetch("/api/pipeline-stages")
      .then((r) => r.json())
      .then((d) => setStages(d.stages ?? []));
    fetch("/api/leads/filter-options")
      .then((r) => r.json())
      .then((d) => {
        setCategories(d.categories ?? []);
        setCities(d.cities ?? []);
        setProvinces(d.provinces ?? []);
      });
  }, []);

  const groupedLeads = useMemo(() => {
    const groups = new Map<string, Lead[]>();
    for (const lead of leads) {
      const key = lead.province ?? "Unknown";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(lead);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => {
      if (a === "Unknown") return 1;
      if (b === "Unknown") return -1;
      return a.localeCompare(b);
    });
  }, [leads]);

  async function handleAdd(data: LeadEditData) {
    await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    await load();
  }

  async function handleSave(id: string, data: LeadEditData) {
    const res = await fetch(`/api/leads/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const payload = await res.json();
    if (payload.lead) {
      setSelected(payload.lead);
      setLeads((prev) => prev.map((l) => (l.id === id ? payload.lead : l)));
    }
  }

  async function handleStageChange(id: string, toStage: string) {
    const res = await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toStage }),
    });
    const payload = await res.json();
    if (payload.lead) {
      setSelected(payload.lead);
      setLeads((prev) => prev.map((l) => (l.id === id ? payload.lead : l)));
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f7f8fa] text-slate-900">
      <AppSidebar active="dashboard" />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-900">Dashboard</h1>
            <p className="text-sm text-slate-500">{loading ? "Loading…" : `${leads.length} leads`}</p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-700 hover:shadow active:scale-95"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            Add Lead
          </button>
        </div>

        <div className="mb-4 flex gap-3">
          <div className="relative flex-1">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              placeholder="Search by name, category, address, or phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-cyan-500"
            />
          </div>
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-cyan-500"
          >
            <option value="all">All stages</option>
            {stages.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
          <select
            value={businessTypeFilter}
            onChange={(e) => setBusinessTypeFilter(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-cyan-500"
          >
            <option value="all">All types</option>
            {BUSINESS_TYPES.map((b) => (
              <option key={b.key} value={b.key}>
                {b.label}
              </option>
            ))}
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-cyan-500"
          >
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-cyan-500"
          >
            <option value="all">All locations</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={provinceFilter}
            onChange={(e) => setProvinceFilter(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-cyan-500"
          >
            <option value="all">All provinces</option>
            {provinces.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <select
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-cyan-500"
          >
            <option value="all">All tags</option>
            {CATEGORY_ORDER.map((key) => (
              <option key={key} value={key}>
                {CATEGORY_LABELS[key]}
              </option>
            ))}
          </select>
          <button
            onClick={() => setGroupByProvince((v) => !v)}
            className={`shrink-0 rounded-lg border px-3 py-2 text-sm font-medium transition ${
              groupByProvince
                ? "border-cyan-600 bg-cyan-50 text-cyan-700"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            Group by province
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
          {!loading && leads.length === 0 && (
            <div className="p-8 text-center text-sm text-slate-400">No leads match — try a different search or add one manually.</div>
          )}
          {leads.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-left text-slate-500">
                    <th className="px-4 py-2.5 font-medium">Name</th>
                    <th className="px-4 py-2.5 font-medium">Type</th>
                    <th className="px-4 py-2.5 font-medium">Category</th>
                    <th className="px-4 py-2.5 font-medium">WA / Office phone</th>
                    <th className="px-4 py-2.5 font-medium">Stage</th>
                    <th className="px-4 py-2.5 font-medium">Rating</th>
                    <th className="px-4 py-2.5 font-medium">Last scraped</th>
                  </tr>
                </thead>
                <tbody>
                  {groupByProvince
                    ? groupedLeads.flatMap(([province, groupLeads]) => [
                        <tr key={`group-${province}`} className="bg-slate-50/80">
                          <td colSpan={7} className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {province} <span className="font-normal normal-case text-slate-400">({groupLeads.length})</span>
                          </td>
                        </tr>,
                        ...groupLeads.map((lead) => (
                          <LeadRow
                            key={lead.id}
                            lead={lead}
                            onSelect={setSelected}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              setContextMenu({ x: e.clientX, y: e.clientY, lead });
                            }}
                          />
                        )),
                      ])
                    : leads.map((lead) => (
                        <LeadRow
                          key={lead.id}
                          lead={lead}
                          onSelect={setSelected}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setContextMenu({ x: e.clientX, y: e.clientY, lead });
                          }}
                        />
                      ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {selected && (
        <LeadModal
          lead={selected}
          stages={stages}
          onClose={() => setSelected(null)}
          onSave={handleSave}
          onStageChange={handleStageChange}
        />
      )}
      {showAdd && <AddLeadModal onClose={() => setShowAdd(false)} onSubmit={handleAdd} />}

      {contextMenu && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ position: "fixed", top: contextMenu.y, left: contextMenu.x, zIndex: 100 }}
          className="min-w-[180px] overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          <div className="truncate px-3 py-1.5 text-xs font-medium text-slate-400">{contextMenu.lead.name}</div>
          <button
            onClick={() => {
              openInBackgroundTab(`/chat?leadId=${contextMenu.lead.id}`);
              setContextMenu(null);
            }}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-slate-700 transition hover:bg-slate-50"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0 text-slate-400">
              <path d="M4 4h16v12H8l-4 4V4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            </svg>
            Open Chat in New Tab
          </button>
          <button
            onClick={() => {
              openInBackgroundTab(`/chat?leadId=${contextMenu.lead.id}&openInfo=1`);
              setContextMenu(null);
            }}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-slate-700 transition hover:bg-slate-50"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0 text-slate-400">
              <path d="M4 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" transform="translate(0 0)" />
              <circle cx="12" cy="9.5" r="2.4" stroke="currentColor" strokeWidth="2" />
            </svg>
            Open Contact Chain in New Tab
          </button>
        </div>
      )}
    </div>
  );
}

function LeadRow({
  lead,
  onSelect,
  onContextMenu,
}: {
  lead: Lead;
  onSelect: (lead: Lead) => void;
  onContextMenu: (e: React.MouseEvent) => void;
}) {
  return (
    <tr
      onClick={() => onSelect(lead)}
      onContextMenu={onContextMenu}
      className="cursor-pointer border-b border-slate-50 transition-colors last:border-0 hover:bg-cyan-50/60 active:bg-cyan-50"
    >
      <td className="px-4 py-2.5 font-medium text-slate-800">{lead.name}</td>
      <td className="px-4 py-2.5">
        {lead.businessType ? (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            {businessTypeLabel(lead.businessType)}
          </span>
        ) : (
          <span className="text-slate-400">-</span>
        )}
      </td>
      <td className="px-4 py-2.5 text-slate-500">{lead.category ?? "-"}</td>
      <td className="px-4 py-2.5 text-slate-600">
        <div>{lead.phoneNormalized ?? "-"}</div>
        {lead.phoneOffice && <div className="text-xs text-slate-400">{lead.phoneOffice}</div>}
      </td>
      <td className="px-4 py-2.5">
        <span
          className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
          style={{ backgroundColor: lead.pipelineStageDef?.color ?? "#71717a" }}
        >
          {lead.pipelineStageDef?.label ?? lead.pipelineStage}
        </span>
      </td>
      <td className="px-4 py-2.5 text-slate-500">{lead.rating ? `${lead.rating} (${lead.reviewCount ?? 0})` : "-"}</td>
      <td className="px-4 py-2.5 text-slate-400">
        {new Date(lead.lastScrapedAt ?? lead.firstScrapedAt).toLocaleDateString("id-ID")}
      </td>
    </tr>
  );
}
