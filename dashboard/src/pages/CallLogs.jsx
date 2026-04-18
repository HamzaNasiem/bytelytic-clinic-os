import React, { useEffect, useState } from "react";
import {
  Phone,
  PlayCircle,
  Clock,
  PhoneIncoming,
  PhoneOutgoing,
  RefreshCw,
  FileText,
  X,
  Sparkles,
  BookOpen,
} from "lucide-react";
import api from "../lib/api";
import { format, parseISO, formatDistanceToNow } from "date-fns";

/* ─── Helpers ─────────────────────────────────────────────── */
const OUTCOME_CFG = {
  booked:      { label: "Booking",   bg: "#edf7e0", color: "#396a00" },
  completed:   { label: "Completed", bg: "#e3f2fd", color: "#006493" },
  no_answer:   { label: "No Answer", bg: "#edf1ef", color: "#3d4946" },
  voicemail:   { label: "Voicemail", bg: "#fff8e1", color: "#856300" },
  cancelled:   { label: "Cancelled", bg: "#fce4ec", color: "#b71c1c" },
  rescheduled: { label: "Rescheduled",bg: "#ede7f6", color: "#4a148c" },
  "follow-up": { label: "Follow-up", bg: "#e1f5fe", color: "#01579b" },
  followup:    { label: "Follow-up", bg: "#e1f5fe", color: "#01579b" },
};

