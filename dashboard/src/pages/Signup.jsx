import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { 
  Building2, User, Clock, CalendarDays, 
  ArrowRight, ArrowLeft, CheckCircle2, Loader2, AlertCircle
} from "lucide-react";
import api from "../lib/api";

const TIMEZONES = [
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "Europe/London", "Europe/Paris", "Asia/Dubai", "Asia/Kolkata", "Asia/Tokyo", "Australia/Sydney"
];

const DEFAULT_HOURS = {
  mon: "08:00-17:00", tue: "08:00-17:00", wed: "08:00-17:00", 
  thu: "08:00-17:00", fri: "08:00-17:00", sat: "closed", sun: "closed"
};

const Signup = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    clinicName: "", email: "", password: "", specialty: "", city: "", timezone: "America/Chicago",
    doctorName: "", doctorCredentials: "", doctorPhone: "",
    businessHours: { ...DEFAULT_HOURS },
    appointmentTypes: [
      { name: "Initial Consultation", duration: 60 },
      { name: "Follow-up Visit", duration: 30 }
    ]
  });

  const updateForm = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    if (error) setError(null); // Clear error when typing
  };

  const nextStep = () => {
    if (step === 1) {
      if (!formData.clinicName) return setError("Clinic Name is required.");
      if (!formData.email) return setError("Admin Email is required.");
      if (!formData.password) return setError("Password is required.");
    }
    if (step === 2) {
      if (!formData.doctorName) return setError("Primary Doctor Name is required.");
    }
    setError(null);
    setStep(s => Math.min(s + 1, 4));
  };
  const prevStep = () => {
    setError(null);
    setStep(s => Math.max(s - 1, 1));
  };

  const handleSignup = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post("/auth/signup", formData);
      const { token, clinicId, clinicName, timezone } = res.data;
      
      if (token) {
        localStorage.setItem("sb-token", token);
        localStorage.setItem("clinic-info", JSON.stringify({ clinicId, clinicName, timezone }));
        navigate("/setup");
      } else {
        // Token is null, meaning Email Confirmation is required!
        setSuccess(true);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-between mb-8 relative w-full max-w-sm mx-auto">
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-[2px] bg-surface-container-high -z-10" />
      {[1, 2, 3, 4].map(num => (
        <div key={num} className="flex flex-col items-center gap-2 relative z-10">
          <div 
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
              step >= num ? "text-white" : "bg-surface-container-high text-on-surface-variant"
            }`}
            style={{ backgroundColor: step >= num ? "#396a00" : undefined }}
          >
            {step > num ? <CheckCircle2 className="w-5 h-5" /> : num}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen flex font-sans">
      {/* Left panel - Form Wizard */}
      <div className="flex-1 flex flex-col justify-center items-center px-8 py-12 bg-surface overflow-y-auto">
        <div className="w-full max-w-sm">
          
          {/* Logo (same as Login) */}
          <div className="flex items-center gap-2.5 mb-10">
            <div
              className="w-9 h-9 rounded-[0.5rem] flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: "#7FCD4D" }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="5.5" y="1" width="3" height="12" rx="1.5" fill="#1a3a2e"/>
                <rect x="1" y="5.5" width="12" height="3" rx="1.5" fill="#1a3a2e"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-extrabold text-on-surface tracking-tight uppercase leading-none">BYTELYTIC</p>
              <p className="text-sm font-extrabold text-on-surface tracking-tight uppercase leading-none mt-0.5">CLINIC</p>
            </div>
          </div>

          <h1 className="text-[1.75rem] font-medium text-on-surface mb-1 tracking-tight">
            {success ? "Check your email" : "Create your account"}
          </h1>
          <p className="text-sm text-on-surface-variant mb-8 mt-1">
            {success ? "We've sent a verification link to your email." : "Set up your AI receptionist in minutes"}
          </p>

          {!success && renderStepIndicator()}

          {error && !success && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Screen */}
          {success && (
            <div className="animate-in fade-in duration-500 bg-surface-container rounded-2xl p-8 text-center border border-surface-container-high">
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-on-surface mb-2">Verify your email</h3>
              <p className="text-sm text-on-surface-variant mb-6 leading-relaxed">
                We've sent an email to <span className="font-semibold text-on-surface">{formData.email}</span>. 
                Please click the link inside to verify your account and complete setup.
              </p>
              <Link to="/login" className="inline-flex items-center justify-center w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90" style={{ backgroundColor: "#396a00" }}>
                Go to Login
              </Link>
            </div>
          )}

          {/* Form Content */}
          {!success && (
            <div className="space-y-5">
              {step === 1 && (
              <div className="animate-in fade-in duration-300 space-y-4">
                <Input label="Clinic Name" value={formData.clinicName} onChange={(e) => updateForm("clinicName", e.target.value)} placeholder="Apex Wellness Center" />
                <Input label="Admin Email" type="email" value={formData.email} onChange={(e) => updateForm("email", e.target.value)} placeholder="admin@apexwellness.com" />
                <Input label="Password" type="password" value={formData.password} onChange={(e) => updateForm("password", e.target.value)} placeholder="Create a secure password" />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Specialty" value={formData.specialty} onChange={(e) => updateForm("specialty", e.target.value)} placeholder="e.g. Dentistry" />
                  <Input label="City" value={formData.city} onChange={(e) => updateForm("city", e.target.value)} placeholder="e.g. New York" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-widest mb-2">Timezone</label>
                  <select 
                    className="w-full pl-4 pr-4 py-3 bg-surface-container rounded-xl outline-none text-on-surface text-sm border-b-2 border-transparent focus:border-primary transition-all"
                    value={formData.timezone} 
                    onChange={(e) => updateForm("timezone", e.target.value)}
                  >
                    {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                  </select>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="animate-in fade-in duration-300 space-y-4">
                <Input label="Primary Doctor Name" value={formData.doctorName} onChange={(e) => updateForm("doctorName", e.target.value)} placeholder="Dr. Sarah Jenkins" />
                <Input label="Credentials" value={formData.doctorCredentials} onChange={(e) => updateForm("doctorCredentials", e.target.value)} placeholder="e.g. DDS, MD, PT" />
                <Input label="Direct Phone (Optional)" value={formData.doctorPhone} onChange={(e) => updateForm("doctorPhone", e.target.value)} placeholder="+1 (555) 000-0000" />
              </div>
            )}

            {step === 3 && (
              <div className="animate-in fade-in duration-300 space-y-3">
                {Object.keys(DEFAULT_HOURS).map(day => {
                  const isOpen = formData.businessHours[day] !== "closed";
                  const [start, end] = isOpen ? formData.businessHours[day].split("-") : ["08:00", "17:00"];
                  
                  return (
                    <div key={day} className="flex items-center justify-between p-3 bg-surface-container rounded-xl">
                      <div className="flex items-center gap-3 w-1/3">
                        <input 
                          type="checkbox" 
                          checked={isOpen}
                          onChange={(e) => {
                            const newHours = { ...formData.businessHours };
                            newHours[day] = e.target.checked ? "08:00-17:00" : "closed";
                            updateForm("businessHours", newHours);
                          }}
                          className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary"
                        />
                        <span className="text-sm font-medium text-on-surface capitalize">{day}</span>
                      </div>
                      
                      {isOpen ? (
                        <div className="flex items-center gap-2">
                          <input type="time" value={start} onChange={e => {
                            const newHours = { ...formData.businessHours };
                            newHours[day] = `${e.target.value}-${end}`;
                            updateForm("businessHours", newHours);
                          }} className="bg-surface rounded border border-transparent px-2 py-1 text-xs text-on-surface outline-none focus:border-primary" />
                          <span className="text-on-surface-variant text-[10px] uppercase">to</span>
                          <input type="time" value={end} onChange={e => {
                            const newHours = { ...formData.businessHours };
                            newHours[day] = `${start}-${e.target.value}`;
                            updateForm("businessHours", newHours);
                          }} className="bg-surface rounded border border-transparent px-2 py-1 text-xs text-on-surface outline-none focus:border-primary" />
                        </div>
                      ) : (
                        <span className="text-xs text-on-surface-variant font-medium px-4">Closed</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {step === 4 && (
              <div className="animate-in fade-in duration-300 space-y-3">
                {formData.appointmentTypes.map((type, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input value={type.name} onChange={(e) => {
                      const newTypes = [...formData.appointmentTypes];
                      newTypes[idx].name = e.target.value;
                      updateForm("appointmentTypes", newTypes);
                    }} placeholder="Service Name" className="flex-1" />
                    
                    <div className="flex items-center gap-1 bg-surface-container rounded-xl px-2">
                      <input type="number" value={type.duration} onChange={(e) => {
                        const newTypes = [...formData.appointmentTypes];
                        newTypes[idx].duration = parseInt(e.target.value) || 30;
                        updateForm("appointmentTypes", newTypes);
                      }} className="w-12 bg-transparent text-sm py-3 outline-none text-center" />
                      <span className="text-xs text-on-surface-variant pr-2">min</span>
                    </div>
                    
                    <button onClick={() => {
                      const newTypes = formData.appointmentTypes.filter((_, i) => i !== idx);
                      updateForm("appointmentTypes", newTypes);
                    }} className="p-3 text-on-surface-variant hover:text-error transition-colors rounded-xl">
                      ✕
                    </button>
                  </div>
                ))}
                
                <button onClick={() => {
                  updateForm("appointmentTypes", [...formData.appointmentTypes, { name: "", duration: 30 }]);
                }} className="w-full py-3 mt-2 border border-dashed border-surface-container-highest text-on-surface-variant text-sm font-medium rounded-xl hover:border-primary hover:text-primary transition-colors">
                  + Add Service
                </button>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-6 mt-2">
              {step > 1 ? (
                <button 
                  onClick={prevStep}
                  disabled={loading}
                  className="text-sm font-semibold text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  Back
                </button>
              ) : (
                <Link to="/login" className="text-sm font-semibold text-on-surface-variant hover:text-on-surface transition-colors">
                  Have an account?
                </Link>
              )}
              
              {step < 4 ? (
                <button 
                  onClick={nextStep}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
                  style={{ backgroundColor: "#396a00" }}
                >
                  Next step <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button 
                  onClick={handleSignup}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60"
                  style={{ backgroundColor: "#396a00" }}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {loading ? "Creating..." : "Complete Setup"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right panel - Branding panel (from Login) */}
      <div
        className="hidden lg:flex w-[45%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ backgroundColor: "#1a3a2e" }}
      >
        <div
          className="absolute -top-24 -right-24 w-72 h-72 rounded-full opacity-20"
          style={{ backgroundColor: "#7FCD4D" }}
        />
        <div
          className="absolute bottom-16 -left-16 w-56 h-56 rounded-full opacity-10"
          style={{ backgroundColor: "#7FCD4D" }}
        />

        <div className="flex items-center gap-2.5 relative z-10">
          <div
            className="w-9 h-9 rounded-[0.5rem] flex items-center justify-center"
            style={{ backgroundColor: "#7FCD4D" }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="5.5" y="1" width="3" height="12" rx="1.5" fill="#1a3a2e"/>
              <rect x="1" y="5.5" width="12" height="3" rx="1.5" fill="#1a3a2e"/>
            </svg>
          </div>
          <div>
            <p className="text-white font-extrabold text-sm uppercase leading-none">BYTELYTIC</p>
            <p className="text-white font-extrabold text-sm uppercase leading-none mt-0.5">CLINIC</p>
          </div>
        </div>

        <div className="relative z-10">
          <h2 className="text-4xl font-light text-white leading-snug mb-4">
            Build your <br/>
            <span style={{ color: "#7FCD4D" }}>AI Clinic.</span>
          </h2>
          <p className="text-white/60 text-sm leading-relaxed max-w-xs">
            Start automating your patient operations today. Zero coding required. Fully integrated with your existing calendar.
          </p>

          <div className="mt-8 space-y-3">
            {[
              "Instant clinic provisioning",
              "Automated Twilio setup",
              "1-click Google Calendar sync",
            ].map((feat) => (
              <div key={feat} className="flex items-center gap-3">
                <div
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: "#7FCD4D" }}
            />
                <span className="text-white/70 text-sm">{feat}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-white/30 text-xs relative z-10">
          Bytelytic Clinic OS · bytelytic.com
        </p>
      </div>
    </div>
  );
};

// Subcomponent
const Input = ({ label, className = "", ...props }) => (
  <div className={className}>
    {label && <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-widest mb-2">{label}</label>}
    <input 
      className="w-full pl-4 pr-4 py-3 bg-surface-container rounded-xl outline-none text-on-surface text-sm placeholder-on-surface-variant/50 border-b-2 border-transparent focus:border-primary transition-all"
      {...props} 
    />
  </div>
);

export default Signup;
