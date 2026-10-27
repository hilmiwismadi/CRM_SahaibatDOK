"use client";

import { useEffect, useRef, useState } from "react";
import {
  applyTemplateVariables,
  defaultVariableValues,
  parseTemplateVariables,
  type TemplateVariable,
} from "@/lib/templateVariables";
import { normalizeClinicName } from "@/lib/normalizeClinicName";
import { useIsMobile } from "@/lib/useIsMobile";

interface Template {
  id: string;
  name: string;
  category: string;
  message: string;
}

export default function Composer({
  disabled,
  disabledReason,
  contactName,
  contactAddress,
  onSend,
}: {
  disabled: boolean;
  disabledReason?: string;
  /** Substituted into `[...like this, dari database]`-style placeholders. */
  contactName?: string | null;
  /** Lead address — lets the name normalizer drop a trailing area name. */
  contactAddress?: string | null;
  onSend: (body: string) => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  // Phones: Enter inserts a newline (on-screen keyboards have no Shift, and
  // reps write multi-line messages); sending is the Send button only. The
  // auto-grow cap is also lower so the thread stays visible above the
  // keyboard.
  const isMobile = useIsMobile();
  const maxAutoHeight = isMobile ? 160 : 320;

  // Auto-grow the textarea with its content (long templates like the pitch
  // used to sit behind a 2-row box you had to scroll inside). Capped so the
  // message thread above never gets squeezed out; beyond the cap it scrolls.
  // The box is also drag-resizable (bottom-right handle). Once the rep drags
  // it, auto-grow stops so it doesn't fight the size they picked.
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autoHeight = useRef<number | null>(null);
  const manualResize = useRef(false);
  useEffect(() => {
    const el = textareaRef.current;
    if (!el || manualResize.current) return;
    el.style.height = "auto";
    const next = Math.min(el.scrollHeight, maxAutoHeight);
    el.style.height = `${next}px`;
    autoHeight.current = next;
  }, [text, maxAutoHeight]);

  function detectManualResize() {
    const el = textareaRef.current;
    if (el && autoHeight.current !== null && Math.abs(el.offsetHeight - autoHeight.current) > 2) {
      manualResize.current = true;
    }
  }

  // Fill-in-the-blanks state for the currently-applied template. Adjusting
  // one of these regenerates `text` from the template + current values —
  // simple and predictable, at the cost of overwriting any manual edits
  // made to the textarea since the template was applied (the note under
  // the controls says so).
  const [activeTemplate, setActiveTemplate] = useState<Template | null>(null);
  const [variables, setVariables] = useState<TemplateVariable[]>([]);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/templates")
      .then((r) => r.json())
      .then((d) => setTemplates(d.templates ?? []))
      .catch(() => {});
  }, []);

  function applyTemplate(id: string) {
    const t = templates.find((tpl) => tpl.id === id);
    if (!t) return;
    // The listing name is cleaned up (Title Case, no area/tagline/titles) so
    // the greeting doesn't read like a bot copying a Google Maps title. The
    // field stays editable below in case the guess is off.
    const friendlyName = contactName ? normalizeClinicName(contactName, { address: contactAddress }) : null;
    const vars = parseTemplateVariables(t.message, friendlyName);
    const values = defaultVariableValues(vars, friendlyName);
    setActiveTemplate(t);
    setVariables(vars);
    setVariableValues(values);
    setText(applyTemplateVariables(t.message, values));
  }

  function updateVariable(raw: string, value: string) {
    const nextValues = { ...variableValues, [raw]: value };
    setVariableValues(nextValues);
    if (activeTemplate) setText(applyTemplateVariables(activeTemplate.message, nextValues));
  }

  // "auto" variables are shown too (prefilled with the normalized name) so
  // the rep can tweak it; when nothing resolved (e.g. an unlinked
  // conversation) the same input doubles as the manual fallback.
  const fillableVariables = variables;

  async function handleSend() {
    const body = text.trim();
    if (!body || sending || disabled) return;
    setSending(true);
    try {
      await onSend(body);
      setText("");
      setActiveTemplate(null);
      setVariables([]);
      setVariableValues({});
    } finally {
      setSending(false);
    }
  }

  return (
    // Phones: stays pinned under the thread (flex column) and clears the
    // home-indicator / gesture bar.
    <div className="shrink-0 border-t border-slate-100 bg-white p-3 max-md:px-2 max-md:pb-[calc(8px+env(safe-area-inset-bottom))] max-md:pt-2">
      {disabled && disabledReason && (
        // Brown — same color used on /map for confirmed "no WA contact"
        // leads, since this banner shows for the same underlying reason
        // (no phone number to send to).
        <div className="mb-2 rounded-md bg-[#8B4513]/10 px-3 py-1.5 text-xs text-[#8B4513]">{disabledReason}</div>
      )}
      {templates.length > 0 && (
        <div className="mb-2">
          <select
            defaultValue=""
            disabled={disabled}
            onChange={(e) => {
              applyTemplate(e.target.value);
              e.target.value = "";
            }}
            className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-500 outline-none transition focus:border-cyan-500 disabled:opacity-50 max-md:min-h-[40px] max-md:w-full max-md:bg-white"
          >
            <option value="" disabled>
              Use a template…
            </option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      )}
      {fillableVariables.length > 0 && (
        <div className="mb-2 flex flex-wrap items-end gap-2 rounded-lg border border-slate-100 bg-slate-50 p-2 max-md:max-h-[30dvh] max-md:overflow-y-auto">
          {fillableVariables.map((v) => (
            <div key={v.raw} className="flex flex-col gap-0.5 max-md:w-full max-md:min-w-0">
              <label className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{v.raw}</label>
              {v.kind === "choice" ? (
                <select
                  value={variableValues[v.raw] ?? ""}
                  onChange={(e) => updateVariable(v.raw, e.target.value)}
                  className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:border-cyan-500 max-md:min-h-[40px] max-md:w-full"
                >
                  {v.options!.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  value={variableValues[v.raw] ?? ""}
                  onChange={(e) => updateVariable(v.raw, e.target.value)}
                  placeholder={v.raw}
                  className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:border-cyan-500 max-md:min-h-[40px] max-md:w-full"
                />
              )}
            </div>
          ))}
          <span className="pb-1 text-[10px] text-slate-400">Adjusting a field regenerates the message below.</span>
        </div>
      )}
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          onMouseUp={detectManualResize}
          onTouchEnd={detectManualResize}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !isMobile) {
              e.preventDefault();
              handleSend();
            }
          }}
          disabled={disabled || sending}
          placeholder={
            disabled
              ? "Not available"
              : isMobile
                ? "Type a message…"
                : "Type a message… (Enter to send, Shift+Enter for new line)"
          }
          rows={2}
          className="min-h-[3.5rem] min-w-0 flex-1 resize-y overflow-y-auto rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-cyan-500 disabled:bg-slate-50 max-md:min-h-[44px] max-md:resize-none max-md:rounded-2xl"
        />
        <button
          onClick={handleSend}
          disabled={disabled || sending || !text.trim()}
          className="shrink-0 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 max-md:min-h-[44px] max-md:rounded-2xl"
        >
          {sending ? "Sending…" : "Send"}
        </button>
      </div>
    </div>
  );
}
