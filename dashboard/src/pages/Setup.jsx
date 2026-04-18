import React, { useEffect, useState } from "react";
import {
  Bot,
  Calendar,
  CheckCircle,
  AlertCircle,
  Loader2,
  Copy,
  ExternalLink,
  Phone,
  MapPin,
  Mail,
  Save,
  Shield,
  Wifi,
  Database,
  AlertTriangle,
} from "lucide-react";
import api from "../lib/api";

/* ─── System Status Row ──────────────────────────────────── */
const StatusRow = ({ label, ok }) => (
  <div className="flex items-center gap-3 py-2">
    <span
      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
      style={{ backgroundColor: ok ? "#396a00" : "#e89e00" }}
    />
    <span className="text-sm text-on-surface flex-1">{label}</span>
    <span
      className="text-[0.65rem] font-bold"
      style={{ color: ok ? "#396a00" : "#8a5f00" }}
    >
      {ok ? "Active" : "Setup needed"}
    </span>
  </div>
);

/* ─── Field label + input combo ──────────────────────────── */
const FieldLabel = ({ children }) => (
  <p className="overline mb-1.5">{children}</p>
);

const ReadonlyField = ({ value }) => (
  <div className="px-4 py-3 bg-surface-container rounded-[0.75rem] text-sm text-on-surface">
    {value || "—"}
  </div>
);

