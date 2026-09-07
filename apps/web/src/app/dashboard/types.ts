export interface StageDef {
  key: string;
  label: string;
  color: string;
  isTerminal?: boolean;
}

export interface Lead {
  id: string;
  name: string;
  category: string | null;
  address: string | null;
  phoneRaw: string | null;
  phoneNormalized: string | null;
  phoneOffice: string | null;
  businessType: string | null;
  instagramUrl: string | null;
  province: string | null;
  notes: string | null;
  rating: string | null;
  reviewCount: number | null;
  pipelineStage: string;
  pipelineStageDef: StageDef;
  firstScrapedAt: string;
  lastScrapedAt: string | null;
}

export const BUSINESS_TYPES = [
  { key: "solo_doctor", label: "Solo Doctor" },
  { key: "klinik_pratama", label: "Klinik Pratama" },
] as const;

export function businessTypeLabel(key: string | null): string {
  return BUSINESS_TYPES.find((b) => b.key === key)?.label ?? key ?? "—";
}
