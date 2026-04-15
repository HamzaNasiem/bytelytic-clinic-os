import React, { useEffect, useState } from "react";
import {
  DollarSign,
  PhoneCall,
  CalendarCheck,
  Users,
  Activity,
  Clock,
} from "lucide-react";
import RevenueCard from "../components/RevenueCard";
import CallStats from "../components/CallStats";
import AppointmentTable from "../components/AppointmentTable";
import api from "../lib/api";

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [clinicName, setClinicName] = useState("Clinic");

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const info = JSON.parse(localStorage.getItem("clinic-info") || "{}");
        if (info.clinicName) setClinicName(info.clinicName);

        const res = await api.get("/dashboard/stats");
        setStats(res.data.data);
      } catch (err) {
        console.error("Failed to load dashboard stats", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="text-sm text-slate-400 font-medium mb-1">{today}</p>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Dashboard Overview
          </h1>
          <p className="text-slate-500 mt-1">
            Here&apos;s what your AI receptionist did for{" "}
            <span className="text-brand-600 font-semibold">{clinicName}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-2 rounded-xl text-sm font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          AI Receptionist Active
        </div>
      </div>

      {/* Metric Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-36 bg-slate-100 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Hero card — spans full width on small, 1 col on large */}
          <RevenueCard
            hero
            title="AI Recovered This Month"
            amount={`$${(stats.revenueRecoveredDollars || 0).toLocaleString()}`}
            percentage={14.5}
            isPositive={true}
            icon={DollarSign}
          />
          <RevenueCard
            title="Calls Answered"
            amount={stats.callsAnswered ?? 0}
            percentage={stats.answerRatePercent ?? 0}
            isPositive={true}
            icon={PhoneCall}
          />
          <RevenueCard
            title="Appointments Booked by AI"
            amount={stats.appointmentsBookedByAi ?? 0}
            percentage={12.4}
            isPositive={true}
            icon={CalendarCheck}
          />
          <RevenueCard
            title="Today's Appointments"
            amount={stats.todayAppointments ?? 0}
            percentage={5.1}
            isPositive={true}
            icon={Users}
          />
          <RevenueCard
            title="No-Shows Today"
            amount={stats.todayNoShows ?? 0}
            percentage={2.1}
            isPositive={false}
            icon={Activity}
          />
          <RevenueCard
            title="Avg Call Duration"
            amount={`${stats.avgCallDurationSeconds ?? 0}s`}
            percentage={15.3}
            isPositive={true}
            icon={Clock}
          />
        </div>
      ) : null}

      {/* Chart */}
      <div>
        <CallStats />
      </div>

      {/* Today's appointments */}
      <div>
        <AppointmentTable />
      </div>
    </div>
  );
};

export default Dashboard;
