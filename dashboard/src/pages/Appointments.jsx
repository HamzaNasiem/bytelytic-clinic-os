import React, { useEffect, useState, useCallback } from 'react';
import { Calendar, Clock, User, Plus, CheckCircle, XCircle, AlertCircle, ChevronDown, RefreshCw } from 'lucide-react';
import api from '../lib/api';
import { format, parseISO, isToday, isTomorrow, startOfDay, endOfDay, addDays } from 'date-fns';

const STATUS_CONFIG = {
  scheduled: { label: 'Scheduled', dot: 'bg-amber-400', bg: 'bg-amber-50', text: 'text-amber-700' },
  confirmed:  { label: 'Confirmed',  dot: 'bg-emerald-400', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  cancelled:  { label: 'Cancelled',  dot: 'bg-rose-400', bg: 'bg-rose-50', text: 'text-rose-700' },
  completed:  { label: 'Completed',  dot: 'bg-blue-400', bg: 'bg-blue-50', text: 'text-blue-700' },
  no_show:    { label: 'No-Show',    dot: 'bg-slate-400', bg: 'bg-slate-100', text: 'text-slate-600' },
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.scheduled;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}></span>
      {cfg.label}
    </span>
  );
};

const Appointments = () => {
  const [activeTab, setActiveTab] = useState('today');
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchAppointments = useCallback(async (tab) => {
    setLoading(true);
    try {
      let url = '/appointments';
      const now = new Date();

      if (tab === 'today') {
        url += `?date_from=${startOfDay(now).toISOString()}&date_to=${endOfDay(now).toISOString()}&limit=100`;
      } else if (tab === 'upcoming') {
        url += `?date_from=${now.toISOString()}&date_to=${endOfDay(addDays(now, 7)).toISOString()}&limit=100`;
      } else {
        url += `?limit=100`;
      }

      const res = await api.get(url);
      setAppointments(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch appointments', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAppointments(activeTab); }, [activeTab]);

  const updateStatus = async (apptId, status) => {
    setUpdatingId(apptId);
    try {
      await api.put(`/appointments/${apptId}`, { status });
      setAppointments(prev => prev.map(a => a.id === apptId ? { ...a, status } : a));
    } catch (err) {
      console.error('Failed to update status', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const getDateLabel = (datetime) => {
    const d = parseISO(datetime);
    if (isToday(d)) return 'Today';
    if (isTomorrow(d)) return 'Tomorrow';
    return format(d, 'EEEE, MMM d');
  };

  // Group appointments by date
  const grouped = appointments.reduce((acc, appt) => {
    const key = appt.datetime ? appt.datetime.split('T')[0] : 'unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(appt);
    return acc;
  }, {});

  const tabs = [
    { key: 'today', label: "Today's Schedule" },
    { key: 'upcoming', label: 'Next 7 Days' },
    { key: 'all', label: 'All Upcoming' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Appointments</h1>
          <p className="text-slate-500 mt-1">{appointments.length} appointments {activeTab === 'today' ? 'today' : 'found'}</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => fetchAppointments(activeTab)} className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2.5 rounded-xl font-medium shadow-sm shadow-brand-500/20 transition-all">
            <Plus className="w-4 h-4" /> New Appointment
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white p-1.5 rounded-xl border border-slate-200 inline-flex shadow-sm">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2 rounded-lg font-medium text-sm transition-all ${
              activeTab === tab.key
                ? 'bg-slate-100 text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : appointments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
          <div className="w-12 h-12 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <Calendar className="w-6 h-6 text-brand-400" />
          </div>
          <p className="text-slate-600 font-semibold">No appointments</p>
          <p className="text-slate-400 text-sm mt-1">AI will fill this calendar automatically when calls come in</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([date, appts]) => (
            <div key={date}>
              {/* Date Header */}
              <div className="flex items-center gap-3 mb-3">
                <span className="text-sm font-bold text-slate-700">{appts[0]?.datetime ? getDateLabel(appts[0].datetime) : date}</span>
                <div className="flex-1 h-px bg-slate-200"></div>
                <span className="text-xs text-slate-400 font-medium">{appts.length} appointment{appts.length !== 1 ? 's' : ''}</span>
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Patient</th>
                      <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Time</th>
                      <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Source</th>
                      <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {appts.map(apt => (
                      <tr key={apt.id} className="hover:bg-slate-50/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {apt.patient_name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div>
                              <div className="font-medium text-slate-800 text-sm">{apt.patient_name}</div>
                              <div className="text-xs text-slate-400">{apt.patient_phone}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 font-medium">{apt.appointment_type}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-sm text-slate-600">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {apt.datetime ? format(parseISO(apt.datetime), 'h:mm a') : '—'}
                            <span className="text-slate-400 text-xs">({apt.duration_minutes}m)</span>
                          </div>
                        </td>
                        <td className="px-6 py-4"><StatusBadge status={apt.status} /></td>
                        <td className="px-6 py-4">
                          <span className={`text-xs font-semibold px-2 py-1 rounded-md ${apt.booked_by === 'ai' ? 'bg-violet-50 text-violet-600' : 'bg-slate-100 text-slate-500'}`}>
                            {apt.booked_by === 'ai' ? '🤖 AI' : '👤 Staff'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {apt.status === 'scheduled' && (
                              <button
                                onClick={() => updateStatus(apt.id, 'confirmed')}
                                disabled={updatingId === apt.id}
                                className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
                                title="Confirm"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            )}
                            {(apt.status === 'scheduled' || apt.status === 'confirmed') && (
                              <>
                                <button
                                  onClick={() => updateStatus(apt.id, 'no_show')}
                                  disabled={updatingId === apt.id}
                                  className="p-1.5 text-amber-500 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-50"
                                  title="Mark No-Show"
                                >
                                  <AlertCircle className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => updateStatus(apt.id, 'cancelled')}
                                  disabled={updatingId === apt.id}
                                  className="p-1.5 text-rose-400 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
                                  title="Cancel"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            {apt.status === 'confirmed' && (
                              <button
                                onClick={() => updateStatus(apt.id, 'completed')}
                                disabled={updatingId === apt.id}
                                className="px-3 py-1 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg font-medium transition-colors disabled:opacity-50"
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
