import React, { useEffect, useState } from 'react';
import { Phone, PlayCircle, Clock, PhoneIncoming, PhoneOutgoing, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import api from '../lib/api';
import { format, parseISO, formatDistanceToNow } from 'date-fns';

const OUTCOME_CONFIG = {
  booked:       { label: 'Booked', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  completed:    { label: 'Completed', bg: 'bg-blue-50', text: 'text-blue-700' },
  no_answer:    { label: 'No Answer', bg: 'bg-slate-100', text: 'text-slate-500' },
  voicemail:    { label: 'Voicemail', bg: 'bg-amber-50', text: 'text-amber-700' },
  cancelled:    { label: 'Cancelled', bg: 'bg-rose-50', text: 'text-rose-600' },
};

const CallLogs = () => {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const fetchCalls = async () => {
    setLoading(true);
    try {
      const res = await api.get('/calls?limit=50');
      setCalls(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCalls(); }, []);

  const filtered = filter === 'all' ? calls :
    filter === 'booked' ? calls.filter(c => c.outcome === 'booked') :
    calls.filter(c => c.direction === filter);

  const formatDuration = (secs) => {
    if (!secs) return '—';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">AI Call Logs</h1>
          <p className="text-slate-500 mt-1">{calls.length} call records</p>
        </div>
        <button onClick={fetchCalls} className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'all', label: 'All Calls' },
          { key: 'inbound', label: 'Inbound' },
          { key: 'outbound', label: 'Outbound' },
          { key: 'booked', label: '🎯 Bookings' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filter === f.key
                ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/20'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[1,2,3,4].map(i => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Phone className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-slate-500 font-medium">No call records yet</p>
            <p className="text-slate-400 text-sm mt-1">Calls appear here automatically when patients call</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Caller</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Outcome</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Duration</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">When</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Recording</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(call => {
                  const cfg = OUTCOME_CONFIG[call.outcome] || { label: call.outcome || 'Unknown', bg: 'bg-slate-100', text: 'text-slate-500' };
                  return (
                    <tr key={call.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${call.direction === 'inbound' ? 'bg-blue-50 text-blue-500' : 'bg-violet-50 text-violet-500'}`}>
                            {call.direction === 'inbound' ? <PhoneIncoming className="w-4 h-4" /> : <PhoneOutgoing className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="font-medium text-slate-800 text-sm">{call.from_number || 'Unknown'}</div>
                            <div className="text-xs text-slate-400 capitalize">{call.direction}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg capitalize">
                          {call.call_type || 'general'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
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
                        {call.started_at ? formatDistanceToNow(parseISO(call.started_at), { addSuffix: true }) : '—'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {call.recording_url ? (
                          <a
                            href={call.recording_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-brand-500 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                          >
                            <PlayCircle className="w-4 h-4" /> Listen
                          </a>
                        ) : (
                          <span className="text-xs text-slate-300 font-medium">No recording</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CallLogs;
