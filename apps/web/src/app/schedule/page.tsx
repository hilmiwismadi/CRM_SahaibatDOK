"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AppSidebar from "@/app/components/AppSidebar";
import { useLanguage } from "@/lib/i18n/context";
import { formatDate } from "@/lib/i18n/locale";
import { AddModal, ItemModal, kindLabel } from "./Modals";
import {
  KIND_STYLE,
  addDays,
  buildItems,
  parseYmd,
  startOfWeek,
  ymd,
  type ScheduleItem,
  type ScheduleResponse,
} from "./utils";

type View = "month" | "week";

const HOUR_START = 6;
const HOUR_END = 22; // exclusive
const HOUR_PX = 48;
const MONTH_CHIPS = 3;

export default function SchedulePage() {
  const { locale, t } = useLanguage();
  const today = ymd(new Date());
  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState(today);
  const [selectedDay, setSelectedDay] = useState(today);
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [openItem, setOpenItem] = useState<ScheduleItem | null>(null);
  const [adding, setAdding] = useState(false);

  // Visible range: month view = 6 full weeks around the cursor's month,
  // week view = the cursor's week.
  const range = useMemo(() => {
    if (view === "week") {
      const start = startOfWeek(cursor);
      return { start, days: 7 };
    }
    const first = `${cursor.slice(0, 7)}-01`;
    return { start: startOfWeek(first), days: 42 };
  }, [view, cursor]);

  // Bumped after every edit so the effect below refetches.
  const [reloadTick, setReloadTick] = useState(0);
  const load = useCallback(() => setReloadTick((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    const from = parseYmd(range.start).toISOString();
    const to = parseYmd(addDays(range.start, range.days)).toISOString();
    fetch(`/api/schedule?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json() as Promise<ScheduleResponse>;
      })
      .then((data) => {
        if (cancelled) return;
        setItems(buildItems(data));
        setLoadError(false);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [range, reloadTick]);

  const byDay = useMemo(() => {
    const m = new Map<string, ScheduleItem[]>();
    for (const it of items) {
      const list = m.get(it.day);
      if (list) list.push(it);
      else m.set(it.day, [it]);
    }
    return m;
  }, [items]);

  const overdue = useMemo(
    () => items.filter((i) => i.kind === "followup" && i.day < today),
    [items, today],
  );

  const days = Array.from({ length: range.days }, (_, i) => addDays(range.start, i));

  function shift(dir: -1 | 1) {
    if (view === "week") {
      setCursor(addDays(cursor, dir * 7));
    } else {
      const d = parseYmd(cursor);
      d.setDate(1);
      d.setMonth(d.getMonth() + dir);
      setCursor(ymd(d));
    }
  }

  function goToday() {
    setCursor(today);
    setSelectedDay(today);
  }

  const title =
    view === "month"
      ? formatDate(parseYmd(cursor), locale, { month: "long", year: "numeric" })
      : `${formatDate(parseYmd(range.start), locale, { day: "numeric", month: "short" })} – ${formatDate(
          parseYmd(addDays(range.start, 6)),
          locale,
          { day: "numeric", month: "short", year: "numeric" },
        )}`;

  const weekdayNames = days.slice(0, 7).map((d) => formatDate(parseYmd(d), locale, { weekday: "short" }));
  const agenda = byDay.get(selectedDay) ?? [];

  return (
    <div className="flex h-screen bg-slate-50">
      <AppSidebar active="none" />
      <main className="flex min-w-0 flex-1 flex-col">
        {/* Phones (max-md:*): two rows — [title ........ Month|Week] then
            [Today ‹ › period-title]; "+ Add" moves to a floating button.
            Desktop keeps the original single wrapping row untouched. */}
        <header className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-6 py-3 max-md:gap-2 max-md:px-3 max-md:py-2">
          <div className="mr-2 max-md:order-1 max-md:min-w-0">
            <h1 className="text-lg font-semibold text-slate-900 max-md:text-base">{t.schedTitle}</h1>
            <p className="text-xs text-slate-400 max-md:hidden">{t.schedSubtitle}</p>
          </div>
          <div className="hidden basis-full max-md:order-3 max-md:block" aria-hidden />
          <button
            onClick={goToday}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 max-md:order-4 max-md:h-10"
          >
            {t.schedToday}
          </button>
          <div className="flex items-center max-md:order-4">
            <button onClick={() => shift(-1)} className="rounded-lg px-2.5 py-1.5 text-slate-600 hover:bg-slate-100 max-md:h-10 max-md:w-10 max-md:p-0 max-md:text-xl" aria-label="prev">
              ‹
            </button>
            <button onClick={() => shift(1)} className="rounded-lg px-2.5 py-1.5 text-slate-600 hover:bg-slate-100 max-md:h-10 max-md:w-10 max-md:p-0 max-md:text-xl" aria-label="next">
              ›
            </button>
          </div>
          <h2 className="min-w-[10rem] text-base font-semibold capitalize text-slate-800 max-md:order-4 max-md:min-w-0 max-md:flex-1 max-md:truncate max-md:text-right max-md:text-sm">
            {title}
          </h2>
          <div className="ml-auto flex items-center gap-3 max-md:order-2">
            <div className="flex overflow-hidden rounded-lg border border-slate-200 text-sm">
              {(["month", "week"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-3 py-1.5 font-medium max-md:h-10 ${view === v ? "bg-cyan-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
                >
                  {v === "month" ? t.schedMonth : t.schedWeek}
                </button>
              ))}
            </div>
            <button
              onClick={() => setAdding(true)}
              className="rounded-lg bg-cyan-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-cyan-700 max-md:hidden"
            >
              {t.schedAdd}
            </button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          <section className="flex min-w-0 flex-1 flex-col overflow-auto p-4 max-md:p-3 max-md:pb-[calc(6rem+env(safe-area-inset-bottom))]">
            {loadError && <p className="mb-2 text-sm text-red-600">{t.schedLoadFailed}</p>}
            {view === "month" ? (
              <MonthGrid
                days={days}
                cursorMonth={cursor.slice(0, 7)}
                today={today}
                selectedDay={selectedDay}
                byDay={byDay}
                weekdayNames={weekdayNames}
                onSelectDay={setSelectedDay}
                onOpen={setOpenItem}
              />
            ) : (
              <>
                <WeekGrid
                  days={days}
                  today={today}
                  selectedDay={selectedDay}
                  byDay={byDay}
                  weekdayNames={weekdayNames}
                  onSelectDay={setSelectedDay}
                  onOpen={setOpenItem}
                />
                <WeekListMobile
                  days={days}
                  today={today}
                  selectedDay={selectedDay}
                  byDay={byDay}
                  weekdayNames={weekdayNames}
                  onSelectDay={setSelectedDay}
                  onOpen={setOpenItem}
                />
              </>
            )}

            {/* Phones: the desktop side panel (lg+) is replaced by stacked
                sections under the calendar — selected-day agenda (month view
                only; the week list already shows every day) + overdue. */}
            <div className="mt-4 flex flex-col gap-5 md:hidden">
              {view === "month" && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-slate-900">
                    {t.schedAgenda} ·{" "}
                    <span className="font-normal capitalize text-slate-500">
                      {formatDate(parseYmd(selectedDay), locale, { weekday: "long", day: "numeric", month: "long" })}
                    </span>
                  </h3>
                  {agenda.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-slate-200 bg-white px-3 py-4 text-center text-sm text-slate-400">
                      {t.schedNoItems}
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {agenda.map((it) => (
                        <AgendaRow key={it.key} item={it} onOpen={setOpenItem} />
                      ))}
                    </ul>
                  )}
                </div>
              )}
              <div>
                <h3 className="mb-2 text-sm font-semibold text-red-700">
                  {t.schedOverdueTitle} {overdue.length > 0 && `(${overdue.length})`}
                </h3>
                {overdue.length === 0 ? (
                  <p className="text-sm text-slate-400">{t.schedOverdueNone}</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {overdue.map((it) => (
                      <AgendaRow key={it.key} item={it} showDate onOpen={setOpenItem} />
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>

          <aside className="hidden w-80 shrink-0 flex-col gap-5 overflow-y-auto border-l border-slate-200 bg-white p-4 lg:flex">
            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-900">
                {t.schedAgenda} ·{" "}
                <span className="font-normal capitalize text-slate-500">
                  {formatDate(parseYmd(selectedDay), locale, { weekday: "long", day: "numeric", month: "long" })}
                </span>
              </h3>
              {agenda.length === 0 ? (
                <p className="text-sm text-slate-400">{t.schedNoItems}</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {agenda.map((it) => (
                    <AgendaRow key={it.key} item={it} onOpen={setOpenItem} />
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-red-700">
                {t.schedOverdueTitle} {overdue.length > 0 && `(${overdue.length})`}
              </h3>
              {overdue.length === 0 ? (
                <p className="text-sm text-slate-400">{t.schedOverdueNone}</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {overdue.map((it) => (
                    <AgendaRow key={it.key} item={it} showDate onOpen={setOpenItem} />
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </div>
        {/* Phones: thumb-reachable "+ Add" (the header button is desktop-only). */}
        <button
          onClick={() => setAdding(true)}
          className="fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-40 flex h-14 items-center rounded-full bg-cyan-600 px-5 text-sm font-semibold text-white shadow-lg shadow-cyan-900/20 active:bg-cyan-700 md:hidden"
        >
          {t.schedAdd}
        </button>
      </main>

      {openItem && <ItemModal item={openItem} onClose={() => setOpenItem(null)} onChanged={load} />}
      {adding && <AddModal initialDay={selectedDay} onClose={() => setAdding(false)} onChanged={load} />}
    </div>
  );
}

function AgendaRow({
  item,
  showDate,
  onOpen,
}: {
  item: ScheduleItem;
  showDate?: boolean;
  onOpen: (i: ScheduleItem) => void;
}) {
  const { locale, t } = useLanguage();
  const style = KIND_STYLE[item.kind];
  const faded = item.status !== "scheduled";
  return (
    <li>
      <button
        onClick={() => onOpen(item)}
        className={`w-full rounded-lg border px-3 py-2 text-left transition hover:shadow-sm ${style.chip} ${faded ? "opacity-60" : ""}`}
      >
        <span className="flex items-center justify-between gap-2 text-xs font-semibold">
          <span>{kindLabel(t, item.kind)}</span>
          <span>
            {showDate && `${formatDate(parseYmd(item.day), locale, { day: "numeric", month: "short" })} · `}
            {item.time ?? t.schedNoTime}
          </span>
        </span>
        <span className={`mt-0.5 block break-words text-sm font-medium ${item.status === "cancelled" ? "line-through" : ""}`}>
          {item.leadName}
        </span>
        {item.note && <span className="mt-0.5 block truncate text-xs opacity-80">{item.note}</span>}
      </button>
    </li>
  );
}

interface GridProps {
  days: string[];
  today: string;
  selectedDay: string;
  byDay: Map<string, ScheduleItem[]>;
  weekdayNames: string[];
  onSelectDay: (d: string) => void;
  onOpen: (i: ScheduleItem) => void;
}

function MonthGrid({
  days,
  cursorMonth,
  today,
  selectedDay,
  byDay,
  weekdayNames,
  onSelectDay,
  onOpen,
}: GridProps & { cursorMonth: string }) {
  const { t } = useLanguage();
  return (
    // Phones: no fixed min height / flex-1 (the agenda stacks underneath),
    // and each cell shows the date + kind dots instead of event chips.
    <div className="flex min-h-[560px] flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white max-md:min-h-0 max-md:flex-none">
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-semibold uppercase text-slate-500 max-md:text-[11px]">
        {weekdayNames.map((n) => (
          <div key={n} className="py-2 max-md:py-1.5">
            {n}
          </div>
        ))}
      </div>
      <div className="grid flex-1 grid-cols-7 grid-rows-6">
        {days.map((d) => {
          const list = byDay.get(d) ?? [];
          const inMonth = d.startsWith(cursorMonth);
          const isToday = d === today;
          const isSelected = d === selectedDay;
          return (
            <div
              key={d}
              onClick={() => onSelectDay(d)}
              className={`min-w-0 cursor-pointer border-b border-r border-slate-100 p-1 max-md:flex max-md:min-h-[52px] max-md:flex-col max-md:items-center max-md:px-0.5 ${
                isSelected ? "bg-cyan-50/60" : inMonth ? "bg-white" : "bg-slate-50/70"
              }`}
            >
              <div className="mb-0.5 flex justify-end">
                <span
                  className={`flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-semibold max-md:h-7 max-md:min-w-7 max-md:text-[13px] ${
                    isToday ? "bg-cyan-600 text-white" : inMonth ? "text-slate-700" : "text-slate-300"
                  } ${isSelected && !isToday ? "max-md:ring-2 max-md:ring-cyan-500" : ""}`}
                >
                  {Number(d.slice(8))}
                </span>
              </div>
              {list.length > 0 && (
                <div className="flex items-center justify-center gap-0.5 md:hidden" aria-label={String(list.length)}>
                  {list.slice(0, 3).map((it) => (
                    <span
                      key={it.key}
                      className={`h-1.5 w-1.5 rounded-full ${KIND_STYLE[it.kind].dot} ${it.status !== "scheduled" ? "opacity-40" : ""}`}
                    />
                  ))}
                  {list.length > 3 && (
                    <span className="text-[9px] font-semibold leading-none text-slate-500">+{list.length - 3}</span>
                  )}
                </div>
              )}
              <div className="flex flex-col gap-0.5 max-md:hidden">
                {list.slice(0, MONTH_CHIPS).map((it) => (
                  <button
                    key={it.key}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectDay(d);
                      onOpen(it);
                    }}
                    title={`${it.time ?? ""} ${it.leadName}`.trim()}
                    className={`truncate rounded border px-1 py-0.5 text-left text-[11px] leading-tight ${KIND_STYLE[it.kind].chip} ${
                      it.status !== "scheduled" ? "opacity-50" : ""
                    } ${it.status === "cancelled" ? "line-through" : ""}`}
                  >
                    {it.time && <b className="mr-1">{it.time}</b>}
                    {it.leadName}
                  </button>
                ))}
                {list.length > MONTH_CHIPS && (
                  <span className="px-1 text-[11px] font-medium text-slate-500">
                    {t.schedMoreN(list.length - MONTH_CHIPS)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Phones' week view: a vertical agenda grouped by day (Mon..Sun of the
// cursor week), each day header tappable to select it for "+ Add".
function WeekListMobile({ days, today, selectedDay, byDay, weekdayNames, onSelectDay, onOpen }: GridProps) {
  const { locale, t } = useLanguage();
  return (
    <ol className="flex flex-col gap-3 md:hidden">
      {days.map((d, i) => {
        const list = byDay.get(d) ?? [];
        const isToday = d === today;
        const isSelected = d === selectedDay;
        return (
          <li
            key={d}
            className={`rounded-xl border bg-white p-2 ${isSelected ? "border-cyan-300 ring-1 ring-cyan-200" : "border-slate-200"}`}
          >
            <button
              type="button"
              onClick={() => onSelectDay(d)}
              className="flex min-h-11 w-full items-center gap-3 rounded-lg px-1 text-left"
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                  isToday ? "bg-cyan-600 text-white" : "bg-slate-100 text-slate-700"
                }`}
              >
                {Number(d.slice(8))}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold uppercase text-slate-500">{weekdayNames[i]}</span>
                <span className="block truncate text-sm capitalize text-slate-700">
                  {formatDate(parseYmd(d), locale, { day: "numeric", month: "long" })}
                </span>
              </span>
              {list.length > 0 && (
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                  {list.length}
                </span>
              )}
            </button>
            {list.length === 0 ? (
              <p className="px-1 pb-1 pt-0.5 text-xs text-slate-400">{t.schedNoItems}</p>
            ) : (
              <ul className="mt-1 flex flex-col gap-2">
                {list.map((it) => (
                  <AgendaRow key={it.key} item={it} onOpen={onOpen} />
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ol>
  );
}

// Greedy lane assignment so overlapping timed items sit side by side.
function layoutLanes(list: ScheduleItem[]): { item: ScheduleItem; lane: number; lanes: number }[] {
  const placed: { item: ScheduleItem; lane: number; end: number }[] = [];
  const out: { item: ScheduleItem; lane: number; lanes: number }[] = [];
  let cluster: typeof placed = [];
  const flush = () => {
    const lanes = Math.max(1, ...cluster.map((c) => c.lane + 1));
    for (const c of cluster) out.push({ item: c.item, lane: c.lane, lanes });
    cluster = [];
  };
  let clusterEnd = -Infinity;
  for (const item of list) {
    const start = item.startMs;
    const end = start + Math.max(item.durationMin, 30) * 60000;
    if (start >= clusterEnd) {
      flush();
      clusterEnd = -Infinity;
    }
    const used = new Set(cluster.filter((c) => c.end > start).map((c) => c.lane));
    let lane = 0;
    while (used.has(lane)) lane++;
    const p = { item, lane, end };
    cluster.push(p);
    placed.push(p);
    clusterEnd = Math.max(clusterEnd, end);
  }
  flush();
  return out;
}

function WeekGrid({ days, today, selectedDay, byDay, weekdayNames, onSelectDay, onOpen }: GridProps) {
  const { t } = useLanguage();
  const hours = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);
  const now = new Date();
  const nowTop = ((now.getHours() * 60 + now.getMinutes()) / 60 - HOUR_START) * HOUR_PX;

  return (
    // Desktop only — phones get WeekListMobile (a 7-column hour grid is
    // unreadable at ~45px per column).
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white max-md:hidden">
      {/* Day headers + summary strip: every item of the day (untimed
          follow-ups first, then timed demos/visits with their time), so the
          week reads at a glance without scrolling the hour grid. */}
      <div className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))] border-b border-slate-200 bg-slate-50">
        <div />
        {days.map((d, i) => {
          const dayItems = byDay.get(d) ?? [];
          return (
            <div
              key={d}
              onClick={() => onSelectDay(d)}
              className={`cursor-pointer border-l border-slate-200 px-1 py-1.5 ${d === selectedDay ? "bg-cyan-50/70" : ""}`}
            >
              <div className="text-center">
                <div className="text-[11px] font-semibold uppercase text-slate-500">{weekdayNames[i]}</div>
                <div
                  className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${
                    d === today ? "bg-cyan-600 text-white" : "text-slate-700"
                  }`}
                >
                  {Number(d.slice(8))}
                </div>
              </div>
              <div className="mt-1 flex flex-col gap-0.5">
                {dayItems.map((it) => (
                  <button
                    key={it.key}
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpen(it);
                    }}
                    title={`${it.time ?? t.schedNoTime} · ${kindLabel(t, it.kind)} · ${it.leadName}`}
                    className={`truncate rounded border px-1 py-0.5 text-left text-[11px] leading-tight ${KIND_STYLE[it.kind].chip} ${
                      it.status !== "scheduled" ? "opacity-50" : ""
                    } ${it.status === "cancelled" ? "line-through" : ""}`}
                  >
                    {it.time && <b className="mr-1">{it.time}</b>}
                    {it.leadName}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))]" style={{ height: hours.length * HOUR_PX }}>
          <div className="relative">
            {hours.map((h) => (
              <div
                key={h}
                className="absolute right-1 -translate-y-1/2 text-[11px] text-slate-400"
                style={{ top: (h - HOUR_START) * HOUR_PX }}
              >
                {h > HOUR_START ? `${String(h).padStart(2, "0")}:00` : ""}
              </div>
            ))}
          </div>
          {days.map((d) => {
            const timed = (byDay.get(d) ?? []).filter((x) => x.time);
            return (
              <div key={d} className="relative border-l border-slate-200" onClick={() => onSelectDay(d)}>
                {hours.map((h) => (
                  <div
                    key={h}
                    className="absolute inset-x-0 border-t border-slate-100"
                    style={{ top: (h - HOUR_START) * HOUR_PX }}
                  />
                ))}
                {d === today && nowTop >= 0 && nowTop <= hours.length * HOUR_PX && (
                  <div className="absolute inset-x-0 z-10 border-t-2 border-red-500" style={{ top: nowTop }} />
                )}
                {layoutLanes(timed).map(({ item, lane, lanes }) => {
                  const [hh, mm] = item.time!.split(":").map(Number);
                  const rawTop = ((hh * 60 + mm) / 60 - HOUR_START) * HOUR_PX;
                  const top = Math.min(Math.max(rawTop, 0), hours.length * HOUR_PX - 22);
                  const height = Math.max((item.durationMin / 60) * HOUR_PX, 22);
                  return (
                    <button
                      key={item.key}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectDay(d);
                        onOpen(item);
                      }}
                      title={`${item.time} ${kindLabel(t, item.kind)} · ${item.leadName}`}
                      className={`absolute z-[5] overflow-hidden rounded border-l-4 px-1 py-0.5 text-left text-[11px] leading-tight ${
                        KIND_STYLE[item.kind].block
                      } ${item.status !== "scheduled" ? "opacity-50" : ""} ${item.status === "cancelled" ? "line-through" : ""}`}
                      style={{
                        top,
                        height,
                        left: `${(lane / lanes) * 100}%`,
                        width: `calc(${100 / lanes}% - 2px)`,
                      }}
                    >
                      <b>{item.time}</b> {item.leadName}
                      <span className="block opacity-70">
                        {kindLabel(t, item.kind)}
                        {item.kind !== "followup" && ` · ${t.schedMinutes(item.durationMin)}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
