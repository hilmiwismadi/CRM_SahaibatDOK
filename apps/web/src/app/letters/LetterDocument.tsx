import { Document, Page, View, Text, Image, Svg, G, Path, Circle, Polyline, StyleSheet } from "@react-pdf/renderer";
import path from "node:path";
import fs from "node:fs";

// The five compliance/partner badges, extracted once from
// `Dokumen/Template Persuratan Demo Invitation (1).docx`'s word/media/ and
// checked into public/letters/ (already downscaled to a print-appropriate
// size so the generated PDF doesn't balloon from the docx's full-res
// originals). Order matches `Dokumen/lettertemplate.txt`'s `.lt-badges` row
// (SATUSEHAT, BPJS, KOMDIGI·PSE, TUV SUD/KAN, NVIDIA last) — NOT the order
// they were first extracted in. Width:height ratios are frozen at
// extraction time (all resized to height=260px) so the row below can size
// each logo to a fixed print height without re-measuring the file per
// request.
const LOGO_FILES = [
  { file: "image1.png", ratio: 462 / 260 }, // SATUSEHAT
  { file: "image2.png", ratio: 347 / 260 }, // BPJS Kesehatan
  { file: "image4.png", ratio: 780 / 260 }, // KOMDIGI · PSE
  { file: "image5.png", ratio: 780 / 260 }, // TUV SUD / KAN
  { file: "image3.jpg", ratio: 600 / 260 }, // NVIDIA Inception (last)
];

const LOGO_HEIGHT = 32;

// M. H. Dzaki Wismadi's own signature — a personal asset, not a generic
// placeholder. If this letter is ever generated for a different BD person,
// this image would need to change (or be made conditional on `namaBD`) —
// not built that way yet since, in practice, this CRM has one BD sender.
const SIGNATURE_FILE = "signature-bd.png";
const SIGNATURE_RATIO = 487 / 330;
// Sized to match the printed name's width, not an arbitrary height — 90.9pt
// is "M. H. Dzaki Wismadi" set in Helvetica-Bold 9.5pt (styles.signatureName),
// measured via jsPDF's font metrics (react-pdf has no text-measurement API
// to call at render time). Recalculate this if the name or its font size
// ever changes.
const SIGNATURE_WIDTH = 91;
const SIGNATURE_HEIGHT = SIGNATURE_WIDTH / SIGNATURE_RATIO;

// `public/` sits at a different depth relative to process.cwd() in `next
// dev` (run from apps/web/) vs the Docker standalone runtime (run from the
// repo-shaped /app with apps/web/public copied alongside server.js) — see
// apps/web/Dockerfile's final COPY step. Try both instead of hardcoding one.
function publicDir(): string {
  const candidates = [
    path.join(process.cwd(), "public"),
    path.join(process.cwd(), "apps/web/public"),
  ];
  return candidates.find((p) => fs.existsSync(p)) ?? candidates[0];
}

// Read straight into a Buffer and hand react-pdf `{ data, format }` instead
// of a bare path string — a Windows-style backslash path (this repo's dev
// machine) isn't a valid react-pdf image source, and it fails silently
// (image just doesn't render, no thrown error) rather than erroring loudly.
// Reading the bytes ourselves sidesteps react-pdf's own path/URL resolution
// entirely, so it behaves the same on Windows dev and the Linux Docker
// runtime. Cached per file since these are fixed static assets, read once
// per server process rather than once per generated letter.
const logoSourceCache = new Map<string, { data: Buffer; format: "png" | "jpg" }>();

function loadLogoSource(file: string): { data: Buffer; format: "png" | "jpg" } {
  const cached = logoSourceCache.get(file);
  if (cached) return cached;
  const format = file.endsWith(".jpg") ? "jpg" : "png";
  const data = fs.readFileSync(path.join(publicDir(), "letters", file));
  const source = { data, format } as const;
  logoSourceCache.set(file, source);
  return source;
}

