import React, { useEffect, useState } from "react";
import {
  Phone,
  PlayCircle,
  Clock,
  PhoneIncoming,
  PhoneOutgoing,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  FileText,
} from "lucide-react";
import api from "../lib/api";
import { format, parseISO, formatDistanceToNow } from "date-fns";

const OUTCOME_CONFIG = {
  booked: {
    label: "Booked",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    dot: "bg-emerald-400",
  },
  completed: {
    label: "Completed",
    bg: "bg-blue-50",
    text: "text-blue-700",
    dot: "bg-blue-400",
  },
  no_answer: {
    label: "No Answer",
    bg: "bg-slate-100",
    text: "text-slate-500",
    dot: "bg-slate-300",
  },
  voicemail: {
    label: "Voicemail",
    bg: "bg-amber-50",
    text: "text-amber-700",
    dot: "bg-amber-400",
  },
  cancelled: {
    label: "Cancelled",
    bg: "bg-rose-50",
    text: "text-rose-600",
    dot: "bg-rose-400",
  },
  rescheduled: {
    label: "Rescheduled",
    bg: "bg-violet-50",
    text: "text-violet-600",
    dot: "bg-violet-400",
  },
};

const formatDuration = (secs) => {
  if (!secs) return "—";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
};

// Expandable transcript row
const CallRow = ({ call }) => {
  const [expanded, setExpanded] = useState(false);
  const cfg = OUTCOME_CONFIG[call.outcome] || {
    label: call.outcome || "Unknown",
    bg: "bg-slate-100",
    text: "text-slate-500",
    dot: "bg-slate-300",
  };

  return (
    <>
      <tr
        className={`hover:bg-slate-50/60 transition-colors cursor-pointer ${expanded ? "bg-brand-50/30" : ""}`}
        onClick={() => call.transcript && setExpanded((v) => !v)}
      >
        <td className="px-6 py-4">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-xl ${call.direction === "inbound" ? "bg-blue-50 text-blue-500" : "bg-violet-50 text-violet-500"}`}
            >
              {call.direction === "inbound" ? (
                <PhoneIncoming className="w-4 h-4" />
              ) : (
                <PhoneOutgoing className="w-4 h-4" />
              )}
            </div>
            <div>
              <div className="font-semibold text-slate-800 text-sm">
                {call.from_number || "Unknown"}
              </div>
              <div className="text-xs text-slate-400 capitalize">
                {call.direction}
              </div>
            </div>
          </div>
        </td>
        <td className="px-6 py-4">
          <span className="text-sm font-medium text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg capitalize">
            {call.call_type || "general"}
          </span>
        </td>
        <td className="px-6 py-4">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </span>
        </td>
        <td className="px-6 py-4">
          <div className="flex items-center gap-1.5 text-sm text-slate-600">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            {formatDuration(call.duration_seconds)}
          </div>
        </td>
        <td className="px-6 py-4 text-sm text-slate-500">
          {call.started_at
            ? formatDistanceToNow(parseISO(call.started_at), {
                addSuffix: true,
              })
            : "—"}
        </td>
        <td className="px-6 py-4 text-right">
          <div className="flex items-center justify-end gap-2">
            {call.recording_url ? (
              <a
                href={call.recording_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 text-brand-500 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              >
                <PlayCircle className="w-3.5 h-3.5" /> Listen
              </a>
            ) : null}
            {call.transcript ? (
              <button className="p-1.5 text-slate-400 hover:text-brand-500 hover:bg-brand-50 rounded-lg transition-colors">
                {expanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
            ) : (
              <span className="text-xs text-slate-300">No recording</span>
            )}
          </div>
        </td>
      </tr>

      {/* Transcript expanded */}
      {expanded && call.transcript && (
        <tr>
          <td colSpan={6} className="px-6 pb-5 pt-0">
            <div className="bg-slate-900 rounded-2xl p-5 border border-slate-700">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-4 h-4 text-slate-400" />
                <span className="text-slate-300 text-sm font-semibold">
                  Call Transcript
                </span>
                <span className="ml-auto text-slate-500 text-xs">
                  {call.started_at
                    ? format(parseISO(call.started_at), "MMM d, yyyy h:mm a")
                    : ""}
                </span>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1 text-sm font-mono leading-relaxed">
                {call.transcript.split("\n").map((line, i) => {
                  const isAgent =
                    line.startsWith("agent:") || line.startsWith("Agent:");
                  const isUser =
                    line.startsWith("user:") || line.startsWith("User:");
                  return (
                    <div
                      key={i}
                      className={`${
                        isAgent
                          ? "text-brand-300"
                          : isUser
                            ? "text-slate-300"
                            : "text-slate-500"
                      }`}
                    >
                      {line || "\u00A0"}
                    </div>
                  );
                })}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

const CallLogs = () => {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

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

  const filters = [
    { key: "all", label: "All Calls" },
    { key: "inbound", label: "Inbound" },
    { key: "outbound", label: "Outbound" },
    { key: "booked", label: "Bookings Only" },
  ];

  return (
    <div className="space-y-6 pb-8">
      <div className="flex justify-between items-end flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            AI Call Logs
          </h1>
          <p className="text-slate-500 mt-1">
            {calls.length} call records — click any row to see transcript
          </p>
        </div>
        <button
          onClick={fetchCalls}
          className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium transition-all"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Filter Pills */}
      <div className="flex gap-2 flex-wrap">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filter === f.key
                ? "bg-brand-500 text-white shadow-sm shadow-brand-500/20"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {f.label}
            {f.key !== "all" && (
              <span className="ml-1.5 text-xs opacity-70">
                (
                {f.key === "booked"
                  ? calls.filter((c) => c.outcome === "booked").length
                  : calls.filter((c) => c.direction === f.key).length}
                )
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-16 bg-slate-100 rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-14 text-center">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Phone className="w-7 h-7 text-slate-400" />
            </div>
            <p className="text-slate-700 font-semibold">No call records yet</p>
            <p className="text-slate-400 text-sm mt-1">
              Calls appear here automatically when patients call
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/60 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Caller
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Outcome
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    When
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((call) => (
                  <CallRow key={call.id} call={call} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CallLogs;
