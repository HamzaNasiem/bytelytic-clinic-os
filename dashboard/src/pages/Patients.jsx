import React, { useEffect, useState, useCallback } from "react";
import {
  Search,
  X,
  Calendar,
  Phone,
  MessageSquare,
  Plus,
  ArrowUpRight,
  CheckCircle2,
} from "lucide-react";
import api from "../lib/api";
import { format, parseISO, differenceInYears } from "date-fns";

/* ─── Helpers ─────────────────────────────────────────────── */
const initials = (name) =>
  (name || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const AVATAR_COLORS = [
  { bg: "#d4e8c1", text: "#2a5200" },
  { bg: "#c8d9e8", text: "#004d78" },
  { bg: "#e8d4c1", text: "#7a3500" },
  { bg: "#d4c1e8", text: "#4a1a70" },
  { bg: "#fce4ec", text: "#880e4f" },
];
const avatarStyle = (name) =>
  AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

const STATUS_DOT = {
  scheduled: "#006493",
  confirmed: "#396a00",
  cancelled: "#b71c1c",
  completed: "#7b1fa2",
  no_show: "#6d4c41",
};

/* ─── Patient Detail Panel ────────────────────────────────── */
const PatientDetail = ({ patient, detail, loading, activeFilter, onBook, onMessage, onRecall, onClose }) => {
  if (!patient) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-on-surface-variant p-8 text-center">
        <div className="w-16 h-16 bg-surface-container rounded-[0.75rem] flex items-center justify-center mx-auto mb-4">
          <Search className="w-7 h-7 text-on-surface-variant/30" />
        </div>
        <p className="font-semibold text-on-surface">Select a patient</p>
        <p className="text-sm mt-1 text-on-surface-variant/60">
          Click any patient to view their full history
        </p>
      </div>
    );
  }

  const style = avatarStyle(patient.name);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Top profile section */}
      <div className="p-6 bg-surface-container-lowest relative">
        <button
          onClick={onClose}
          className="lg:hidden absolute top-4 right-4 p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        {/* Name + avatar + actions */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-5">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0"
              style={{ backgroundColor: style.bg, color: style.text }}
            >
              {initials(patient.name)}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-light text-on-surface tracking-tight break-words">{patient.name}</h2>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                {patient.date_of_birth && (
                  <span className="text-xs text-on-surface-variant">
                    DOB: {format(parseISO(patient.date_of_birth), "MMM d, yyyy")}
                  </span>
                )}
                <span
                  className="text-[0.65rem] font-bold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: "#edf7e0", color: "#396a00" }}
                >
                  Active Patient
                </span>
              </div>
            </div>
          </div>
          {/* Quick action buttons */}
          <div className="flex gap-2 flex-wrap flex-shrink-0 w-full sm:w-auto">
            {activeFilter === "Recall" && (
              <button 
                onClick={onRecall}
                className="flex-1 sm:flex-none justify-center btn-primary text-xs py-2 px-3"
                style={{ backgroundColor: "#396a00" }}
              >
                <Phone className="w-3.5 h-3.5 mr-1" />
                Start Recall
              </button>
            )}
            <button onClick={onBook} className="flex-1 sm:flex-none justify-center btn-primary text-xs py-2 px-3">
              <Calendar className="w-3.5 h-3.5 mr-1" />
              Book Appt
            </button>
            <button onClick={onMessage} className="flex-1 sm:flex-none justify-center btn-secondary text-xs py-2 px-3">
              <MessageSquare className="w-3.5 h-3.5 mr-1" />
              Message
            </button>
          </div>
        </div>

        {/* Contact + Insurance info */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-surface-container rounded-[0.75rem] p-3">
            <p className="overline mb-1">Mobile</p>
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-on-surface-variant" />
              <p className="text-sm font-semibold text-on-surface">{patient.phone}</p>
            </div>
          </div>
          {patient.email && (
            <div className="bg-surface-container rounded-[0.75rem] p-3">
              <p className="overline mb-1">Email</p>
              <p className="text-sm font-semibold text-on-surface truncate">{patient.email}</p>
            </div>
          )}
          {(patient.insurance_provider || detail?.patient?.insurance_provider) && (
            <div className="bg-surface-container rounded-[0.75rem] p-3">
              <p className="overline mb-1">Insurance</p>
              <p className="text-sm font-semibold text-on-surface truncate">
                {detail?.patient?.insurance_provider || patient.insurance_provider}
              </p>
              {detail?.patient?.insurance_member_id && (
                <p className="text-xs text-on-surface-variant mt-0.5">ID: {detail.patient.insurance_member_id}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Clinical summary */}
      <div className="px-6 py-4 bg-surface-container-lowest border-t border-surface-container">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-on-surface">Clinical Summary</h3>
          <button onClick={() => setShowChartModal(true)} className="text-[0.7rem] font-bold text-primary hover:opacity-70 tracking-wide uppercase">
            View Full Chart
          </button>
        </div>
        {loading ? (
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-surface-container rounded-[0.75rem] animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="overline mb-1">Last Visit</p>
              <p className="text-sm font-semibold text-on-surface">
                {patient.last_visit_date
                  ? format(parseISO(patient.last_visit_date), "MMM d, yyyy")
                  : "—"}
              </p>
            </div>
            <div>
              <p className="overline mb-1">Total Visits</p>
              <p className="text-sm font-semibold text-on-surface">{patient.total_visits || 0}</p>
            </div>
            <div>
              <p className="overline mb-1">No-Shows</p>
              <p
                className="text-sm font-semibold"
                style={{ color: (patient.no_show_count || 0) > 0 ? "#b71c1c" : "#396a00" }}
              >
                {patient.no_show_count || 0}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* History + Comms log */}
      <div className="flex-1 overflow-y-auto thin-scrollbar bg-surface">
        {loading ? (
          <div className="p-5 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-surface-container rounded-[0.75rem] animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-0 min-h-full">
            {/* Appointment history */}
            <div className="p-5 border-r border-surface-container">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-primary" />
                <h4 className="text-sm font-semibold text-on-surface">History</h4>
              </div>
              {!detail?.appointments?.length ? (
                <p className="text-xs text-on-surface-variant text-center py-6">
                  No appointments yet
                </p>
              ) : (
                <div className="space-y-3">
                  {detail.appointments.slice(0, 8).map((apt) => (
                    <div key={apt.id} className="flex gap-3">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{
                          backgroundColor:
                            apt.status === "completed" ? "#edf7e0" : "#edf1ef",
                        }}
                      >
                        <CheckCircle2
                          className="w-3 h-3"
                          style={{
                            color:
                              apt.status === "completed" ? "#396a00" : "#9a9a9a",
                          }}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-on-surface truncate">
                            {apt.appointment_type}
                          </p>
                          <p className="text-xs text-on-surface-variant flex-shrink-0">
                            {apt.datetime
                              ? format(parseISO(apt.datetime), "MMM d, yyyy")
                              : "—"}
                          </p>
                        </div>
                        {apt.notes && (
                          <p className="text-xs text-on-surface-variant mt-0.5 line-clamp-2">
                            {apt.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Comms log */}
            <div className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="w-4 h-4 text-tertiary" />
                <h4 className="text-sm font-semibold text-on-surface">Comms Log</h4>
              </div>
              {!detail?.calls?.length && !detail?.smsMessages?.length ? (
                <p className="text-xs text-on-surface-variant text-center py-6">
                  No communications yet
                </p>
              ) : (
                <div className="space-y-3">
                  {/* Calls */}
                  {(detail?.calls || []).slice(0, 3).map((call) => (
                    <div key={call.id} className="relative pl-4">
                      <div
                        className="absolute left-0 top-0 bottom-0 w-0.5 rounded-full"
                        style={{
                          backgroundColor:
                            call.direction === "outbound" ? "#396a00" : "#006493",
                        }}
                      />
                      <p className="overline mb-0.5">
                        {call.direction === "outbound" ? "↗ Outbound" : "↙ Inbound"} Call
                        {call.started_at
                          ? " · " +
                            format(parseISO(call.started_at), "MMM d, h:mm a")
                          : ""}
                      </p>
                      <p className="text-xs text-on-surface leading-relaxed">
                        {call.transcript
                          ? call.transcript.slice(0, 80) + "..."
                          : `${call.call_type} call — ${call.outcome || "completed"}`}
                      </p>
                    </div>
                  ))}
                  {/* SMS */}
                  {(detail?.smsMessages || []).slice(0, 3).map((sms) => (
                    <div key={sms.id} className="relative pl-4">
                      <div
                        className="absolute left-0 top-0 bottom-0 w-0.5 rounded-full"
                        style={{
                          backgroundColor:
                            sms.direction === "inbound" ? "#396a00" : "#585d77",
                        }}
                      />
                      <p className="overline mb-0.5">
                        {sms.direction === "inbound" ? "📩 SMS Received" : "📤 Automated SMS"}
                        {sms.created_at
                          ? " · " +
                            format(parseISO(sms.created_at), "MMM d, h:mm a")
                          : ""}
                      </p>
                      <p className="text-xs text-on-surface leading-relaxed">
                        {sms.body}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── Main Patients Page ──────────────────────────────────── */
const Patients = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [meta, setMeta] = useState({ total: 0, page: 1 });
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");

  // Modals state
  const [showAddPatientModal, setShowAddPatientModal] = useState(false);
  const [showBookApptModal, setShowBookApptModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showChartModal, setShowChartModal] = useState(false);

  // Book Appointment form
  const [bookForm, setBookForm] = useState({ appointment_type: 'Initial Evaluation', date: '', time: '', duration_minutes: 60 });
  const [bookSaving, setBookSaving] = useState(false);
  const [bookError, setBookError] = useState('');

  // Message form
  const [msgText, setMsgText] = useState('');
  const [msgSending, setMsgSending] = useState(false);
  const [msgError, setMsgError] = useState('');
  const [msgSent, setMsgSent] = useState(false);

  // Add Patient form
  const [addForm, setAddForm] = useState({ name: '', phone: '', email: '', date_of_birth: '', insurance_provider: '' });
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState('');

  const fetchPatients = useCallback(async (searchTerm = "", page = 1, filterType = "All") => {
    setLoading(true);
    try {
      if (filterType === "Recall") {
        const res = await api.get('/patients/recall-candidates');
        setPatients(res.data.data || []);
        setMeta({ total: res.data.data?.length || 0, page: 1 });
      } else {
        const params = new URLSearchParams({ page, limit: 50 });
        if (searchTerm) params.set("search", searchTerm);
        const res = await api.get(`/patients?${params}`);
        setPatients(res.data.data || []);
        setMeta(res.data.meta || { total: 0, page: 1 });
      }
    } catch (err) {
      console.error("Failed to fetch patients", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPatients(search, 1, activeFilter);
  }, [search, activeFilter]);

  const selectPatient = async (p) => {
    setSelectedPatient(p);
    setDetailLoading(true);
    setDetail(null);
    try {
      const res = await api.get(`/patients/${p.id}`);
      setDetail(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 pb-8 h-[calc(100vh-56px)]">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex justify-between items-end flex-wrap gap-4 flex-shrink-0">
        <div>
          <h1 className="text-[1.75rem] font-medium text-on-surface tracking-tight">
            Directory
          </h1>
          <p className="text-sm text-on-surface-variant mt-0.5">
            <span className="font-bold text-on-surface">{meta.total || 0}</span> Total
          </p>
        </div>
        <button onClick={() => setShowAddPatientModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          Add Patient
        </button>
      </div>

      {/* ── Split layout ─────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0 pb-10 lg:pb-0 overflow-y-auto lg:overflow-hidden">
        {/* Left — patient list */}
        <div className={`w-full lg:w-[300px] h-[400px] lg:h-auto flex-col card overflow-hidden flex-shrink-0 ${selectedPatient ? 'hidden lg:flex' : 'flex'}`}>
          {/* Filter chips */}
          <div className="p-3 flex items-center gap-1.5 overflow-x-auto thin-scrollbar">
            {["All", "Recent", "Flagged", "Recall"].map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                  activeFilter === f
                    ? "text-white"
                    : "bg-surface-container text-on-surface-variant hover:text-on-surface"
                }`}
                style={activeFilter === f ? { backgroundColor: "#396a00" } : {}}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="px-3 pb-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSearch(searchInput);
              }}
              className="relative"
            >
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
              <input
                type="text"
                placeholder="Search by name or phone..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-8 pr-8 py-2 bg-surface-container rounded-[0.625rem] text-sm outline-none text-on-surface placeholder-on-surface-variant/40"
                style={{ border: "none" }}
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => { setSearch(""); setSearchInput(""); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </form>
          </div>

          {/* Patient list */}
          <div className="flex-1 overflow-y-auto thin-scrollbar">
            {loading ? (
              <div className="p-3 space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-14 bg-surface-container rounded-[0.75rem] animate-pulse" />
                ))}
              </div>
            ) : patients.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-on-surface-variant">No patients found</p>
              </div>
            ) : (
              patients.map((p) => {
                const isActive = selectedPatient?.id === p.id;
                const style = avatarStyle(p.name);
                return (
                  <button
                    key={p.id}
                    onClick={() => selectPatient(p)}
                    className={`w-full flex items-center gap-3 px-3 py-3 text-left transition-all border-l-2 ${
                      isActive
                        ? "border-primary bg-surface-container"
                        : "border-transparent hover:bg-surface-container"
                    }`}
                  >
                    {/* Avatar or initials */}
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: style.bg, color: style.text }}
                    >
                      {initials(p.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-on-surface text-sm truncate">{p.name}</p>
                        {p.last_visit_date && (
                          <span className="text-[0.6rem] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: "#edf7e0", color: "#396a00" }}>
                            UPCOMING
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-on-surface-variant">
                        {p.last_visit_date
                          ? "Last: " + format(parseISO(p.last_visit_date), "MMM d")
                          : p.phone}
                      </p>
                    </div>
                    {p.last_visit_date && (
                      <span className="text-[0.65rem] text-on-surface-variant flex-shrink-0">
                        {format(parseISO(p.last_visit_date), "MMM d")}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right — detail panel */}
        <div className={`flex-1 min-h-[500px] lg:min-h-0 card overflow-hidden ${!selectedPatient ? 'hidden lg:flex' : 'flex flex-col'}`}>
          <PatientDetail
            patient={selectedPatient}
            detail={detail}
            loading={detailLoading}
            activeFilter={activeFilter}
            onBook={() => { setShowBookApptModal(true); setBookForm({ appointment_type: 'Initial Evaluation', date: '', time: '', duration_minutes: 60 }); setBookError(''); }}
            onMessage={() => { setShowMessageModal(true); setMsgText(''); setMsgError(''); }}
            onRecall={async () => {
              try {
                await api.post(`/patients/recall/${selectedPatient.id}`);
                alert("Recall call initiated! Check Retell or Call Logs shortly.");
              } catch (e) {
                alert("Failed to initiate recall: " + (e.response?.data?.error || e.message));
              }
            }}
            onClose={() => setSelectedPatient(null)}
          />
        </div>
      </div>

      {/* ── MODALS ───────────────────────────────────────────── */}

      {/* 1. Add Patient Modal */}
      {showAddPatientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="card w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-lg font-bold text-on-surface mb-1">Add New Patient</h2>
            <p className="text-xs text-on-surface-variant mb-5">Enter patient details to create their profile.</p>
            <div className="space-y-4">
              <div>
                <label className="overline mb-1 block">Full Name *</label>
                <input type="text" className="w-full bg-surface-container rounded-lg px-3 py-2 text-sm outline-none text-on-surface" placeholder="e.g. John Smith" value={addForm.name} onChange={e => setAddForm(f=>({...f,name:e.target.value}))} />
              </div>
              <div>
                <label className="overline mb-1 block">Phone Number *</label>
                <input type="text" className="w-full bg-surface-container rounded-lg px-3 py-2 text-sm outline-none text-on-surface" placeholder="+1 (555) 000-0000" value={addForm.phone} onChange={e => setAddForm(f=>({...f,phone:e.target.value}))} />
              </div>
              <div>
                <label className="overline mb-1 block">Email (optional)</label>
                <input type="email" className="w-full bg-surface-container rounded-lg px-3 py-2 text-sm outline-none text-on-surface" placeholder="john@example.com" value={addForm.email} onChange={e => setAddForm(f=>({...f,email:e.target.value}))} />
              </div>
              <div>
                <label className="overline mb-1 block">Insurance Provider (optional)</label>
                <input type="text" className="w-full bg-surface-container rounded-lg px-3 py-2 text-sm outline-none text-on-surface" placeholder="e.g. Blue Cross" value={addForm.insurance_provider} onChange={e => setAddForm(f=>({...f,insurance_provider:e.target.value}))} />
              </div>
            </div>
            {addError && <p className="text-xs text-red-600 mt-3">{addError}</p>}
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowAddPatientModal(false)} className="px-4 py-2 text-sm font-semibold text-on-surface hover:bg-surface-container rounded-lg transition-colors">Cancel</button>
              <button disabled={addSaving} onClick={async () => {
                setAddError('');
                if (!addForm.name || !addForm.phone) { setAddError('Name and phone are required.'); return; }
                setAddSaving(true);
                try {
                  await api.post('/patients', addForm);
                  fetchPatients();
                  setShowAddPatientModal(false);
                  setAddForm({ name:'', phone:'', email:'', date_of_birth:'', insurance_provider:'' });
                } catch(err) { setAddError(err.response?.data?.error || 'Failed to save patient.'); }
                finally { setAddSaving(false); }
              }} className="btn-primary text-sm px-5 py-2 disabled:opacity-50">{addSaving ? 'Saving...' : 'Save Patient'}</button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Book Appointment Modal */}
      {showBookApptModal && selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="card w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-lg font-bold text-on-surface mb-1">Book Appointment</h2>
            <p className="text-xs text-on-surface-variant mb-5">Schedule a visit for <strong>{selectedPatient.name}</strong>.</p>
            <div className="space-y-4">
              <div>
                <label className="overline mb-1 block">Service Type</label>
                <select className="w-full bg-surface-container rounded-lg px-3 py-2 text-sm outline-none border-r-8 border-transparent text-on-surface" value={bookForm.appointment_type} onChange={e=>setBookForm(f=>({...f,appointment_type:e.target.value}))}>
                  <option>Initial Evaluation</option>
                  <option>Follow-up</option>
                  <option>Routine Checkup</option>
                  <option>Consultation</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="overline mb-1 block">Date *</label>
                  <input type="date" className="w-full bg-surface-container rounded-lg px-3 py-2 text-sm outline-none text-on-surface" value={bookForm.date} onChange={e=>setBookForm(f=>({...f,date:e.target.value}))} />
                </div>
                <div>
                  <label className="overline mb-1 block">Time *</label>
                  <input type="time" className="w-full bg-surface-container rounded-lg px-3 py-2 text-sm outline-none text-on-surface" value={bookForm.time} onChange={e=>setBookForm(f=>({...f,time:e.target.value}))} />
                </div>
              </div>
              <div>
                <label className="overline mb-1 block">Duration</label>
                <select className="w-full bg-surface-container rounded-lg px-3 py-2 text-sm outline-none border-r-8 border-transparent text-on-surface" value={bookForm.duration_minutes} onChange={e=>setBookForm(f=>({...f,duration_minutes:e.target.value}))}>
                  <option value={30}>30 min</option>
                  <option value={60}>60 min</option>
                  <option value={90}>90 min</option>
                </select>
              </div>
            </div>
            {bookError && <p className="text-xs text-red-600 mt-3">{bookError}</p>}
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowBookApptModal(false)} className="px-4 py-2 text-sm font-semibold text-on-surface hover:bg-surface-container rounded-lg transition-colors">Cancel</button>
              <button disabled={bookSaving} onClick={async () => {
                setBookError('');
                if (!bookForm.date || !bookForm.time) { setBookError('Date and time are required.'); return; }
                setBookSaving(true);
                try {
                  const datetime = new Date(`${bookForm.date}T${bookForm.time}:00`).toISOString();
                  await api.post('/appointments', {
                    patient_id: selectedPatient.id,
                    patient_name: selectedPatient.name,
                    patient_phone: selectedPatient.phone,
                    appointment_type: bookForm.appointment_type,
                    datetime,
                    duration_minutes: Number(bookForm.duration_minutes),
                  });
                  fetchPatients();
                  setShowBookApptModal(false);
                } catch(err) { setBookError(err.response?.data?.error || 'Failed to book appointment.'); }
                finally { setBookSaving(false); }
              }} className="btn-primary text-sm px-5 py-2 disabled:opacity-50">{bookSaving ? 'Booking...' : 'Confirm Booking'}</button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Message Modal */}
      {showMessageModal && selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="card w-full max-w-lg p-6 flex flex-col" style={{maxHeight:'90vh'}}>
            <div className="flex items-center justify-between border-b border-surface-container pb-4 mb-4">
              <div>
                <h2 className="text-lg font-bold text-on-surface">Send SMS</h2>
                <p className="text-xs text-on-surface-variant">To: {selectedPatient.name} · {selectedPatient.phone}</p>
              </div>
              <button onClick={() => setShowMessageModal(false)} className="p-2 text-on-surface-variant hover:bg-surface-container rounded-full">
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* SMS history */}
            <div className="flex-1 bg-surface-container-lowest rounded-lg p-4 overflow-y-auto mb-4 border border-surface-container space-y-3 min-h-[160px]">
              {(detail?.smsMessages || []).length === 0 ? (
                <p className="text-xs text-on-surface-variant text-center py-4">No messages yet</p>
              ) : (
                (detail?.smsMessages || []).slice().reverse().map(sms => (
                  <div key={sms.id} className={`p-3 rounded-lg text-sm max-w-[85%] ${sms.direction==='inbound' ? 'bg-surface-container text-on-surface rounded-tl-sm' : 'bg-[#edf7e0] text-[#396a00] rounded-tr-sm ml-auto'}`}>
                    <p>{sms.body}</p>
                    <p className="text-[0.6rem] opacity-60 mt-1">{sms.direction === 'inbound' ? '← Patient' : '→ AI/Staff'}</p>
                  </div>
                ))
              )}
            </div>
            {msgSent && <p className="text-xs text-green-700 mb-2">✅ Message sent successfully!</p>}
            {msgError && <p className="text-xs text-red-600 mb-2">{msgError}</p>}
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 bg-surface-container rounded-full px-4 py-2 text-sm outline-none text-on-surface"
                placeholder="Type a message..."
                value={msgText}
                onChange={e => { setMsgText(e.target.value); setMsgSent(false); }}
                onKeyDown={async e => { if (e.key === 'Enter' && msgText.trim()) { /* trigger send */ } }}
              />
              <button
                disabled={msgSending || !msgText.trim()}
                className="bg-primary hover:opacity-90 w-10 h-10 rounded-full flex items-center justify-center text-white flex-shrink-0 disabled:opacity-40"
                onClick={async () => {
                  if (!msgText.trim()) return;
                  setMsgSending(true); setMsgError(''); setMsgSent(false);
                  try {
                    await api.post(`/patients/${selectedPatient.id}/message`, { message: msgText.trim() });
                    setMsgText('');
                    setMsgSent(true);
                    // Refresh detail to show new SMS
                    const res = await api.get(`/patients/${selectedPatient.id}`);
                    setDetail(res.data.data);
                  } catch(err) { setMsgError(err.response?.data?.error || 'Failed to send.'); }
                  finally { setMsgSending(false); }
                }}
              >
                {msgSending
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Chart Modal — uses real detail data */}
      {showChartModal && selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="card w-full max-w-3xl p-6 h-[80vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-surface-container pb-4 mb-4">
              <h2 className="text-lg font-bold text-on-surface">Full Clinical Chart — {selectedPatient.name}</h2>
              <button onClick={() => setShowChartModal(false)} className="p-2 text-on-surface-variant hover:bg-surface-container rounded-full">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto pr-2 space-y-6">
              {/* Demographics */}
              <div>
                <h3 className="font-bold text-on-surface mb-2">Patient Demographics</h3>
                <div className="bg-surface-container p-4 rounded-lg text-sm grid grid-cols-2 gap-4">
                  <div><span className="text-on-surface-variant block mb-1">Phone</span><span className="font-medium">{selectedPatient.phone || '—'}</span></div>
                  <div><span className="text-on-surface-variant block mb-1">Email</span><span className="font-medium">{detail?.patient?.email || selectedPatient.email || '—'}</span></div>
                  <div><span className="text-on-surface-variant block mb-1">Date of Birth</span><span className="font-medium">{detail?.patient?.date_of_birth ? format(parseISO(detail.patient.date_of_birth), 'MMM d, yyyy') : '—'}</span></div>
                  <div><span className="text-on-surface-variant block mb-1">Insurance</span><span className="font-medium">{detail?.patient?.insurance_provider || '—'}</span></div>
                  <div><span className="text-on-surface-variant block mb-1">Member ID</span><span className="font-medium">{detail?.patient?.insurance_member_id || '—'}</span></div>
                  <div><span className="text-on-surface-variant block mb-1">Total Visits</span><span className="font-medium">{selectedPatient.total_visits || 0}</span></div>
                </div>
              </div>
              {/* Visit History */}
              <div>
                <h3 className="font-bold text-on-surface mb-2">Visit History ({detail?.appointments?.length || 0} appointments)</h3>
                {detail?.appointments?.length ? (
                  <div className="bg-surface-container p-4 rounded-lg text-sm space-y-3">
                    {detail.appointments.map(apt => (
                      <div key={apt.id} className="flex justify-between border-b border-surface pb-2 last:border-0 last:pb-0">
                        <span>{apt.appointment_type}</span>
                        <span className="text-on-surface-variant">{apt.datetime ? format(parseISO(apt.datetime), 'MMM d, yyyy') : '—'}</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-on-surface-variant">No appointments on record.</p>}
              </div>
              {/* Notes */}
              {detail?.patient?.notes && (
                <div>
                  <h3 className="font-bold text-on-surface mb-2">Notes</h3>
                  <div className="bg-[#fff8e1] p-4 rounded-lg text-sm text-[#8a6000]">{detail.patient.notes}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Patients;

