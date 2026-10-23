"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import BackButton from "@/app/components/BackButton";
import MenuOverlay from "@/app/components/MenuOverlay";
import PageHeading from "@/app/components/PageHeading";
import PremiumFeaturePrompt from "@/app/components/PremiumFeaturePrompt";
import { supabaseBrowser } from "@/lib/supabase/supabaseBrowser";

type CalendarBatch = {
  id: string;
  name: string | null;
  startdato: string;
  finished_date: string | null;
  status: string;
  aktivt_kar: string | null;
};

type CalendarReminder = {
  id: string;
  batch_id: string;
  type: "manual" | "sg_check";
  message: string;
  remind_at: string;
  batch_name: string;
  kar_id: string | null;
};

type CalendarEvent = {
  id: string;
  date: string;
  title: string;
  kind: "start" | "finish" | "reminder";
  href: string;
  detail?: string;
  timestamp?: string;
};

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function shiftDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function mondayOfWeek(date: Date) {
  return shiftDays(date, -((date.getDay() + 6) % 7));
}

function monthGridRange(month: Date) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const gridStart = shiftDays(firstDay, -firstDay.getDay());
  const afterLastDay = new Date(month.getFullYear(), month.getMonth() + 1, 1);
  const gridEnd = shiftDays(afterLastDay, (7 - afterLastDay.getDay()) % 7);
  return { from: dateKey(gridStart), to: dateKey(gridEnd) };
}

function reminderDateKey(value: string) {
  return dateKey(new Date(value));
}

