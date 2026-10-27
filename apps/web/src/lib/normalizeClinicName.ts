/**
 * Turns a raw Google-Maps listing name into something a human would type in a
 * WhatsApp greeting. Sending the listing name verbatim ("KLINIK NURUS SYIFA
 * BANGSALSARI - JEMBER") reads like a bot, so this:
 *
 *  1. cuts taglines / area suffixes after a separator (" - ", " | ", ",", "(")
 *  2. drops trailing words that are just the place the clinic sits in (matched
 *     against the lead's own address, so "BANGSALSARI" goes but "Sentosa" in
 *     "Klinik Utama Sentosa" stays unless the address says so AND enough of the
 *     name remains)
 *  3. strips academic / specialist titles after a doctor's name
 *     ("dr Cahyawati A Sp.OG MMRS" -> "dr Cahyawati")
 *  4. fixes ALL-CAPS into Title Case (mixed-case input keeps its casing)
 *
 * Pure function, no imports — safe in client components. The result is only a
 * *suggestion*: the Composer shows it in an editable field.
 */

const GENERIC_WORDS = new Set([
  "klinik",
  "pratama",
  "utama",
  "praktek",
  "praktik",
  "dokter",
  "apotek",
  "rs",
  "rsu",
  "rsia",
  "rumah",
  "sakit",
  "puskesmas",
  "dr",
  "drg",
  "bidan",
  "laboratorium",
  "lab",
]);

// Kept upper-case when title-casing ("RSU", "UPT", "PT"...).
const ACRONYMS = new Set([
  "rs", "rsu", "rsud", "rsia", "rskia", "rsi", "rsgm", "pt", "cv", "ud", "upt", "uptd", "bkia", "kia", "bpjs", "tni",
  "polri", "ugd", "igd", "usg", "ii", "iii", "iv", "bp", "kb", "pmi", "nu", "dki", "diy",
]);

// Lower-case in the middle of a name when title-casing.
const SMALL_WORDS = new Set(["dan", "di", "ke", "yang", "untuk", "dengan"]);

const DOCTOR_PREFIX = /^(dr|drg|dra|prof)\.?$/i;

// Specialist suffixes that follow "Sp." — explicit list so a real name that
// merely starts with "Sp" is never mistaken for a title.
const SP_CODES =
  "a|an|b|bm|bp|bs|d|em|jp|kfr|kg|kj|m|mk|n|og|ot|p|pa|pd|pk|pm|pp|pr|prd|rad|s|t|tht|u|v|k|kk|gk|gm|ort|perio|pros|ko|bmm|kga|kgm|op|rkg|ortho";
const SP_RE = new RegExp(`^sp\\.?(${SP_CODES})?(\\(k\\))?\\.?,?$`, "i");
const SP_COMBINED_RE = new RegExp(`^sp\\.?(${SP_CODES})(\\.|\\(k\\))?.*$`, "i");

// Degrees / certifications that trail a name.
const DEGREE_RE =
  /^(s\.?ked|s\.?kg|s\.?km|s\.?kep|s\.?h|s\.?e|s\.?t|s\.?psi|s\.?farm|m\.?kes|m\.?kg|m\.?m|m\.?mr|mmrs|mmr|mars|mph|m\.?sc|m\.?h|m\.?kom|m\.?biomed|m\.?si|ph\.?d|fics|fias|finacs|facs|fisqua|fiscs|fmas|ficog|fk|fkp|dipl|dip|cht|c\.?ht|cmc|cpc|cpm|cmhp|mha|mba|msi|mkm|mkes|mscph|ners|amd|a\.?md|akbid|st|se|sh|mm|mt|msc|mhkes|mkk|mpd|mpdi|pgd)\.?,?$/i;

const SEPARATOR_RE = /\s+[-–—|:@/]\s+|\s*[|,(]\s*|\s+[-–—]\s*$/;

// Words that begin a tagline / branch description, cut from here on.
const CUT_WORDS = new Set(["cabang", "unit", "24", "buka", "melayani"]);

const NON_ALNUM = /[^a-z0-9]+/g;

function tokensOf(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(NON_ALNUM)
      .filter((t) => t.length >= 3),
  );
}

