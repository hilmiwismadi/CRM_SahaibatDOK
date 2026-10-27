"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS: { href: string; label: string; isActive: (pathname: string) => boolean }[] = [
  { href: "/reports/overview", label: "Overview", isActive: (p) => p === "/reports" || p === "/reports/overview" },
  // /reports/kanban/{overview,daily} both count as the Kanban tab.
  { href: "/reports/kanban/overview", label: "Kanban", isActive: (p) => p.startsWith("/reports/kanban") },
  { href: "/reports/history", label: "History", isActive: (p) => p === "/reports/history" },
  { href: "/reports/classify", label: "Klasifikasi", isActive: (p) => p === "/reports/classify" },
  { href: "/reports/followup", label: "Follow Up", isActive: (p) => p === "/reports/followup" },
  { href: "/reports/important", label: "Penting", isActive: (p) => p === "/reports/important" },
];

export default function ReportsTabs() {
  const pathname = usePathname();
  return (
    <div className="mb-4 flex snap-x gap-1 overflow-x-auto overflow-y-hidden border-b border-slate-200 [scrollbar-width:none] md:mb-6 md:overflow-visible">
      {TABS.map((t) => {
        const active = t.isActive(pathname);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`flex h-11 shrink-0 snap-start items-center border-b-2 px-4 text-sm font-medium whitespace-nowrap transition-colors md:-mb-px md:block md:h-auto md:py-2 ${
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
