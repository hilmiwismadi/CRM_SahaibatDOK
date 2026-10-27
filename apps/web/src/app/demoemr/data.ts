// Skenario demo DOK Companion pada EMR existing. Semua data pasien fiktif.

export type FieldId =
  | "keluhan" | "rps" | "rpd" | "alergi"
  | "td" | "nadi" | "rr" | "suhu" | "spo2" | "bb" | "tb"
  | "pemfis" | "dx" | "plan" | "edukasi" | "kontrol";

export interface RxRow {
  obat: string;
  dosis: string;
  aturan: string;
  jumlah: string;
}

export const PATIENT = {
  nama: "Budi Santoso",
  rm: "RM-004217",
  umur: "45 th",
  jk: "Laki-laki",
  tglLahir: "12-03-1981",
  penjamin: "BPJS Kesehatan",
  noKartu: "0001234567890",
  poli: "Poli Umum",
  dokter: "dr. Ayu Lestari",
  antrian: "A-014",
  tanggal: "11 Okt 2026",
};

export const FIELD_LABEL: Record<FieldId, string> = {
  keluhan: "Keluhan utama",
  rps: "Riwayat penyakit sekarang",
  rpd: "Riwayat penyakit dahulu",
  alergi: "Alergi",
  td: "TD (mmHg)",
  nadi: "Nadi (x/mnt)",
  rr: "RR (x/mnt)",
  suhu: "Suhu (°C)",
  spo2: "SpO₂ (%)",
  bb: "BB (kg)",
  tb: "TB (cm)",
  pemfis: "Pemeriksaan fisik",
  dx: "Diagnosis (ICD-10)",
  plan: "Rencana / terapi",
  edukasi: "Edukasi pasien",
  kontrol: "Kontrol ulang",
};

// Hasil ekstraksi DOK dari percakapan.
export const EXTRACTED: Record<FieldId, string> = {
  keluhan: "Demam dan batuk sejak 3 hari",
  rps: "Demam naik turun sejak 3 hari lalu, batuk berdahak putih, pilek, nyeri menelan ringan. Tidak sesak, tidak ada mual muntah. Sudah minum paracetamol 1x, demam turun sebentar.",
  rpd: "Hipertensi (-), DM (-), asma (-). Tidak ada riwayat rawat inap.",
  alergi: "Tidak ada alergi obat/makanan",
  td: "120/80",
  nadi: "92",
  rr: "20",
  suhu: "38.1",
  spo2: "98",
  bb: "70",
  tb: "170",
  pemfis:
    "KU baik, CM. Faring hiperemis, tonsil T1-T1 tenang. Cor: BJ I-II reguler, murmur (-). Pulmo: vesikuler +/+, ronkhi -/-, wheezing -/-. Abdomen: supel, BU (+) normal.",
  dx: "J06.9 – Acute upper respiratory infection, unspecified",
  plan: "Terapi simptomatik. Istirahat cukup, banyak minum air putih. Kontrol bila demam >3 hari atau sesak.",
  edukasi: "Penjelasan ISPA viral, tanda bahaya (sesak, demam tinggi menetap), cuci tangan, pakai masker.",
  kontrol: "3 hari lagi bila belum membaik",
};

export const EXTRACTED_RX: RxRow[] = [
  { obat: "Paracetamol 500 mg tab", dosis: "500 mg", aturan: "3 x 1 tab prn demam", jumlah: "10" },
  { obat: "Ambroxol 30 mg tab", dosis: "30 mg", aturan: "3 x 1 tab sesudah makan", jumlah: "9" },
  { obat: "Vitamin C 500 mg tab", dosis: "500 mg", aturan: "1 x 1 tab", jumlah: "5" },
];

// Urutan pengisian ke form EMR (ids "rx0".."rx2" = baris resep).
export const FILL_ORDER: string[] = [
  "keluhan", "rps", "rpd", "alergi",
  "td", "nadi", "rr", "suhu", "spo2", "bb", "tb",
  "pemfis", "dx", "plan",
  "rx0", "rx1", "rx2",
  "edukasi", "kontrol",
];

export interface Line {
  who: "D" | "P";
  text: string;
}

export const TRANSCRIPT: Line[] = [
  { who: "D", text: "Selamat pagi Pak Budi, ada keluhan apa hari ini?" },
  { who: "P", text: "Pagi dok. Saya demam sama batuk sudah tiga hari." },
  { who: "D", text: "Demamnya terus-menerus atau naik turun? Batuknya berdahak?" },
  { who: "P", text: "Naik turun dok. Batuk berdahak putih, pilek juga, tenggorokan agak sakit kalau menelan." },
  { who: "D", text: "Ada sesak, mual, atau muntah?" },
  { who: "P", text: "Tidak ada dok. Tadi malam sempat minum paracetamol satu kali, turun sebentar terus naik lagi." },
  { who: "D", text: "Punya riwayat darah tinggi, kencing manis, atau asma? Alergi obat?" },
  { who: "P", text: "Tidak ada dok, alergi juga tidak." },
  { who: "D", text: "Baik, saya periksa dulu. Tensi 120/80, nadi 92, napas 20, suhu 38,1, saturasi 98. Berat 70, tinggi 170." },
  { who: "D", text: "Tenggorokan merah, amandel tenang. Jantung dan paru normal, perut supel." },
  { who: "D", text: "Ini infeksi saluran napas atas, kemungkinan virus. Saya beri paracetamol, ambroxol, dan vitamin C." },
  { who: "D", text: "Istirahat, banyak minum. Kalau demam lebih dari tiga hari atau sesak, segera kontrol ya." },
];

export const AGENTS = ["Riwayat", "Pemeriksaan", "Diagnosis", "Obat", "Tindak lanjut"];

export function bmi(bb: string, tb: string): string | null {
  const w = parseFloat(bb.replace(",", "."));
  const h = parseFloat(tb.replace(",", ".")) / 100;
  if (!w || !h) return null;
  return (w / (h * h)).toFixed(1);
}

export const SKINS = [
  { id: "cloud", label: "Cloud modern", hint: "pola UI Assist.id / Klinikme" },
  { id: "desktop", label: "Desktop klasik", hint: "pola UI SIMRS Khanza" },
  { id: "webadmin", label: "Web admin", hint: "pola UI Sisfomedika / AdminLTE" },
] as const;

export type SkinId = (typeof SKINS)[number]["id"];
