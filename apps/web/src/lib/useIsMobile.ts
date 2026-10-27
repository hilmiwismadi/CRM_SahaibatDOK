"use client";

import { useEffect, useState } from "react";

/** Phone breakpoint — must match the `max-width: 767px` block in app/globals.css. */
export const MOBILE_QUERY = "(max-width: 767px)";

/**
 * True on phones. Starts false (so SSR and the first client render agree),
 * then syncs after mount. Prefer Tailwind `md:` classes for pure styling and
 * use this only when the *structure* differs (e.g. master/detail navigation).
 */
export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const sync = () => setMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return mobile;
}
