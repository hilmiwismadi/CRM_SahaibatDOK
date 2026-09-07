import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import AppSidebar from "@/app/components/AppSidebar";
import LeadTabs from "./LeadTabs";

export default async function LeadLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lead = await db.lead.findUnique({ where: { id }, include: { pipelineStageDef: true } });
  if (!lead) notFound();

  return (
    <div className="flex h-screen overflow-hidden bg-[#f7f8fa] text-slate-900">
      <AppSidebar active="none" />
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="border-b border-slate-100 bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-slate-900">{lead.name}</h1>
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
              style={{ backgroundColor: lead.pipelineStageDef.color }}
            >
              {lead.pipelineStageDef.label}
            </span>
          </div>
          <LeadTabs leadId={id} />
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
