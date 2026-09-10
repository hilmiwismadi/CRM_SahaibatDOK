"use client";

import { useEffect, useState } from "react";
import {
  applyTemplateVariables,
  defaultVariableValues,
  parseTemplateVariables,
  type TemplateVariable,
} from "@/lib/templateVariables";

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
  onSend,
}: {
  disabled: boolean;
  disabledReason?: string;
  /** Substituted into `[...like this, dari database]`-style placeholders. */
  contactName?: string | null;
  onSend: (body: string) => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);

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
    const vars = parseTemplateVariables(t.message, contactName ?? null);
    const values = defaultVariableValues(vars, contactName ?? null);
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

  // "auto" variables stay hidden only while they actually resolved to
  // something (contactName was available) — otherwise (e.g. an unlinked
  // conversation with no lead attached) surface a manual fallback input
  // instead of silently sending the placeholder text as-is or an empty gap.
  const fillableVariables = variables.filter((v) => v.kind !== "auto" || !variableValues[v.raw]);

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
    <div className="border-t border-slate-100 bg-white p-3">
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
            className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-500 outline-none transition focus:border-cyan-500 disabled:opacity-50"
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
        <div className="mb-2 flex flex-wrap items-end gap-2 rounded-lg border border-slate-100 bg-slate-50 p-2">
          {fillableVariables.map((v) => (
            <div key={v.raw} className="flex flex-col gap-0.5">
              <label className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{v.raw}</label>
              {v.kind === "choice" ? (
                <select
                  value={variableValues[v.raw] ?? ""}
                  onChange={(e) => updateVariable(v.raw, e.target.value)}
                  className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:border-cyan-500"
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
                  className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:border-cyan-500"
                />
              )}
            </div>
          ))}
          <span className="pb-1 text-[10px] text-slate-400">Adjusting a field regenerates the message below.</span>
        </div>
      )}
      <div className="flex items-end gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          disabled={disabled || sending}
          placeholder={disabled ? "Not available" : "Type a message… (Enter to send, Shift+Enter for new line)"}
          rows={2}
          className="flex-1 resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-cyan-500 disabled:bg-slate-50"
        />
        <button
          onClick={handleSend}
          disabled={disabled || sending || !text.trim()}
          className="shrink-0 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          {sending ? "Sending…" : "Send"}
        </button>
      </div>
    </div>
  );
}