export interface LetterData {
  nomorSurat: string;
  tanggal: string; // pre-formatted, e.g. "18 September 2026"
  namaPenerima: string; // optional — addressee block collapses to just the clinic name when blank
  jabatanPenerima: string;
  namaKlinik: string;
  namaBD: string;
  whatsappBD: string;
  emailBD: string;
}

// Brand palette — the only three colors fixed by the source logo SVG in
// `Dokumen/lettertemplate.txt` (a deep green icon/wordmark stroke, a mint
// accent on the "AI" in "SahAIbat", and a near-black wordmark fill). LINE/
// MUTED/NOTE_BG are derived, not specified anywhere — no stylesheet shipped
// with that template, just markup — chosen to sit quietly next to the three
// fixed colors rather than reintroduce the old cyan theme.
const INK = "#16231e";
const ACCENT = "#0f6e56";
const MINT = "#1fae83";
const LINE = "#cddad4";
const MUTED = "#57655e";

// Tightened once (from an initial pass that ran 3 pages) specifically to
// fit this letter's full docx content in 2 — font size, line height, and
// every paragraph/section/bullet margin below are deliberately smaller
// than a first-draft letter would use. Still comfortably readable (9.5pt
// body is standard for dense formal correspondence), but there's very
// little slack left; a meaningfully longer edit to the body text will
// likely push back to 3 pages.
const HEADER_HEIGHT = 62; // reserved at the top of every page for the fixed letterhead
const FOOTER_HEIGHT = 76; // reserved at the bottom of every page for the fixed footer (badges + legal text)

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9.5,
    lineHeight: 1.32,
    color: INK,
    paddingTop: HEADER_HEIGHT + 14,
    paddingBottom: FOOTER_HEIGHT + 14,
    paddingHorizontal: 50,
  },
  bold: { fontFamily: "Helvetica-Bold" },
  header: {
    position: "absolute",
    top: 18,
    left: 50,
    right: 50,
  },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  // Scaled up (icon 20->34, wordmark 13->22, "DOK" 6.5->11, same ratios) so
  // the mark's height matches the 3-line address block on the right — they
  // sit in the same flex row, so a shorter logo left a lopsided header.
  logoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  wordmark: { fontFamily: "Helvetica-Bold", fontSize: 22, color: INK },
  wordmarkDok: { fontFamily: "Helvetica-Bold", fontSize: 11, color: "#73867e", letterSpacing: 0.5 },
  addrBlock: { alignItems: "flex-end" },
  addrLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 6.8,
    color: ACCENT,
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  addrLine: { fontSize: 6.8, color: MUTED, textAlign: "right", lineHeight: 1.3 },
  headerRule: { height: 1, backgroundColor: LINE, marginTop: 10 },

  refRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  refLeft: { fontSize: 8.6, color: MUTED, lineHeight: 1.5 },
  // Fixed-width label column so "Nomor" (5 letters) and "Perihal" (7)
  // still line up their colons on the same x — same effect as a LaTeX
  // `tabular` column, just done with a flex row instead of manual spaces
  // (which can't account for proportional-width text).
  refRowLine: { flexDirection: "row" },
  refLabel: { width: 40 },
  refRight: { fontSize: 8.6, color: MUTED },

  eyebrow: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7.8,
    color: ACCENT,
    letterSpacing: 0.6,
    marginBottom: 3,
  },
  title: { fontFamily: "Helvetica-Bold", fontSize: 14.5, color: INK, marginBottom: 20 },

  para: { marginBottom: 5.5, textAlign: "justify" },
  addressBlock: { marginBottom: 6 },

  // Page 2's own opener, sized like page 1's `title` (not the smaller
  // `sectionHeading` the other page-2 headings use below it) so "Profil
  // Sahaibat" reads as page 2's title, with "Cara DOK Membantu Dokter" /
  // "Keamanan dan Kesiapan Implementasi" / "Manfaat bagi klinik mitra"
  // as green subtitles under it, not four headings of equal weight.
  pageTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 14.5,
    color: ACCENT,
    marginBottom: 10,
  },
  sectionHeading: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    color: ACCENT,
    marginTop: 3,
    marginBottom: 5,
  },
  bulletRow: { flexDirection: "row", marginBottom: 1.8, paddingLeft: 6 },
  bulletDot: { width: 12, fontSize: 9.5, color: ACCENT },
  bulletText: { flex: 1, textAlign: "justify" },
  dokItem: { flexDirection: "row", marginBottom: 4 },
  dokNum: { width: 20, fontFamily: "Helvetica-Bold", color: ACCENT },
  dokLabel: { fontFamily: "Helvetica-Bold", color: ACCENT },
  numberedLead: { fontFamily: "Helvetica-Bold", color: ACCENT, marginBottom: 2 },

  signatureBlock: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 0.75,
    borderColor: LINE,
    fontSize: 8.8,
    lineHeight: 1.35,
  },
  signatureName: { fontFamily: "Helvetica-Bold", fontSize: 9.5, marginBottom: 1 },

  footer: {
    position: "absolute",
    left: 50,
    right: 50,
    bottom: 14,
  },
  // `space-between` — spreads the five badges across the full content
  // width with equal gaps instead of leaving them clumped at one edge.
  footerLogoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  footerRule: { height: 0.75, backgroundColor: LINE, marginBottom: 4 },
  footerLine: { fontSize: 6.6, color: MUTED, textAlign: "center" },
  footerLine2: { fontSize: 6.6, color: MUTED, textAlign: "center", marginTop: 1.5 },
});

