import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { normalizePhoneNumber } from "@sahaibat/shared";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const lead = await db.lead.findUnique({
    where: { id },
    include: { pipelineStageDef: true },
  });
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }
  return NextResponse.json({ lead });
}

const patchSchema = z.object({
  toStage: z.string().min(1),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const lead = await db.lead.findUnique({ where: { id } });
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const { toStage } = parsed.data;
  if (toStage === lead.pipelineStage) {
    return NextResponse.json({ error: "Lead is already in this stage" }, { status: 400 });
  }

  const stageDef = await db.pipelineStageDef.findUnique({ where: { key: toStage } });
  if (!stageDef) {
    return NextResponse.json({ error: `Unknown stage "${toStage}"` }, { status: 400 });
  }

  const [updated] = await db.$transaction([
    db.lead.update({
      where: { id },
      data: { pipelineStage: toStage },
      include: { pipelineStageDef: true },
    }),
    db.leadActivity.create({
      data: {
        leadId: id,
        type: "stage_change",
        payload: { from: lead.pipelineStage, to: toStage },
      },
    }),
  ]);

  return NextResponse.json({ lead: updated });
}

const editSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  phoneRaw: z.string().nullable().optional(),
  phoneOffice: z.string().nullable().optional(),
  businessType: z.string().nullable().optional(),
  instagramUrl: z.string().nullable().optional(),
  province: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  googleMapsUrl: z.string().nullable().optional(),
});

/** General field edit from the dashboard's lead modal — distinct from the
 * stage-transition-only PATCH above, which /map depends on unchanged. */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const parsed = editSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await db.lead.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const {
    name,
    category,
    address,
    phoneRaw,
    phoneOffice,
    businessType,
    instagramUrl,
    province,
    notes,
    lat,
    lng,
    googleMapsUrl,
  } = parsed.data;
  const data: Prisma.LeadUpdateInput = {};
  if (name !== undefined) data.name = name;
  if (category !== undefined) data.category = category;
  if (address !== undefined) data.address = address;
  if (notes !== undefined) data.notes = notes;
  if (phoneOffice !== undefined) data.phoneOffice = phoneOffice;
  if (businessType !== undefined) data.businessType = businessType;
  if (instagramUrl !== undefined) data.instagramUrl = instagramUrl;
  if (province !== undefined) data.province = province;
  if (lat !== undefined) data.lat = lat;
  if (lng !== undefined) data.lng = lng;
  if (googleMapsUrl !== undefined) data.googleMapsUrl = googleMapsUrl;
  if (phoneRaw !== undefined) {
    data.phoneRaw = phoneRaw;
    data.phoneNormalized = phoneRaw ? normalizePhoneNumber(phoneRaw) : null;
  }

  const [lead] = await db.$transaction([
    db.lead.update({ where: { id }, data, include: { pipelineStageDef: true } }),
    db.leadActivity.create({
      data: { leadId: id, type: "manual_edit", payload: { fields: Object.keys(data) } },
    }),
  ]);

  return NextResponse.json({ lead });
}
