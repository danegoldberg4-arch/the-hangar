"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { getApiError } from "@/lib/api-client";

interface Visit {
  id: string;
  userId: string | null;
  visitorName: string;
  startDate: string;
  endDate: string;
  notes: string;
  bringing: string;
}

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDate(s: string): Date {
  const [y, m, d] = s.split("T")[0].split("-").map(Number);
  return new Date(y, m - 1, d);
}

async function fetchVisits(year: number, month: number, signal?: AbortSignal) {
  const from = formatDate(new Date(year, month, 1));
  const to = formatDate(new Date(year, month + 1, 0));
  const query = new URLSearchParams({ from, to });
  const res = await fetch(`/api/visits?${query}`, { signal, credentials: "same-origin" });
  if (!res.ok) throw new Error(await getApiError(res, "Could not load visits."));
  const data: unknown = await res.json();
  if (!Array.isArray(data)) throw new Error("The visit calendar returned an invalid response.");
  return data as Visit[];
}

export function VisitCalendar() {
  const { data: session } = useSession();
  const now = new Date();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [showForm, setShowForm] = useState(false);
  const [editingVisit, setEditingVisit] = useState<Visit | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [today] = useState(() => parseDate(formatDate(new Date())));

  const [visitorName, setVisitorName] = useState("");
  const [startDate, setStartDate] = useState(formatDate(now));
  const [endDate, setEndDate] = useState(formatDate(now));
  const [notes, setNotes] = useState("");
  const [bringing, setBringing] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingVisitIds, setDeletingVisitIds] = useState<Set<string>>(
    () => new Set()
  );
  const [error, setError] = useState("");
  const loadToken = useRef<symbol | null>(null);
  const loadController = useRef<AbortController | null>(null);
  const visibleRangeKey = `${currentYear}-${currentMonth}`;
  const visibleRange = useRef(visibleRangeKey);

  const loadVisits = useCallback(async () => {
    const requestedRange = `${currentYear}-${currentMonth}`;
    if (visibleRange.current !== requestedRange) return;

    const token = Symbol("visit-load");
    loadToken.current = token;
    loadController.current?.abort();
    const controller = new AbortController();
    loadController.current = controller;
    setLoading(true);
    setLoadError("");
    try {
      const data = await fetchVisits(
        currentYear,
        currentMonth,
        controller.signal
      );
      if (
        loadToken.current !== token ||
        visibleRange.current !== requestedRange
      ) {
        return;
      }
      setVisits(data);
    } catch (loadFailure) {
      if (controller.signal.aborted || loadToken.current !== token) return;
      setVisits([]);
      setLoadError(loadFailure instanceof Error ? loadFailure.message : "Could not load visits.");
    } finally {
      if (loadToken.current === token) {
        loadToken.current = null;
        loadController.current = null;
        setLoading(false);
      }
    }
  }, [currentMonth, currentYear, setLoadError, setLoading, setVisits]);

  useEffect(() => {
    visibleRange.current = `${currentYear}-${currentMonth}`;
    const token = Symbol("visit-range-load");
    loadToken.current = token;
    loadController.current?.abort();
    const controller = new AbortController();
    loadController.current = controller;
    void fetchVisits(currentYear, currentMonth, controller.signal)
      .then((data) => {
        if (loadToken.current !== token) return;
        setVisits(data);
        setLoadError("");
      })
      .catch((loadFailure) => {
        if (controller.signal.aborted || loadToken.current !== token) return;
        setVisits([]);
        setLoadError(
          loadFailure instanceof Error ? loadFailure.message : "Could not load visits."
        );
      })
      .finally(() => {
        if (loadToken.current === token) {
          loadToken.current = null;
          loadController.current = null;
          setLoading(false);
        }
      });
    return () => {
      loadToken.current = null;
      loadController.current?.abort();
      loadController.current = null;
    };
  }, [currentMonth, currentYear]);

  function setVisitDeleting(id: string, deleting: boolean) {
    setDeletingVisitIds((current) => {
      const next = new Set(current);
      if (deleting) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function prevMonth() {
    const previous = new Date(currentYear, currentMonth - 1, 1);
    visibleRange.current = `${previous.getFullYear()}-${previous.getMonth()}`;
    setLoading(true);
    setLoadError("");
    setCurrentMonth(previous.getMonth());
    setCurrentYear(previous.getFullYear());
    setSelectedDate(null);
    setActionError("");
  }

  function nextMonth() {
    const next = new Date(currentYear, currentMonth + 1, 1);
    visibleRange.current = `${next.getFullYear()}-${next.getMonth()}`;
    setLoading(true);
    setLoadError("");
    setCurrentMonth(next.getMonth());
    setCurrentYear(next.getFullYear());
    setSelectedDate(null);
    setActionError("");
  }

  function openForm(date?: string, visit?: Visit) {
    if (visit) {
      setEditingVisit(visit);
      setVisitorName(visit.visitorName);
      setStartDate(formatDate(parseDate(visit.startDate)));
      setEndDate(formatDate(parseDate(visit.endDate)));
      setNotes(visit.notes);
      setBringing(visit.bringing);
    } else {
      setEditingVisit(null);
      setVisitorName("");
      setStartDate(date || formatDate(new Date()));
      setEndDate(date || formatDate(new Date()));
      setNotes("");
      setBringing("");
    }
    setError("");
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!visitorName.trim()) {
      setError("Name is required");
      return;
    }
    if (endDate < startDate) {
      setError("Leaving date must be on or after arriving date.");
      return;
    }
    setSubmitting(true);
    setError("");

    try {
      const payload = {
        visitorName: visitorName.trim(),
        startDate,
        endDate,
        notes: notes.trim(),
        bringing: bringing.trim(),
      };

      const res = editingVisit
        ? await fetch(`/api/visits/${editingVisit.id}`, { credentials: "same-origin",
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/visits", { credentials: "same-origin",
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      if (!res.ok) {
        setError(await getApiError(res, "Could not save the visit."));
        return;
      }

      setShowForm(false);
      setEditingVisit(null);
      await loadVisits();
    } catch (saveFailure) {
      setError(saveFailure instanceof Error ? saveFailure.message : "Could not save the visit.");
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteVisit(visit: Visit) {
    if (!window.confirm(`Delete the visit for ${visit.visitorName}? This cannot be undone.`)) {
      return;
    }

    setVisitDeleting(visit.id, true);
    setActionError("");
    try {
      const res = await fetch(`/api/visits/${visit.id}`, { method: "DELETE", credentials: "same-origin" });
      if (!res.ok) throw new Error(await getApiError(res, "Could not delete the visit."));
      await loadVisits();
    } catch (deleteFailure) {
      setActionError(
        deleteFailure instanceof Error ? deleteFailure.message : "Could not delete the visit."
      );
    } finally {
      setVisitDeleting(visit.id, false);
    }
  }

  const visibleVisits = loading || loadError ? [] : visits;

  function getVisitsForDay(day: number): Visit[] {
    const dayDate = new Date(currentYear, currentMonth, day);
    const dayStart = new Date(dayDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayDate);
    dayEnd.setHours(23, 59, 59, 999);

    return visibleVisits.filter((v) => {
      const vStart = parseDate(v.startDate);
      const vEnd = parseDate(v.endDate);
      return vStart <= dayEnd && vEnd >= dayStart;
    });
  }

  function isOccupied(day: number): boolean {
    return getVisitsForDay(day).length > 0;
  }

  function isToday(day: number): boolean {
    const today = new Date();
    return (
      today.getFullYear() === currentYear &&
      today.getMonth() === currentMonth &&
      today.getDate() === day
    );
  }

  const firstDay = new Date(currentYear, currentMonth, 1);
  const lastDay = new Date(currentYear, currentMonth + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startWeekday = (firstDay.getDay() + 6) % 7;

  const weeks: (number | null)[][] = [];
  let currentDay = 1;
  for (let w = 0; w < 6; w++) {
    const week: (number | null)[] = [];
    for (let d = 0; d < 7; d++) {
      if (w === 0 && d < startWeekday) {
        week.push(null);
      } else if (currentDay > daysInMonth) {
        week.push(null);
      } else {
        week.push(currentDay);
        currentDay++;
      }
    }
    weeks.push(week);
    if (currentDay > daysInMonth) break;
  }

  const monthVisits = [...visibleVisits]
    .sort((a, b) => parseDate(a.startDate).getTime() - parseDate(b.startDate).getTime());

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Calendar */}
      <div className="lg:col-span-2 card-surface p-4 sm:p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-narrow uppercase tracking-wider text-sm font-bold text-paper">
            {monthNames[currentMonth]} {currentYear}
          </h3>
          <div className="flex items-center gap-1">
            <button
              onClick={prevMonth}
              aria-label="Previous month"
              className="font-narrow text-galv-dim hover:text-paper px-2 py-1 transition-colors"
            >
              ‹
            </button>
            <button
              onClick={() => {
                const todayDate = new Date();
                if (
                  currentMonth === todayDate.getMonth() &&
                  currentYear === todayDate.getFullYear()
                ) {
                  void loadVisits();
                } else {
                  visibleRange.current = `${todayDate.getFullYear()}-${todayDate.getMonth()}`;
                  setLoading(true);
                  setLoadError("");
                  setCurrentMonth(todayDate.getMonth());
                  setCurrentYear(todayDate.getFullYear());
                }
                setSelectedDate(null);
                setActionError("");
              }}
              className="font-narrow uppercase tracking-wider text-[0.6rem] text-galv-dim hover:text-iron-lt px-2 py-1 transition-colors"
            >
              Today
            </button>
            <button
              onClick={nextMonth}
              aria-label="Next month"
              className="font-narrow text-galv-dim hover:text-paper px-2 py-1 transition-colors"
            >
              ›
            </button>
          </div>
        </div>

        {loading && (
          <p className="text-galv text-sm mb-4" aria-live="polite">
            Loading visits...
          </p>
        )}
        {loadError && (
          <div role="alert" className="bg-iron/5 border border-iron/20 text-iron text-sm rounded p-3 mb-4 flex items-center justify-between gap-3">
            <span>{loadError}</span>
            <button
              type="button"
              onClick={() => loadVisits()}
              className="font-narrow uppercase tracking-wider text-xs hover:text-paper"
            >
              Retry
            </button>
          </div>
        )}
        {actionError && (
          <div role="alert" className="bg-iron/5 border border-iron/20 text-iron text-sm rounded p-3 mb-4">
            {actionError}
          </div>
        )}

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {dayNames.map((d) => (
            <div key={d} className="font-narrow uppercase tracking-wider text-[0.5rem] sm:text-[0.55rem] text-galv-dim text-center py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-[1px] sm:gap-[2px]">
          {weeks.flat().map((day, i) => {
            if (day === null) {
              return <div key={i} className="aspect-square" />;
            }

            const occupied = isOccupied(day);
            const today = isToday(day);
            const dayVisits = getVisitsForDay(day);

            return (
              <button
                key={i}
                onClick={() => {
                  const dateStr = formatDate(new Date(currentYear, currentMonth, day));
                  if (dayVisits.length > 0) {
                    setSelectedDate(selectedDate === dateStr ? null : dateStr);
                  } else {
                    openForm(dateStr);
                  }
                }}
                className={`aspect-square rounded flex flex-col items-center justify-center text-[0.65rem] sm:text-xs transition-colors relative ${
                  today
                    ? "bg-iron/20 border border-iron/30"
                    : occupied
                    ? "bg-forest-lt/30 hover:bg-forest-lt/50"
                    : "hover:bg-steel-3"
                }`}
              >
                <span className={`font-narrow ${today ? "text-iron-lt font-bold" : occupied ? "text-paper" : "text-galv-dim"}`}>
                  {day}
                </span>
                {occupied && (
                  <div className="flex gap-[2px] mt-0.5">
                    {dayVisits.slice(0, 3).map((_, j) => (
                      <span key={j} className="w-1 h-1 rounded-full bg-green-400" />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Selected day visits */}
        {selectedDate && (
          <div className="mt-4 pt-4 border-t border-line space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-narrow uppercase tracking-wider text-xs text-galv">
                {parseDate(selectedDate).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })}
              </h4>
              <button
                onClick={() => openForm(selectedDate)}
                className="font-narrow uppercase tracking-wider text-[0.6rem] text-iron hover:text-iron-lt"
              >
                + Add visit
              </button>
            </div>
            {getVisitsForDay(parseDate(selectedDate).getDate()).map((v) => {
              const vStart = parseDate(v.startDate);
              const vEnd = parseDate(v.endDate);
              const canManage =
                session?.user?.role === "admin" ||
                (v.userId !== null && v.userId === session?.user?.id);
              return (
                <div key={v.id} className="bg-forest-lt/20 border border-line rounded-lg p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="font-narrow font-bold text-sm text-paper">{v.visitorName}</div>
                      <div className="font-narrow text-xs text-galv-dim mt-0.5">
                        {vStart.toLocaleDateString("en-AU", { day: "numeric", month: "short" })} → {vEnd.toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                      </div>
                      {v.notes && <p className="text-xs text-galv mt-1">{v.notes}</p>}
                      {v.bringing && (
                        <p className="text-xs text-green-400 mt-1">Bringing: {v.bringing}</p>
                      )}
                    </div>
                    {canManage && (
                      <div className="flex gap-1">
                        <button onClick={() => openForm(selectedDate, v)} className="text-galv-dim hover:text-iron-lt text-xs px-1">edit</button>
                        <button
                          onClick={() => deleteVisit(v)}
                        disabled={deletingVisitIds.has(v.id)}
                        aria-label={`Delete visit for ${v.visitorName}`}
                        title="Delete visit"
                        className="text-galv-dim hover:text-iron text-xs px-1 disabled:opacity-50"
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sidebar — upcoming + form */}
      <div className="space-y-4">
        {/* Upcoming */}
        <div className="card-surface p-4 sm:p-5">
          <h4 className="font-narrow uppercase tracking-wider text-xs font-bold text-galv mb-3">
            {monthNames[currentMonth]} visits
          </h4>
          {loading ? (
            <p className="text-xs text-galv-dim">Loading...</p>
          ) : loadError ? (
            <p className="text-xs text-iron">Visits unavailable.</p>
          ) : monthVisits.length === 0 ? (
            <p className="text-xs text-galv-dim">No visits planned for this month.</p>
          ) : (
            <div className="space-y-2">
              {monthVisits.slice(0, 8).map((v) => {
                const vStart = parseDate(v.startDate);
                const vEnd = parseDate(v.endDate);
                const daysUntil = Math.round(
                  (vStart.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
                );
                return (
                  <div key={v.id} className="border-l-2 border-iron/30 pl-3 py-1">
                    <div className="font-narrow font-bold text-sm text-paper">{v.visitorName}</div>
                    <div className="font-narrow text-[0.65rem] text-galv-dim mt-0.5">
                      {vStart.toLocaleDateString("en-AU", { day: "numeric", month: "short" })} → {vEnd.toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                    </div>
                    {daysUntil >= 0 && daysUntil <= 30 && (
                      <div className="font-narrow text-[0.6rem] text-iron mt-0.5">
                        {daysUntil === 0 ? "Today" : daysUntil === 1 ? "Tomorrow" : `In ${daysUntil} days`}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Add button / Form */}
        {!showForm ? (
          <button
            onClick={() => openForm()}
            className="w-full font-narrow uppercase tracking-wider text-xs font-bold text-steel bg-sand hover:bg-paper rounded-md py-3 transition-colors"
          >
            + Plan a Visit
          </button>
        ) : (
          <form onSubmit={handleSubmit} className="card-surface p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-narrow uppercase tracking-wider text-xs font-bold text-galv">
                {editingVisit ? "Edit Visit" : "New Visit"}
              </h4>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setError("");
                }}
                aria-label="Close visit form"
                className="text-galv-dim hover:text-iron text-xs"
              >
                ×
              </button>
            </div>

            <div>
              <label className="font-narrow uppercase tracking-wider text-[0.6rem] text-galv-dim block mb-1">Who</label>
              <input
                type="text"
                value={visitorName}
                onChange={(e) => setVisitorName(e.target.value)}
                required
                maxLength={160}
                placeholder="Name"
                className="w-full bg-steel-3 border border-line rounded-lg px-3 py-2 text-paper text-sm focus:border-iron focus:outline-none transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-narrow uppercase tracking-wider text-[0.6rem] text-galv-dim block mb-1">Arriving</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="w-full bg-steel-3 border border-line rounded-lg px-3 py-2 text-paper text-sm focus:border-iron focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="font-narrow uppercase tracking-wider text-[0.6rem] text-galv-dim block mb-1">Leaving</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  className="w-full bg-steel-3 border border-line rounded-lg px-3 py-2 text-paper text-sm focus:border-iron focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="font-narrow uppercase tracking-wider text-[0.6rem] text-galv-dim block mb-1">Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={2000}
                placeholder="Optional"
                className="w-full bg-steel-3 border border-line rounded-lg px-3 py-2 text-paper text-sm focus:border-iron focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="font-narrow uppercase tracking-wider text-[0.6rem] text-galv-dim block mb-1">Bringing</label>
              <input
                type="text"
                value={bringing}
                onChange={(e) => setBringing(e.target.value)}
                maxLength={1000}
                placeholder="Supplies, parts, firewood..."
                className="w-full bg-steel-3 border border-line rounded-lg px-3 py-2 text-paper text-sm focus:border-iron focus:outline-none transition-colors"
              />
            </div>

            {error && <p className="text-iron text-xs">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full font-narrow uppercase tracking-wider text-xs font-bold text-steel bg-sand hover:bg-paper rounded-md py-2.5 transition-colors disabled:opacity-50"
            >
              {submitting ? "Saving..." : editingVisit ? "Update" : "Add Visit"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
