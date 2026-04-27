import React, { useEffect, useState } from "react";
import {
  DollarSign,
  PhoneCall,
  CalendarCheck,
  Calendar,
  UserX,
  Clock,
  TrendingUp,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import api from "../lib/api";
import { format, parseISO } from "date-fns";

/* ─── Mock chart data ─────────────────────────────────────── */
/* ─── Removed mock generator, fetching live now ─────────────── */

/* ─── Custom Tooltip ──────────────────────────────────────── */
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="card p-3 text-sm min-w-[120px]">
      <p className="font-bold text-on-surface mb-1">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.fill }} />
          <span className="text-on-surface-variant">{p.name}:</span>
          <span className="font-semibold text-on-surface">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

/* ─── Small stat card (bottom row in reference) ───────────── */
const SmallMetricCard = ({ icon: Icon, iconBg, value, label }) => (
  <div className="card p-5 flex items-center gap-4">
    <div
      className="w-11 h-11 rounded-[0.75rem] flex items-center justify-center flex-shrink-0"
      style={{ backgroundColor: iconBg }}
    >
      <Icon className="w-5 h-5" style={{ color: "#181c1c" }} />
    </div>
    <div>
      <p className="text-2xl font-bold text-on-surface leading-none">{value}</p>
      <p className="overline mt-1.5">{label}</p>
    </div>
  </div>
);

/* ─── Up Next appointment row ─────────────────────────────── */
const STATUS_LABELS = {
  arrived: { label: "ARRIVED", bg: "#e8f5e9", color: "#396a00" },
  in_session: { label: "IN SESSION", bg: "#fce4ec", color: "#c00060" },
  waiting: { label: "WAITING", bg: "#fff8e1", color: "#856300" },
  expected: { label: "EXPECTED", bg: "#edf1ef", color: "#3d4946" },
};

