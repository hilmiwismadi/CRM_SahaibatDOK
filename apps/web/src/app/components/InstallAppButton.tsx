"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * "Pasang di HP" button (sidebar drawer). Registers the service worker, and:
 *  - Android / desktop Chrome: triggers the native install prompt.
 *  - iPhone / iPad Safari (no install API): shows the Share -> "Add to Home Screen" steps.
 * Hidden once the app already runs installed (display-mode: standalone).
 */
export default function InstallAppButton({ locale }: { locale: "id" | "en" }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [standalone, setStandalone] = useState(true); // hidden until we know
  const [isIos, setIsIos] = useState(false);
  const [help, setHelp] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    const nav = navigator as Navigator & { standalone?: boolean };
    setStandalone(window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true);
    setIsIos(
      /iphone|ipad|ipod/i.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1),
    );
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setStandalone(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (standalone) return null;

  const id = locale === "id";
  async function install() {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice.catch(() => null);
      setDeferred(null);
    } else {
      setHelp(true);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={install}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "9px 12px",
          borderRadius: 8,
          background: "rgba(8,145,178,0.18)",
          border: "none",
          cursor: "pointer",
          color: "#67e8f9",
          marginBottom: 4,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
          <path d="M12 4v11M7 11l5 5 5-5M5 20h14" stroke="#67e8f9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span style={{ fontSize: 12.5, fontWeight: 600 }}>{id ? "Pasang di HP" : "Install app"}</span>
      </button>

      {help && (
        <div
          onClick={() => setHelp(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 300,
            background: "rgba(2,6,23,0.6)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 420,
              background: "#fff",
              color: "#0f172a",
              borderRadius: "16px 16px 0 0",
              padding: "18px 20px calc(20px + env(safe-area-inset-bottom))",
              fontSize: 14,
              lineHeight: 1.5,
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
              {id ? "Pasang di layar utama" : "Add to Home Screen"}
            </div>
            {isIos ? (
              <ol style={{ paddingLeft: 20, margin: 0 }}>
                <li>{id ? "Buka halaman ini di Safari (bukan di dalam app lain)." : "Open this page in Safari."}</li>
                <li>
                  {id
                    ? "Ketuk tombol Bagikan (kotak dengan panah ke atas) di bar bawah."
                    : "Tap the Share button (square with an arrow)."}
                </li>
                <li>
                  {id ? "Pilih “Tambah ke Layar Utama”, lalu “Tambah”." : "Choose “Add to Home Screen”, then “Add”."}
                </li>
              </ol>
            ) : (
              <ol style={{ paddingLeft: 20, margin: 0 }}>
                <li>{id ? "Ketuk menu ⋮ di pojok kanan atas browser." : "Tap the ⋮ browser menu."}</li>
                <li>
                  {id
                    ? "Pilih “Instal aplikasi” atau “Tambahkan ke layar utama”."
                    : "Choose “Install app” / “Add to Home screen”."}
                </li>
              </ol>
            )}
            <button
              type="button"
              onClick={() => setHelp(false)}
              style={{
                marginTop: 14,
                width: "100%",
                minHeight: 44,
                borderRadius: 10,
                border: "none",
                background: "#0891b2",
                color: "#fff",
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              {id ? "Mengerti" : "Got it"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