function LetterheadMark() {
  return (
    <View style={styles.logoRow}>
      <Svg viewBox="0 0 64 64" width={34} height={34}>
        <G fill="none" stroke={ACCENT} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M32 25 C32 17 26 14 22 11" />
          <Path d="M32 25 C32 17 38 14 42 11" />
          <Path d="M32 25 L32 33" />
          <Circle cx={32} cy={44} r={11} />
          <Polyline points="23 44 28.5 44 30.5 39 33 49 35 44 41 44" strokeWidth={4} />
          <Circle cx={22} cy={11} r={2.7} fill={ACCENT} stroke="none" />
          <Circle cx={42} cy={11} r={2.7} fill={ACCENT} stroke="none" />
        </G>
      </Svg>
      <Text style={styles.wordmark}>
        Sah
        <Text style={{ color: MINT }}>AI</Text>
        bat
        {/* Matches Dokumen/logosahaibat.svg's "DOK" suffix on the wordmark —
            a nested Text run (not that SVG's own <text>: react-pdf's
            SVGTextProps has no fontFamily/fontSize fields, so sizing text
            inside an <Svg> isn't reliable) so it sits right after "bat"
            instead of picking up the row's inter-child gap. */}
        <Text style={styles.wordmarkDok}> DOK</Text>
      </Text>
    </View>
  );
}

// Fixed — react-pdf repeats this at the same position on every auto-paginated
// page, same as `Footer` below, so a letter that runs to page 2 still opens
// under a full letterhead instead of bare body text.
function Header() {
  return (
    <View style={styles.header} fixed>
      <View style={styles.headerRow}>
        <LetterheadMark />
        <View style={styles.addrBlock}>
          <Text style={styles.addrLabel}>KANTOR JAKARTA</Text>
          <Text style={styles.addrLine}>Kensington Tower, Jl. Boulevard Raya No. 1</Text>
          <Text style={styles.addrLine}>RW.17, Kelapa Gading Timur, Kec. Kelapa Gading</Text>
          <Text style={styles.addrLine}>Jakarta Utara, DKI Jakarta 14240, Indonesia</Text>
        </View>
      </View>
      <View style={styles.headerRule} />
    </View>
  );
}

