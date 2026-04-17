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
const PatientDetail = ({ patient, detail, loading }) => {
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
      <div className="p-6 bg-surface-container-lowest">
        {/* Name + avatar + actions */}
        <div className="flex items-start gap-4 mb-5">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0"
            style={{ backgroundColor: style.bg, color: style.text }}
          >
            {initials(patient.name)}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-light text-on-surface tracking-tight">{patient.name}</h2>
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
          {/* Quick action buttons */}
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={() => setShowBookApptModal(true)} className="btn-primary text-xs py-2 px-3">
              <Calendar className="w-3.5 h-3.5" />
              Book Appt
            </button>
            <button onClick={() => setShowMessageModal(true)} className="btn-secondary text-xs py-2 px-3">
              <MessageSquare className="w-3.5 h-3.5" />
              Message
            </button>
          </div>
        </div>

        {/* Contact info */}
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

  const fetchPatients = useCallback(async (searchTerm = "", page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 50 });
      if (searchTerm) params.set("search", searchTerm);
      const res = await api.get(`/patients?${params}`);
      setPatients(res.data.data || []);
      setMeta(res.data.meta || { total: 0, page: 1 });
    } catch (err) {
      console.error("Failed to fetch patients", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPatients(search);
  }, [search]);

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
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left — patient list */}
        <div className="w-[300px] flex flex-col card overflow-hidden flex-shrink-0">
          {/* Filter chips */}
          <div className="p-3 flex items-center gap-1.5">
            {["All", "Recent", "Flagged"].map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
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
        <div className="flex-1 card overflow-hidden">
          <PatientDetail
            patient={selectedPatient}
            detail={detail}
            loading={detailLoading}
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
                <label className="overline mb-1 block">Full Name</label>
                <input type="text" className="w-full bg-surface-container rounded-lg px-3 py-2 text-sm outline-none" placeholder="e.g. Michael Scott" />
              </div>
              <div>
                <label className="overline mb-1 block">Phone Number</label>
                <input type="text" className="w-full bg-surface-container rounded-lg px-3 py-2 text-sm outline-none" placeholder="+1 (555) 000-0000" />
              </div>
              <div>
                <label className="overline mb-1 block">Email (optional)</label>
                <input type="email" className="w-full bg-surface-container rounded-lg px-3 py-2 text-sm outline-none" placeholder="michael@example.com" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowAddPatientModal(false)} className="px-4 py-2 text-sm font-semibold text-on-surface hover:bg-surface-container rounded-lg transition-colors">Cancel</button>
              <button onClick={() => setShowAddPatientModal(false)} className="btn-primary text-sm px-5 py-2">Save Patient</button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Book Appointment Modal */}
      {showBookApptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="card w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-lg font-bold text-on-surface mb-1">Book Appointment</h2>
            <p className="text-xs text-on-surface-variant mb-5">Schedule a visit for {detail?.name || "the patient"}.</p>
            <div className="space-y-4">
              <div>
                <label className="overline mb-1 block">Service Type</label>
                <select className="w-full bg-surface-container rounded-lg px-3 py-2 text-sm outline-none border-r-8 border-transparent">
                  <option>Initial Evaluation</option>
                  <option>Follow-up</option>
                  <option>Routine Checkup</option>
                  <option>Consultation</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="overline mb-1 block">Date</label>
                  <input type="date" className="w-full bg-surface-container rounded-lg px-3 py-2 text-sm outline-none text-on-surface-variant" />
                </div>
                <div>
                  <label className="overline mb-1 block">Time</label>
                  <input type="time" className="w-full bg-surface-container rounded-lg px-3 py-2 text-sm outline-none text-on-surface-variant" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowBookApptModal(false)} className="px-4 py-2 text-sm font-semibold text-on-surface hover:bg-surface-container rounded-lg transition-colors">Cancel</button>
              <button onClick={() => setShowBookApptModal(false)} className="btn-primary text-sm px-5 py-2">Confirm Booking</button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Message Modal */}
      {showMessageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="card w-full max-w-lg p-6 flex flex-col h-[500px] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-surface-container pb-4 mb-4">
              <div>
                <h2 className="text-lg font-bold text-on-surface">Message Thread</h2>
                <p className="text-xs text-on-surface-variant">Conversation with {detail?.name}</p>
              </div>
              <button onClick={() => setShowMessageModal(false)} className="p-2 text-on-surface-variant hover:bg-surface-container rounded-full">
                <span className="sr-only">Close</span>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 1L1 13M1 1L13 13"/></svg>
              </button>
            </div>
            <div className="flex-1 bg-surface-container-lowest rounded-lg p-4 overflow-y-auto mb-4 border border-surface-container space-y-4">
              <div className="bg-surface-container p-3 rounded-lg w-[85%] rounded-tl-sm text-sm text-on-surface">
                Hi {detail?.name}, your appointment is confirmed for tomorrow.
              </div>
              <div className="bg-[#edf7e0] p-3 rounded-lg w-[85%] ml-auto rounded-tr-sm text-sm text-[#396a00]">
                Thank you! I will be there.
              </div>
            </div>
            <div className="flex gap-2">
              <input type="text" className="flex-1 bg-surface-container rounded-full px-4 py-2 text-sm outline-none" placeholder="Type a message..." />
              <button className="bg-primary hover:opacity-90 w-10 h-10 rounded-full flex items-center justify-center text-white flex-shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Chart Modal */}
      {showChartModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="card w-full max-w-3xl p-6 h-[80vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-surface-container pb-4 mb-4">
              <h2 className="text-lg font-bold text-on-surface">Full Clinical Chart - {detail?.name}</h2>
              <button onClick={() => setShowChartModal(false)} className="p-2 text-on-surface-variant hover:bg-surface-container rounded-full">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 1L1 13M1 1L13 13"/></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto pr-2 space-y-6">
              <div>
                <h3 className="font-bold text-on-surface mb-2">Patient Demographics</h3>
                <div className="bg-surface-container p-4 rounded-lg text-sm grid grid-cols-2 gap-4">
                  <div><span className="text-on-surface-variant block mb-1">Phone</span>+923172532350</div>
                  <div><span className="text-on-surface-variant block mb-1">Status</span>Active</div>
                  <div><span className="text-on-surface-variant block mb-1">Date of Birth</span>12/04/1990</div>
                </div>
              </div>
              <div>
                <h3 className="font-bold text-on-surface mb-2">Visit History</h3>
                <div className="bg-surface-container p-4 rounded-lg text-sm space-y-3">
                  <div className="flex justify-between border-b border-surface pb-2">
                    <span>Initial Evaluation</span><span className="text-on-surface-variant">Apr 21, 2026</span>
                  </div>
                  <div className="flex justify-between border-b border-surface pb-2">
                    <span>Follow-up</span><span className="text-on-surface-variant">Apr 20, 2026</span>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="font-bold text-on-surface mb-2">Physician Notes</h3>
                <div className="bg-[#fff8e1] p-4 rounded-lg text-sm text-[#8a6000]">
                  Patient reported mild discomfort in lower back. Recommended standard physiotherapy rotation. Follow-up scheduled.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Patients;

