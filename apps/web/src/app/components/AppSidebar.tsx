"use client";

// Extracted from the original inline sidebar in `map/MapView.tsx` (kept as
// inline styles, matching that file, since this is a lift-and-share of
// existing UI rather than new design — new pages built alongside it use
// Tailwind, the configured system).

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/context";
import { NAV_LABELS } from "@/lib/i18n/translations";

export type AppPage = "dashboard" | "map" | "chat" | "reports" | "scrapes" | "templates" | "none";

interface NavItem {
  page: Exclude<AppPage, "none">;
  href: string;
  Icon: (props: { muted: boolean }) => React.ReactElement;
}

const NAV_ITEMS: NavItem[] = [
  { page: "dashboard", href: "/dashboard", Icon: DashboardIcon },
  { page: "map", href: "/map", Icon: PinIcon },
  { page: "chat", href: "/chat", Icon: ChatIcon },
  { page: "templates", href: "/templates", Icon: TemplateIcon },
  { page: "reports", href: "/reports/overview", Icon: ReportIcon },
  { page: "scrapes", href: "/admin/scrapes", Icon: ScrapeIcon },
];

const STORAGE_KEY = "sahaibat-sidebar-collapsed";
const EXPANDED_WIDTH = 232;
const COLLAPSED_WIDTH = 68;

export default function AppSidebar({ active }: { active: AppPage }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { locale, setLocale, t } = useLanguage();

  useEffect(() => {
    setMounted(true);
    try {
      setCollapsed(window.localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      // localStorage unavailable — default to expanded, no crash.
    }
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        // ignore — per-viewer convenience only
      }
      return next;
    });
  }

  return (
    <div
      style={{
        width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH,
        flexShrink: 0,
        background: "#111827",
        display: "flex",
        flexDirection: "column",
        padding: "20px 12px",
        transition: mounted ? "width 160ms ease" : undefined,
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 2px 24px 2px" }}>
        <div style={{ width: 32, height: 32, borderRadius: 9, background: "#0891b2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M4 21V9l8-6 8 6v12" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M9 21v-7h6v7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        {!collapsed && (
          <div style={{ whiteSpace: "nowrap" }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#f8fafc", lineHeight: 1.1 }}>SahAIbat DOK</div>
            <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.1, marginTop: 2 }}>{t.sidebarTagline}</div>
          </div>
        )}
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {NAV_ITEMS.map(({ page, href, Icon }) => {
          const isActive = page === active;
          const label = NAV_LABELS[locale][page];
          const content = (
            <>
              <Icon muted={!isActive} />
              {!collapsed && <span style={navLabelStyle(isActive)}>{label}</span>}
            </>
          );
          return isActive ? (
            <div key={page} title={collapsed ? label : undefined} style={navItemStyle(true, collapsed)}>
              {content}
            </div>
          ) : (
            <Link key={page} href={href} title={collapsed ? label : undefined} style={navItemStyle(false, collapsed)}>
              {content}
            </Link>
          );
        })}
      </nav>

      <div style={{ flex: 1 }} />

      <button
        onClick={() => setLocale(locale === "id" ? "en" : "id")}
        title={t.sidebarLanguage}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "flex-start",
          gap: 10,
          padding: "9px 12px",
          borderRadius: 8,
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: "#94a3b8",
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
          <circle cx="12" cy="12" r="9" stroke="#94a3b8" strokeWidth="2" />
          <path d="M3 12h18M12 3c2.5 2.6 4 5.9 4 9s-1.5 6.4-4 9c-2.5-2.6-4-5.9-4-9s1.5-6.4 4-9Z" stroke="#94a3b8" strokeWidth="2" />
        </svg>
        {!collapsed && (
          <span style={{ fontSize: 12.5, fontWeight: 600 }}>
            {locale.toUpperCase()} <span style={{ color: "#4b5563" }}>→</span> {(locale === "id" ? "en" : "id").toUpperCase()}
          </span>
        )}
      </button>

      <button
        onClick={toggle}
        title={collapsed ? t.sidebarExpandTitle : t.sidebarCollapseTitle}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "flex-start",
          gap: 10,
          padding: "9px 12px",
          borderRadius: 8,
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: "#94a3b8",
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          style={{ transform: collapsed ? "rotate(180deg)" : undefined, transition: "transform 160ms ease" }}
        >
          <path d="M15 6l-6 6 6 6" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {!collapsed && <span style={{ fontSize: 12.5, fontWeight: 500 }}>{t.sidebarCollapse}</span>}
      </button>
    </div>
  );
}

function navItemStyle(active: boolean, collapsed: boolean): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: collapsed ? "center" : "flex-start",
    gap: 10,
    padding: "9px 12px",
    borderRadius: 8,
    background: active ? "rgba(255,255,255,0.09)" : "transparent",
    textDecoration: "none",
  };
}

function navLabelStyle(active: boolean): React.CSSProperties {
  return { fontSize: 13.5, fontWeight: active ? 600 : 500, color: active ? "#f8fafc" : "#cbd5e1", whiteSpace: "nowrap" };
}

function DashboardIcon({ muted }: { muted: boolean }) {
  const c = muted ? "#94a3b8" : "#f8fafc";
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      <rect x="3" y="3" width="7" height="9" rx="1.5" stroke={c} strokeWidth="2" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" stroke={c} strokeWidth="2" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" stroke={c} strokeWidth="2" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" stroke={c} strokeWidth="2" />
    </svg>
  );
}

function PinIcon({ muted }: { muted: boolean }) {
  const c = muted ? "#94a3b8" : "#f8fafc";
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      <path d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21Z" stroke={c} strokeWidth="2" strokeLinejoin="round" />
      <circle cx="12" cy="9.5" r="2.4" stroke={c} strokeWidth="2" />
    </svg>
  );
}

function ScrapeIcon({ muted }: { muted: boolean }) {
  const c = muted ? "#94a3b8" : "#f8fafc";
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      <path d="M5 4h11l3 3v13H5V4Z" stroke={c} strokeWidth="2" strokeLinejoin="round" />
      <path d="M9 11h6M9 15h6" stroke={c} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ChatIcon({ muted }: { muted: boolean }) {
  const c = muted ? "#94a3b8" : "#f8fafc";
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      <path d="M4 4h16v12H8l-4 4V4Z" stroke={c} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function ReportIcon({ muted }: { muted: boolean }) {
  const c = muted ? "#94a3b8" : "#f8fafc";
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      <path d="M4 20V10M12 20V4M20 20v-7" stroke={c} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function TemplateIcon({ muted }: { muted: boolean }) {
  const c = muted ? "#94a3b8" : "#f8fafc";
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      <rect x="4" y="3" width="16" height="18" rx="2" stroke={c} strokeWidth="2" />
      <path d="M8 8h8M8 12h8M8 16h5" stroke={c} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