// Fixed — repeats on every page (same as `Header`), badges included, so
// the compliance/partner strip no longer only shows up once at the very
// end of the letter.
function Footer({ whatsappBD, emailBD }: { whatsappBD: string; emailBD: string }) {
  return (
    <View style={styles.footer} fixed>
      <View style={styles.footerLogoRow}>
        {LOGO_FILES.map((logo) => (
          // @react-pdf/renderer's <Image>, not an HTML <img> — jsx-a11y's
          // alt-text rule doesn't know that and flags it as if it were one.
          // eslint-disable-next-line jsx-a11y/alt-text
          <Image
            key={logo.file}
            src={loadLogoSource(logo.file)}
            style={{ height: LOGO_HEIGHT, width: LOGO_HEIGHT * logo.ratio }}
          />
        ))}
      </View>
      <View style={styles.footerRule} />
      <Text style={styles.footerLine}>
        SahAIbat — sebuah brand dari Viantra Health · NIB: 1202260248509 · Terdaftar PSE Lingkup Privat Asing
        (Indonesia)
      </Text>
      <Text style={styles.footerLine2}>
        WhatsApp {whatsappBD || "[Nomor]"} · www.sahaibat.com · www.sahaibatdok.com · {emailBD || "[Email]"}
      </Text>
    </View>
  );
}

const DOK_ITEMS: [string, string, string][] = [
  ["01", "Mendengar", "Percakapan konsultasi dalam Bahasa Indonesia diubah menjadi catatan yang dapat ditinjau dokter."],
  ["02", "Membaca", "Lab, radiologi, EKG, USG, dan riwayat pasien dibaca bersama, bukan sebagai berkas terpisah."],
  ["03", "Menghitung", "Perhitungan klinis seperti eGFR, FIB-4, dan eAG menggunakan rumus yang dapat diaudit."],
  ["04", "Memeriksa", "Diagnosis, ICD-10, obat, Fornas, dan alur BPJS diperiksa terhadap informasi pasien yang tersedia."],
  ["05", "Mendampingi", "Dokter tetap mengambil keputusan akhir, dan tim SahAIbat membantu implementasi klinik secara langsung."],
];

const SECURITY_ITEMS = [
  "Data pasien diproses dan disimpan di Indonesia.",
  "SahAIbat terdaftar sebagai PSE Lingkup Privat Asing dengan NIB 1202260248509.",
  "DOK mendukung standar SATUSEHAT HL7 FHIR R4 serta alur kerja BPJS dan PCare.",
  "Kontrol akses berbasis peran, enkripsi, dan jejak audit membantu melindungi data pasien.",
  "DOK bekerja bersama sistem klinik yang sudah digunakan; migrasi RME tidak menjadi syarat untuk memulai.",
];

const BENEFIT_ITEMS = [
  "Akses khusus selama periode program;",
  "Onboarding dan konfigurasi alur kerja bersama tim SahAIbat;",
  "Pendampingan hingga konsultasi pertama berhasil dijalankan;",
  "Dukungan prioritas selama implementasi;",
  "Akses awal ke fitur tertentu; serta",
  "Keterlibatan langsung dalam memberikan masukan untuk pengembangan DOK.",
];

