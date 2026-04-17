import React, { useEffect, useState, useCallback } from "react";
import {
  Calendar,
  Clock,
  Plus,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  CalendarDays,
  Bot,
  User,
} from "lucide-react";
import api from "../lib/api";
import {
  format,
  parseISO,
  isToday,
  isTomorrow,
  startOfDay,
  endOfDay,
  addDays,
} from "date-fns";

/* ── Status config ──────────────────────────────────────────── */
const STATUS_CFG = {
  scheduled: { label: "SCHEDULED", dotColor: "#006493", textColor: "#006493", bg: "transparent" },
  confirmed:  { label: "CONFIRMED",  dotColor: "#396a00", textColor: "#396a00", bg: "transparent" },
  cancelled:  { label: "CANCELLED",  dotColor: "#b71c1c", textColor: "#b71c1c", bg: "transparent" },
  completed:  { label: "COMPLETED",  dotColor: "#4a148c", textColor: "#4a148c", bg: "transparent" },
  no_show:    { label: "NO-SHOW",    dotColor: "#6d4c41", textColor: "#6d4c41", bg: "transparent" },
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CFG[status] || STATUS_CFG.scheduled;
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: cfg.dotColor }}
      />
      <span
        className="text-[0.6875rem] font-bold tracking-widest"
        style={{ color: cfg.textColor }}
      >
        {cfg.label}
      </span>
    </div>
  );
};

/* ── Tabs (pill segment style) ─────────────────────────────── */
const TABS = [
  { key: "today",    label: "Today" },
  { key: "upcoming", label: "Next 7 Days" },
  { key: "all",      label: "All" },
];

