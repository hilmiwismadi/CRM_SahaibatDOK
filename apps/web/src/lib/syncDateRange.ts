// Turns a "YYYY-MM-DD" date param (meant as a WIB/Asia-Jakarta calendar
// day — that's the day the rep actually experiences, not the server's UTC
// day) into the UTC instant range that covers it. Used by /api/sync/* so
// "today" in the UI matches "today" on the rep's phone, not the VPS clock.
export function wibDayRange(dateStr: string): { start: Date; end: Date } {
  const start = new Date(`${dateStr}T00:00:00+07:00`);
  const end = new Date(`${dateStr}T23:59:59.999+07:00`);
  return { start, end };
}

// Today's date as a "YYYY-MM-DD" string in WIB, for the default date param.
export function todayWib(): string {
  const now = new Date();
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return wib.toISOString().slice(0, 10);
}
