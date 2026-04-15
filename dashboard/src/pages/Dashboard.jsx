import React, { useEffect, useState } from 'react';
import { DollarSign, PhoneCall, CalendarCheck, Users, Activity, Clock } from 'lucide-react';
import RevenueCard from '../components/RevenueCard';
import CallStats from '../components/CallStats';
import AppointmentTable from '../components/AppointmentTable';
import api from '../lib/api';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [clinicName, setClinicName] = useState('Clinic Owner');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const info = JSON.parse(localStorage.getItem('clinic-info') || '{}');
        if (info.clinicName) setClinicName(info.clinicName);

        const res = await api.get('/dashboard/stats');
        setStats(res.data.data);
      } catch (err) {
        console.error("Failed to load dashboard stats", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="space-y-8 pb-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Dashboard Overview</h1>
        <p className="text-slate-500 mt-1">Welcome back, {clinicName}. Here's what's happening today.</p>
      </div>

      {loading ? (
        <div className="h-40 rounded-2xl bg-slate-100 animate-pulse border border-slate-200"></div>
      ) : stats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
          <RevenueCard title="AI Recovered This Month" amount={`$${stats.revenueRecoveredDollars}`} percentage={14.5} isPositive={true} icon={DollarSign} />
          <RevenueCard title="Calls Answered" amount={stats.callsAnswered} percentage={stats.answerRatePercent} isPositive={true} icon={PhoneCall} />
          <RevenueCard title="Appointments Booked by AI" amount={stats.appointmentsBookedByAi} percentage={12.4} isPositive={true} icon={CalendarCheck} />
          <RevenueCard title="Patients Recalled" amount={stats.todayAppointments} percentage={5.1} isPositive={true} icon={Users} />
          <RevenueCard title="No-Shows Today" amount={stats.todayNoShows} percentage={2.1} isPositive={false} icon={Activity} />
          <RevenueCard title="Avg Response Time" amount={`${stats.avgCallDurationSeconds}s`} percentage={15.3} isPositive={true} icon={Clock} />
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-3">
           <CallStats />
        </div>
      </div>

      <div>
        <AppointmentTable />
      </div>
    </div>
  );
};

export default Dashboard;
