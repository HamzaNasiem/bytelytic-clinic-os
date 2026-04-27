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
  FileText,
  X,
  Sparkles,
  Phone,
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
  scheduled: { label: "SCHEDULED", dotColor: "#006493", textColor: "#006493" },
  confirmed:  { label: "CONFIRMED",  dotColor: "#396a00", textColor: "#396a00" },
  cancelled:  { label: "CANCELLED",  dotColor: "#b71c1c", textColor: "#b71c1c" },
  completed:  { label: "COMPLETED",  dotColor: "#4a148c", textColor: "#4a148c" },
  no_show:    { label: "NO-SHOW",    dotColor: "#6d4c41", textColor: "#6d4c41" },
};
const StatusBadge = ({ status }) => {
  const cfg = STATUS_CFG[status] || STATUS_CFG.scheduled;
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.dotColor }} />
      <span className="text-[0.6875rem] font-bold tracking-widest" style={{ color: cfg.textColor }}>
        {cfg.label}
      </span>
    </div>
  );
};

/* ── Tabs ────────────────────────────────────────────────────── */
const TABS = [
  { key: "today",    label: "Today" },
  { key: "upcoming", label: "Next 7 Days" },
  { key: "all",      label: "All" },
];

/* ── Avatar helpers ──────────────────────────────────────────── */
const initials = (name) =>
  (name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
const AVATAR_COLORS = ["#d4e8c1","#c8d9e8","#e8d4c1","#d4c1e8","#c1e8d4"];
const avatarColor = (name) => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

/* ── Transcript Panel (right side) ───────────────────────────── */
const TranscriptPanel = ({ call, loading, onClose }) => {
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!call) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-on-surface-variant p-8 text-center">
        <div className="w-14 h-14 bg-surface-container rounded-[0.75rem] flex items-center justify-center mx-auto mb-4">
          <FileText className="w-6 h-6 text-on-surface-variant/30" />
        </div>
        <p className="font-semibold text-on-surface text-sm">Select an appointment</p>
        <p className="text-xs mt-1 text-on-surface-variant/60">
          Click any row to view the linked call transcript
        </p>
      </div>
    );
  }

  const lines = call.transcript
    ? call.transcript.split("\n").map((l) => l.trim()).filter(Boolean)
    : [];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-surface-container-lowest flex-shrink-0 border-b border-surface-container">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="font-semibold text-sm text-on-surface">
                {call.patient_name || call.from_number || "Unknown"}
              </p>
              <span className="text-[0.6rem] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#edf7e0", color: "#396a00" }}>
                {call.call_type || "call"}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-on-surface-variant">
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3" />
                {call.from_number || "—"}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {call.duration_seconds ? `${Math.floor(call.duration_seconds / 60)}m ${call.duration_seconds % 60}s` : "—"}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-on-surface-variant hover:bg-surface-container rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* AI Summary */}
      <div className="mx-4 mt-3 flex-shrink-0">
        <div className="bg-surface-container rounded-[0.75rem] p-3.5">
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <p className="overline" style={{ color: "#396a00" }}>AI Summary</p>
          </div>
          <p className="text-xs text-on-surface leading-relaxed">
            {call.transcript
              ? call.transcript.slice(0, 200) + (call.transcript.length > 200 ? "..." : "")
              : "Patient called. AI handled the conversation."}
          </p>
        </div>
      </div>

      {/* Transcript */}
      <div className="flex-1 overflow-y-auto thin-scrollbar p-4 space-y-3 mt-1">
        <p className="overline mb-2">Transcript</p>
        {lines.length > 0 ? (
          lines.map((line, i) => {
            const isAgent = /^(agent|receptionist):/i.test(line);
            const isUser  = /^(user|patient|caller):/i.test(line);
            const text = line.replace(/^(agent|user|patient|caller|receptionist):\s*/i, "");
            return (
              <div key={i} className="flex gap-2.5">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[0.55rem] font-bold flex-shrink-0 mt-0.5"
                  style={isAgent
                    ? { backgroundColor: "#edf7e0", color: "#396a00" }
                    : { backgroundColor: "#e3f2fd", color: "#006493" }}
                >
                  {isAgent ? "R" : "P"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-on-surface leading-relaxed">{text || line}</p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-on-surface-variant">
            <FileText className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-xs">No transcript available for this call</p>
          </div>
        )}
      </div>
    </div>
  );
};

/* ── New Appointment Modal ────────────────────────────────────── */
const NewApptModal = ({ onClose, onCreated }) => {
  const [form, setForm] = useState({ patient_name: "", patient_phone: "", appointment_type: "Initial Evaluation", date: "", time: "", duration_minutes: 60 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.patient_name || !form.patient_phone || !form.date || !form.time) {
      setError("All fields except notes are required.");
      return;
    }
    setSaving(true);
    try {
      const datetime = new Date(`${form.date}T${form.time}:00`).toISOString();
      await api.post("/appointments", {
        patient_name: form.patient_name,
        patient_phone: form.patient_phone,
        appointment_type: form.appointment_type,
        datetime,
        duration_minutes: Number(form.duration_minutes),
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create appointment.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="card w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-on-surface mb-1">New Appointment</h2>
        <p className="text-xs text-on-surface-variant mb-5">Book a manual appointment for a patient.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="overline mb-1 block">Patient Name *</label>
            <input
              className="w-full bg-surface-container rounded-lg px-3 py-2 text-sm outline-none text-on-surface"
              placeholder="Full name"
              value={form.patient_name}
              onChange={(e) => setForm(f => ({ ...f, patient_name: e.target.value }))}
            />
          </div>
          <div>
            <label className="overline mb-1 block">Patient Phone *</label>
            <input
              className="w-full bg-surface-container rounded-lg px-3 py-2 text-sm outline-none text-on-surface"
              placeholder="+1 (555) 000-0000"
              value={form.patient_phone}
              onChange={(e) => setForm(f => ({ ...f, patient_phone: e.target.value }))}
            />
          </div>
          <div>
            <label className="overline mb-1 block">Service Type</label>
            <select
              className="w-full bg-surface-container rounded-lg px-3 py-2 text-sm outline-none text-on-surface border-r-8 border-transparent"
              value={form.appointment_type}
              onChange={(e) => setForm(f => ({ ...f, appointment_type: e.target.value }))}
            >
              <option>Initial Evaluation</option>
              <option>Follow-up</option>
              <option>Routine Checkup</option>
              <option>Consultation</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="overline mb-1 block">Date *</label>
              <input
                type="date"
                className="w-full bg-surface-container rounded-lg px-3 py-2 text-sm outline-none text-on-surface"
                value={form.date}
                onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))}
              />
            </div>
            <div>
              <label className="overline mb-1 block">Time *</label>
              <input
                type="time"
                className="w-full bg-surface-container rounded-lg px-3 py-2 text-sm outline-none text-on-surface"
                value={form.time}
                onChange={(e) => setForm(f => ({ ...f, time: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="overline mb-1 block">Duration (minutes)</label>
            <select
              className="w-full bg-surface-container rounded-lg px-3 py-2 text-sm outline-none text-on-surface border-r-8 border-transparent"
              value={form.duration_minutes}
              onChange={(e) => setForm(f => ({ ...f, duration_minutes: e.target.value }))}
            >
              <option value={30}>30 min</option>
              <option value={60}>60 min</option>
              <option value={90}>90 min</option>
            </select>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-on-surface hover:bg-surface-container rounded-lg transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary text-sm px-5 py-2 disabled:opacity-50">
              {saving ? "Booking..." : "Book Appointment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ── Main Component ────────────────────────────────────────── */
const Appointments = () => {
  const [activeTab, setActiveTab] = useState("today");
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [showNewModal, setShowNewModal] = useState(false);

  // Transcript panel state
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [apptCall, setApptCall] = useState(null);
  const [callLoading, setCallLoading] = useState(false);

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

  useEffect(() => { fetchAppointments(activeTab); }, [activeTab]);

  const updateStatus = async (apptId, status) => {
    setUpdatingId(apptId);
    try {
      await api.put(`/appointments/${apptId}`, { status });
      setAppointments((prev) => prev.map((a) => (a.id === apptId ? { ...a, status } : a)));
      if (selectedAppt?.id === apptId) setSelectedAppt(a => ({ ...a, status }));
    } catch (err) {
      console.error("Failed to update status", err);
    } finally {
      setUpdatingId(null);
    }
  };

  const selectAppt = async (apt) => {
    if (selectedAppt?.id === apt.id) {
      setSelectedAppt(null);
      setApptCall(null);
      return;
    }
    setSelectedAppt(apt);
    setApptCall(null);
    setCallLoading(true);
    try {
      // Fetch most recent call by this patient phone
      const res = await api.get(`/calls?from_number=${encodeURIComponent(apt.patient_phone)}&limit=5`);
      const calls = res.data.data || [];
      setApptCall(calls[0] || null); // show most recent call
    } catch (err) {
      console.error("Failed to fetch call transcript", err);
      setApptCall(null);
    } finally {
      setCallLoading(false);
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
    <div className="flex flex-col gap-5 pb-8 h-[calc(100vh-56px)]">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-end justify-between flex-wrap gap-4 flex-shrink-0">
        <div>
          <h1 className="text-[1.75rem] font-medium text-on-surface tracking-tight">Appointments</h1>
          <p className="text-sm text-on-surface-variant mt-1">Manage and track patient scheduling.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => fetchAppointments(activeTab)} className="btn-ghost" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setShowNewModal(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            New Appointment
          </button>
        </div>
      </div>

      {/* ── Tabs ───────────────────────────────────────────── */}
      <div className="tab-group flex-shrink-0">
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

      {/* ── Split Layout ─────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0 pb-10 lg:pb-0 overflow-y-auto lg:overflow-hidden">
        {/* Left — appointments list */}
        <div className={`flex-[3] flex-col card overflow-hidden min-h-[400px] lg:min-h-0 ${selectedAppt ? 'hidden lg:flex' : 'flex'}`}>
          <div className="flex-1 overflow-auto thin-scrollbar">
            {loading ? (
              <div className="p-4 space-y-2">
                {[1,2,3].map(i => <div key={i} className="h-16 bg-surface-container rounded-[0.75rem] animate-pulse" />)}
              </div>
            ) : appointments.length === 0 ? (
              <div className="p-16 text-center">
                <div className="w-14 h-14 bg-surface-container rounded-[0.75rem] flex items-center justify-center mx-auto mb-4">
                  <CalendarDays className="w-7 h-7 text-on-surface-variant/40" />
                </div>
                <p className="font-semibold text-on-surface">No appointments</p>
                <p className="text-on-surface-variant text-sm mt-1">AI will fill this calendar when patients call</p>
              </div>
            ) : (
              <div>
                {Object.entries(grouped)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([date, appts]) => (
                    <div key={date}>
                      <p className="overline px-4 pt-4 pb-2">
                        {appts[0]?.datetime ? getDateLabel(appts[0].datetime) : date}
                      </p>
                      <table className="w-full text-left min-w-[600px]">
                        <thead>
                          <tr>
                            <th className="table-header-cell">Patient</th>
                            <th className="table-header-cell">Time</th>
                            <th className="table-header-cell">Service</th>
                            <th className="table-header-cell">Status</th>
                            <th className="table-header-cell">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {appts.map((apt) => {
                            const isSelected = selectedAppt?.id === apt.id;
                            return (
                              <tr
                                key={apt.id}
                                onClick={() => selectAppt(apt)}
                                className={`table-row cursor-pointer ${isSelected ? "selected" : ""}`}
                              >
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
                                      <p className="font-semibold text-sm text-on-surface">{apt.patient_name}</p>
                                      <div className="flex items-center gap-1 mt-0.5">
                                        {apt.booked_by === "ai"
                                          ? <Bot className="w-3 h-3 text-primary" />
                                          : <User className="w-3 h-3 text-on-surface-variant" />}
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
                                    {apt.datetime ? format(parseISO(apt.datetime), "hh:mm a") : "—"}
                                  </p>
                                  <p className="text-xs text-on-surface-variant">{apt.duration_minutes} min</p>
                                </td>
                                {/* Service */}
                                <td className="table-cell text-sm text-on-surface">{apt.appointment_type}</td>
                                {/* Status */}
                                <td className="table-cell"><StatusBadge status={apt.status} /></td>
                                {/* Actions */}
                                <td className="table-cell" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center gap-1.5">
                                    {apt.status === "scheduled" && (
                                      <button
                                        onClick={() => updateStatus(apt.id, "confirmed")}
                                        disabled={updatingId === apt.id}
                                        className="flex items-center gap-1 px-2.5 py-1 text-[0.7rem] font-bold rounded-full transition-colors disabled:opacity-40"
                                        style={{ backgroundColor: "#edf7e0", color: "#396a00" }}
                                      >
                                        <CheckCircle className="w-3 h-3" /> Confirm
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
                                          <AlertCircle className="w-3 h-3" /> No-Show
                                        </button>
                                        <button
                                          onClick={() => updateStatus(apt.id, "cancelled")}
                                          disabled={updatingId === apt.id}
                                          className="flex items-center gap-1 px-2.5 py-1 text-[0.7rem] font-bold rounded-full transition-colors disabled:opacity-40"
                                          style={{ backgroundColor: "#fce4ec", color: "#b71c1c" }}
                                        >
                                          <XCircle className="w-3 h-3" /> Cancel
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
                                        <CheckCircle className="w-3 h-3" /> Complete
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Right — transcript panel */}
        <div className={`flex-[2] flex-col card overflow-hidden min-h-[400px] lg:min-h-0 ${!selectedAppt ? 'hidden lg:flex' : 'flex'}`}>
          <TranscriptPanel
            call={apptCall}
            loading={callLoading}
            onClose={() => { setSelectedAppt(null); setApptCall(null); }}
          />
        </div>
      </div>

      {/* Modal */}
      {showNewModal && (
        <NewApptModal
          onClose={() => setShowNewModal(false)}
          onCreated={() => fetchAppointments(activeTab)}
        />
      )}
    </div>
  );
};

export default Appointments;