function bare(word: string): string {
  return word.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isAllCaps(text: string): boolean {
  const letters = text.replace(/[^A-Za-z]/g, "");
  if (letters.length < 3) return false;
  const upper = letters.replace(/[^A-Z]/g, "").length;
  return upper / letters.length > 0.7;
}

function titleCaseWord(word: string, index: number): string {
  const lower = word.toLowerCase();
  const key = bare(word);
  if (DOCTOR_PREFIX.test(lower)) return lower; // "dr", "drg."
  if (ACRONYMS.has(key)) return word.toUpperCase();
  if (index > 0 && SMALL_WORDS.has(key)) return lower;
  // Capitalize after a hyphen / slash / dot-initial too: "ibu-anak" -> "Ibu-Anak".
  return lower.replace(/(^|[-/.])([a-z])/g, (_, pre: string, ch: string) => pre + ch.toUpperCase());
}

function titleCase(text: string): string {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map(titleCaseWord)
    .join(" ");
}

// Without a "dr" prefix only unmistakable titles count ("Sp.A", "SpOG"), so a
// business called "Spa Cantik" or "Klinik ST" is left alone.
const STRICT_TITLE_RE = /^(sp\.[a-z]|sp[A-Z]{1,3}|[a-z]\.[a-z]{1,4}\.?$)/;

function isTitleToken(word: string, hasDoctor: boolean): boolean {
  const w = word.replace(/,$/, "");
  if (hasDoctor) return SP_RE.test(w) || SP_COMBINED_RE.test(w) || DEGREE_RE.test(w);
  return STRICT_TITLE_RE.test(w) && (SP_RE.test(w) || SP_COMBINED_RE.test(w) || DEGREE_RE.test(w));
}

/** Cut everything from the first academic/specialist title (and stray initials) onward. */
function stripPersonTitles(words: string[]): string[] {
  const doctorAt = words.findIndex((w) => DOCTOR_PREFIX.test(w));
  const out: string[] = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (isTitleToken(w, doctorAt !== -1)) break;
    // A lone letter after the doctor's name is a middle initial ("Cahyawati A").
    // Only treat it so once the name has begun, to keep things like "Klinik A".
    if (doctorAt !== -1 && i > doctorAt + 1 && /^[A-Za-z]\.?,?$/.test(w)) break;
    out.push(w.replace(/,$/, ""));
  }
  // Trailing comma-glued titles ("Cahyawati,") already stripped above.
  return out.length ? out : words;
}

function isGenericOnly(words: string[]): boolean {
  return words.every((w) => GENERIC_WORDS.has(bare(w)) || DOCTOR_PREFIX.test(w));
}

export interface NormalizeOptions {
  /** The lead's address — used to recognise trailing place names to drop. */
  address?: string | null;
}

export function normalizeClinicName(raw: string | null | undefined, opts: NormalizeOptions = {}): string {
  if (!raw) return "";
  let name = raw.replace(/\s+/g, " ").trim();
  if (!name) return "";

  const wasAllCaps = isAllCaps(name);

  // 1) First segment before a separator / tagline.
  const first = name.split(SEPARATOR_RE)[0]?.trim();
  if (first && first.length >= 3) name = first;

  let words = name.split(" ").filter(Boolean);

  // Cut at "Cabang ..." / "24 Jam" style tails (keep at least 2 words).
  const cutAt = words.findIndex((w, i) => i >= 2 && CUT_WORDS.has(bare(w)));
  if (cutAt !== -1) words = words.slice(0, cutAt);

  // 2) Doctor titles.
  words = stripPersonTitles(words);

  // 3) Trailing place names, judged against the lead's address.
  if (opts.address) {
    const place = tokensOf(opts.address);
    while (words.length > 2) {
      const last = bare(words[words.length - 1]);
      if (last.length < 3 || !place.has(last) || GENERIC_WORDS.has(last)) break;
      const rest = words.slice(0, -1);
      if (isGenericOnly(rest)) break; // would leave only "Klinik Utama"
      words = rest;
    }
  }

  const cleaned = words.join(" ").replace(/[\s.,;:-]+$/, "");
  if (!cleaned) return raw.trim();

  // 4) Casing: only rewrite when the source was shouting; otherwise trust it,
  //    but still lower-case a doctor prefix ("DR" -> "dr").
  if (wasAllCaps) return titleCase(cleaned);
  return cleaned
    .split(" ")
    .map((w) => (/^(DR|DRG|DRA)\.?$/.test(w) ? w.toLowerCase() : w))
    .join(" ");
}
