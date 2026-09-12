"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS: { href: string; label: string; isActive: (pathname: string) => boolean }[] = [
  { href: "/reports/overview", label: "Overview", isActive: (p) => p === "/reports" || p === "/reports/overview" },
  // /reports/kanban/{overview,daily} both count as the Kanban tab.
  { href: "/reports/kanban/overview", label: "Kanban", isActive: (p) => p.startsWith("/reports/kanban") },
  { href: "/reports/history", label: "History", isActive: (p) => p === "/reports/history" },
];

export default function ReportsTabs() {
  const pathname = usePathname();
  return (
    <div className="mb-6 flex gap-1 border-b border-slate-200">
      {TABS.map((t) => {
        const active = t.isActive(pathname);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              active ? "border-cyan-600 text-cyan-700" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
