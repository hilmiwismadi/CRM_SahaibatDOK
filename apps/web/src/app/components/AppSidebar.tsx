"use client";

// Extracted from the original inline sidebar in `map/MapView.tsx` (kept as
// inline styles, matching that file, since this is a lift-and-share of
// existing UI rather than new design — new pages built alongside it use
// Tailwind, the configured system).

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/context";
import { NAV_LABELS } from "@/lib/i18n/translations";
import { formatDate } from "@/lib/i18n/locale";

interface FollowUpReminder {
  waContactId: string;
  leadId: string;
  leadName: string;
  followUpAt: string;
}

const REMINDERS_POLL_MS = 60000;

// Opens a URL in a new tab without stealing focus — same trick as the
// dashboard's lead context menu, so clicking a reminder doesn't lose the
// sidebar popup or whatever page the rep was on.
function openInBackgroundTab(url: string) {
  const win = window.open(url, "_blank");
  win?.blur();
  window.focus();
}

export type AppPage = "dashboard" | "map" | "chat" | "reports" | "scrapes" | "templates" | "letters" | "none";

interface NavItem {
  page: Exclude<AppPage, "none">;
  href: string;
  Icon: (props: { muted: boolean }) => React.ReactElement;
  newTab?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { page: "dashboard", href: "/dashboard", Icon: DashboardIcon },
  { page: "map", href: "/map", Icon: PinIcon },
  { page: "chat", href: "/chat", Icon: ChatIcon },
  { page: "templates", href: "/templates", Icon: TemplateIcon },
  { page: "letters", href: "/letters", Icon: LetterIcon, newTab: true },
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

  const [reminders, setReminders] = useState<FollowUpReminder[]>([]);
  const [remindersOpen, setRemindersOpen] = useState(false);
  const [remindersPos, setRemindersPos] = useState<{ top: number; left: number } | null>(null);
  const remindersBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
    try {
      setCollapsed(window.localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      // localStorage unavailable — default to expanded, no crash.
    }
  }, []);

  const loadReminders = useCallback(() => {
    fetch("/api/leads/follow-up-reminders")
      .then((r) => r.json())
      .then((d) => setReminders(d.reminders ?? []))
      .catch(() => {
        // Silent — the badge just stays at its last known count until the
        // next successful poll, same tolerance as /chat's message polling.
      });
  }, []);

  // Mounted on every page (AppSidebar is shared), so this poll runs
  // regardless of which page is open — a rep should see the badge update
  // whether they're on /chat, /dashboard, or anywhere else.
  useEffect(() => {
    loadReminders();
    const id = setInterval(loadReminders, REMINDERS_POLL_MS);
    return () => clearInterval(id);
  }, [loadReminders]);

  useEffect(() => {
    if (!remindersOpen) return;
    const close = () => setRemindersOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [remindersOpen]);

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
        {NAV_ITEMS.map(({ page, href, Icon, newTab }) => {
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
            <Link
              key={page}
              href={href}
              title={collapsed ? label : undefined}
              style={navItemStyle(false, collapsed)}
              {...(newTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            >
              {content}
            </Link>
          );
        })}
      </nav>

      <button
        ref={remindersBtnRef}
        onClick={(e) => {
          e.stopPropagation();
          if (!remindersOpen) {
            const rect = remindersBtnRef.current?.getBoundingClientRect();
            if (rect) setRemindersPos({ top: rect.top, left: rect.right + 8 });
            loadReminders();
          }
          setRemindersOpen((v) => !v);
        }}
        title={t.sidebarReminders}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "flex-start",
          gap: 10,
          padding: "9px 12px",
          borderRadius: 8,
          background: remindersOpen ? "rgba(255,255,255,0.09)" : "transparent",
          border: "none",
          cursor: "pointer",
          color: "#cbd5e1",
          marginTop: 2,
        }}
      >
        <span style={{ position: "relative", display: "inline-flex", flexShrink: 0 }}>
          <BellIcon muted={false} />
          {reminders.length > 0 && (
            <span
              style={{
                position: "absolute",
                top: -4,
                right: -6,
                minWidth: 14,
                height: 14,
                padding: "0 3px",
                borderRadius: 7,
                background: "#ef4444",
                color: "#fff",
                fontSize: 9.5,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                lineHeight: 1,
              }}
            >
              {reminders.length}
            </span>
          )}
        </span>
        {!collapsed && <span style={navLabelStyle(false)}>{t.sidebarReminders}</span>}
      </button>

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

      {remindersOpen && remindersPos && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "fixed",
            top: remindersPos.top,
            left: remindersPos.left,
            zIndex: 200,
            width: 280,
            maxHeight: 360,
            overflowY: "auto",
            background: "#fff",
            borderRadius: 10,
            boxShadow: "0 12px 32px rgba(0,0,0,0.25)",
            padding: "10px 0",
          }}
        >
          <div style={{ padding: "0 14px 8px", fontSize: 12.5, fontWeight: 700, color: "#0f172a" }}>
            {t.sidebarReminders}
          </div>
          {reminders.length === 0 ? (
            <div style={{ padding: "10px 14px", fontSize: 12.5, color: "#94a3b8" }}>{t.sidebarRemindersEmpty}</div>
          ) : (
            reminders.map((r) => (
              <button
                key={r.waContactId}
                onClick={() => {
                  openInBackgroundTab(`/chat?leadId=${r.leadId}`);
                  setRemindersOpen(false);
                }}
                style={{
                  display: "flex",
                  width: "100%",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  padding: "8px 14px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <span style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#0f172a",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {r.leadName}
                  </span>
                  <span style={{ fontSize: 11, color: "#94a3b8" }}>
                    {formatDate(r.followUpAt, locale, { day: "2-digit", month: "short", year: "numeric" })}
                  </span>
                </span>
                <span
                  style={{
                    flexShrink: 0,
                    fontSize: 10.5,
                    fontWeight: 700,
                    color: reminderIsToday(r.followUpAt) ? "#0ea5e9" : "#dc2626",
                    background: reminderIsToday(r.followUpAt) ? "#e0f2fe" : "#fee2e2",
                    borderRadius: 999,
                    padding: "2px 7px",
                  }}
                >
                  {reminderIsToday(r.followUpAt) ? t.sidebarRemindersToday : t.sidebarRemindersOverdue(reminderOverdueDays(r.followUpAt))}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function reminderOverdueDays(followUpAt: string): number {
  const due = new Date(followUpAt);
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((today.getTime() - due.getTime()) / 86400000));
}

function reminderIsToday(followUpAt: string): boolean {
  return reminderOverdueDays(followUpAt) === 0;
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

function BellIcon({ muted }: { muted: boolean }) {
  const c = muted ? "#94a3b8" : "#f8fafc";
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      <path
        d="M6 9a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 13 6 9Z"
        stroke={c}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10 18a2 2 0 0 0 4 0" stroke={c} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function LetterIcon({ muted }: { muted: boolean }) {
  const c = muted ? "#94a3b8" : "#f8fafc";
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      <rect x="3" y="5" width="18" height="14" rx="2" stroke={c} strokeWidth="2" />
      <path d="m4 6.5 8 6 8-6" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