const formatDuration = (secs) => {
  if (!secs) return "—";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

const initials = (name) =>
  (name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

const AVATAR_COLORS = [
  { bg: "#d4e8c1", text: "#2a5200" },
  { bg: "#c8d9e8", text: "#004d78" },
  { bg: "#e8d4c1", text: "#7a3500" },
  { bg: "#d4c1e8", text: "#4a1a70" },
  { bg: "#fce4ec", text: "#880e4f" },
];
const avatarStyle = (name) =>
  AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

/* ─── Transcript side panel ──────────────────────────────── */
const TranscriptPanel = ({ call, onClose }) => {
  if (!call) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-on-surface-variant p-8 text-center">
        <div className="w-14 h-14 bg-surface-container rounded-[0.75rem] flex items-center justify-center mx-auto mb-4">
          <FileText className="w-6 h-6 text-on-surface-variant/30" />
        </div>
        <p className="font-semibold text-on-surface text-sm">Select a call</p>
        <p className="text-xs mt-1 text-on-surface-variant/60">
          Click any row to view the transcript
        </p>
      </div>
    );
  }

  const cfg = OUTCOME_CFG[call.outcome] || {
    label: call.outcome || "Unknown",
    bg: "#edf1ef",
    color: "#3d4946",
  };

  const style = avatarStyle(call.patient_name || call.from_number || "U");
  const patientName = call.patient_name || call.from_number || "Unknown Caller";

  /* Parse transcript into lines */
  const lines = call.transcript
    ? call.transcript
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
    : [];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Call header */}
      <div className="p-4 bg-surface-container-lowest flex-shrink-0">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ backgroundColor: style.bg, color: style.text }}
            >
              {initials(patientName)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm text-on-surface">{patientName}</p>
                <span
                  className="text-[0.6rem] font-bold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: cfg.bg, color: cfg.color }}
                >
                  {cfg.label.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-on-surface-variant mt-0.5">
                {call.from_number && <span>{call.from_number} &middot; </span>} 
                {formatDuration(call.duration_seconds)} Duration
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors"
          >
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
              ? call.transcript.slice(0, 180) + (call.transcript.length > 180 ? "..." : "")
              : "Patient called for general inquiry. AI handled the conversation and provided appropriate information."}
          </p>
        </div>
      </div>

      {/* Transcript */}
      <div className="flex-1 overflow-y-auto thin-scrollbar p-4 space-y-3">
        <p className="overline mb-2">Transcript</p>
        {lines.length > 0 ? (
          lines.map((line, i) => {
            const isAgent =
              line.toLowerCase().startsWith("agent:") ||
              line.toLowerCase().startsWith("receptionist:");
            const isUser =
              line.toLowerCase().startsWith("user:") ||
              line.toLowerCase().startsWith("patient:") ||
              line.toLowerCase().startsWith("caller:");
            const displayText = line.replace(/^(agent|user|patient|caller|receptionist):\s*/i, "");
            const speaker = isAgent ? "Receptionist" : isUser ? patientName.split(" ")[0] : null;
            if (!speaker && !line.trim()) return null;

            return (
              <div key={i} className="flex gap-2.5">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[0.55rem] font-bold flex-shrink-0 mt-0.5"
                  style={
                    isAgent
                      ? { backgroundColor: "#edf7e0", color: "#396a00" }
                      : { backgroundColor: "#e3f2fd", color: "#006493" }
                  }
                >
                  {isAgent ? "R" : isUser ? (patientName[0] || "P") : "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[0.65rem] font-bold text-on-surface-variant mb-0.5">
                    {speaker || "Speaker"} · 00:0{i}
                  </p>
                  <p className="text-xs text-on-surface leading-relaxed">{displayText || line}</p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-on-surface-variant">
            <FileText className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-xs">No transcript available</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 flex-shrink-0">
        <button
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-[0.75rem] text-sm font-semibold transition-colors"
          style={{ backgroundColor: "#edf1ef", color: "#181c1c" }}
        >
          <BookOpen className="w-4 h-4" />
          View Associated Booking
        </button>
      </div>
    </div>
  );
};

/* ─── Main CallLogs Page ──────────────────────────────────── */
const FILTER_TABS = [
  { key: "all",      label: "All Calls" },
  { key: "inbound",  label: "Inbound" },
  { key: "outbound", label: "Outbound" },
  { key: "booked",   label: "Bookings" },
];

const CallLogs = () => {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [selectedCall, setSelectedCall] = useState(null);

  const fetchCalls = async () => {
    setLoading(true);
    try {
      const res = await api.get("/calls?limit=50");
      setCalls(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalls();
  }, []);

  const filtered =
    filter === "all"
      ? calls
      : filter === "booked"
      ? calls.filter((c) => c.outcome === "booked")
      : calls.filter((c) => c.direction === filter);

  const countFor = (key) =>
    key === "all"
      ? calls.length
      : key === "booked"
      ? calls.filter((c) => c.outcome === "booked").length
      : calls.filter((c) => c.direction === key).length;

  return (
    <div className="flex flex-col gap-5 pb-8 h-[calc(100vh-56px)]">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex justify-between items-end flex-wrap gap-4 flex-shrink-0">
        <div>
          <h1 className="text-[1.75rem] font-medium text-on-surface tracking-tight">
            Communication Intelligence
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Analyzing inbound and outbound patient communications.
          </p>
        </div>
        {/* Filter tabs (pill style, right-aligned like reference) */}
        <div className="tab-group">
          {FILTER_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`tab-item ${filter === t.key ? "active" : ""}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Split layout ─────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0 pb-10 lg:pb-0 overflow-y-auto lg:overflow-hidden">
        {/* Left — calls table */}
        <div className={`flex-[3] flex-col card overflow-hidden min-h-[400px] lg:min-h-0 ${selectedCall ? 'hidden lg:flex' : 'flex'}`}>
          <div className="flex-1 overflow-auto thin-scrollbar">
            {loading ? (
              <div className="p-4 space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-14 bg-surface-container rounded-[0.75rem] animate-pulse" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-14 text-center">
                <div className="w-12 h-12 bg-surface-container rounded-[0.75rem] flex items-center justify-center mx-auto mb-3">
                  <Phone className="w-5 h-5 text-on-surface-variant/30" />
                </div>
                <p className="text-sm font-semibold text-on-surface">No call records yet</p>
                <p className="text-xs text-on-surface-variant mt-1">
                  Calls appear here automatically
                </p>
              </div>
            ) : (
              <table className="w-full text-left min-w-[600px]">
                <thead className="sticky top-0 z-10 shadow-sm" style={{ backgroundColor: "#fafefb" }}>
                  <tr>
                    <th className="table-header-cell">Date / Time</th>
                    <th className="table-header-cell">Patient</th>
                    <th className="table-header-cell">Duration</th>
                    <th className="table-header-cell">Direction</th>
                    <th className="table-header-cell">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((call) => {
                    const cfg = OUTCOME_CFG[call.outcome] || {
                      label: call.outcome || "General",
                      bg: "#edf1ef",
                      color: "#3d4946",
                    };
                    const typeCfg = OUTCOME_CFG[call.call_type] || {
                      label: call.call_type || "general",
                      bg: "#edf1ef",
                      color: "#3d4946",
                    };
                    const isSelected = selectedCall?.id === call.id;
                    const style = avatarStyle(call.patient_name || call.from_number || "U");

                    return (
                      <tr
                        key={call.id}
                        onClick={() => setSelectedCall(isSelected ? null : call)}
                        className={`table-row ${isSelected ? "selected" : ""}`}
                      >
                        {/* Date / Time */}
                        <td className="table-cell">
                          <p className="text-sm font-semibold text-on-surface">
                            {call.started_at
                              ? format(parseISO(call.started_at), "MMM d")
                              : "—"}
                          </p>
                          <p className="text-xs text-on-surface-variant">
                            {call.started_at
                              ? format(parseISO(call.started_at), "hh:mm a")
                              : ""}
                          </p>
                        </td>

                        {/* Patient */}
                        <td className="table-cell">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-[0.6rem] font-bold flex-shrink-0"
                              style={{ backgroundColor: style.bg, color: style.text }}
                            >
                              {initials(call.patient_name || call.from_number || "Unknown")}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-on-surface">
                                {call.patient_name || call.from_number || "Unknown"}
                              </p>
                              <p className="text-[0.65rem] text-on-surface-variant">
                                {call.patient_name ? call.from_number || "Existing Patient" : ""}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Duration */}
                        <td className="table-cell text-sm font-medium text-on-surface">
                          {formatDuration(call.duration_seconds)}
                        </td>

                        {/* Direction */}
                        <td className="table-cell">
                          <div className="flex items-center gap-1.5">
                            {call.direction === "inbound" ? (
                              <PhoneIncoming className="w-3.5 h-3.5 text-primary" />
                            ) : (
                              <PhoneOutgoing className="w-3.5 h-3.5 text-on-surface-variant" />
                            )}
                            <span className="text-xs font-medium text-on-surface capitalize">
                              {call.direction}
                            </span>
                          </div>
                        </td>

                        {/* Type badge */}
                        <td className="table-cell">
                          <span
                            className="text-[0.6rem] font-bold px-2.5 py-1 rounded-full"
                            style={{ backgroundColor: typeCfg.bg, color: typeCfg.color }}
                          >
                            {typeCfg.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right — transcript panel */}
        <div className={`flex-[2] flex-col card overflow-hidden min-h-[500px] lg:min-h-0 ${!selectedCall ? 'hidden lg:flex' : 'flex'}`}>
          <TranscriptPanel
            call={selectedCall}
            onClose={() => setSelectedCall(null)}
          />
        </div>
      </div>
    </div>
  );
};

export default CallLogs;
