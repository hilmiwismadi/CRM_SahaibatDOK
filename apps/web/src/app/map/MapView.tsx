"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import AppSidebar from "@/app/components/AppSidebar";

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
  lat: number;
  lng: number;
  pipelineStage: string;
  pipelineStageDef: StageDef;
}

interface Activity {
  id: string;
  type: string;
  payload: { from?: string; to?: string } | null;
  createdAt: string;
}

const TEXT_ON_DARK_STAGES = new Set(["new", "contacted", "trial_rejected", "offer_payment"]);

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

function FitBounds({ leads }: { leads: Lead[] }) {
  const map = useMap();
  useEffect(() => {
    if (leads.length === 0) return;
    const bounds = L.latLngBounds(leads.map((l) => [l.lat, l.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [48, 48] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leads.length === 0]);
  return null;
}

function FlyToSelected({ lead }: { lead: Lead | null }) {
  const map = useMap();
  useEffect(() => {
    if (lead) map.flyTo([lead.lat, lead.lng], Math.max(map.getZoom(), 14), { duration: 0.6 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead?.id]);
  return null;
}

export default function MapView() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stages, setStages] = useState<StageDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    function loadLeadsAndStages() {
      Promise.all([
        fetch("/api/leads", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/pipeline-stages", { cache: "no-store" }).then((r) => r.json()),
      ])
        .then(([leadsData, stagesData]) => {
          if (cancelled) return;
          setLeads((leadsData.leads ?? []).filter((l: Lead) => l.lat != null && l.lng != null));
          setStages(stagesData.stages ?? []);
          setLoading(false);
        })
        .catch(() => {
          if (!cancelled) setLoading(false);
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
  }, []);

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

  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach((l) => {
      counts[l.pipelineStage] = (counts[l.pipelineStage] ?? 0) + 1;
    });
    return counts;
  }, [leads]);

  const filteredLeads = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter((l) => {
      const matchesFilter = filter === "all" || l.pipelineStage === filter;
      const matchesQuery =
        q === "" || l.name.toLowerCase().includes(q) || (l.category ?? "").toLowerCase().includes(q);
      return matchesFilter && matchesQuery;
    });
  }, [leads, query, filter]);

  const selected = useMemo(() => leads.find((l) => l.id === selectedId) ?? null, [leads, selectedId]);

  function stageLabel(key: string) {
    return stages.find((s) => s.key === key)?.label ?? key;
  }

  async function changeStage(toStage: string) {
    if (!selected || toStage === selected.pipelineStage) return;
    setApplying(true);
    try {
      const res = await fetch(`/api/leads/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toStage }),
      });
      const data = await res.json();
      if (res.ok) {
        setLeads((prev) => prev.map((l) => (l.id === selected.id ? { ...l, ...data.lead } : l)));
        const activityRes = await fetch(`/api/leads/${selected.id}/activities`);
        const activityData = await activityRes.json();
        setActivities(activityData.activities ?? []);
      }
    } finally {
      setApplying(false);
    }
  }

  return (
    <div style={{ display: "flex", height: "100vh", background: "#f7f8fa", color: "#0f172a", overflow: "hidden", position: "relative" }}>
      <AppSidebar active="map" />

      {/* Lead list panel */}
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
          <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
            <FilterPill
              active={filter === "all"}
              label={`All (${leads.length})`}
              activeBg="#0f172a"
              activeColor="#fff"
              onClick={() => setFilter("all")}
            />
            {stages.map((s) => (
              <FilterPill
                key={s.key}
                active={filter === s.key}
                label={`${s.label} (${stageCounts[s.key] ?? 0})`}
                activeBg={s.color}
                activeColor={TEXT_ON_DARK_STAGES.has(s.key) ? "#fff" : "#1c1917"}
                onClick={() => setFilter(s.key)}
              />
            ))}
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading && <div style={{ padding: 18, fontSize: 13, color: "#94a3b8" }}>Loading leads…</div>}
          {!loading && filteredLeads.length === 0 && (
            <div style={{ padding: 18, fontSize: 13, color: "#94a3b8" }}>No leads match.</div>
          )}
          {filteredLeads.map((lead) => (
            <div
              key={lead.id}
              onClick={() => setSelectedId(lead.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "11px 18px",
                borderBottom: "1px solid #f6f7f8",
                background: lead.id === selectedId ? "#f0f9fb" : "#fff",
                cursor: "pointer",
              }}
            >
              <div style={{ width: 9, height: 9, borderRadius: "50%", background: lead.pipelineStageDef.color, flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {lead.name}
                </div>
                <div style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 1 }}>{lead.category ?? "—"}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Map area */}
      <div style={{ flex: 1, position: "relative" }}>
        {!loading && leads.length > 0 && (
          <MapContainer style={{ width: "100%", height: "100%" }} center={[leads[0].lat, leads[0].lng]} zoom={12} scrollWheelZoom>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitBounds leads={leads} />
            <FlyToSelected lead={selected} />
            {filteredLeads.map((lead) => (
              <Marker
                key={lead.id}
                position={[lead.lat, lead.lng]}
                icon={pinIcon(lead.pipelineStageDef.color, lead.id === selectedId)}
                zIndexOffset={lead.id === selectedId ? 1000 : 0}
                eventHandlers={{ click: () => setSelectedId(lead.id) }}
              />
            ))}
          </MapContainer>
        )}

        {/* Legend */}
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
          }}
        >
          <div style={{ fontSize: 10.5, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 8 }}>
            Pipeline stage
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, auto)", gap: "6px 16px" }}>
            {stages.map((s) => (
              <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
                <div style={{ fontSize: 11.5, color: "#334155", whiteSpace: "nowrap" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detail drawer */}
      {selected && (
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
            <div style={{ paddingRight: 12 }}>
              <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.3 }}>{selected.name}</div>
              <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 2 }}>{selected.category ?? "—"}</div>
            </div>
            <button
              onClick={() => setSelectedId(null)}
              style={{ width: 28, height: 28, borderRadius: 7, border: "none", background: "transparent", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path d="M6 6l12 12M18 6 6 18" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <span
            style={{
              background: selected.pipelineStageDef.color,
              color: TEXT_ON_DARK_STAGES.has(selected.pipelineStage) ? "#fff" : "#1c1917",
              fontSize: 12,
              fontWeight: 600,
              padding: "5px 12px",
              borderRadius: 999,
            }}
          >
            {selected.pipelineStageDef.label}
          </span>

          <div style={{ marginTop: 18, paddingTop: 18, borderTop: "1px solid #f1f5f9", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 13.5, fontWeight: 500 }}>{selected.phoneNormalized ?? "No phone number scraped"}</div>
            <div style={{ fontSize: 13.5, color: "#334155", lineHeight: 1.5 }}>{selected.address ?? "—"}</div>
            <div style={{ fontSize: 13.5, color: "#334155" }}>
              {selected.rating ? `${selected.rating} (${selected.reviewCount ?? 0} reviews)` : "No ratings yet"}
            </div>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selected.name)}&query_place_id=${selected.googlePlaceId}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, fontWeight: 600, color: "#0891b2", textDecoration: "none" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                <path d="M14 4h6v6M10 14 20 4M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h6" stroke="#0891b2" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Open in Google Maps
            </a>
          </div>

          <div style={{ marginTop: 18, paddingTop: 18, borderTop: "1px solid #f1f5f9" }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 10 }}>
              Stage
            </div>
            <select
              value={selected.pipelineStage}
              disabled={applying}
              onChange={(e) => changeStage(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                fontSize: 13,
                fontFamily: "inherit",
                background: "#fff",
                opacity: applying ? 0.6 : 1,
              }}
            >
              {stages.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
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
        </div>
      )}
    </div>
  );
}

function FilterPill({
  active,
  label,
  activeBg,
  activeColor,
  onClick,
}: {
  active: boolean;
  label: string;
  activeBg: string;
  activeColor: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? activeBg : "#f1f5f9",
        color: active ? activeColor : "#475569",
        fontSize: 11.5,
        fontWeight: 600,
        padding: "5px 9px",
        borderRadius: 999,
        border: "none",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}