export function LetterDocument({ data }: { data: LetterData }) {
  const namaKlinik = data.namaKlinik || "[Nama Klinik atau Fasilitas Kesehatan]";
  const namaPenerima = data.namaPenerima?.trim();
  // Only meaningful once a recipient is actually named — no dangling
  // "Direktur" line above a blank name.
  const jabatanPenerima = namaPenerima ? data.jabatanPenerima?.trim() || "Direktur" : "";
  const namaBD = data.namaBD || "[Nama Business Development]";
  const whatsappBD = data.whatsappBD || "";
  const emailBD = data.emailBD || "";

  return (
    <Document title={`Permohonan Partisipasi Riset - ${namaKlinik}`} author="SahAIbat DOK">
      <Page size="A4" style={styles.page}>
        <Header />

        <View style={styles.refRow}>
          <View style={styles.refLeft}>
            <View style={styles.refRowLine}>
              <Text style={styles.refLabel}>Nomor</Text>
              <Text>: {data.nomorSurat || "[Nomor Surat]"}</Text>
            </View>
            <View style={styles.refRowLine}>
              <Text style={styles.refLabel}>Perihal</Text>
              <Text>: Permohonan Partisipasi Riset dan Validasi Sistem</Text>
            </View>
          </View>
          <Text style={styles.refRight}>Jakarta, {data.tanggal}</Text>
        </View>

        <Text style={styles.eyebrow}>SAHAIBAT DOK 2026</Text>
        <Text style={styles.title}>Permohonan Partisipasi Riset Sistem Kesehatan</Text>

        {/* Addressee block collapses to just "Kepada Yth. / [Klinik] / di
            tempat" when no personal recipient is given — the source docx
            never named an individual, only the clinic, so the extra two
            lines are additive, not required. */}
        <View style={styles.addressBlock}>
          <Text>Kepada Yth.</Text>
          {namaPenerima ? <Text style={styles.bold}>{namaPenerima}</Text> : null}
          {jabatanPenerima ? <Text>{jabatanPenerima}</Text> : null}
          <Text style={namaPenerima ? undefined : styles.bold}>{namaKlinik}</Text>
          <Text>di tempat</Text>
        </View>

        <Text style={styles.para}>Dengan hormat,</Text>

        <Text style={styles.para}>
          Perkenalkan, saya {namaBD} dari SahAIbat, sebuah perusahaan teknologi yang sedang melakukan riset dan
          pengembangan sistem informasi untuk membantu operasional dan administrasi layanan kesehatan, khususnya pada
          praktik mandiri dan klinik/FKTP.
        </Text>

        <Text style={styles.para}>
          Saat ini kami sedang melakukan validasi langsung dengan tenaga kesehatan dan pengelola klinik untuk
          memahami alur kerja, kebutuhan administrasi, serta kendala yang dihadapi dalam pengelolaan layanan dan data
          pasien. Kami ingin memastikan sistem yang kami kembangkan benar-benar sesuai dengan kebutuhan di lapangan.
        </Text>

        <Text style={styles.para}>
          Sehubungan dengan hal tersebut, kami mengundang <Text style={styles.bold}>{namaKlinik}</Text> untuk
          berkenan menjadi narasumber dalam sesi diskusi singkat selama kurang lebih 20–30 menit, dengan waktu yang
          sepenuhnya menyesuaikan ketersediaan pihak klinik.
        </Text>

        <Text style={styles.para}>Sesi akan terdiri dari:</Text>

        <View style={{ marginBottom: 6 }}>
          <Text style={styles.numberedLead}>1. Memahami alur kerja klinik | ±10–15 menit</Text>
          {[
            "Alur pasien mulai dari pendaftaran hingga selesai konsultasi;",
            "Proses penjadwalan dan pencatatan rekam medis;",
            "Sistem digital atau pencatatan manual yang saat ini digunakan; dan",
            "Kendala atau kebutuhan yang masih dirasakan dalam proses tersebut.",
          ].map((item) => (
            <View style={styles.bulletRow} key={item}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={{ marginBottom: 6 }}>
          <Text style={styles.numberedLead}>2. Demonstrasi singkat | ±5 menit</Text>
          <Text style={styles.para}>
            Kami akan memperlihatkan secara singkat sistem yang sedang kami kembangkan, terutama bagaimana sistem
            dapat membantu proses dokumentasi dan administrasi konsultasi.
          </Text>
        </View>

        <View style={{ marginBottom: 6 }}>
          <Text style={styles.numberedLead}>3. Tanggapan dari klinik | ±10–15 menit</Text>
          <Text style={styles.para}>
            Kami akan meminta masukan secara terbuka mengenai relevansi, kemudahan penggunaan, kekurangan, maupun
            hal-hal yang perlu diperbaiki. Tidak ada jawaban yang benar atau salah; kami justru sangat mengharapkan
            feedback yang jujur berdasarkan kondisi dan pengalaman klinik.
          </Text>
        </View>

        <View style={styles.signatureBlock} wrap={false}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image
            src={loadLogoSource(SIGNATURE_FILE)}
            style={{ height: SIGNATURE_HEIGHT, width: SIGNATURE_WIDTH, marginBottom: 2 }}
          />
          <Text style={styles.signatureName}>{namaBD}</Text>
          <Text>Business Development Manager</Text>
          <Text>WhatsApp {whatsappBD || "[Nomor]"}</Text>
          <Text>{emailBD || "[Email]"}</Text>
        </View>

        <Footer whatsappBD={whatsappBD} emailBD={emailBD} />
      </Page>

      <Page size="A4" style={styles.page}>
        <Header />

        <Text style={styles.pageTitle}>Profil Sahaibat</Text>
        <Text style={styles.para}>
          Perjalanan berawal dari pengembangan sistem untuk mendukung program kesehatan komunitas di Nusa Tenggara
          Timur (NTT), kemudian berkembang melalui kolaborasi dengan berbagai organisasi kesehatan dan sosial,
          termasuk <Text style={styles.bold}>PERDHAKI, YPPS, Yayasan Pijar Timur, dan Yayasan PAPHA</Text>. Pengalaman
          tersebut mencakup pendampingan proses pelayanan dan pemantauan kesehatan di berbagai lapisan, mulai dari
          komunitas dan Posyandu hingga fasilitas pelayanan kesehatan.
        </Text>
        <Text style={styles.para}>
          Dalam salah satu implementasinya, sistem SahAIbat telah digunakan untuk memantau lebih dari{" "}
          <Text style={styles.bold}>6.000 anak di NTT</Text>, membantu kader kesehatan melakukan screening, memantau
          pertumbuhan anak, serta mengidentifikasi kondisi yang membutuhkan tindak lanjut dan rujukan. Pengalaman ini
          kemudian berkembang ke berbagai kebutuhan pelayanan kesehatan, termasuk membantu bidan dalam memantau
          pelayanan kehamilan, mendampingi pasien dan keluarga melalui WhatsApp, serta mendukung dokter dan fasilitas
          kesehatan dalam mengelola informasi klinis. Berbagai pengalaman tersebut menjadi dasar bagi SahAIbat dalam
          memahami kebutuhan tenaga kesehatan dari tingkat komunitas hingga fasilitas klinis, yang kemudian
          diterapkan dalam pengembangan <Text style={styles.bold}>SahAIbat DOK</Text>.
        </Text>

        <Text style={styles.sectionHeading}>Cara DOK Membantu Dokter</Text>
        {DOK_ITEMS.map(([num, label, desc]) => (
          <View style={styles.dokItem} key={num}>
            <Text style={styles.dokNum}>{num}</Text>
            <Text style={{ flex: 1, textAlign: "justify" }}>
              <Text style={styles.dokLabel}>{label}  </Text>
              {desc}
            </Text>
          </View>
        ))}

        <Text style={styles.sectionHeading}>Keamanan dan Kesiapan Implementasi</Text>
        {SECURITY_ITEMS.map((item) => (
          <View style={styles.bulletRow} key={item}>
            <Text style={styles.bulletDot}>•</Text>
            <Text style={styles.bulletText}>{item}</Text>
          </View>
        ))}

        {/* Kept as one unbroken block — otherwise a stray bullet or the
            closing line ends up alone at the top of a near-empty page,
            which reads as a rendering glitch rather than a letter ending
            cleanly. If it doesn't fit under "Keamanan..." on this page, the
            whole section (heading through closing line) moves to the next
            page together instead of splitting mid-list. */}
        <View wrap={false}>
          <Text style={styles.sectionHeading}>Manfaat bagi klinik mitra</Text>
          <Text style={styles.para}>
            Klinik terpilih akan memperoleh manfaat khusus yang disesuaikan dengan kebutuhan dan bentuk partisipasi
            klinik. Tim SahAIbat akan menyusun kombinasi manfaat berikut berdasarkan hasil pembicaraan:
          </Text>
          {BENEFIT_ITEMS.map((item) => (
            <View style={styles.bulletRow} key={item}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>{item}</Text>
            </View>
          ))}

          <Text style={{ ...styles.para, marginTop: 6 }}>
            Sebagai mitra klinis, klinik diharapkan menggunakan DOK dalam konsultasi yang sesuai dan memberikan
            masukan.
          </Text>
        </View>

        <Footer whatsappBD={whatsappBD} emailBD={emailBD} />
      </Page>
    </Document>
  );
}
