import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { renderToBuffer } from "@react-pdf/renderer";
import { db } from "@/lib/db";
import { LetterDocument } from "@/app/letters/LetterDocument";

const SESSION_MODES = ["online", "offline", "hybrid"] as const;

/**
 * Fills the "Permohonan Partisipasi Riset Sistem Kesehatan" research-invite
 * letter (copy source: Dokumen/Template Persuratan Demo Invitation (1).docx;
 * letterhead/eyebrow/section-heading/signature/footer layout adapted from
 * Dokumen/lettertemplate.txt, including its brand palette — pulled from that
 * file's inline logo SVG, no stylesheet shipped with it) for a specific lead
 * and returns a ready-to-send PDF. Built for leads tagged "Further Contact"
 * (needsOtherContact) that need a formal letter instead of/alongside
 * WhatsApp outreach — see /letters. Rendered with @react-pdf/renderer (pure
 * JS, no Chromium/LibreOffice) so it works unchanged in the apps/web Docker
 * image, which has neither.
 */
const bodySchema = z.object({
  leadId: z.string().uuid(),
  nomorSurat: z.string().optional(),
  tanggal: z.string().optional(), // ISO date string; defaults to today
  namaPenerima: z.string().optional(),
  jabatanPenerima: z.string().optional(), // defaults to "Direktur" if blank
  namaKlinik: z.string().optional(), // overrides lead.name if provided
  namaBD: z.string().min(1, "Nama Business Development wajib diisi"),
  whatsappBD: z.string().optional(),
  emailBD: z.string().optional(),
  // Which wording of the "sesi diskusi" sentence to use — see
  // LetterDocument.tsx's SESSION_MODE_TEXT. Defaults to "hybrid" (mentions
  // both) when omitted, since that commits to the least.
  modeSesi: z.enum(SESSION_MODES).optional(),
});

const INDO_DATE = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" });

export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { leadId, nomorSurat, tanggal, namaPenerima, jabatanPenerima, namaKlinik, namaBD, whatsappBD, emailBD, modeSesi } =
    parsed.data;

  const lead = await db.lead.findUnique({ where: { id: leadId }, select: { id: true, name: true } });
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const tanggalDisplay = INDO_DATE.format(tanggal ? new Date(tanggal) : new Date());
  const finalNamaKlinik = namaKlinik?.trim() || lead.name;

  const pdfBuffer = await renderToBuffer(
    LetterDocument({
      data: {
        nomorSurat: nomorSurat?.trim() ?? "",
        tanggal: tanggalDisplay,
        namaPenerima: namaPenerima?.trim() ?? "",
        jabatanPenerima: jabatanPenerima?.trim() ?? "",
        namaKlinik: finalNamaKlinik,
        namaBD: namaBD.trim(),
        whatsappBD: whatsappBD?.trim() ?? "",
        emailBD: emailBD?.trim() ?? "",
        modeSesi: modeSesi ?? "hybrid",
      },
    }),
  );

  await db.leadActivity.create({
    data: {
      leadId: lead.id,
      type: "letter_generated",
      payload: { nomorSurat: nomorSurat ?? null, tanggal: tanggalDisplay, generatedBy: namaBD.trim() },
    },
  });

  // Keeps spaces and readable punctuation in the clinic name (unlike the
  // old all-dashes slug) — only strips characters that are actually
  // invalid in a filename/Content-Disposition header.
  const fileSafeName =
    finalNamaKlinik
      .replace(/[\\/:*?"<>|]+/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80) || "Lead";

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Surat Permohonan Riset-${fileSafeName}.pdf"`,
    },
  });
}