export default function CalendarPage() {
  const router = useRouter();
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [batches, setBatches] = useState<CalendarBatch[]>([]);
  const [reminders, setReminders] = useState<CalendarReminder[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [premiumRequired, setPremiumRequired] = useState(false);
  const [isNarrow, setIsNarrow] = useState(false);
  const [viewOverride, setViewOverride] = useState<"agenda" | "month" | null>(null);
  const [agendaStart, setAgendaStart] = useState(() => dateKey(mondayOfWeek(new Date())));
  const [retry, setRetry] = useState(0);
  const view = isNarrow ? "agenda" : viewOverride ?? "month";
  const agendaDays = useMemo(() => {
    const start = new Date(`${agendaStart}T12:00:00`);
    return Array.from({ length: 7 }, (_, index) => shiftDays(start, index));
  }, [agendaStart]);
  const { from, to } = view === "agenda"
    ? { from: agendaStart, to: dateKey(shiftDays(agendaDays[0], 7)) }
    : monthGridRange(month);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 639px)");
    const update = () => setIsNarrow(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const loadCalendar = useCallback(async (signal: AbortSignal) => {
    const {
      data: { session },
      error: sessionError,
    } = await supabaseBrowser.auth.getSession();
    if (signal.aborted) return;
    if (sessionError) throw sessionError;
    if (!session) {
      router.replace("/auth/login");
      return;
    }

    // Include adjacent UTC dates so reminders near local midnight are not missed.
    const fetchFrom = dateKey(shiftDays(new Date(`${from}T12:00:00`), -1));
    const fetchTo = dateKey(shiftDays(new Date(`${to}T12:00:00`), 1));
    const response = await fetch(
      `/api/calendar?from=${encodeURIComponent(fetchFrom)}&to=${encodeURIComponent(fetchTo)}`,
      { cache: "no-store", credentials: "include", signal }
    );
    const result: {
      batches?: CalendarBatch[];
      reminders?: CalendarReminder[];
      error?: string;
    } = await response.json();
    if (signal.aborted) return;
    if (response.status === 403) {
      setPremiumRequired(true);
      return;
    }
    if (!response.ok) throw new Error(result.error || "Could not load calendar");
    setPremiumRequired(false);
    setBatches(result.batches ?? []);
    setReminders(result.reminders ?? []);
  }, [from, to, router]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    loadCalendar(controller.signal)
      .catch((loadError) => {
        if (controller.signal.aborted) return;
        console.error("Could not load brewing calendar", loadError);
        setError("Calendar events could not be loaded. Please try again.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => {
      controller.abort();
    };
  }, [loadCalendar, retry]);

  const days = useMemo(() => {
    const first = new Date(`${from}T12:00:00`);
    const last = new Date(`${to}T12:00:00`);
    const result: Date[] = [];
    for (let day = first; day < last; day = shiftDays(day, 1)) result.push(day);
    return result;
  }, [from, to]);

  const events = useMemo<CalendarEvent[]>(() => {
    const batchEvents = batches.flatMap((batch) => {
      const href = batch.aktivt_kar ? `/kar/${batch.aktivt_kar}` : "/batch-history";
      const name = batch.name || "Untitled batch";
      const result: CalendarEvent[] = [];
      if (batch.startdato >= from && batch.startdato < to) {
        result.push({
          id: `${batch.id}:start`,
          date: batch.startdato.slice(0, 10),
          title: `${name} started`,
          kind: "start",
          href,
        });
      }
      if (batch.finished_date && batch.finished_date >= from && batch.finished_date < to) {
        result.push({
          id: `${batch.id}:finish`,
          date: batch.finished_date.slice(0, 10),
          title: `${name} finished`,
          kind: "finish",
          href,
        });
      }
      return result;
    });

    const reminderEvents = reminders.map((reminder) => ({
      id: `reminder:${reminder.id}`,
      date: reminderDateKey(reminder.remind_at),
      title: reminder.message,
      kind: "reminder" as const,
      href: reminder.kar_id
        ? `/kar/${reminder.kar_id}#batch-reminders-content`
        : `/batch-history?batchId=${encodeURIComponent(reminder.batch_id)}`,
      detail: `${reminder.batch_name} · ${new Date(reminder.remind_at).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      })}`,
      timestamp: reminder.remind_at,
    }));
    return [...batchEvents, ...reminderEvents]
      .filter(event => event.date >= from && event.date < to)
      .sort((left, right) => left.date.localeCompare(right.date) ||
        (left.timestamp ?? "").localeCompare(right.timestamp ?? "") ||
        left.title.localeCompare(right.title));
  }, [batches, reminders, from, to]);

  const eventsByDate = useMemo(() => {
    const grouped = new Map<string, CalendarEvent[]>();
    for (const event of events) grouped.set(event.date, [...(grouped.get(event.date) ?? []), event]);
    return grouped;
  }, [events]);

  const selectedEvents = eventsByDate.get(selectedDate) ?? [];
  const today = dateKey(new Date());

  function changeMonth(offset: number) {
    const nextMonth = new Date(month.getFullYear(), month.getMonth() + offset, 1);
    setMonth(nextMonth);
    setSelectedDate(dateKey(nextMonth));
  }

  function changePeriod(offset: number) {
    if (view === "month") changeMonth(offset);
    else setAgendaStart(dateKey(shiftDays(new Date(`${agendaStart}T12:00:00`), offset * 7)));
  }

  return (
    <main className="min-h-screen px-2 py-10 text-white sm:px-6">
      <div className="relative mx-auto w-full max-w-6xl rounded-xl border border-white/10 bg-black/60 p-2 pt-16 backdrop-blur-md sm:p-8 sm:pt-16">
        <div className="absolute left-4 top-3 z-20">
          <BackButton />
        </div>
        <div className="absolute right-4 top-3 z-20">
          <MenuOverlay current="calendar" />
        </div>
        <PageHeading
          title="Brew calendar"
          subtitle="See batch milestones and scheduled reminders in one place."
        />
        {!premiumRequired && !loading && !error && (
          <div className="mb-5 text-center">
            <a
              href="/api/calendar/export"
              download="batchlogg-calendar.ics"
              className="text-sm font-semibold text-green-200 underline"
            >
              Export calendar for external apps (.ics)
            </a>
          </div>
        )}

        <section aria-label="Calendar" className="mt-8">
          <div role="group" aria-label="Calendar view" className="mb-4 flex flex-wrap justify-center gap-2">
            {(["agenda", "month"] as const).filter(option => option === "agenda" || !isNarrow).map(option => (
              <button
                key={option}
                type="button"
                aria-pressed={view === option}
                onClick={() => setViewOverride(option)}
                className={`min-h-11 rounded-lg border px-4 py-2 text-sm ${
                  view === option ? "border-green-400 bg-green-700" : "border-white/20 bg-white/5 hover:bg-white/10"
                }`}
              >
                {option === "agenda" ? "Agenda" : "Month"}
              </button>
            ))}
          </div>
          <div className="mb-4 flex flex-wrap items-center justify-center gap-3">
            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => changePeriod(-1)}
                aria-label={view === "agenda" ? "Previous week" : "Previous month"}
                className="min-h-11 min-w-11 rounded-lg border border-white/20 bg-white/10 px-3 py-2 hover:bg-white/20"
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => {
                  const current = new Date();
                  setMonth(new Date(current.getFullYear(), current.getMonth(), 1));
                  setSelectedDate(dateKey(current));
                  setAgendaStart(dateKey(mondayOfWeek(current)));
                }}
                className="min-h-11 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm hover:bg-white/20"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => changePeriod(1)}
                aria-label={view === "agenda" ? "Next week" : "Next month"}
                className="min-h-11 min-w-11 rounded-lg border border-white/20 bg-white/10 px-3 py-2 hover:bg-white/20"
              >
                →
              </button>
            </div>
            <h2 aria-live="polite" className="w-full break-words text-center text-sm font-semibold text-green-300 sm:w-auto sm:text-xl">
              {view === "agenda"
                ? `${agendaDays[0].toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} – ${agendaDays[6].toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`
                : month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
            </h2>
          </div>

          {premiumRequired ? (
            <PremiumFeaturePrompt
              feature="The brew calendar"
              description="Keep your brewing schedule in one place and plan around upcoming fermentation and finishing dates."
              benefits={[
                "See batch start and finish dates alongside scheduled brew reminders.",
                "Switch between a monthly calendar and a weekly agenda.",
                "Export your schedule to calendar apps with an iCalendar (.ics) file.",
              ]}
            />
          ) : error ? (
            <div role="alert" className="mb-4 rounded-lg border border-red-500/40 bg-red-950/40 p-4 text-center">
              <p>{error}</p>
              <button type="button" onClick={() => setRetry(value => value + 1)} className="mt-2 min-h-11 underline">
                Try again
              </button>
            </div>
          ) : null}

          {!premiumRequired && loading ? (
            <p role="status" className="py-6 text-center text-sm text-white/60">Loading calendar…</p>
          ) : !premiumRequired && !error && view === "agenda" ? (
            <section aria-label="Weekly agenda" className="space-y-3">
              {agendaDays.map(day => {
                const key = dateKey(day);
                const dayEvents = eventsByDate.get(key) ?? [];
                return (
                  <section key={key} aria-labelledby={`agenda-${key}`} className={`rounded-lg border p-4 ${key === today ? "border-green-400/40 bg-green-400/5" : "border-white/10 bg-white/5"}`}>
                    <h3 id={`agenda-${key}`} className="font-semibold text-green-200">
                      {key === today ? "Today · " : ""}
                      <time dateTime={key}>{day.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}</time>
                    </h3>
                    {dayEvents.length === 0 ? (
                      <p className="mt-2 text-sm text-white/50">Nothing scheduled.</p>
                    ) : (
                      <ul className="mt-3 space-y-2">
                        {dayEvents.map(event => (
                          <li key={event.id}>
                            <Link href={event.href} className="block min-h-11 rounded-lg border border-white/10 bg-black/20 p-3 hover:bg-white/10">
                              <span className={`block text-xs font-medium ${event.kind === "reminder" ? "text-amber-200" : event.kind === "finish" ? "text-blue-200" : "text-green-200"}`}>
                                {event.kind === "reminder" ? "Reminder" : event.kind === "finish" ? "Batch finished" : "Batch started"}
                              </span>
                              <span className="mt-1 block break-words">{event.title}</span>
                              {event.detail && <span className="mt-1 block break-words text-sm text-white/65">{event.detail}</span>}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                );
              })}
            </section>
          ) : null}

          {!premiumRequired && !error && !loading && view === "month" && <div className="grid grid-cols-7 overflow-hidden rounded-lg border border-white/10">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((weekday) => (
              <div key={weekday} className="border-b border-white/10 bg-white/5 p-2 text-center text-xs text-white/60">
                <span className="hidden sm:inline">{weekday}</span>
                <span className="sm:hidden">{weekday.slice(0, 1)}</span>
              </div>
            ))}
            {days.map((day) => {
              const key = dateKey(day);
              const dayEvents = eventsByDate.get(key) ?? [];
              const inMonth = day.getMonth() === month.getMonth();
              return (
                <button
                  type="button"
                  key={key}
                  onClick={() => setSelectedDate(key)}
                  aria-pressed={selectedDate === key}
                  aria-label={`${day.toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}${dayEvents.length ? `, ${dayEvents.length} events` : ""}`}
                  className={`min-h-20 border-b border-r border-white/10 p-1.5 text-left transition sm:min-h-24 sm:p-2 ${
                    inMonth ? "bg-black/20" : "bg-black/40 text-white/35"
                  } ${selectedDate === key ? "ring-2 ring-inset ring-green-400" : "hover:bg-white/10"} ${
                    key === today ? "text-green-200" : ""
                  }`}
                >
                  <span className={`text-xs ${key === today ? "font-bold" : ""}`}>{day.getDate()}</span>
                  <span className="mt-1 flex flex-col gap-1">
                    {dayEvents.slice(0, 2).map((event) => (
                      <span
                        key={event.id}
                        className={`truncate rounded px-1 py-0.5 text-[10px] leading-tight sm:text-xs ${
                          event.kind === "reminder"
                            ? "bg-amber-400/20 text-amber-200"
                            : event.kind === "finish"
                              ? "bg-blue-400/20 text-blue-200"
                              : "bg-green-400/20 text-green-200"
                        }`}
                      >
                        {event.title}
                      </span>
                    ))}
                    {dayEvents.length > 2 && (
                      <span className="text-[10px] text-white/50">+{dayEvents.length - 2} more</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>}
        </section>

        {!premiumRequired && !error && !loading && view === "month" && <section aria-live="polite" className="mt-6 rounded-lg border border-white/10 bg-white/5 p-4">
          <h2 className="text-lg font-semibold text-green-300">
            {new Date(`${selectedDate}T12:00:00`).toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </h2>
          {!premiumRequired && loading ? (
            <p className="mt-3 text-sm text-white/60">Loading calendar…</p>
          ) : !premiumRequired && selectedEvents.length === 0 ? (
            <p className="mt-3 text-sm text-white/60">No batch milestones or reminders scheduled.</p>
          ) : !premiumRequired ? (
            <ul className="mt-3 space-y-2">
              {selectedEvents.map((event) => (
                <li key={event.id}>
                  <Link
                    href={event.href}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/20 p-3 hover:bg-white/10"
                  >
                    <span>{event.title}</span>
                    {event.detail && <span className="text-sm text-white/60">{event.detail}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </section>}

        <div className="mt-4 flex flex-wrap justify-center gap-4 text-xs text-white/65">
          <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-green-300" />Batch started</span>
          <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-blue-300" />Batch finished</span>
          <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-amber-300" />Reminder</span>
        </div>
      </div>
    </main>
  );
}
