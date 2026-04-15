import React, { useEffect, useState, useCallback } from 'react';
import { Search, MoreVertical, FileText, X, Phone, Calendar, MessageSquare, Plus, ChevronRight } from 'lucide-react';
import api from '../lib/api';
import { format, parseISO } from 'date-fns';

// ─── Patient Detail Slide-over ────────────────────────────────
const PatientDetail = ({ patientId, onClose }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patientId) return;
    api.get(`/patients/${patientId}`)
      .then(res => setData(res.data.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [patientId]);

  const getStatusBadge = (status) => {
    const styles = {
      scheduled: 'bg-amber-50 text-amber-600',
      confirmed: 'bg-emerald-50 text-emerald-600',
      cancelled: 'bg-rose-50 text-rose-600',
      completed: 'bg-blue-50 text-blue-600',
      no_show: 'bg-slate-100 text-slate-500',
    };
    return <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[status] || 'bg-slate-100 text-slate-500'}`}>{status}</span>;
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-slide-in">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800">{data?.patient?.name || 'Loading...'}</h2>
            <p className="text-sm text-slate-500">{data?.patient?.phone}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-brand-50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-brand-600">{data?.patient?.total_visits || 0}</div>
                  <div className="text-xs text-slate-500 mt-1 font-medium">Total Visits</div>
                </div>
                <div className="bg-amber-50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-amber-600">{data?.patient?.no_show_count || 0}</div>
                  <div className="text-xs text-slate-500 mt-1 font-medium">No-Shows</div>
                </div>
                <div className="bg-emerald-50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-emerald-600">{data?.appointments?.filter(a => a.status === 'completed').length || 0}</div>
                  <div className="text-xs text-slate-500 mt-1 font-medium">Completed</div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-brand-500" /> Appointment History
                </h3>
                {data?.appointments?.length === 0 ? (
                  <p className="text-sm text-slate-400 py-4 text-center">No appointments yet</p>
                ) : (
                  <div className="space-y-2">
                    {data?.appointments?.map(apt => (
                      <div key={apt.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                        <div>
                          <div className="text-sm font-medium text-slate-700">{apt.appointment_type}</div>
                          <div className="text-xs text-slate-400">{apt.datetime ? format(parseISO(apt.datetime), 'MMM d, yyyy h:mm a') : '—'}</div>
                        </div>
                        {getStatusBadge(apt.status)}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-brand-500" /> Call History
                </h3>
                {data?.calls?.length === 0 ? (
                  <p className="text-sm text-slate-400 py-4 text-center">No calls yet</p>
                ) : (
                  <div className="space-y-2">
                    {data?.calls?.map(call => (
                      <div key={call.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                        <div>
                          <div className="text-sm font-medium text-slate-700 capitalize">{call.direction} — {call.call_type}</div>
                          <div className="text-xs text-slate-400">{call.duration_seconds}s · {call.outcome}</div>
                        </div>
                        <span className="text-xs text-slate-400">{call.started_at ? format(parseISO(call.started_at), 'MMM d') : '—'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-brand-500" /> SMS History
                </h3>
                {data?.smsMessages?.length === 0 ? (
                  <p className="text-sm text-slate-400 py-4 text-center">No SMS messages yet</p>
                ) : (
                  <div className="space-y-2">
                    {data?.smsMessages?.map(sms => (
                      <div key={sms.id} className={`p-3 rounded-xl text-sm ${sms.direction === 'inbound' ? 'bg-blue-50 text-blue-800' : 'bg-slate-50 text-slate-700'}`}>
                        <div className="font-medium mb-0.5 capitalize">{sms.direction} · {sms.sms_type}</div>
                        <div className="text-xs opacity-75">{sms.body}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main Patients Page ───────────────────────────────────────
const Patients = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [meta, setMeta] = useState({ total: 0, page: 1 });
  const [selectedPatientId, setSelectedPatientId] = useState(null);

  const fetchPatients = useCallback(async (searchTerm = '', page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 50 });
      if (searchTerm) params.set('search', searchTerm);
      const res = await api.get(`/patients?${params}`);
      setPatients(res.data.data || []);
      setMeta(res.data.meta || { total: 0, page: 1 });
    } catch (err) {
      console.error('Failed to fetch patients', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPatients(search); }, [search]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  return (
    <div className="space-y-6">
      {selectedPatientId && (
        <PatientDetail patientId={selectedPatientId} onClose={() => setSelectedPatientId(null)} />
      )}

      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Patients Directory</h1>
          <p className="text-slate-500 mt-1">{meta.total || 0} total patients</p>
        </div>
        <button className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2.5 rounded-xl font-medium shadow-sm shadow-brand-500/20 transition-all">
          <Plus className="w-4 h-4" /> Add Patient
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center gap-4">
          <form onSubmit={handleSearch} className="relative w-full max-w-md flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name or phone..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 rounded-xl text-sm outline-none transition-all"
              />
            </div>
            <button type="submit" className="px-4 py-2 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 transition-colors">Search</button>
            {search && <button type="button" onClick={() => { setSearch(''); setSearchInput(''); }} className="px-3 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm hover:bg-slate-200 transition-colors">Clear</button>}
          </form>
        </div>

        {loading ? (
          <div className="p-8 space-y-3">
            {[1,2,3,4,5].map(i => <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />)}
          </div>
        ) : patients.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Search className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-slate-500 font-medium">No patients found</p>
            <p className="text-slate-400 text-sm mt-1">Patients appear here after their first call</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Patient</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Phone</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Last Visit</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Visits</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">No-Shows</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {patients.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer group" onClick={() => setSelectedPatientId(p.id)}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
                          {p.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <span className="font-medium text-slate-800 group-hover:text-brand-600 transition-colors">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{p.phone}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {p.last_visit_date ? format(parseISO(p.last_visit_date), 'MMM d, yyyy') : <span className="text-slate-300">Never</span>}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-700">{p.total_visits || 0}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 rounded-md text-xs font-medium ${p.no_show_count > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
                        {p.no_show_count || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="inline-flex items-center gap-1 text-brand-500 hover:text-brand-700 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        View <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Patients;
