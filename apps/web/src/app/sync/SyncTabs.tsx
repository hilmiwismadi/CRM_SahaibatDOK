"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Only 2 sub-tabs for now — a 3rd was mentioned (2026-09-29 conversation)
// but not yet specified. Add it here + its own /sync/<name> page when the
// user decides what it is.
const TABS: { href: string; label: string; isActive: (pathname: string) => boolean }[] = [
  { href: "/sync/leadinput", label: "Lead Input", isActive: (p) => p === "/sync" || p === "/sync/leadinput" },
  { href: "/sync/dailylog", label: "Daily Log", isActive: (p) => p === "/sync/dailylog" },
];

export default function SyncTabs() {
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
