"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import AppSidebar from "@/app/components/AppSidebar";
import { CATEGORY_LABELS_EN, CATEGORY_ORDER, type LeadCategory } from "@/lib/leadSegmentation";
import { ALL_REGIONS_KEY } from "@/lib/mapRegions";
import { useIsMobile } from "@/lib/useIsMobile";

interface StageDef {
  key: string;
  label: string;
  color: string;
  sortOrder: number;
}

interface Lead {
  id: string;
  googlePlaceId: string;
  name: string;
  category: string | null;
  address: string | null;
  phoneNormalized: string | null;
  rating: string | null;
  reviewCount: number | null;
  // Nullable: manually-added or not-yet-geocoded leads have no coordinates
  // and can't be plotted as a pin — but they still belong in the lead list,
  // stage counts, and are still selectable/chattable from this page. Only
  // the map-rendering code (mappableLeads below) filters these out.
  lat: number | null;
  lng: number | null;
  pipelineStage: string;
  pipelineStageDef: StageDef;
  // True if any WA contact linked to this lead has been confirmed (via
  // apps/wa-bridge's sock.onWhatsApp() check — manual tag or automatic on
  // a failed send) to have no WhatsApp account at all. Takes visual
  // priority over the pipeline-stage color everywhere on this page — see
  // NO_WA_COLOR/pinColor below — since "can't be reached on WA" is a more
  // urgent fact than whatever stage the lead happens to be in.
  noWaAccount: boolean;
  // Real working status (same classification /reports/kanban uses) — what
  // pin colors, the legend and the status filter are based on. pipelineStage
  // is not used for this: reps never advance it, so it stays "new".
  tagCategory: LeadCategory;
  // Why a rep is deliberately not contacting this lead — see LABEL_OPTIONS.
  label: string | null;
  labelNote: string | null;
}

const LABEL_OPTIONS: { key: string; text: string }[] = [
  { key: "dental", text: "Dental" },
  { key: "aesthetic", text: "Aesthetic" },
  { key: "low_rating", text: "Low rating" },
  { key: "government_affiliate", text: "Government Affiliate" },
  { key: "other", text: "Other options" },
];

function labelText(lead: Lead): string | null {
  if (!lead.label) return null;
  if (lead.label === "other") return lead.labelNote ? `Other: ${lead.labelNote}` : "Other";
  return LABEL_OPTIONS.find((o) => o.key === lead.label)?.text ?? lead.label;
}

function hasCoords(l: Lead): l is Lead & { lat: number; lng: number } {
  return l.lat != null && l.lng != null;
}

// The map shows four top-level groups. Everything a rep has actually
// worked (Appointment, Reject, Follow Up, ...) is folded into "Contacted"
// and only broken out when its legend row is expanded.
type Group = "untouched" | "no_wa" | "later" | "contacted";

const GROUP_ORDER: Group[] = ["untouched", "no_wa", "later", "contacted"];
const GROUP_COLORS: Record<Group, string> = {
  untouched: "#94a3b8", // slate
  no_wa: "#8B4513", // brown
  later: "#7c3aed", // purple
  contacted: "#3b82f6", // blue
};
const GROUP_LABELS: Record<Group, string> = {
  untouched: "Untouched",
  no_wa: "Tidak Ada Kontak WA",
  later: "Later",
  contacted: "Contacted",
};

// The detailed statuses that live under "Contacted".
const CONTACTED_STATUSES = CATEGORY_ORDER.filter((c) => c !== "untouched" && c !== "no_wa_account");

function statusLabel(c: LeadCategory): string {
  return CATEGORY_LABELS_EN[c];
}

// "Tidak Ada Kontak WA" covers two distinct "can't be WA-chatted" cases:
// (1) noWaAccount — a number exists but is confirmed (via
// sock.onWhatsApp()) to have no WhatsApp account; (2) no phoneNormalized at
// all. Both are dead ends for WA. A label ("Later") wins over everything —
// it means a rep deliberately set the lead aside.
function groupOf(lead: Lead): Group {
  if (lead.label) return "later";
  if (lead.noWaAccount || !lead.phoneNormalized) return "no_wa";
  // Untouched lead whose only number is a landline (+62<area code>, not
  // +628...) can never be WA-chatted — auto-bucket it instead of waiting for
  // a failed send to set noWaAccount. Touched leads keep their real status.
  if (lead.tagCategory === "untouched" && isLikelyLandline(lead.phoneNormalized)) return "no_wa";
  if (lead.tagCategory === "untouched") return "untouched";
  return "contacted";
}

function pinColor(lead: Lead): string {
  return GROUP_COLORS[groupOf(lead)];
}

// Indonesian mobile (WhatsApp-capable) numbers always take the form
// +628xxxxxxxxx. Anything else after +62 (e.g. +62274... — Yogyakarta's
// 0274 landline area code) is a landline/office number with no WhatsApp
// account. Real case that surfaced this: Puskesmas Tegalrejo's only
// scraped phone was "(0274) 586841" -> normalized to "+62274586841" and
// treated as WA-capable — the CRM reported the message as "sent" even
// though nothing ever reached a real phone (see apps/wa-bridge's
// sendText(), which now rejects these via sock.onWhatsApp() before
// sending). This is the same check, applied proactively in the UI so a
// rep sees it before even trying to send.
function isLikelyLandline(phoneNormalized: string | null): boolean {
  return !!phoneNormalized && /^\+62(?!8)/.test(phoneNormalized);
}

interface Activity {
  id: string;
  type: string;
  payload: { from?: string; to?: string | null; note?: string | null } | null;
  createdAt: string;
}

function activityLabel(to: string | null | undefined, note: string | null | undefined): string {
  if (!to) return "cleared";
  if (to === "other") return note ? `Other — ${note}` : "Other";
  return LABEL_OPTIONS.find((o) => o.key === to)?.text ?? to;
}

function pinIcon(color: string, selected: boolean) {
  const size = selected ? 40 : 30;
  const ring = selected ? "#0f172a" : "#ffffff";
  const ringWidth = selected ? 2 : 1.5;
  const html = `<svg width="${size}" height="${size}" viewBox="0 0 32 40" style="filter:drop-shadow(0 2px 3px rgba(15,23,42,0.35))">
    <path d="M16 39C16 39 30 24.5 30 15A14 14 0 0 0 2 15C2 24.5 16 39 16 39Z" fill="${color}" stroke="${ring}" stroke-width="${ringWidth}"/>
    <circle cx="16" cy="15" r="6" fill="#fff"/>
  </svg>`;
  return L.divIcon({
    html,
    className: "lead-pin-icon",
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
  });
}

