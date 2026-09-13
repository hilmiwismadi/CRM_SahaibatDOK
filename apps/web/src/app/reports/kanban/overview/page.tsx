"use client";

import { useCallback, useEffect, useState } from "react";
import AppSidebar from "@/app/components/AppSidebar";
import ReportsTabs from "../../ReportsTabs";
import { CATEGORY_COLORS, CATEGORY_GRADIENTS, CATEGORY_LABELS, type LeadCategory } from "@/lib/leadSegmentation";
import {
  type CardLead,
  type SelectedLead,
  LeadCard,
  LeadPopup,
  KanbanSubNav,
  quickTag,
  type QuickTagAction,
  BOARD_COLUMN_WIDTH,
  buildBoardHeaderCells,
} from "../shared";

// Overview's columns that are valid drag-and-drop targets, mapped to the
// quick-tag action a drop there performs.
const DROPPABLE_ACTION: Partial<Record<LeadCategory, QuickTagAction>> = {
  no_wa_account: "noWaAccount",
  appointment: "appointment",
  declined: "declined",
  replied_by_bot: "repliedBot",
  needs_other_contact: "needsOtherContact",
  needs_follow_up: "needsFollowUp",
  active: "clear",
};

interface Segmentation {
  total: number;
  untouched: { count: number; leads: CardLead[] };
  touched: {
    count: number;
    categories: { key: LeadCategory; label: string; count: number; leads: CardLead[] }[];
  };
}

// The funnel, drawn left to right exactly as the triase diagram reads:
// Belum Disentuh -> Tidak Ada Kontak WA -> (Tidak Reply: Non-Responsive,
// Not-Interested) -> (Reply: Follow Up, Further Contact, Reject,
// Appointment) -> the 3 categories that sit outside that split entirely
// (Belum Dijawab, Dijawab Bot, Perlu Diklasifikasi). This is a *display*
// order, deliberately different from leadSegmentation's CATEGORY_ORDER
// (which orders by classification priority, not funnel position) — see
// GROUP_LABELS below for the two spanning headers this order lets us draw.
const FUNNEL_COLUMNS: { key: LeadCategory; group?: "no_reply" | "reply" }[] = [
  { key: "untouched" },
  { key: "no_wa_account" },
  { key: "non_responsive", group: "no_reply" },
  { key: "no_reply_after_pitch", group: "no_reply" },
  { key: "needs_follow_up", group: "reply" },
  { key: "needs_other_contact", group: "reply" },
  { key: "declined", group: "reply" },
  { key: "appointment", group: "reply" },
  { key: "needs_reply" },
  { key: "replied_by_bot" },
  { key: "active" },
];

const GROUP_LABELS: Record<"no_reply" | "reply", string> = { no_reply: "Tidak Reply", reply: "Reply" };
const HEADER_CELLS = buildBoardHeaderCells(FUNNEL_COLUMNS, GROUP_LABELS);

