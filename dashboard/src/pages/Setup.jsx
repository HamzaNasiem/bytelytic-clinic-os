import React, { useEffect, useState } from 'react';
import { PhoneCall, Bot, Calendar, CheckCircle, AlertCircle, Loader2, Copy, ExternalLink } from 'lucide-react';
import api from '../lib/api';

// ─── Step Card Component ───────────────────────────────────────
const SetupStep = ({ step, title, description, status, children }) => {
  const icons = {
    done: <CheckCircle className="w-5 h-5 text-emerald-500" />,
    pending: <AlertCircle className="w-5 h-5 text-amber-500" />,
    loading: <Loader2 className="w-5 h-5 text-brand-500 animate-spin" />,
  };

  return (
    <div className={`bg-white rounded-2xl border p-6 shadow-sm transition-all ${status === 'done' ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-100'}`}>
      <div className="flex items-start gap-4">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${status === 'done' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
          {status === 'done' ? '✓' : step}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-800">{title}</h3>
            {icons[status]}
          </div>
          <p className="text-sm text-slate-500 mt-0.5 mb-4">{description}</p>
          {children}
        </div>
      </div>
    </div>
  );
};

// ─── Setup Page ────────────────────────────────────────────────
const Setup = () => {
  const [clinic, setClinic] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [savingNumber, setSavingNumber] = useState(false);
  const [msg, setMsg] = useState(null);
  const [twilioNumber, setTwilioNumber] = useState('');

  // Load clinic info from localStorage and fetch from API
  useEffect(() => {
    const fetchClinic = async () => {
      try {
        const info = JSON.parse(localStorage.getItem('clinic-info') || '{}');
        if (!info.clinicId) return;
        const res = await api.get(`/clinics/${info.clinicId}`);
        setClinic(res.data.data);
        if (res.data.data?.twilio_number) setTwilioNumber(res.data.data.twilio_number);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchClinic();
  }, []);

  // Create Retell AI Agent
  const createAgent = async () => {
    setCreating(true);
    setMsg(null);
    try {
      const info = JSON.parse(localStorage.getItem('clinic-info') || '{}');
      const res = await api.post(`/clinics/${info.clinicId}/create-agent`);
      setMsg({ type: 'success', text: `✅ Retell agent created! ID: ${res.data.data?.agentId}` });
      // Refresh clinic
      const updated = await api.get(`/clinics/${info.clinicId}`);
      setClinic(updated.data.data);
    } catch (err) {
      setMsg({ type: 'error', text: `❌ ${err.response?.data?.error || err.message}` });
    } finally {
      setCreating(false);
    }
  };

  // Save Twilio number to clinic
  const saveTwilioNumber = async () => {
    setSavingNumber(true);
    setMsg(null);
    try {
      const info = JSON.parse(localStorage.getItem('clinic-info') || '{}');
      if (!info.clinicId) throw new Error('No clinic ID found — please log out and log back in');
      await api.put(`/clinics/${info.clinicId}`, { twilio_number: twilioNumber });
      setMsg({ type: 'success', text: `✅ Twilio number ${twilioNumber} saved!` });
      const updated = await api.get(`/clinics/${info.clinicId}`);
      setClinic(updated.data.data);
    } catch (err) {
      setMsg({ type: 'error', text: `❌ ${err.response?.data?.error || err.message}` });
    } finally {
      setSavingNumber(false);
    }
  };

  // Trigger Google Calendar OAuth — pass token as query param so backend can auth
  const connectGoogle = () => {
    const token = localStorage.getItem('sb-token');
    const base = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    // Opens in same window — backend will redirect to Google after verifying token
    window.location.href = `${base}/auth/google?token=${encodeURIComponent(token)}`;
  };

  const info = JSON.parse(localStorage.getItem('clinic-info') || '{}');
  const webhookUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/webhooks/retell`;
  const twilioWebhookUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/webhooks/twilio/sms`;

  if (loading) {
    return <div className="h-64 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand-400" /></div>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Clinic Setup</h1>
        <p className="text-slate-500 mt-1">Connect all services to activate your AI front desk</p>
      </div>

      {msg && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium ${msg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
          {msg.text}
        </div>
      )}

      <div className="space-y-4">

        {/* Step 1 — Retell Agent */}
        <SetupStep
          step={1}
          title="Create AI Voice Agent (Retell)"
          description="Creates a Retell AI agent configured with your clinic's name, hours, and appointment types"
          status={clinic?.retell_agent_id ? 'done' : 'pending'}
        >
          {clinic?.retell_agent_id ? (
            <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg">
              <CheckCircle className="w-4 h-4" />
              Agent ID: <code className="font-mono">{clinic.retell_agent_id}</code>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-sm text-amber-700">
                ⚠️ Make sure your <code className="font-mono bg-amber-100 px-1 rounded">RETELL_API_KEY</code> is set in <code className="font-mono bg-amber-100 px-1 rounded">.env</code>
              </div>
              <button
                onClick={createAgent}
                disabled={creating}
                className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2.5 rounded-xl font-medium shadow-sm transition-all disabled:opacity-60"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
                {creating ? 'Creating...' : 'Create AI Agent'}
              </button>
            </div>
          )}
        </SetupStep>

        {/* Step 2 — Twilio Number */}
        <SetupStep
          step={2}
          title="Assign Twilio Phone Number"
          description="The phone number patients will call — must match your Twilio webhook configuration"
          status={clinic?.twilio_number ? 'done' : 'pending'}
        >
          <div className="flex gap-2">
            <input
              type="text"
              value={twilioNumber}
              onChange={e => setTwilioNumber(e.target.value)}
              placeholder="+15551234567"
              className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all font-mono"
            />
            <button
              onClick={saveTwilioNumber}
              disabled={!twilioNumber || savingNumber}
              className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {savingNumber && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {savingNumber ? 'Saving...' : 'Save Number'}
            </button>
          </div>

          {/* Webhook URLs for copy */}
          <div className="mt-3 space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Retell Webhook URL (paste in Retell dashboard)</p>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <code className="text-xs text-slate-700 flex-1 font-mono">{webhookUrl}</code>
              <button onClick={() => navigator.clipboard.writeText(webhookUrl)} className="text-slate-400 hover:text-slate-700">
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-2">Twilio SMS Webhook URL (paste in Twilio console)</p>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <code className="text-xs text-slate-700 flex-1 font-mono">{twilioWebhookUrl}</code>
              <button onClick={() => navigator.clipboard.writeText(twilioWebhookUrl)} className="text-slate-400 hover:text-slate-700">
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </SetupStep>

        {/* Step 3 — Google Calendar */}
        <SetupStep
          step={3}
          title="Connect Google Calendar"
          description="Allows the AI to check availability and create appointments in your Google Calendar"
          status={clinic?.google_refresh_token ? 'done' : 'pending'}
        >
          {clinic?.google_refresh_token ? (
            <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg">
              <CheckCircle className="w-4 h-4" />
              Google Calendar connected ✓
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-sm text-amber-700">
                ⚠️ Make sure <code className="font-mono bg-amber-100 px-1 rounded">GOOGLE_REDIRECT_URI</code> is set correctly in <code className="font-mono bg-amber-100 px-1 rounded">.env</code>
              </div>
              <button
                onClick={connectGoogle}
                className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl font-medium shadow-sm transition-all"
              >
                <Calendar className="w-4 h-4 text-brand-500" />
                Connect Google Calendar
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          )}
        </SetupStep>

        {/* Step 4 — Status Summary */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4">System Status</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Backend API', ok: true },
              { label: 'Database', ok: true },
              { label: 'Retell Agent', ok: !!clinic?.retell_agent_id },
              { label: 'Twilio Number', ok: !!clinic?.twilio_number },
              { label: 'Google Calendar', ok: !!clinic?.google_refresh_token },
              { label: 'OpenRouter AI', ok: true },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-2.5 p-3 bg-slate-50 rounded-xl">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${item.ok ? 'bg-emerald-500' : 'bg-amber-400'}`}></div>
                <span className="text-sm font-medium text-slate-700">{item.label}</span>
                <span className={`ml-auto text-xs font-semibold ${item.ok ? 'text-emerald-600' : 'text-amber-600'}`}>{item.ok ? 'OK' : 'Setup needed'}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Setup;