// Refits when `fitKey` (the region selection whose data is now loaded)
// changes — not on the focus-triggered refetches, which keep the same key and
// so don't yank the viewport away from wherever the rep has panned.
function FitBounds({
  leads,
  fitKey,
  mobile,
}: {
  leads: (Lead & { lat: number; lng: number })[];
  fitKey: string;
  mobile: boolean;
}) {
  const map = useMap();
  useEffect(() => {
    if (leads.length === 0) return;
    const bounds = L.latLngBounds(leads.map((l) => [l.lat, l.lng] as [number, number]));
    // Phones: keep pins clear of the floating search row (top) and the
    // "Daftar" button (bottom).
    if (mobile) map.fitBounds(bounds, { paddingTopLeft: [24, 72], paddingBottomRight: [24, 84] });
    else map.fitBounds(bounds, { padding: [48, 48] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey, leads.length === 0]);
  return null;
}

interface RegionOption {
  key: string;
  label: string;
  count: number;
}

const NO_LEADS: Lead[] = [];

const REGION_STORAGE_KEY = "map.regions";

// Remembered selection from the last visit. localStorage can throw or be
// empty (private window, blocked site data) — fall back to "nothing picked".
function readStoredRegions(): string[] {
  try {
    const raw = window.localStorage.getItem(REGION_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((k): k is string => typeof k === "string") : [];
  } catch {
    return [];
  }
}

function storeRegions(keys: string[]) {
  try {
    window.localStorage.setItem(REGION_STORAGE_KEY, JSON.stringify(keys));
  } catch {
    // remembering the choice is a convenience only
  }
}

// "Berikutnya terdekat": the rep walks the visible pins one by one instead of
// panning and clicking each. The walk (ids in the order they were shown) is
// remembered per region selection so a reload resumes where it stopped.
const TOUR_STORAGE_KEY = "map.tour";

function readStoredTours(): Record<string, string[]> {
  try {
    const raw = window.localStorage.getItem(TOUR_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function storeTours(tours: Record<string, string[]>) {
  try {
    window.localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify(tours));
  } catch {
    // resuming the walk after a reload is a convenience only
  }
}

// Squared distance in degrees with longitude scaled by latitude — plenty to
// rank neighbours within a city; sqrt × 111 gives km for display.
function dist2(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const dLat = a.lat - b.lat;
  const dLng = (a.lng - b.lng) * Math.cos((a.lat * Math.PI) / 180);
  return dLat * dLat + dLng * dLng;
}

// Hands the Leaflet map out of MapContainer (for "start from the map center").
function MapRefSetter({ mapRef }: { mapRef: React.MutableRefObject<L.Map | null> }) {
  const map = useMap();
  useEffect(() => {
    mapRef.current = map;
    return () => {
      mapRef.current = null;
    };
  }, [map, mapRef]);
  return null;
}

function FlyToSelected({ lead, mobile }: { lead: Lead | null; mobile: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (!lead || !hasCoords(lead)) return;
    const zoom = Math.max(map.getZoom(), 14);
    let target = L.latLng(lead.lat, lead.lng);
    if (mobile) {
      // On phones the detail bottom sheet covers the lower half of the map,
      // so park the pin in the upper part of the visible area instead of
      // the exact center.
      const p = map.project(target, zoom).add([0, map.getSize().y * 0.28]);
      target = map.unproject(p, zoom);
    }
    map.flyTo(target, zoom, { duration: 0.6 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead?.id]);
  return null;
}

// Keeps Leaflet's cached container size in sync with the real one (panels
// toggling, phone toolbar collapsing / 100dvh changes, rotation, crossing
// the phone breakpoint) and moves the zoom buttons out from under the
// floating search row on phones.
function MapLayoutSync({ mobile }: { mobile: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(map.getContainer());
    return () => ro.disconnect();
  }, [map]);
  useEffect(() => {
    map.zoomControl?.setPosition(mobile ? "bottomright" : "topleft");
    map.invalidateSize();
  }, [map, mobile]);
  return null;
}

export default function MapView() {
  const [loadedLeads, setLeads] = useState<Lead[]>([]);
  const [stages, setStages] = useState<StageDef[]>([]);
  // Only the selected regions are fetched — loading every lead at once made
  // the first paint slow. Nothing is fetched until a region is picked.
  const [regionOptions, setRegionOptions] = useState<RegionOption[]>([]);
  const [totalLeads, setTotalLeads] = useState(0);
  const [regionSel, setRegionSel] = useState<string[]>(readStoredRegions);
  const [draftRegions, setDraftRegions] = useState<string[]>(regionSel);
  const [regionPickerOpen, setRegionPickerOpen] = useState(regionSel.length === 0);
  const [loadedKey, setLoadedKey] = useState("");
  const regionKey = regionSel.join(",");
  // Derived rather than set from the fetch effect: nothing picked -> no leads,
  // and "loading" is simply "the selection hasn't finished loading yet".
  const leads = regionKey === "" ? NO_LEADS : loadedLeads;
  const loading = regionKey !== "" && loadedKey !== regionKey;
  const [query, setQuery] = useState("");
  // Legend doubles as the filter: anything in these sets is hidden from
  // both the pins and the lead list.
  const [hiddenGroups, setHiddenGroups] = useState<Set<Group>>(new Set());
  const [hiddenStatuses, setHiddenStatuses] = useState<Set<LeadCategory>>(new Set());
  const [hiddenLabels, setHiddenLabels] = useState<Set<string>>(new Set());
  // Sub-lists (Later's labels, Contacted's statuses) start minimized.
  const [expanded, setExpanded] = useState<Set<Group>>(new Set());
  const [legendOpen, setLegendOpen] = useState(true);
  const [otherReason, setOtherReason] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  // Phones: the map is full-bleed and the lead list / legend filter open as
  // bottom sheets instead of permanent panels.
  const isMobile = useIsMobile();
  const [mobileSheet, setMobileSheet] = useState<"list" | "filter" | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [tours, setTours] = useState<Record<string, string[]>>(readStoredTours);
  const tour = tours[regionKey] ?? [];
  const [tourMsg, setTourMsg] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/leads/region-counts", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setRegionOptions(data.regions ?? []);
        setTotalLeads(data.total ?? 0);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (regionKey === "") return;

    function loadLeadsAndStages() {
      Promise.all([
        fetch(`/api/leads?regions=${encodeURIComponent(regionKey)}`, { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/pipeline-stages", { cache: "no-store" }).then((r) => r.json()),
      ])
        .then(([leadsData, stagesData]) => {
          if (cancelled) return;
          // Every lead, not just ones with coordinates — stage counts and
          // the lead list must reflect the real database, not just what
          // happens to be plottable. See hasCoords()/mappableLeads below
          // for where the coordinate filter actually belongs (map pins
          // only).
          setLeads(leadsData.leads ?? []);
          setStages(stagesData.stages ?? []);
          setLoadedKey(regionKey);
        })
        .catch(() => {
          if (!cancelled) setLoadedKey(regionKey);
        });
    }

    loadLeadsAndStages();

    // Pipeline stage can change elsewhere (e.g. sending a first WA message
    // in /chat auto-advances a lead new -> contacted). This page only fetches
    // once on mount, and Next.js's client-side router cache can reuse this
    // already-mounted component when navigating back via <Link> instead of
    // remounting it — so without this, stage/status shown here goes stale
    // until a hard reload. Refetch whenever the tab regains focus/visibility.
    function onFocusOrVisible() {
      if (document.visibilityState === "hidden") return;
      loadLeadsAndStages();
    }
    window.addEventListener("focus", onFocusOrVisible);
    document.addEventListener("visibilitychange", onFocusOrVisible);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocusOrVisible);
      document.removeEventListener("visibilitychange", onFocusOrVisible);
    };
  }, [regionKey]);

  function applyRegions(keys: string[]) {
    // "All" is exclusive — picking it alongside regions would be redundant.
    const next = keys.includes(ALL_REGIONS_KEY) ? [ALL_REGIONS_KEY] : keys;
    storeRegions(next);
    setSelectedId(null);
    setRegionSel(next);
    setDraftRegions(next);
    setRegionPickerOpen(next.length === 0);
  }

  function toggleDraft(key: string) {
    setDraftRegions((d) => {
      if (key === ALL_REGIONS_KEY) return d.includes(ALL_REGIONS_KEY) ? [] : [ALL_REGIONS_KEY];
      const without = d.filter((k) => k !== ALL_REGIONS_KEY);
      return without.includes(key) ? without.filter((k) => k !== key) : [...without, key];
    });
  }

  const regionSummary =
    regionSel.length === 0
      ? "Pilih daerah"
      : regionSel.includes(ALL_REGIONS_KEY)
        ? "Semua daerah"
        : regionSel.map((k) => regionOptions.find((r) => r.key === k)?.label ?? k).join(", ");
  const draftChanged = draftRegions.join(",") !== regionKey;

  useEffect(() => {
    if (!selectedId) {
      setActivities([]);
      return;
    }
    let cancelled = false;
    setActivitiesLoading(true);
    fetch(`/api/leads/${selectedId}/activities`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setActivities(data.activities ?? []);
      })
      .finally(() => {
        if (!cancelled) setActivitiesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const groupCounts = useMemo(() => {
    const counts: Partial<Record<Group, number>> = {};
    leads.forEach((l) => {
      const g = groupOf(l);
      counts[g] = (counts[g] ?? 0) + 1;
    });
    return counts;
  }, [leads]);

  const statusCounts = useMemo(() => {
    const counts: Partial<Record<LeadCategory, number>> = {};
    leads.forEach((l) => {
      if (groupOf(l) === "contacted") counts[l.tagCategory] = (counts[l.tagCategory] ?? 0) + 1;
    });
    return counts;
  }, [leads]);

  const labelCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach((l) => {
      if (l.label) counts[l.label] = (counts[l.label] ?? 0) + 1;
    });
    return counts;
  }, [leads]);

  const filteredLeads = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter((l) => {
      const g = groupOf(l);
      if (hiddenGroups.has(g)) return false;
      if (g === "contacted" && hiddenStatuses.has(l.tagCategory)) return false;
      if (g === "later" && l.label && hiddenLabels.has(l.label)) return false;
      return q === "" || l.name.toLowerCase().includes(q) || (l.category ?? "").toLowerCase().includes(q);
    });
  }, [leads, query, hiddenGroups, hiddenStatuses, hiddenLabels]);

  function toggleIn<T>(set: Set<T>, value: T): Set<T> {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  }

  // Map pins can only plot leads with coordinates — kept separate from
  // filteredLeads (which drives the sidebar list, search, and stage
  // counts) so a lead missing coordinates still shows up everywhere else.
  const mappableLeads = useMemo(() => leads.filter(hasCoords), [leads]);
  const filteredMappableLeads = useMemo(() => filteredLeads.filter(hasCoords), [filteredLeads]);

  const selected = useMemo(() => leads.find((l) => l.id === selectedId) ?? null, [leads, selectedId]);

  function stageLabel(key: string) {
    return stages.find((s) => s.key === key)?.label ?? key;
  }

  // Keep the "Other" reason box in sync with whichever lead is selected.
  useEffect(() => {
    setOtherReason(selected?.label === "other" ? (selected.labelNote ?? "") : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  async function saveLabel(label: string | null, note?: string) {
    if (!selected) return;
    setApplying(true);
    try {
      const res = await fetch(`/api/leads/${selected.id}/label`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, note }),
      });
      const data = await res.json();
      if (res.ok) {
        setLeads((prev) =>
          prev.map((l) => (l.id === selected.id ? { ...l, label: data.lead.label, labelNote: data.lead.labelNote } : l)),
        );
        const activityRes = await fetch(`/api/leads/${selected.id}/activities`);
        const activityData = await activityRes.json();
        setActivities(activityData.activities ?? []);
      }
    } finally {
      setApplying(false);
    }
  }

  function selectLead(id: string) {
    setSelectedId(id);
    setMobileSheet(null);
  }

  function saveTour(next: string[]) {
    const all = { ...tours, [regionKey]: next };
    setTours(all);
    storeTours(all);
  }

  // Nearest visible pin not shown yet in this walk, measured from the selected
  // lead (or the map center when nothing is selected). Respects the legend
  // filter and search, so e.g. hiding "Contacted" walks only untouched leads.
  function goNext() {
    const seen = new Set(tour);
    if (selected) seen.add(selected.id);
    const candidates = filteredMappableLeads.filter((l) => !seen.has(l.id));
    if (candidates.length === 0) {
      setTourMsg("Semua titik yang tampil sudah dilihat. Klik Ulang untuk mulai lagi.");
      return;
    }
    const c = mapRef.current?.getCenter();
    const from = selected && hasCoords(selected) ? selected : c ? { lat: c.lat, lng: c.lng } : candidates[0];
    let best = candidates[0];
    let bestD = dist2(from, best);
    for (const l of candidates) {
      const d = dist2(from, l);
      if (d < bestD) {
        best = l;
        bestD = d;
      }
    }
    const base = selected && !tour.includes(selected.id) ? [...tour, selected.id] : tour;
    saveTour([...base, best.id]);
    setTourMsg("");
    selectLead(best.id);
  }

  function goPrev() {
    const i = selectedId ? tour.lastIndexOf(selectedId) : tour.length;
    if (i > 0) {
      setTourMsg("");
      selectLead(tour[i - 1]);
    }
  }

  function resetTour() {
    saveTour([]);
    setTourMsg("");
  }

  // Keyboard: N / → next nearest, P / ← previous (ignored while typing).
  const navRef = useRef({ goNext, goPrev });
  useEffect(() => {
    navRef.current = { goNext, goPrev };
  });
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "n" || e.key === "N" || e.key === "ArrowRight") navRef.current.goNext();
      else if (e.key === "p" || e.key === "P" || e.key === "ArrowLeft") navRef.current.goPrev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const tourPos = selectedId ? tour.lastIndexOf(selectedId) : -1;
  const tourLeft = filteredMappableLeads.filter((l) => !tour.includes(l.id)).length;

  const filterActive = hiddenGroups.size + hiddenStatuses.size + hiddenLabels.size > 0;

  // Which bottom sheet is showing on phones (only one at a time). The region
  // picker wins (it auto-opens when nothing is picked yet), then the list /
  // filter sheets, then the selected lead's detail.
  const mobileView: "region" | "list" | "filter" | "detail" | null = !isMobile
    ? null
    : regionPickerOpen
      ? "region"
      : (mobileSheet ?? (selected ? "detail" : null));

  function closeRegionSheet() {
    setRegionPickerOpen(false);
    setDraftRegions(regionSel);
  }

  const leadList = (mobile: boolean) => (
    <>
      {loading && <div style={{ padding: 18, fontSize: 13, color: "#94a3b8" }}>Loading leads…</div>}
      {!loading && regionSel.length === 0 && (
        <div style={{ padding: 18, fontSize: 13, color: "#94a3b8" }}>Pilih satu atau lebih daerah untuk menampilkan lead.</div>
      )}
      {!loading && regionSel.length > 0 && filteredLeads.length === 0 && (
        <div style={{ padding: 18, fontSize: 13, color: "#94a3b8" }}>No leads match.</div>
      )}
      {filteredLeads.map((lead) => (
        <div
          key={lead.id}
          onClick={() => selectLead(lead.id)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: mobile ? 12 : 10,
            padding: mobile ? "12px 16px" : "11px 18px",
            minHeight: mobile ? 56 : undefined,
            borderBottom: "1px solid #f6f7f8",
            background: lead.id === selectedId ? "#f0f9fb" : "#fff",
            cursor: "pointer",
          }}
        >
          <div style={{ width: mobile ? 11 : 9, height: mobile ? 11 : 9, borderRadius: "50%", background: pinColor(lead), flexShrink: 0 }} />
          <div style={mobile ? { minWidth: 0, flex: 1 } : { minWidth: 0 }}>
            <div style={{ fontSize: mobile ? 14.5 : 12.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {lead.name}
            </div>
            <div style={{ fontSize: mobile ? 12.5 : 11.5, color: "#94a3b8", marginTop: mobile ? 2 : 1 }}>
              {lead.category ?? "—"}
              {!hasCoords(lead) && <span style={{ color: "#f59e0b" }}> · no location</span>}
              {isLikelyLandline(lead.phoneNormalized) && (
                <span style={{ color: "#dc2626" }}> · bukan nomor WA</span>
              )}
              {lead.label && <span style={{ color: "#7c3aed" }}> · {labelText(lead)}</span>}
            </div>
          </div>
        </div>
      ))}
    </>
  );

  const regionRows = (mobile: boolean) => (
    <div style={mobile ? { padding: "6px 8px" } : { maxHeight: 260, overflowY: "auto", padding: "6px 4px" }}>
      <RegionRow
        label="Semua daerah (lambat)"
        count={totalLeads}
        checked={draftRegions.includes(ALL_REGIONS_KEY)}
        onClick={() => toggleDraft(ALL_REGIONS_KEY)}
        big={mobile}
      />
      {regionOptions.map((r) => (
        <RegionRow
          key={r.key}
          label={r.label}
          count={r.count}
          checked={draftRegions.includes(r.key)}
          onClick={() => toggleDraft(r.key)}
          big={mobile}
        />
      ))}
      {regionOptions.length === 0 && <div style={{ padding: "6px 8px", fontSize: 12, color: "#94a3b8" }}>Memuat daftar daerah…</div>}
    </div>
  );

  const regionFooter = (mobile: boolean) => (
    <div
      style={
        mobile
          ? { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }
          : { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "8px 10px", borderTop: "1px solid #f1f5f9" }
      }
    >
      <button style={mobile ? pillBtn : linkBtn} onClick={() => setDraftRegions([])}>
        Kosongkan
      </button>
      <button
        disabled={!draftChanged}
        onClick={() => applyRegions(draftRegions)}
        style={{
          padding: mobile ? "0 22px" : "6px 14px",
          height: mobile ? 44 : undefined,
          borderRadius: mobile ? 10 : 8,
          border: "none",
          background: "#0891b2",
          color: "#fff",
          fontSize: mobile ? 14.5 : 12.5,
          fontWeight: 600,
          cursor: draftChanged ? "pointer" : "default",
          opacity: draftChanged ? 1 : 0.5,
        }}
      >
        Tampilkan
      </button>
    </div>
  );

  const legendBody = (mobile: boolean) => (
    <>
      <div style={{ display: "flex", gap: mobile ? 8 : 10, margin: mobile ? "0 0 6px 0" : "6px 0 8px 0" }}>
        <button
          style={mobile ? pillBtn : linkBtn}
          onClick={() => {
            setHiddenGroups(new Set());
            setHiddenStatuses(new Set());
            setHiddenLabels(new Set());
          }}
        >
          Show all
        </button>
        <button style={mobile ? pillBtn : linkBtn} onClick={() => setHiddenGroups(new Set(GROUP_ORDER))}>
          Hide all
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: mobile ? 0 : 4 }}>
        {GROUP_ORDER.map((g) => {
          const expandable = g === "later" || g === "contacted";
          const isOpen = expanded.has(g);
          return (
            <div key={g} style={mobile ? { borderBottom: "1px solid #f6f7f8" } : undefined}>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ flex: 1, minWidth: mobile ? 0 : undefined }}>
                  <LegendRow
                    color={GROUP_COLORS[g]}
                    label={GROUP_LABELS[g]}
                    count={groupCounts[g] ?? 0}
                    visible={!hiddenGroups.has(g)}
                    onClick={() => setHiddenGroups((h) => toggleIn(h, g))}
                    big={mobile}
                  />
                </div>
                {expandable && (
                  <button
                    onClick={() => setExpanded((e) => toggleIn(e, g))}
                    title={isOpen ? "Minimize" : "Expand"}
                    aria-label={isOpen ? "Minimize" : "Expand"}
                    style={
                      mobile
                        ? { width: 44, height: 44, border: "none", background: "transparent", cursor: "pointer", fontSize: 15, color: "#64748b", flexShrink: 0 }
                        : { border: "none", background: "transparent", cursor: "pointer", fontSize: 12, color: "#64748b", padding: "0 2px" }
                    }
                  >
                    {isOpen ? "▾" : "▸"}
                  </button>
                )}
              </div>
              {expandable && isOpen && (
                <div style={{ display: "flex", flexDirection: "column", gap: mobile ? 0 : 4, margin: mobile ? "0 0 6px 26px" : "4px 0 4px 22px" }}>
                  {g === "later"
                    ? LABEL_OPTIONS.map((o) => (
                        <LegendRow
                          key={o.key}
                          color={GROUP_COLORS.later}
                          label={o.text}
                          count={labelCounts[o.key] ?? 0}
                          visible={!hiddenLabels.has(o.key)}
                          onClick={() => setHiddenLabels((h) => toggleIn(h, o.key))}
                          big={mobile}
                        />
                      ))
                    : CONTACTED_STATUSES.map((c) => (
                        <LegendRow
                          key={c}
                          color={GROUP_COLORS.contacted}
                          label={statusLabel(c)}
                          count={statusCounts[c] ?? 0}
                          visible={!hiddenStatuses.has(c)}
                          onClick={() => setHiddenStatuses((h) => toggleIn(h, c))}
                          big={mobile}
                        />
                      ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );

  const detailHeader = (lead: Lead) => (
    <>
      <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.3 }}>{lead.name}</div>
      <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 2 }}>{lead.category ?? "—"}</div>
    </>
  );

  const actionLinkStyle = (mobile: boolean): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: mobile ? 14.5 : 13.5,
    fontWeight: 600,
    color: "#0891b2",
    textDecoration: "none",
    minHeight: mobile ? 44 : undefined,
  });

  const tourBar = (mobile: boolean) => (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={goPrev}
          disabled={tourPos <= 0}
          title="Sebelumnya (P / ←)"
          style={{ ...tourBtn(mobile, false), flex: "0 0 auto", opacity: tourPos <= 0 ? 0.4 : 1, cursor: tourPos <= 0 ? "default" : "pointer" }}
        >
          ‹
        </button>
        <button onClick={goNext} title="Titik terdekat berikutnya (N / →)" style={{ ...tourBtn(mobile, true), flex: 1 }}>
          Berikutnya terdekat ›
        </button>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 6, fontSize: 11.5, color: "#94a3b8" }}>
        <span>
          {tourPos >= 0 ? `Titik ke-${tourPos + 1}` : "Di luar urutan"} · sisa {tourLeft} titik
          {!mobile && " · tombol N / P"}
        </span>
        {tour.length > 0 && (
          <button onClick={resetTour} style={linkBtn}>
            Ulang
          </button>
        )}
      </div>
      {tourMsg && <div style={{ marginTop: 6, fontSize: 12, color: "#b45309" }}>{tourMsg}</div>}
    </div>
  );

  const detailBody = (selected: Lead, mobile: boolean) => (
    <>
      {tourBar(mobile)}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      <span
        style={{
          background: pinColor(selected),
          color: "#fff",
          fontSize: 12,
          fontWeight: 600,
          padding: "5px 12px",
          borderRadius: 999,
        }}
      >
        {groupOf(selected) === "contacted"
          ? `Contacted · ${statusLabel(selected.tagCategory)}`
          : groupOf(selected) === "later"
            ? `Later · ${labelText(selected)}`
            : GROUP_LABELS[groupOf(selected)]}
      </span>
      </div>

      <div style={{ marginTop: 18, paddingTop: 18, borderTop: "1px solid #f1f5f9", display: "flex", flexDirection: "column", gap: mobile ? 8 : 12 }}>
        <div style={{ fontSize: 13.5, fontWeight: 500, color: selected.phoneNormalized ? undefined : GROUP_COLORS.no_wa }}>
          {selected.phoneNormalized ?? "No phone number scraped"}
        </div>
        <div style={{ fontSize: 13.5, color: "#334155", lineHeight: 1.5, overflowWrap: mobile ? "anywhere" : undefined }}>{selected.address ?? "—"}</div>
        <div style={{ fontSize: 13.5, color: "#334155" }}>
          {selected.rating ? `${selected.rating} (${selected.reviewCount ?? 0} reviews)` : "No ratings yet"}
        </div>
        <Link
          href={`/chat?leadId=${selected.id}`}
          target="_blank"
          rel="noopener noreferrer"
          style={actionLinkStyle(mobile)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
            <path d="M4 4h16v12H8l-4 4V4Z" stroke="#0891b2" strokeWidth="1.8" strokeLinejoin="round" />
          </svg>
          Open Chat
        </Link>
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selected.name)}&query_place_id=${selected.googlePlaceId}`}
          target="_blank"
          rel="noopener noreferrer"
          style={actionLinkStyle(mobile)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
            <path d="M14 4h6v6M10 14 20 4M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h6" stroke="#0891b2" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Open in Google Maps
        </a>
      </div>

      <div style={{ marginTop: 18, paddingTop: 18, borderTop: "1px solid #f1f5f9" }}>
        <div style={{ fontSize: 11.5, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 10 }}>
          Label
        </div>
        <select
          value={selected.label ?? ""}
          disabled={applying}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "") saveLabel(null);
            else if (v === "other") {
              // Wait for the reason before saving — just reveal the box.
              setLeads((prev) => prev.map((l) => (l.id === selected.id ? { ...l, label: "other" } : l)));
            } else saveLabel(v);
          }}
          style={{
            width: "100%",
            padding: "8px 10px",
            height: mobile ? 44 : undefined,
            borderRadius: 8,
            border: "1px solid #e2e8f0",
            fontSize: 13,
            fontFamily: "inherit",
            background: "#fff",
            opacity: applying ? 0.6 : 1,
          }}
        >
          <option value="">— No label —</option>
          {LABEL_OPTIONS.map((o) => (
            <option key={o.key} value={o.key}>
              {o.text}
            </option>
          ))}
        </select>
        {selected.label === "other" && (
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
            <textarea
              value={otherReason}
              onChange={(e) => setOtherReason(e.target.value)}
              placeholder="Reason for not contacting…"
              rows={3}
              maxLength={500}
              style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, fontFamily: "inherit", resize: "vertical" }}
            />
            <button
              disabled={applying || otherReason.trim() === "" || otherReason.trim() === (selected.labelNote ?? "")}
              onClick={() => saveLabel("other", otherReason.trim())}
              style={{
                alignSelf: "flex-end",
                padding: mobile ? "0 18px" : "6px 14px",
                height: mobile ? 44 : undefined,
                borderRadius: 8,
                border: "none",
                background: "#0891b2",
                color: "#fff",
                fontSize: mobile ? 14 : 12.5,
                fontWeight: 600,
                cursor: "pointer",
                opacity: applying || otherReason.trim() === "" || otherReason.trim() === (selected.labelNote ?? "") ? 0.5 : 1,
              }}
            >
              Save reason
            </button>
          </div>
        )}
      </div>

      <div style={{ marginTop: 18, paddingTop: 18, borderTop: "1px solid #f1f5f9" }}>
        <div style={{ fontSize: 11.5, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 10 }}>
          Activity
        </div>
        {activitiesLoading && <div style={{ fontSize: 12.5, color: "#94a3b8" }}>Loading…</div>}
        {!activitiesLoading && activities.length === 0 && (
          <div style={{ fontSize: 12.5, color: "#94a3b8" }}>No activity yet.</div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {activities.map((a) => (
            <div key={a.id} style={{ display: "flex", gap: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#cbd5e1", marginTop: 5, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 12.5, color: "#334155" }}>
                  {a.type === "stage_change" && a.payload
                    ? `${stageLabel(a.payload.from ?? "")} → ${stageLabel(a.payload.to ?? "")}`
                    : a.type === "label_change" && a.payload
                      ? `Label: ${activityLabel(a.payload.to, a.payload.note)}`
                      : a.type}
                </div>
                <div style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 1 }}>
                  {new Date(a.createdAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );

  return (
    <div style={{ display: "flex", height: isMobile ? "100dvh" : "100vh", background: "#f7f8fa", color: "#0f172a", overflow: "hidden", position: "relative" }}>
      <AppSidebar active="map" />

      {/* Lead list panel (desktop only — a bottom sheet on phones) */}
      {!isMobile && (
      <div style={{ width: 320, flexShrink: 0, display: "flex", flexDirection: "column", borderRight: "1px solid #eef0f2", background: "#fff" }}>
        <div style={{ padding: "20px 18px 14px 18px", borderBottom: "1px solid #f1f5f9" }}>
          <h1 style={{ margin: "0 0 10px 0", fontSize: 18, fontWeight: 700 }}>Map</h1>
          <input
            type="text"
            placeholder="Search leads"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, fontFamily: "inherit" }}
          />
          <div style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 8 }}>
            Showing {filteredLeads.length} of {leads.length} · use the legend on the map to filter
          </div>

          {/* Region picker — only the selected regions are loaded. */}
          <div style={{ marginTop: 10 }}>
            <button
              onClick={() => setRegionPickerOpen((o) => !o)}
              style={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontSize: 13, fontFamily: "inherit", textAlign: "left" }}
            >
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                <span style={{ color: "#94a3b8" }}>Daerah: </span>
                <span style={{ fontWeight: 600 }}>{regionSummary}</span>
              </span>
              <span style={{ color: "#64748b", fontSize: 12 }}>{regionPickerOpen ? "▾" : "▸"}</span>
            </button>
            {regionPickerOpen && (
              <div style={{ marginTop: 6, border: "1px solid #e2e8f0", borderRadius: 8, background: "#fff" }}>
                {regionRows(false)}
                {regionFooter(false)}
              </div>
            )}
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>{leadList(false)}</div>
      </div>
      )}

      {/* Map area. On phones it is the page's only content sibling (so it
          sits below the app bar) and an isolated stacking context, so the
          Leaflet panes and the sheets below can't paint over the nav drawer. */}
      <div style={{ flex: 1, position: "relative", isolation: isMobile ? "isolate" : undefined }}>
        {regionSel.length === 0 && (
          <div style={{ position: "absolute", inset: 0, zIndex: 400, display: "flex", flexDirection: isMobile ? "column" : undefined, gap: isMobile ? 14 : undefined, alignItems: "center", justifyContent: "center", background: "#f7f8fa", color: "#64748b", fontSize: 14, textAlign: "center", padding: 24 }}>
            {isMobile ? "Pilih daerah untuk menampilkan titik di peta." : "Pilih daerah di panel kiri untuk menampilkan titik di peta."}
            {isMobile && (
              <button
                onClick={() => {
                  setMobileSheet(null);
                  setRegionPickerOpen(true);
                }}
                style={{ height: 44, padding: "0 20px", borderRadius: 10, border: "none", background: "#0891b2", color: "#fff", fontSize: 14.5, fontWeight: 600, cursor: "pointer" }}
              >
                Pilih daerah
              </button>
            )}
          </div>
        )}
        {loading && regionSel.length > 0 && (
          <div style={{ position: "absolute", top: isMobile ? 66 : 14, left: "50%", transform: "translateX(-50%)", zIndex: 600, background: "#fff", border: "1px solid #eef0f2", borderRadius: 999, padding: "6px 14px", fontSize: 12.5, color: "#334155", boxShadow: "0 4px 14px rgba(15,23,42,0.08)", whiteSpace: "nowrap" }}>
            Memuat lead…
          </div>
        )}
        {regionSel.length > 0 && mappableLeads.length > 0 && (
          <MapContainer style={{ width: "100%", height: "100%" }} center={[mappableLeads[0].lat, mappableLeads[0].lng]} zoom={12} scrollWheelZoom>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapLayoutSync mobile={isMobile} />
            <MapRefSetter mapRef={mapRef} />
            <FitBounds leads={mappableLeads} fitKey={loadedKey} mobile={isMobile} />
            <FlyToSelected lead={selected} mobile={isMobile} />
            {filteredMappableLeads.map((lead) => (
              <Marker
                key={lead.id}
                position={[lead.lat, lead.lng]}
                icon={pinIcon(pinColor(lead), lead.id === selectedId)}
                zIndexOffset={lead.id === selectedId ? 1000 : 0}
                eventHandlers={{ click: () => selectLead(lead.id) }}
              />
            ))}
          </MapContainer>
        )}

        {/* Desktop: start the nearest-pin walk when nothing is selected. */}
        {!isMobile && !selected && regionSel.length > 0 && filteredMappableLeads.length > 0 && (
          <div style={{ position: "absolute", top: 14, left: "50%", transform: "translateX(-50%)", zIndex: 600, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <button
              onClick={goNext}
              title="Mulai dari titik terdekat ke tengah peta (N / →)"
              style={{ ...tourBtn(false, true), boxShadow: "0 4px 14px rgba(15,23,42,0.18)", padding: "0 18px" }}
            >
              {tour.length > 0 ? `Lanjutkan · titik terdekat ›` : "Mulai · titik terdekat ›"}
            </button>
            {tourMsg && <div style={{ background: "#fff", borderRadius: 8, padding: "4px 10px", fontSize: 12, color: "#b45309" }}>{tourMsg}</div>}
          </div>
        )}

        {/* Legend + filter (desktop — a sheet behind the filter button on phones) */}
        {!isMobile && (
        <div
          style={{
            position: "absolute",
            left: 18,
            bottom: 18,
            zIndex: 500,
            background: "#fff",
            border: "1px solid #eef0f2",
            borderRadius: 10,
            padding: "12px 14px",
            boxShadow: "0 4px 14px rgba(15,23,42,0.08)",
            maxHeight: "calc(100% - 36px)",
            overflowY: "auto",
            minWidth: 220,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ fontSize: 10.5, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.03em" }}>
              Status · click to show/hide
            </div>
            <button
              onClick={() => setLegendOpen((o) => !o)}
              style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 12, color: "#64748b" }}
            >
              {legendOpen ? "▾" : "▸"}
            </button>
          </div>
          {legendOpen && legendBody(false)}
        </div>
        )}

        {/* Phones: floating search / region / filter row over the map */}
        {isMobile && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              zIndex: 900,
              display: "flex",
              gap: 8,
              padding: "10px max(12px, env(safe-area-inset-right)) 0 max(12px, env(safe-area-inset-left))",
              pointerEvents: "none",
            }}
          >
            <label style={{ ...floatCard, flex: "1 1 0", minWidth: 0, display: "flex", alignItems: "center", gap: 6, padding: "0 10px", cursor: "text" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                <circle cx="11" cy="11" r="7" stroke="#94a3b8" strokeWidth="2" />
                <path d="m20 20-3.5-3.5" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <input
                type="search"
                enterKeyHint="search"
                placeholder="Search leads"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  e.currentTarget.blur();
                  if (regionSel.length > 0) {
                    setRegionPickerOpen(false);
                    setMobileSheet("list");
                  }
                }}
                style={{ flex: 1, minWidth: 0, height: 42, border: "none", outline: "none", background: "transparent", padding: 0, fontFamily: "inherit", color: "#0f172a" }}
              />
            </label>
            <button
              onClick={() => {
                if (regionPickerOpen) closeRegionSheet();
                else {
                  setMobileSheet(null);
                  setRegionPickerOpen(true);
                }
              }}
              aria-label={`Daerah: ${regionSummary}`}
              style={{ ...floatCard, flex: "0 1 auto", maxWidth: "40%", minWidth: 0, display: "flex", alignItems: "center", gap: 6, padding: "0 12px", cursor: "pointer", fontFamily: "inherit", fontSize: 13.5, fontWeight: 600, color: "#0f172a" }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z" stroke="#0891b2" strokeWidth="2" strokeLinejoin="round" />
                <circle cx="12" cy="9.5" r="2.5" stroke="#0891b2" strokeWidth="2" />
              </svg>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{regionSummary}</span>
            </button>
            <button
              onClick={() => {
                setRegionPickerOpen(false);
                setMobileSheet((s) => (s === "filter" ? null : "filter"));
              }}
              aria-label="Filter status"
              style={{ ...floatCard, width: 44, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative", padding: 0 }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M4 5h16l-6 7.5V19l-4 1.5v-8L4 5Z" stroke={filterActive ? "#0891b2" : "#334155"} strokeWidth="1.9" strokeLinejoin="round" />
              </svg>
              {filterActive && (
                <span style={{ position: "absolute", top: 8, right: 8, width: 8, height: 8, borderRadius: "50%", background: "#dc2626", border: "1.5px solid #fff" }} />
              )}
            </button>
          </div>
        )}

        {/* Phones: "Daftar (N)" opens the lead list sheet; "Terdekat ›" starts the walk */}
        {isMobile && regionSel.length > 0 && (
          <div
            style={{
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
              bottom: "calc(28px + env(safe-area-inset-bottom))",
              zIndex: 900,
              display: "flex",
              gap: 8,
            }}
          >
          <button
            onClick={() => {
              setRegionPickerOpen(false);
              setMobileSheet("list");
            }}
            style={{
              height: 44,
              padding: "0 18px",
              borderRadius: 999,
              border: "none",
              background: "#0f172a",
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              gap: 8,
              whiteSpace: "nowrap",
              cursor: "pointer",
              boxShadow: "0 6px 18px rgba(15,23,42,0.28)",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
              <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
            Daftar ({filteredLeads.length})
          </button>
          {filteredMappableLeads.length > 0 && (
            <button onClick={goNext} style={{ ...tourBtn(true, true), borderRadius: 999, boxShadow: "0 6px 18px rgba(15,23,42,0.28)", whiteSpace: "nowrap" }}>
              Terdekat ›
            </button>
          )}
          </div>
        )}
        {isMobile && tourMsg && !selected && (
          <div style={{ position: "absolute", left: 12, right: 12, bottom: "calc(84px + env(safe-area-inset-bottom))", zIndex: 900, background: "#fff", borderRadius: 10, padding: "8px 12px", fontSize: 13, color: "#b45309", boxShadow: "0 4px 14px rgba(15,23,42,0.12)" }}>
            {tourMsg}
          </div>
        )}

        {/* Phones: bottom sheets */}
        {(mobileView === "region" || mobileView === "list" || mobileView === "filter") && (
          <div
            onClick={() => (mobileView === "region" ? closeRegionSheet() : setMobileSheet(null))}
            style={{ position: "absolute", inset: 0, zIndex: 1150, background: "rgba(2,6,23,0.35)" }}
          />
        )}
        {mobileView === "region" && (
          <MobileSheet
            title="Pilih daerah"
            subtitle="Hanya daerah yang dipilih yang dimuat."
            onClose={closeRegionSheet}
            footer={regionFooter(true)}
          >
            {regionRows(true)}
          </MobileSheet>
        )}
        {mobileView === "list" && (
          <MobileSheet
            title="Daftar lead"
            subtitle={`Showing ${filteredLeads.length} of ${leads.length}${filterActive ? " · filter aktif" : ""}`}
            onClose={() => setMobileSheet(null)}
            maxHeight="75%"
          >
            {leadList(true)}
          </MobileSheet>
        )}
        {mobileView === "filter" && (
          <MobileSheet title="Filter status" subtitle="Tap to show/hide on the map and list" onClose={() => setMobileSheet(null)}>
            <div style={{ padding: "12px 16px 16px" }}>{legendBody(true)}</div>
          </MobileSheet>
        )}
        {mobileView === "detail" && selected && (
          <MobileSheet header={detailHeader(selected)} onClose={() => setSelectedId(null)}>
            <div style={{ padding: "14px 16px 20px" }}>{detailBody(selected, true)}</div>
          </MobileSheet>
        )}
      </div>

      {/* Detail drawer (desktop) */}
      {!isMobile && selected && (
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            width: 380,
            background: "#fff",
            boxShadow: "-8px 0 24px rgba(15,23,42,0.14)",
            overflowY: "auto",
            padding: 24,
            zIndex: 1000,
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 }}>
            <div style={{ paddingRight: 12 }}>{detailHeader(selected)}</div>
            <button
              onClick={() => setSelectedId(null)}
              style={{ width: 28, height: 28, borderRadius: 7, border: "none", background: "transparent", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path d="M6 6l12 12M18 6 6 18" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {detailBody(selected, false)}
        </div>
      )}
    </div>
  );
}

const linkBtn: React.CSSProperties = {
  border: "none",
  background: "transparent",
  padding: 0,
  cursor: "pointer",
  fontSize: 11.5,
  fontWeight: 600,
  color: "#0891b2",
};

// Prev / "Berikutnya terdekat" buttons (primary = filled cyan).
function tourBtn(mobile: boolean, primary: boolean): React.CSSProperties {
  return {
    height: mobile ? 44 : 36,
    minWidth: mobile ? 44 : 36,
    padding: "0 14px",
    borderRadius: 8,
    border: primary ? "none" : "1px solid #e2e8f0",
    background: primary ? "#0891b2" : "#fff",
    color: primary ? "#fff" : "#334155",
    fontSize: mobile ? 14.5 : 13,
    fontWeight: 600,
    fontFamily: "inherit",
    cursor: "pointer",
  };
}

// Phone-sized variant of linkBtn (>= 44px tap target).
const pillBtn: React.CSSProperties = {
  height: 44,
  padding: "0 16px",
  border: "1px solid #e2e8f0",
  borderRadius: 999,
  background: "#fff",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 600,
  fontFamily: "inherit",
  color: "#0891b2",
};

// Floating controls over the map on phones.
const floatCard: React.CSSProperties = {
  height: 44,
  boxSizing: "border-box",
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  boxShadow: "0 4px 14px rgba(15,23,42,0.12)",
  pointerEvents: "auto",
};

// Simple bottom sheet for phones: no drag, tap the X (or the backdrop) to
// close. Positioned inside the map area, so it never covers the app bar.
function MobileSheet({
  title,
  subtitle,
  header,
  onClose,
  footer,
  maxHeight = "85%",
  children,
}: {
  title?: string;
  subtitle?: string;
  header?: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
  maxHeight?: string;
  children: ReactNode;
}) {
  return (
    <div
      role="dialog"
      aria-label={title}
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1200,
        maxHeight,
        display: "flex",
        flexDirection: "column",
        background: "#fff",
        borderRadius: "16px 16px 0 0",
        boxShadow: "0 -8px 28px rgba(15,23,42,0.18)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "center", paddingTop: 8 }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: "#e2e8f0" }} />
      </div>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "4px 6px 10px 16px", borderBottom: "1px solid #f1f5f9" }}>
        <div style={{ flex: 1, minWidth: 0, paddingTop: 8 }}>
          {header ?? (
            <>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{title}</div>
              {subtitle && <div style={{ fontSize: 12.5, color: "#94a3b8", marginTop: 2 }}>{subtitle}</div>}
            </>
          )}
        </div>
        <button
          onClick={onClose}
          aria-label="Tutup"
          style={{ width: 44, height: 44, borderRadius: 10, border: "none", background: "#f1f5f9", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M6 6l12 12M18 6 6 18" stroke="#334155" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <div style={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto", overscrollBehavior: "contain", WebkitOverflowScrolling: "touch" }}>{children}</div>
      {footer && <div style={{ flexShrink: 0, borderTop: "1px solid #f1f5f9", padding: "10px 16px" }}>{footer}</div>}
    </div>
  );
}

function RegionRow({
  label,
  count,
  checked,
  onClick,
  big = false,
}: {
  label: string;
  count: number;
  checked: boolean;
  onClick: () => void;
  big?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{ display: "flex", width: "100%", alignItems: "center", gap: big ? 12 : 8, border: "none", background: checked ? "#f0f9fb" : "transparent", borderRadius: big ? 8 : 6, padding: big ? "8px 10px" : "5px 8px", minHeight: big ? 48 : undefined, cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}
    >
      <span
        style={{ width: big ? 18 : 14, height: big ? 18 : 14, borderRadius: 4, border: "2px solid #0891b2", background: checked ? "#0891b2" : "transparent", color: "#fff", fontSize: big ? 12 : 10, lineHeight: big ? "12px" : "10px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
      >
        {checked ? "✓" : ""}
      </span>
      <span style={{ fontSize: big ? 14.5 : 12.5, color: "#334155", flex: 1 }}>{label}</span>
      <span style={{ fontSize: big ? 13 : 11.5, color: "#94a3b8" }}>{count}</span>
    </button>
  );
}

function LegendRow({
  color,
  label,
  count,
  visible,
  onClick,
  big = false,
}: {
  color: string;
  label: string;
  count: number;
  visible: boolean;
  onClick: () => void;
  big?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={visible ? "Click to hide" : "Click to show"}
      style={{
        display: "flex",
        alignItems: "center",
        gap: big ? 12 : 8,
        border: "none",
        background: "transparent",
        padding: big ? "0 4px 0 0" : "2px 0",
        width: big ? "100%" : undefined,
        minHeight: big ? 44 : undefined,
        cursor: "pointer",
        textAlign: "left",
        fontFamily: big ? "inherit" : undefined,
        opacity: visible ? 1 : 0.4,
      }}
    >
      <span
        style={{
          width: big ? 18 : 14,
          height: big ? 18 : 14,
          borderRadius: 4,
          border: `2px solid ${color}`,
          background: visible ? color : "transparent",
          color: "#fff",
          fontSize: big ? 12 : 10,
          lineHeight: big ? "12px" : "10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {visible ? "✓" : ""}
      </span>
      <span
        style={{
          fontSize: big ? 14.5 : 12,
          color: "#334155",
          whiteSpace: big ? "normal" : "nowrap",
          flex: 1,
          textDecoration: visible ? "none" : "line-through",
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: big ? 13 : 11.5, color: "#94a3b8", marginLeft: 8 }}>{count}</span>
    </button>
  );
}
