/**
 * Generic `[...]` placeholder parsing for message templates, used by the
 * chat Composer's template selector. Three kinds of placeholder, inferred
 * from how the bracket text is written — no separate schema field needed,
 * everything lives in the template's own message text:
 *
 * - `[Nama Klinik/Dokter dari database]` → "auto": silently filled from
 *   the active conversation's contact name (matched by a "dari database"/
 *   "nama klinik"/"nama dokter" hint in the bracket text).
 * - `[Pagi/Siang/Sore]` → "choice": any bracket containing "/" becomes a
 *   dropdown of the slash-separated options. A greeting-style option list
 *   (recognizes Pagi/Siang/Sore) gets a smart default based on the current
 *   time; otherwise the first option is the default.
 * - `[anything else]` → "text": a free-text input, defaults to empty.
 */

export interface TemplateVariable {
  raw: string; // exact bracket contents, used as the substitution key
  kind: "auto" | "choice" | "text";
  options?: string[];
}

const AUTO_FILL_HINTS = ["dari database", "nama klinik", "nama dokter", "nama kontak"];
const PLACEHOLDER_RE = /\[([^\]]+)\]/g;

export function parseTemplateVariables(message: string, contactName: string | null): TemplateVariable[] {
  const seen = new Set<string>();
  const variables: TemplateVariable[] = [];
  for (const match of message.matchAll(PLACEHOLDER_RE)) {
    const raw = match[1];
    if (seen.has(raw)) continue;
    seen.add(raw);

    const lower = raw.toLowerCase();
    if (AUTO_FILL_HINTS.some((h) => lower.includes(h))) {
      // Always classify as "auto" on the hint match alone, regardless of
      // whether contactName is currently available — e.g. an unlinked
      // WhatsApp conversation with no lead attached. Otherwise this would
      // fall through to the "/" check below and get misparsed as a choice
      // dropdown (since "Nama Klinik/Dokter dari database" itself contains
      // a slash). The Composer decides whether to show a manual fallback
      // input for this variable based on whether the resolved value ended
      // up empty (see defaultVariableValues / Composer's fillable filter).
      variables.push({ raw, kind: "auto" });
    } else if (raw.includes("/")) {
      variables.push({ raw, kind: "choice", options: raw.split("/").map((s) => s.trim()) });
    } else {
      variables.push({ raw, kind: "text" });
    }
  }
  return variables;
}

export function defaultVariableValues(
  variables: TemplateVariable[],
  contactName: string | null,
): Record<string, string> {
  const values: Record<string, string> = {};
  for (const v of variables) {
    if (v.kind === "auto") values[v.raw] = contactName ?? "";
    else if (v.kind === "choice") values[v.raw] = smartDefaultChoice(v.options!);
    else values[v.raw] = "";
  }
  return values;
}

function smartDefaultChoice(options: string[]): string {
  const lower = options.map((o) => o.toLowerCase());
  const hasGreeting = ["pagi", "siang", "sore", "malam"].some((g) => lower.includes(g));
  if (hasGreeting) {
    const hour = new Date().getHours();
    const pick = hour < 11 ? "pagi" : hour < 15 ? "siang" : hour < 19 ? "sore" : "malam";
    const idx = lower.indexOf(pick);
    if (idx !== -1) return options[idx];
  }
  return options[0];
}

export function applyTemplateVariables(message: string, values: Record<string, string>): string {
  return message.replace(PLACEHOLDER_RE, (full, raw: string) => {
    const value = values[raw];
    return value ? value : full;
  });
}
