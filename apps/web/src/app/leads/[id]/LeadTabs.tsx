"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function LeadTabs({ leadId }: { leadId: string }) {
  const pathname = usePathname();
  const isContacts = pathname?.endsWith("/contacts");

  return (
    <div className="mt-3 flex gap-1">
      <Link
        href={`/chat?leadId=${leadId}`}
        className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-50"
      >
        Chat
      </Link>
      <Link
        href={`/leads/${leadId}/contacts`}
        className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
          isContacts ? "bg-cyan-50 text-cyan-700" : "text-slate-500 hover:bg-slate-50"
        }`}
      >
        Contacts
      </Link>
    </div>
  );
}