export default function KanbanOverviewPage() {
  const [data, setData] = useState<Segmentation | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SelectedLead | null>(null);
  const [dragOverKey, setDragOverKey] = useState<LeadCategory | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast((cur) => (cur === msg ? null : cur)), 3000);
  }, []);

  const loadSegmentation = useCallback(() => {
    return fetch("/api/reports/segmentation")
      .then((r) => r.json())
      .then((d) => setData(d));
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadSegmentation().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [loadSegmentation]);

  function handleMoved() {
    loadSegmentation();
  }

  async function handleDrop(leadId: string, targetKey: LeadCategory) {
    setDragOverKey(null);
    const action = DROPPABLE_ACTION[targetKey];
    if (!action) return;
    const result = await quickTag(leadId, action);
    if (!result.ok) {
      showToast(result.error ?? "Gagal memindahkan lead.");
      return;
    }
    handleMoved();
  }

  const columns = data
    ? FUNNEL_COLUMNS.map(({ key }) => {
        if (key === "untouched") {
          return { key, label: CATEGORY_LABELS.untouched, leads: data.untouched.leads };
        }
        const cat = data.touched.categories.find((c) => c.key === key);
        return { key, label: cat?.label ?? CATEGORY_LABELS[key], leads: cat?.leads ?? [] };
      })
    : [];

  return (
    <div className="flex h-screen overflow-hidden bg-[#f7f8fa] text-slate-900">
      <AppSidebar active="reports" />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-6">
        <h1 className="mb-1 text-lg font-bold text-slate-900">Sales report</h1>
        <p className="mb-4 text-sm text-slate-500">
          Alur kiri ke kanan: Belum Disentuh → Tidak Ada Kontak WA → (Tidak Reply) → (Reply) → lainnya. Klik kartu
          untuk lihat ringkasan &amp; pindahkan tag, atau drag ke kolom lain. &ldquo;Belum Disentuh&rdquo;, &ldquo;Belum
          Dijawab&rdquo;, &ldquo;Not-Interested&rdquo;, dan &ldquo;Non-Responsive&rdquo; tidak bisa dipindah manual —
          itu status otomatis, bukan tag. &ldquo;Perlu Diklasifikasi&rdquo; bukan status aman — cek isi chat-nya dan
          pindahkan ke kategori yang sesuai.
        </p>
        <ReportsTabs />
        <KanbanSubNav active="overview" />

        {loading && <div className="text-sm text-slate-400">Loading…</div>}
        {data && (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {/* One shared horizontal scroller for both rows below — on a
                narrow screen the group headers ("Tidak Reply"/"Reply") must
                scroll together with the columns they label, not stay fixed
                while the board underneath slides past them. min-h-0
                everywhere in this chain: flex/grid children default to
                min-height:auto (content size), which silently defeats a
                descendant's overflow-y-auto by never letting this
                container shrink below "tall enough to show every card". */}
            <div className="flex min-h-0 flex-1 flex-col overflow-x-auto overflow-y-hidden">
            {/* Group header row — same track widths as the board below, so
                "Tidak Reply" / "Reply" visually span exactly the columns
                they contain. */}
            <div
              className="grid shrink-0 gap-4 pb-2"
              style={{ gridAutoFlow: "column", gridAutoColumns: BOARD_COLUMN_WIDTH }}
            >
              {HEADER_CELLS.map((cell, i) => (
                <div
                  key={i}
                  style={{ gridColumn: `span ${cell.span}` }}
                  className={
                    cell.label
                      ? "rounded-t-lg border border-b-0 border-slate-200 bg-slate-100 px-3 py-1.5 text-center text-xs font-semibold uppercase tracking-wide text-slate-500"
                      : ""
                  }
                >
                  {cell.label}
                </div>
              ))}
            </div>

            <div
              className="grid min-h-0 flex-1 gap-4 pb-4"
              style={{ gridAutoFlow: "column", gridAutoColumns: BOARD_COLUMN_WIDTH }}
            >
              {columns.map((col) => {
                const droppable = Boolean(DROPPABLE_ACTION[col.key]);
                return (
                  <div
                    key={col.key}
                    onDragOver={
                      droppable
                        ? (e) => {
                            e.preventDefault();
                            setDragOverKey(col.key);
                          }
                        : undefined
                    }
                    onDragLeave={droppable ? () => setDragOverKey((k) => (k === col.key ? null : k)) : undefined}
                    onDrop={
                      droppable
                        ? (e) => {
                            e.preventDefault();
                            const leadId = e.dataTransfer.getData("text/plain");
                            if (leadId) handleDrop(leadId, col.key);
                          }
                        : undefined
                    }
                    className={`flex min-h-0 flex-col rounded-xl bg-slate-100/60 p-3 transition ${
                      dragOverKey === col.key ? "ring-2 ring-cyan-400 bg-cyan-50/60" : ""
                    }`}
                  >
                    <div className="mb-3 flex items-center gap-2 px-1">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={
                          CATEGORY_GRADIENTS[col.key]
                            ? { backgroundImage: `linear-gradient(135deg, ${CATEGORY_GRADIENTS[col.key]![0]}, ${CATEGORY_GRADIENTS[col.key]![1]})` }
                            : { backgroundColor: CATEGORY_COLORS[col.key] }
                        }
                      />
                      <span className="text-sm font-semibold text-slate-700">{col.label}</span>
                      <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-500">
                        {col.leads.length}
                      </span>
                    </div>
                    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
                      {col.leads.length === 0 && (
                        <div className="rounded-lg border border-dashed border-slate-200 p-3 text-center text-xs text-slate-400">
                          Kosong
                        </div>
                      )}
                      {col.leads.map((lead) => (
                        <LeadCard
                          key={lead.id}
                          lead={lead}
                          categoryLabel={col.label}
                          categoryColor={CATEGORY_COLORS[col.key]}
                          draggable
                          onOpen={setSelected}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            </div>
          </div>
        )}
      </div>
      {selected && <LeadPopup selection={selected} onClose={() => setSelected(null)} onMoved={handleMoved} />}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[70] -translate-x-1/2 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