/* ── Avatar initials ───────────────────────────────────────── */
const initials = (name) =>
  (name || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

/* ── Color from name (deterministic) ──────────────────────── */
const AVATAR_COLORS = [
  "#d4e8c1", "#c8d9e8", "#e8d4c1", "#d4c1e8", "#c1e8d4",
];
const avatarColor = (name) =>
  AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

/* ── Main Component ────────────────────────────────────────── */
const Appointments = () => {
  const [activeTab, setActiveTab] = useState("today");
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchAppointments = useCallback(async (tab) => {
    setLoading(true);
    try {
      const now = new Date();
      let url = "/appointments";
      if (tab === "today") {
        url += `?date_from=${startOfDay(now).toISOString()}&date_to=${endOfDay(now).toISOString()}&limit=100`;
      } else if (tab === "upcoming") {
        url += `?date_from=${now.toISOString()}&date_to=${endOfDay(addDays(now, 7)).toISOString()}&limit=100`;
      } else {
        url += `?limit=100`;
      }
      const res = await api.get(url);
      setAppointments(res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch appointments", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments(activeTab);
  }, [activeTab]);

  const updateStatus = async (apptId, status) => {
    setUpdatingId(apptId);
    try {
      await api.put(`/appointments/${apptId}`, { status });
      setAppointments((prev) =>
        prev.map((a) => (a.id === apptId ? { ...a, status } : a))
      );
    } catch (err) {
      console.error("Failed to update status", err);
    } finally {
      setUpdatingId(null);
    }
  };

  /* Group by date */
  const grouped = appointments.reduce((acc, appt) => {
    const key = appt.datetime ? appt.datetime.split("T")[0] : "unknown";
    if (!acc[key]) acc[key] = [];
    acc[key].push(appt);
    return acc;
  }, {});

  const getDateLabel = (datetime) => {
    const d = parseISO(datetime);
    if (isToday(d)) return "Today";
    if (isTomorrow(d)) return "Tomorrow";
    return format(d, "EEEE, MMMM d");
  };

  return (
    <div className="space-y-6 pb-8">
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-[1.75rem] font-medium text-on-surface tracking-tight">
            Appointments
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Manage and track patient scheduling.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchAppointments(activeTab)}
            className="btn-ghost"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button className="btn-primary">
            <Plus className="w-4 h-4" />
            New Appointment
          </button>
        </div>
      </div>

      {/* ── Tabs (pill/segment style like reference) ─────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="tab-group">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`tab-item ${activeTab === tab.key ? "active" : ""}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────── */}
      {loading ? (
        <div className="card overflow-hidden">
          <div className="h-12 bg-surface-container" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 border-t border-surface-container animate-pulse" />
          ))}
        </div>
      ) : appointments.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="w-14 h-14 bg-surface-container rounded-[0.75rem] flex items-center justify-center mx-auto mb-4">
            <CalendarDays className="w-7 h-7 text-on-surface-variant/40" />
          </div>
          <p className="font-semibold text-on-surface">No appointments</p>
          <p className="text-on-surface-variant text-sm mt-1">
            AI will fill this calendar when patients call
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, appts]) => (
              <div key={date}>
                {/* Date group label */}
                <p className="overline mb-3">
                  {appts[0]?.datetime ? getDateLabel(appts[0].datetime) : date}
                </p>

                {/* Table card */}
                <div className="card overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr>
                        <th className="table-header-cell">Patient</th>
                        <th className="table-header-cell">Time</th>
                        <th className="table-header-cell">Service</th>
                        <th className="table-header-cell">Status</th>
                        <th className="table-header-cell hidden xl:table-cell">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {appts.map((apt) => (
                        <tr key={apt.id} className="table-row">
                          {/* Patient */}
                          <td className="table-cell">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 text-on-surface"
                                style={{ backgroundColor: avatarColor(apt.patient_name) }}
                              >
                                {initials(apt.patient_name)}
                              </div>
                              <div>
                                <p className="font-semibold text-sm text-on-surface">
                                  {apt.patient_name}
                                </p>
                                <div className="flex items-center gap-1 mt-0.5">
                                  {apt.booked_by === "ai" ? (
                                    <Bot className="w-3 h-3 text-primary" />
                                  ) : (
                                    <User className="w-3 h-3 text-on-surface-variant" />
                                  )}
                                  <span className="text-[0.65rem] text-on-surface-variant font-medium">
                                    {apt.booked_by === "ai" ? "AI Booking" : "Staff"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Time */}
                          <td className="table-cell">
                            <p className="font-semibold text-on-surface text-sm">
                              {apt.datetime
                                ? format(parseISO(apt.datetime), "hh:mm a")
                                : "—"}
                            </p>
                            <p className="text-xs text-on-surface-variant">
                              {apt.duration_minutes} min
                            </p>
                          </td>

                          {/* Service */}
                          <td className="table-cell text-sm text-on-surface">
                            {apt.appointment_type}
                          </td>

                          {/* Status */}
                          <td className="table-cell">
                            <StatusBadge status={apt.status} />
                          </td>

                          {/* Actions */}
                          <td className="table-cell hidden xl:table-cell">
                            <div className="flex items-center gap-1.5">
                              {apt.status === "scheduled" && (
                                <button
                                  onClick={() => updateStatus(apt.id, "confirmed")}
                                  disabled={updatingId === apt.id}
                                  className="flex items-center gap-1 px-2.5 py-1 text-[0.7rem] font-bold rounded-full transition-colors disabled:opacity-40"
                                  style={{ backgroundColor: "#edf7e0", color: "#396a00" }}
                                >
                                  <CheckCircle className="w-3 h-3" />
                                  Confirm
                                </button>
                              )}
                              {(apt.status === "scheduled" || apt.status === "confirmed") && (
                                <>
                                  <button
                                    onClick={() => updateStatus(apt.id, "no_show")}
                                    disabled={updatingId === apt.id}
                                    className="flex items-center gap-1 px-2.5 py-1 text-[0.7rem] font-bold rounded-full transition-colors disabled:opacity-40"
                                    style={{ backgroundColor: "#fff8e1", color: "#9a6800" }}
                                  >
                                    <AlertCircle className="w-3 h-3" />
                                    No-Show
                                  </button>
                                  <button
                                    onClick={() => updateStatus(apt.id, "cancelled")}
                                    disabled={updatingId === apt.id}
                                    className="flex items-center gap-1 px-2.5 py-1 text-[0.7rem] font-bold rounded-full transition-colors disabled:opacity-40"
                                    style={{ backgroundColor: "#fce4ec", color: "#b71c1c" }}
                                  >
                                    <XCircle className="w-3 h-3" />
                                    Cancel
                                  </button>
                                </>
                              )}
                              {apt.status === "confirmed" && (
                                <button
                                  onClick={() => updateStatus(apt.id, "completed")}
                                  disabled={updatingId === apt.id}
                                  className="flex items-center gap-1 px-2.5 py-1 text-[0.7rem] font-bold rounded-full transition-colors disabled:opacity-40"
                                  style={{ backgroundColor: "#ede7f6", color: "#4a148c" }}
                                >
                                  <CheckCircle className="w-3 h-3" />
                                  Complete
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default Appointments;
