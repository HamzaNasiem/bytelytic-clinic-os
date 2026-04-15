import React, { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import api from '../lib/api';

const STATUS_STYLES = {
  scheduled: 'bg-amber-50 text-amber-600 border border-amber-200',
  confirmed: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  cancelled: 'bg-rose-50 text-rose-600 border border-rose-200',
  completed: 'bg-blue-50 text-blue-700 border border-blue-200',
  no_show: 'bg-slate-100 text-slate-500 border border-slate-200',
};

const AppointmentTable = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTodayAppointments = async () => {
      try {
        const res = await api.get('/appointments/today');
        setAppointments(res.data.data || []);
      } catch (err) {
        console.error('Failed to fetch today\'s appointments', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTodayAppointments();
  }, []);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
        <div>
          <h3 className="font-bold text-slate-800 text-lg">Today's Appointments</h3>
          <p className="text-sm text-slate-400 mt-0.5">
            {loading ? 'Loading...' : `${appointments.length} scheduled for today`}
          </p>
        </div>
        <a href="/appointments" className="text-sm text-brand-500 hover:text-brand-700 font-semibold transition-colors">
          View All →
        </a>
      </div>

      {loading ? (
        <div className="p-6 space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      ) : appointments.length === 0 ? (
        <div className="p-10 text-center">
          <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-slate-500 font-medium text-sm">No appointments today</p>
          <p className="text-slate-400 text-xs mt-1">The AI will fill this when patients call in</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/60">
                <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Patient</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Time</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Booked By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {appointments.map((appt) => (
                <tr key={appt.id} className="hover:bg-slate-50/40 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
                        {appt.patient_name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800 text-sm">{appt.patient_name}</div>
                        <div className="text-xs text-slate-400">{appt.patient_phone}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 font-medium">{appt.appointment_type}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {appt.datetime ? format(parseISO(appt.datetime), 'h:mm a') : '—'}
                    <span className="text-xs text-slate-400 ml-1">({appt.duration_minutes}m)</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${STATUS_STYLES[appt.status] || STATUS_STYLES.scheduled}`}>
                      {appt.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-md ${appt.booked_by === 'ai' ? 'bg-violet-50 text-violet-600' : 'bg-slate-100 text-slate-500'}`}>
                      {appt.booked_by === 'ai' ? '🤖 AI' : '👤 Staff'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AppointmentTable;