/* ─── Main Setup Page ─────────────────────────────────────── */
const Setup = () => {
  const [clinic, setClinic] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [savingNumber, setSavingNumber] = useState(false);
  const [msg, setMsg] = useState(null);
  const [twilioNumber, setTwilioNumber] = useState("");

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isWiping, setIsWiping] = useState(false);

  useEffect(() => {
    const fetchClinic = async () => {
      try {
        const info = JSON.parse(localStorage.getItem("clinic-info") || "{}");
        if (!info.clinicId) {
          // No clinicId yet — still show the page, don't hang on spinner
          setLoading(false);
          return;
        }
        const res = await api.get(`/clinics/${info.clinicId}`);
        setClinic(res.data.data);
        if (res.data.data?.twilio_number) setTwilioNumber(res.data.data.twilio_number);
      } catch (err) {
        console.error("Setup fetch error:", err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchClinic();
  }, []);

  const createAgent = async () => {
    setCreating(true);
    setMsg(null);
    try {
      const info = JSON.parse(localStorage.getItem("clinic-info") || "{}");
      const res = await api.post(`/clinics/${info.clinicId}/create-agent`);
      setMsg({ type: "success", text: `Agent created! ID: ${res.data.data?.agentId}` });
      const updated = await api.get(`/clinics/${info.clinicId}`);
      setClinic(updated.data.data);
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.error || err.message });
    } finally {
      setCreating(false);
    }
  };

  const saveTwilioNumber = async () => {
    setSavingNumber(true);
    setMsg(null);
    try {
      const info = JSON.parse(localStorage.getItem("clinic-info") || "{}");
      if (!info.clinicId) throw new Error("No clinic ID — please log out and back in");
      await api.put(`/clinics/${info.clinicId}`, { twilio_number: twilioNumber });
      setMsg({ type: "success", text: `Twilio number ${twilioNumber} saved!` });
      const updated = await api.get(`/clinics/${info.clinicId}`);
      setClinic(updated.data.data);
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.error || err.message });
    } finally {
      setSavingNumber(false);
    }
  };

  const connectGoogle = () => {
    const token = localStorage.getItem("sb-token");
    const base = import.meta.env.VITE_API_URL || "http://localhost:3000";
    window.location.href = `${base}/auth/google?token=${encodeURIComponent(token)}`;
  };

  const handleFactoryReset = async () => {
    setIsWiping(true);
    setMsg(null);
    try {
      const info = JSON.parse(localStorage.getItem("clinic-info") || "{}");
      if (!info.clinicId) throw new Error("No clinic ID — please log out and back in");
      await api.post(`/clinics/${info.clinicId}/factory-reset`, { confirmation: deleteConfirmation });
      setMsg({ type: "success", text: "Factory reset complete. All patients, calls, and appointments wiped." });
      setShowDeleteModal(false);
      setDeleteConfirmation("");
      // Force reload to flush everything
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.error || err.message });
      setIsWiping(false);
      setShowDeleteModal(false); // Close modal so user can see the error toast!
      setDeleteConfirmation("");
    }
  };

  const webhookUrl = `${import.meta.env.VITE_API_URL || "http://localhost:3000"}/webhooks/retell`;
  const twilioWebhookUrl = `${import.meta.env.VITE_API_URL || "http://localhost:3000"}/webhooks/twilio/sms`;

  const clinicInfo = JSON.parse(localStorage.getItem("clinic-info") || "{}");

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      {/* ── Header ──────────────────────────────────────────── */}
      <div>
        <h1 className="text-[1.75rem] font-medium text-on-surface tracking-tight">
          Clinic Settings
        </h1>
        <p className="text-sm text-on-surface-variant mt-1">
          Manage your clinic's profile, location, and communication preferences.
        </p>
      </div>

      {/* ── Toast message ────────────────────────────────────── */}
      {msg && (
        <div
          className={`px-4 py-3 rounded-[0.75rem] text-sm font-medium flex items-center gap-2 ${
            msg.type === "success"
              ? "bg-[#edf7e0] text-[#396a00]"
              : "bg-[#fce4ec] text-[#b71c1c]"
          }`}
        >
          {msg.type === "success" ? (
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
          )}
          {msg.text}
        </div>
      )}

      {/* ── Two column layout ────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5">
        {/* LEFT — main forms */}
        <div className="space-y-5">
          {/* General Information */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-5">
              <div
                className="w-8 h-8 rounded-[0.5rem] flex items-center justify-center"
                style={{ backgroundColor: "#edf7e0" }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect x="1" y="1" width="6" height="6" rx="1" fill="#396a00" />
                  <rect x="9" y="1" width="6" height="6" rx="1" fill="#396a00" />
                  <rect x="1" y="9" width="6" height="6" rx="1" fill="#396a00" />
                  <rect x="9" y="9" width="6" height="6" rx="1" fill="#9dce6b" />
                </svg>
              </div>
              <h2 className="text-sm font-bold text-on-surface">General Information</h2>
            </div>

            <div className="space-y-4">
              <div>
                <FieldLabel>Clinic Name</FieldLabel>
                <ReadonlyField value={clinic?.name || clinicInfo.clinicName || "Bytelytic Clinic OS"} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <FieldLabel>Email Address</FieldLabel>
                  <ReadonlyField value={clinic?.owner_email || clinicInfo.email} />
                </div>
                <div>
                  <FieldLabel>Primary Phone</FieldLabel>
                  <ReadonlyField value={clinic?.phone_number || "(555) 123-4567"} />
                </div>
              </div>
            </div>
          </div>

          {/* AI Voice Agent */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-5">
              <div
                className="w-8 h-8 rounded-[0.5rem] flex items-center justify-center"
                style={{ backgroundColor: "#ede7f6" }}
              >
                <Bot className="w-4 h-4" style={{ color: "#4a148c" }} />
              </div>
              <div className="flex-1">
                <h2 className="text-sm font-bold text-on-surface">AI Voice Agent</h2>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Retell AI agent that handles all patient calls
                </p>
              </div>
              {clinic?.retell_agent_id && (
                <div
                  className="flex items-center gap-1.5 text-[0.65rem] font-bold px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: "#edf7e0", color: "#396a00" }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#396a00] animate-pulse" />
                  Active
                </div>
              )}
            </div>

            {clinic?.retell_agent_id ? (
              <div className="bg-surface-container rounded-[0.75rem] px-4 py-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                <p className="text-xs font-mono text-on-surface-variant flex-1 truncate">
                  Agent ID: {clinic.retell_agent_id}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-[#fff8e1] rounded-[0.75rem] px-4 py-3 text-xs text-[#8a6000]">
                  Ensure{" "}
                  <code className="font-mono bg-[#ffeaa7] px-1 rounded">RETELL_API_KEY</code>{" "}
                  is set in your <code className="font-mono bg-[#ffeaa7] px-1 rounded">.env</code>
                </div>
                <button
                  onClick={createAgent}
                  disabled={creating}
                  className="btn-primary disabled:opacity-60"
                >
                  {creating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Bot className="w-4 h-4" />
                  )}
                  {creating ? "Creating..." : "Create AI Agent"}
                </button>
              </div>
            )}
          </div>

          {/* Twilio / AI Assistant Line */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-5">
              <div
                className="w-8 h-8 rounded-[0.5rem] flex items-center justify-center"
                style={{ backgroundColor: "#e3f2fd" }}
              >
                <Phone className="w-4 h-4" style={{ color: "#006493" }} />
              </div>
              <div className="flex-1">
                <h2 className="text-sm font-bold text-on-surface">AI Assistant Line</h2>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  This Twilio number powers your AI receptionist for automated patient routing.
                </p>
              </div>
              {clinic?.twilio_number && (
                <div
                  className="flex items-center gap-1.5 text-[0.65rem] font-bold px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: "#edf7e0", color: "#396a00" }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#396a00]" />
                  Active
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <FieldLabel>Twilio Phone Number</FieldLabel>
                <div className="flex gap-2">
                  <div className="flex items-center flex-1 gap-2 px-4 py-3 bg-surface-container rounded-[0.75rem]">
                    <Phone className="w-4 h-4 text-on-surface-variant flex-shrink-0" />
                    <input
                      type="text"
                      value={twilioNumber}
                      onChange={(e) => setTwilioNumber(e.target.value)}
                      placeholder="+1 (555) 987-6543"
                      className="flex-1 bg-transparent text-sm outline-none text-on-surface font-mono placeholder-on-surface-variant/40"
                    />
                  </div>
                  <button
                    onClick={saveTwilioNumber}
                    disabled={!twilioNumber || savingNumber}
                    className="btn-primary disabled:opacity-50"
                  >
                    {savingNumber ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : null}
                    {savingNumber ? "Saving..." : "Verify Connection"}
                  </button>
                </div>
              </div>

              {/* Webhook URLs */}
              <div className="space-y-2">
                <div>
                  <FieldLabel>Retell Webhook URL</FieldLabel>
                  <div className="flex items-center gap-2 bg-surface-container rounded-[0.75rem] px-3 py-2.5">
                    <code className="text-xs text-on-surface flex-1 font-mono truncate">{webhookUrl}</code>
                    <button
                      onClick={() => navigator.clipboard.writeText(webhookUrl)}
                      className="text-on-surface-variant hover:text-primary transition-colors flex-shrink-0"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div>
                  <FieldLabel>Twilio SMS Webhook URL</FieldLabel>
                  <div className="flex items-center gap-2 bg-surface-container rounded-[0.75rem] px-3 py-2.5">
                    <code className="text-xs text-on-surface flex-1 font-mono truncate">{twilioWebhookUrl}</code>
                    <button
                      onClick={() => navigator.clipboard.writeText(twilioWebhookUrl)}
                      className="text-on-surface-variant hover:text-primary transition-colors flex-shrink-0"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Google Calendar */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-5">
              <div
                className="w-8 h-8 rounded-[0.5rem] flex items-center justify-center"
                style={{ backgroundColor: "#fff8e1" }}
              >
                <Calendar className="w-4 h-4" style={{ color: "#f57f17" }} />
              </div>
              <div className="flex-1">
                <h2 className="text-sm font-bold text-on-surface">Google Calendar</h2>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Allows the AI to check availability and book appointments
                </p>
              </div>
              {clinic?.google_refresh_token && (
                <div
                  className="flex items-center gap-1.5 text-[0.65rem] font-bold px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: "#edf7e0", color: "#396a00" }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#396a00]" />
                  Connected
                </div>
              )}
            </div>

            {clinic?.google_refresh_token ? (
              <div className="bg-surface-container rounded-[0.75rem] px-4 py-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                <p className="text-sm text-on-surface">Google Calendar connected successfully</p>
              </div>
            ) : (
              <button
                onClick={connectGoogle}
                className="btn-secondary flex items-center gap-2"
              >
                <Calendar className="w-4 h-4" />
                Connect Google Calendar
                <ExternalLink className="w-3.5 h-3.5 text-on-surface-variant ml-auto" />
              </button>
            )}
          </div>
        </div>

        {/* RIGHT — status + save */}
        <div className="space-y-4">
          {/* Save button card */}
          <div className="card p-5">
            <div className="flex flex-col items-center text-center gap-3">
              <div
                className="w-10 h-10 rounded-[0.625rem] flex items-center justify-center"
                style={{ backgroundColor: "#edf1ef" }}
              >
                <Save className="w-5 h-5 text-on-surface-variant" />
              </div>
              <p className="text-xs text-on-surface-variant">
                Unsaved changes will be lost if you leave this page.
              </p>
              <button
                onClick={saveTwilioNumber}
                disabled={!twilioNumber || savingNumber}
                className="w-full py-2.5 rounded-[0.625rem] font-bold text-sm transition-all hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: "#7dbd42", color: "#fff" }}
              >
                {savingNumber ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>

          {/* System Status */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-on-surface">System Status</h3>
            </div>
            <div className="space-y-0 divide-y divide-surface-container">
              {[
                { label: "Backend API", ok: true, icon: Wifi },
                { label: "Database", ok: true, icon: Database },
                { label: "Retell Agent", ok: !!clinic?.retell_agent_id },
                { label: "Twilio Number", ok: !!clinic?.twilio_number },
                { label: "Google Calendar", ok: !!clinic?.google_refresh_token },
                { label: "OpenRouter AI", ok: true },
              ].map((item) => (
                <StatusRow key={item.label} label={item.label} ok={item.ok} />
              ))}
            </div>
          </div>

          {/* Danger Zone */}
          <div className="card p-5 border border-[#ffcdd2] bg-[#fff5f6]">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-[#d32f2f]" />
              <h3 className="text-sm font-bold text-[#d32f2f]">Danger Zone</h3>
            </div>
            <p className="text-xs text-[#d32f2f]/80 mb-4 leading-relaxed">
              Permanently wipe all operational data (patients, appointments, call logs). Your Retell/Twilio configurations will be preserved.
            </p>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="w-full py-2.5 rounded-[0.625rem] font-bold text-sm transition-all hover:bg-[#d32f2f] hover:text-white"
              style={{ backgroundColor: "#fce4ec", color: "#d32f2f" }}
            >
              Factory Reset Data
            </button>
          </div>
        </div>
      </div>

      {/* ── Factory Reset Confirmation Modal ───────────────────── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="card w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-[#fce4ec] flex items-center justify-center text-[#d32f2f]">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-on-surface">Factory Reset</h2>
            </div>
            <p className="text-sm text-on-surface-variant mb-4 leading-relaxed mt-3">
              This will permanently delete <strong className="text-on-surface">all patients, appointments, call logs, SMS logs, and revenue records!</strong>
              <br /><br />
              This action <strong>cannot</strong> be undone.
            </p>
            
            <div className="mb-4">
              <label className="overline mb-1 block">Please type <span className="text-[#d32f2f] font-mono lowercase">DELETE EVERYTHING</span> to confirm.</label>
              <input 
                type="text" 
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                className="w-full bg-surface-container border border-error/30 focus:border-error rounded-lg px-3 py-2 text-sm outline-none" 
                placeholder="DELETE EVERYTHING" 
              />
            </div>

            <div className="flex justify-end gap-3 mt-6 border-t border-surface-container pt-4">
              <button 
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmation("");
                }} 
                disabled={isWiping}
                className="px-4 py-2 text-sm font-semibold text-on-surface hover:bg-surface-container rounded-lg transition-colors"
               >
                 Cancel
               </button>
              <button 
                onClick={handleFactoryReset}
                disabled={isWiping || deleteConfirmation !== "DELETE EVERYTHING"}
                className="px-5 py-2 text-sm font-semibold text-white bg-[#d32f2f] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
               >
                {isWiping ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Wiping...
                  </div>
                ) : (
                  "I understand, delete data"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Setup;
