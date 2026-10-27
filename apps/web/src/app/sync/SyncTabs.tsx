"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Sub-tabs of /sync — each has its own /sync/<name> page.
const TABS: { href: string; label: string; isActive: (pathname: string) => boolean }[] = [
  { href: "/sync/leadinput", label: "Lead Input", isActive: (p) => p === "/sync" || p === "/sync/leadinput" },
  { href: "/sync/dailylog", label: "Daily Log", isActive: (p) => p === "/sync/dailylog" },
  { href: "/sync/timesheet", label: "Timesheet", isActive: (p) => p === "/sync/timesheet" },
];

export default function SyncTabs() {
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
