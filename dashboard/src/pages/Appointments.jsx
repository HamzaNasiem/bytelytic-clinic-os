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

const STATUS_CONFIG = {
  scheduled: {
    label: "Scheduled",
    dot: "bg-amber-400",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
  },
  confirmed: {
    label: "Confirmed",
    dot: "bg-emerald-400",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
  },
  cancelled: {
    label: "Cancelled",
    dot: "bg-rose-400",
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
  },
  completed: {
    label: "Completed",
    dot: "bg-blue-400",
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
  },
  no_show: {
    label: "No-Show",
    dot: "bg-slate-400",
    bg: "bg-slate-100",
    text: "text-slate-600",
    border: "border-slate-200",
  },
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.scheduled;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
};

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
        prev.map((a) => (a.id === apptId ? { ...a, status } : a)),
      );
    } catch (err) {
      console.error("Failed to update status", err);
    } finally {
      setUpdatingId(null);
    }
  };

  const getDateLabel = (datetime) => {
    const d = parseISO(datetime);
    if (isToday(d)) return "Today";
    if (isTomorrow(d)) return "Tomorrow";
    return format(d, "EEEE, MMMM d");
  };

  const grouped = appointments.reduce((acc, appt) => {
    const key = appt.datetime ? appt.datetime.split("T")[0] : "unknown";
    if (!acc[key]) acc[key] = [];
    acc[key].push(appt);
    return acc;
  }, {});

  const tabs = [
    { key: "today", label: "Today", icon: "📅" },
    { key: "upcoming", label: "Next 7 Days", icon: "📆" },
    { key: "all", label: "All", icon: "🗂️" },
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex justify-between items-end flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Appointments
          </h1>
          <p className="text-slate-500 mt-1">
            {appointments.length} appointment
            {appointments.length !== 1 ? "s" : ""}{" "}
            {activeTab === "today" ? "today" : "found"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchAppointments(activeTab)}
            className="p-2.5 text-slate-500 hover:text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2.5 rounded-xl font-medium shadow-sm shadow-brand-500/25 transition-all">
            <Plus className="w-4 h-4" /> New Appointment
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white p-1.5 rounded-2xl border border-slate-200 inline-flex shadow-sm gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2 rounded-xl font-medium text-sm transition-all ${
              activeTab === tab.key
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 bg-slate-100 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      ) : appointments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center">
          <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CalendarDays className="w-8 h-8 text-brand-400" />
          </div>
          <p className="text-slate-800 font-bold text-lg">No appointments</p>
          <p className="text-slate-400 text-sm mt-1">
            AI will fill this calendar automatically when patients call
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, appts]) => (
              <div key={date}>
                {/* Date divider */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center gap-2 bg-slate-900 text-white px-3 py-1.5 rounded-xl">
                    <Calendar className="w-3.5 h-3.5 opacity-70" />
                    <span className="text-sm font-bold">
                      {appts[0]?.datetime
                        ? getDateLabel(appts[0].datetime)
                        : date}
                    </span>
                  </div>
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className="text-xs text-slate-400 font-medium">
                    {appts.length} appt{appts.length !== 1 ? "s" : ""}
                  </span>
                </div>

                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/60 border-b border-slate-100">
                        <th className="px-6 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          Patient
                        </th>
                        <th className="px-6 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          Time
                        </th>
                        <th className="px-6 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          Source
                        </th>
                        <th className="px-6 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {appts.map((apt) => (
                        <tr
                          key={apt.id}
                          className="hover:bg-slate-50/40 transition-colors group"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0 shadow-sm">
                                {apt.patient_name?.charAt(0)?.toUpperCase() ||
                                  "?"}
                              </div>
                              <div>
                                <div className="font-semibold text-slate-800 text-sm">
                                  {apt.patient_name}
                                </div>
                                <div className="text-xs text-slate-400">
                                  {apt.patient_phone}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600 font-medium">
                            {apt.appointment_type}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5 text-sm text-slate-700 font-medium">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              {apt.datetime
                                ? format(parseISO(apt.datetime), "h:mm a")
                                : "—"}
                              <span className="text-slate-400 text-xs font-normal">
                                ({apt.duration_minutes}m)
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <StatusBadge status={apt.status} />
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                                apt.booked_by === "ai"
                                  ? "bg-violet-50 text-violet-600 border border-violet-200"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {apt.booked_by === "ai" ? "🤖 AI" : "👤 Staff"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {apt.status === "scheduled" && (
                                <button
                                  onClick={() =>
                                    updateStatus(apt.id, "confirmed")
                                  }
                                  disabled={updatingId === apt.id}
                                  className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-40"
                                  title="Confirm"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                              )}
                              {(apt.status === "scheduled" ||
                                apt.status === "confirmed") && (
                                <>
                                  <button
                                    onClick={() =>
                                      updateStatus(apt.id, "no_show")
                                    }
                                    disabled={updatingId === apt.id}
                                    className="p-1.5 text-amber-500 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-40"
                                    title="Mark No-Show"
                                  >
                                    <AlertCircle className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() =>
                                      updateStatus(apt.id, "cancelled")
                                    }
                                    disabled={updatingId === apt.id}
                                    className="p-1.5 text-rose-400 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-40"
                                    title="Cancel"
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                              {apt.status === "confirmed" && (
                                <button
                                  onClick={() =>
                                    updateStatus(apt.id, "completed")
                                  }
                                  disabled={updatingId === apt.id}
                                  className="px-3 py-1 text-xs bg-blue-500 text-white hover:bg-blue-600 rounded-lg font-semibold transition-colors disabled:opacity-40"
                                >
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
