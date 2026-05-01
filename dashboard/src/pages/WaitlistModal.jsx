import React, { useState, useEffect } from "react";
import { X, UserPlus, PhoneOutgoing, AlertCircle } from "lucide-react";
import api from "../lib/api";

const CLINIC_TZ = "America/Chicago";

const fmtClinicDate = (iso) => {
  if (!iso) return "Unknown";
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: CLINIC_TZ,
  });
};

const WaitlistModal = ({ appointment, onClose }) => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [offeringId, setOfferingId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCandidates = async () => {
      try {
        const res = await api.get("/waitlist");
        // Filter candidates that match the appointment type (optional, but good for UX)
        // Waitlist matches might be more complex, but we'll just show all pending for now
        // and highlight exact matches.
        setCandidates(res.data.data || []);
      } catch (err) {
        setError("Failed to fetch waitlist");
      } finally {
        setLoading(false);
      }
    };
    fetchCandidates();
  }, []);

  const offerSlot = async (waitlistId) => {
    setOfferingId(waitlistId);
    setError(null);
    try {
      await api.post("/waitlist/offer", {
        waitlistId,
        dateStr: appointment.datetime, // Offer the cancelled slot's time
      });
      // Optionally show success
      onClose(); 
    } catch (err) {
      setError(err.response?.data?.error || "Failed to trigger waitlist call");
      setOfferingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-surface w-full max-w-xl rounded-2xl shadow-premium overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-surface-container">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <UserPlus className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-on-surface">Find Replacement</h2>
          </div>
          <button onClick={onClose} className="p-2 text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto max-h-[60vh]">
          <div className="bg-surface-container-lowest p-3 rounded-lg border border-surface-container mb-4">
            <p className="text-xs text-on-surface-variant font-medium uppercase tracking-wider mb-1">Cancelled Slot Info</p>
            <p className="text-sm font-bold text-on-surface">{fmtClinicDate(appointment.datetime)}</p>
            <p className="text-xs text-on-surface-variant mt-0.5">{appointment.appointment_type} ({appointment.duration_minutes} min)</p>
          </div>

          {error && (
            <div className="mb-4 bg-rose-50 text-rose-600 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <h3 className="text-sm font-bold text-on-surface mb-3">Waitlist Candidates</h3>
          
          {loading ? (
            <div className="py-8 flex justify-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div></div>
          ) : candidates.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-on-surface-variant">No pending waitlist candidates found.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {candidates.map((c) => {
                const isExactMatch = c.appointment_type === appointment.appointment_type;
                return (
                  <div key={c.id} className="flex items-center justify-between p-3 rounded-xl border border-surface-container hover:bg-surface-container/50 transition-colors">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm text-on-surface">{c.patients?.name || "Unknown Patient"}</p>
                        {isExactMatch && <span className="text-[0.6rem] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold uppercase">Exact Match</span>}
                      </div>
                      <p className="text-xs text-on-surface-variant mt-0.5">Prefers: {c.appointment_type}</p>
                    </div>
                    <button
                      onClick={() => offerSlot(c.id)}
                      disabled={offeringId !== null}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                      style={{ backgroundColor: "#1a3a2e", color: "white" }}
                    >
                      {offeringId === c.id ? (
                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <PhoneOutgoing className="w-3 h-3" />
                      )}
                      {offeringId === c.id ? "Calling AI..." : "Offer Slot"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WaitlistModal;
