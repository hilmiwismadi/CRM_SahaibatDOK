"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function LeadTabs({ leadId }: { leadId: string }) {
  const pathname = usePathname();
  const isContacts = pathname?.endsWith("/contacts");

  return (
    // Phones: two equal-width tabs with 44px tap height.
    <div className="mt-3 flex gap-1 max-md:mt-2">
      <Link
        href={`/chat?leadId=${leadId}`}
        className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-50 max-md:flex max-md:min-h-[44px] max-md:flex-1 max-md:items-center max-md:justify-center"
      >
        Chat
      </Link>
      <Link
        href={`/leads/${leadId}/contacts`}
        className={`rounded-lg px-3 py-1.5 text-sm font-medium max-md:flex max-md:min-h-[44px] max-md:flex-1 max-md:items-center max-md:justify-center ${
          isContacts ? "bg-cyan-50 text-cyan-700" : "text-slate-500 hover:bg-slate-50"
        }`}
      >
        Contacts
      </Link>
    </div>
  );
}
