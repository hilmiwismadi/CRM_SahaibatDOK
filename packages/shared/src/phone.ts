/**
 * Shared phone-number normalization for matching scraped lead phone numbers
 * (e.g. "0812-3456-7890", "+62 812 3456 7890") against WhatsApp JIDs
 * (e.g. "6281234567890@s.whatsapp.net", "6281234567890:12@s.whatsapp.net").
 *
 * Both `leads.phone_normalized` and `wa_contacts.phone_normalized` must be
 * derived through these functions so the two tables can be joined reliably.
 */

const DEFAULT_COUNTRY_CODE = "62"; // Indonesia

/**
 * Normalizes a raw phone number string (as scraped, or manually entered)
 * into E.164 form, e.g. "+6281234567890". Returns null if the input has
 * too few digits to plausibly be a phone number.
 */
export function normalizePhoneNumber(
  raw: string | null | undefined,
  countryCode: string = DEFAULT_COUNTRY_CODE,
): string | null {
  if (!raw) return null;

  const digits = raw.replace(/\D/g, "");
  if (digits.length < 8) return null;

  let national: string;
  if (digits.startsWith("00" + countryCode)) {
    national = digits.slice(2 + countryCode.length);
  } else if (digits.startsWith(countryCode)) {
    national = digits.slice(countryCode.length);
  } else if (digits.startsWith("0")) {
    national = digits.slice(1);
  } else {
    // No recognizable prefix (e.g. "8123456789") — assume local number.
    national = digits;
  }

  if (national.length < 7) return null;

  return `+${countryCode}${national}`;
}

/**
 * Extracts and normalizes the phone number from a Baileys WhatsApp JID,
 * e.g. "6281234567890:12@s.whatsapp.net" -> "+6281234567890".
 * Returns null for non-user JIDs (e.g. group JIDs ending in "@g.us").
 */
export function jidToPhone(jid: string | null | undefined): string | null {
  if (!jid) return null;
  if (!jid.endsWith("@s.whatsapp.net")) return null;

  const withoutDomain = jid.split("@")[0];
  const withoutDevice = withoutDomain.split(":")[0];
  return normalizePhoneNumber(withoutDevice);
}

/** Builds a Baileys-compatible JID from a normalized E.164 phone number. */
export function phoneToJid(phoneNormalized: string): string {
  const digits = phoneNormalized.replace(/\D/g, "");
  return `${digits}@s.whatsapp.net`;
}