const UpNextRow = ({ time, name, type, status, isHighlighted }) => {
  const cfg = STATUS_LABELS[status] || STATUS_LABELS.expected;
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-[0.75rem] transition-colors ${
        isHighlighted ? "bg-surface-container" : "hover:bg-surface-container"
      }`}
    >
      <div className="w-14 flex-shrink-0">
        <p className="text-sm font-bold text-on-surface leading-none">{time}</p>
        <p className="text-[0.65rem] text-on-surface-variant mt-0.5">AM</p>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-on-surface truncate">{name}</p>
        <p className="text-xs text-on-surface-variant truncate">{type}</p>
      </div>
      <span
        className="text-[0.6rem] font-bold px-2 py-1 rounded-full flex-shrink-0"
        style={{ backgroundColor: cfg.bg, color: cfg.color }}
      >
        {cfg.label}
      </span>
    </div>
  );
};

/* ─── MAIN DASHBOARD ──────────────────────────────────────── */
const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chartRange, setChartRange] = useState(7);
  const [chartData, setChartData] = useState([]);
  const [upNext, setUpNext] = useState([]);
  const [clinicName, setClinicName] = useState("Bytelytic Clinic");

  const fetchTimeline = async (days) => {
    try {
      const res = await api.get(`/dashboard/timeline?days=${days}`);
      const formatted = (res.data.data || []).map(t => {
        const d = parseISO(t.date);
        return {
          name: format(d, "MMM d"),
          Answered: t.calls - (t.missed_calls || 0), // If missed isn't tracked, assume all calls answered for now or use outcome
          Calls: t.calls,
          Bookings: t.bookings
        }
      });
      setChartData(formatted);
    } catch (err) {
      console.error("Timeline error:", err);
    }
  };

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const info = JSON.parse(localStorage.getItem("clinic-info") || "{}");
        if (info.clinicName) setClinicName(info.clinicName);
        
        const [statsRes, apptRes] = await Promise.all([
          api.get("/dashboard/stats"),
          api.get("/appointments")
        ]);
        
        setStats(statsRes.data.data);
        
        // Up Next processing
        const allAppts = apptRes.data.data || [];
        const todayStr = new Date().toISOString().slice(0, 10);
        const upcoming = allAppts
          .filter(a => a.datetime && a.datetime.startsWith(todayStr))
          .sort((a, b) => new Date(a.datetime) - new Date(b.datetime))
          .map(a => {
            const dt = new Date(a.datetime);
            return {
              id: a.id,
              time: format(dt, "hh:mm"),
              name: a.patient_name || "Unknown",
              type: "Appointment",
              status: a.status || "expected"
            };
          });
        setUpNext(upcoming);
        
      } catch (err) {
        console.error("Dashboard list failed:", err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboard();
    fetchTimeline(chartRange);
  }, []);

  const handleRangeChange = (d) => {
    setChartRange(d);
    fetchTimeline(d);
  };

  const s = stats || {};
  const recovered = s.revenueRecoveredDollars ?? 0;
  const callsAnswered = s.callsAnswered ?? 0;
  const callsTotal = s.callsTotal ?? 0;
  const aiAppts = s.appointmentsBookedByAi ?? 0;
  const todayAppts = s.todayAppointments ?? 0;
  const noShows = s.todayNoShows ?? 0;
  const avgDuration = s.avgCallDurationSeconds ?? 0;
  const answerRate = callsTotal > 0 ? Math.round((callsAnswered / callsTotal) * 100) : 99;

  const fmtDuration = (secs) => {
    const m = Math.floor(secs / 60);
    const s2 = secs % 60;
    return `${m}m ${String(s2).padStart(2, "0")}s`;
  };

  // Live from backend now!

  return (
    <div className="space-y-6 pb-10">
      {/* ── Page Header ──────────────────────────────────────── */}
      <div>
        <h1 className="text-[1.75rem] font-medium text-on-surface tracking-tight">
          Today's Overview
        </h1>
        <p className="text-sm text-on-surface-variant mt-1">
          A curated summary of clinic operations and AI performance.
        </p>
      </div>

      {/* ── Top 3 Hero Cards ─────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* AI Recovered */}
        <div className="card p-6 relative overflow-hidden" style={{ borderTop: "3px solid #396a00" }}>
          <div className="flex items-center justify-between mb-4">
            <p className="overline">AI Recovered This Month</p>
            <div
              className="w-9 h-9 rounded-[0.625rem] flex items-center justify-center"
              style={{ backgroundColor: "#edf7e0" }}
            >
              <DollarSign className="w-4 h-4" style={{ color: "#396a00" }} />
            </div>
          </div>
          {loading ? (
            <div className="space-y-3">
              <div className="h-10 w-32 bg-surface-container rounded-[0.5rem] animate-pulse" />
              <div className="h-4 w-24 bg-surface-container rounded-[0.25rem] animate-pulse" />
            </div>
          ) : (
            <>
              <p className="text-[2.5rem] font-light text-on-surface leading-none tracking-tight">
                ${recovered.toLocaleString()}
              </p>
              <div className="flex items-center gap-1.5 mt-3">
                {recovered > 0 ? (
                  <>
                    <TrendingUp className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-semibold text-primary">+{aiAppts} AI bookings this month</span>
                  </>
                ) : (
                  <span className="text-xs text-on-surface-variant">Awaiting first AI booking ($150 each)</span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Calls Answered */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="overline">Calls Answered</p>
            <div
              className="w-9 h-9 rounded-[0.625rem] flex items-center justify-center"
              style={{ backgroundColor: "#e3f2fd" }}
            >
              <PhoneCall className="w-4 h-4" style={{ color: "#006493" }} />
            </div>
          </div>
          {loading ? (
            <div className="space-y-3">
              <div className="h-10 w-24 bg-surface-container rounded-[0.5rem] animate-pulse" />
              <div className="h-3 w-full bg-surface-container rounded-full animate-pulse" />
            </div>
          ) : (
            <>
              <div className="flex items-baseline gap-2">
                <p className="text-[2.5rem] font-light text-on-surface leading-none tracking-tight">
                  {callsAnswered.toLocaleString()}
                </p>
                <span className="text-sm text-on-surface-variant font-medium">
                  / {callsTotal} total
                </span>
              </div>
              {/* Progress bar */}
              <div className="mt-3 h-1 rounded-full bg-surface-container overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${answerRate}%`, backgroundColor: "#396a00" }}
                />
              </div>
            </>
          )}
        </div>

        {/* AI Appointments */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="overline">AI Appointments</p>
            <div
              className="w-9 h-9 rounded-[0.625rem] flex items-center justify-center"
              style={{ backgroundColor: "#f3e5f5" }}
            >
              <CalendarCheck className="w-4 h-4" style={{ color: "#7b1fa2" }} />
            </div>
          </div>
          {loading ? (
            <div className="space-y-3">
              <div className="h-10 w-16 bg-surface-container rounded-[0.5rem] animate-pulse" />
              <div className="h-4 w-40 bg-surface-container rounded-[0.25rem] animate-pulse" />
            </div>
          ) : (
            <>
              <p className="text-[2.5rem] font-light text-on-surface leading-none tracking-tight">
                {aiAppts.toLocaleString()}
              </p>
              <p className="text-xs text-on-surface-variant mt-3">
                Saved approx. 18 hours of staff time.
              </p>
            </>
          )}
        </div>
      </div>

      {/* ── Bottom 3 Smaller Metric Cards ───────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SmallMetricCard
          icon={Calendar}
          iconBg="#edf1ef"
          value={loading ? "–" : todayAppts}
          label="Today's Appointments"
        />
        <SmallMetricCard
          icon={UserX}
          iconBg="#fce4ec"
          value={loading ? "–" : noShows}
          label="No-Shows Today"
        />
        <SmallMetricCard
          icon={Clock}
          iconBg="#e3f2fd"
          value={loading ? "–" : fmtDuration(avgDuration)}
          label="Avg Call Duration"
        />
      </div>

      {/* ── Chart + Up Next ──────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Call Volume Chart */}
        <div className="xl:col-span-2 card p-6">
          <div className="flex items-start justify-between mb-1">
            <div>
              <h2 className="text-base font-semibold text-on-surface">Call Volume Analysis</h2>
              <p className="text-xs text-on-surface-variant mt-0.5">Inbound vs Missed calls over time.</p>
            </div>
            {/* Range selector */}
            <div className="flex items-center gap-0.5 bg-surface-container rounded-[0.5rem] p-0.5">
              {[7, 14, 30].map((d) => (
                <button
                  key={d}
                  onClick={() => handleRangeChange(d)}
                  className={`px-3 py-1.5 rounded-[0.375rem] text-xs font-bold transition-all duration-150 ${
                    chartRange === d
                      ? "bg-surface-container-lowest text-on-surface shadow-sm"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  {d}D
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barSize={18} barGap={2}>
                <CartesianGrid strokeDasharray="0" stroke="rgba(24,28,28,0.04)" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "#3d4946", fontFamily: "Manrope" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#3d4946", fontFamily: "Manrope" }}
                  axisLine={false}
                  tickLine={false}
                  width={30}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(57,106,0,0.04)", radius: 6 }} />
                <Bar dataKey="Calls" fill="#9dce6b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Bookings" fill="#396a00" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Up Next */}
        <div className="card p-5 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-on-surface">Up Next</h2>
            <button className="text-xs font-semibold text-primary hover:opacity-70 transition-opacity">
              View All
            </button>
          </div>
          <div className="flex-1 space-y-1">
            {upNext.length > 0 ? upNext.map((item, i) => (
              <UpNextRow
                key={item.id || i}
                time={item.time}
                name={item.name}
                type={item.type}
                status={item.status}
                isHighlighted={item.status === 'in_session'}
              />
            )) : (
              <div className="flex flex-col items-center justify-center p-6 text-center text-on-surface-variant">
                <Calendar className="w-6 h-6 mb-2 opacity-30" />
                <p className="text-xs">No upcoming appointments today</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
