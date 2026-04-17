import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, ArrowRight, AlertCircle } from "lucide-react";
import api from "../lib/api";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await api.post("/auth/login", { email, password });
      const { token, clinicId, clinicName, timezone } = response.data;

      localStorage.setItem("sb-token", token);
      localStorage.setItem(
        "clinic-info",
        JSON.stringify({ clinicId, clinicName, timezone }),
      );

      navigate("/");
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Failed to login. Please check credentials.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left — Form */}
      <div className="flex-1 flex flex-col justify-center items-center px-8 py-12 bg-surface">
        <div className="w-full max-w-sm">
          {/* Logo */}
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
              <p className="text-sm font-extrabold text-on-surface tracking-tight uppercase leading-none">PRECISION</p>
              <p className="text-sm font-extrabold text-on-surface tracking-tight uppercase leading-none">CLINIC</p>
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-[1.75rem] font-medium text-on-surface mb-1 tracking-tight">
            Welcome back
          </h1>
          <p className="text-sm text-on-surface-variant mb-8 mt-1">
            Sign in to your clinic dashboard
          </p>

          <form className="space-y-5" onSubmit={handleLogin}>
            {error && (
              <div className="bg-rose-50 text-rose-600 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-widest mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60" />
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="doctor@clinic.com"
                  className="w-full pl-10 pr-4 py-3 bg-surface-container rounded-xl outline-none text-on-surface text-sm
                    placeholder-on-surface-variant/50 border-b-2 border-transparent focus:border-primary transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-widest mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60" />
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-surface-container rounded-xl outline-none text-on-surface text-sm
                    placeholder-on-surface-variant/50 border-b-2 border-transparent focus:border-primary transition-all"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded accent-primary"
                />
                <span className="text-sm text-on-surface-variant">
                  Remember me
                </span>
              </label>
              <a
                href="#"
                className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
              >
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              style={{ backgroundColor: "#396a00" }}
            >
              {loading ? "Signing in..." : "Sign In"}
              {!loading && (
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Right — Branding panel (hidden on mobile) */}
      <div
        className="hidden lg:flex w-[45%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ backgroundColor: "#1a3a2e" }}
      >
        {/* Decorative circles */}
        <div
          className="absolute -top-24 -right-24 w-72 h-72 rounded-full opacity-20"
          style={{ backgroundColor: "#7FCD4D" }}
        />
        <div
          className="absolute bottom-16 -left-16 w-56 h-56 rounded-full opacity-10"
          style={{ backgroundColor: "#7FCD4D" }}
        />

        {/* Top logo */}
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
            <p className="text-white font-extrabold text-sm uppercase leading-none">PRECISION</p>
            <p className="text-white font-extrabold text-sm uppercase leading-none mt-0.5">CLINIC</p>
          </div>
        </div>

        {/* Center copy */}
        <div className="relative z-10">
          <h2 className="text-4xl font-light text-white leading-snug mb-4">
            Your AI Front Desk.
            <br />
            <span style={{ color: "#7FCD4D" }}>Always On.</span>
          </h2>
          <p className="text-white/60 text-sm leading-relaxed max-w-xs">
            Automated appointment booking, 24/7 patient calls, and revenue
            recovery — all handled by AI while you focus on care.
          </p>

          <div className="mt-8 space-y-3">
            {[
              "Answers every call, 24/7",
              "Books appointments automatically",
              "Sends reminders & follow-ups",
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

        {/* Bottom tagline */}
        <p className="text-white/30 text-xs relative z-10">
          Bytelytic Clinic OS · bytelytic.com
        </p>
      </div>
    </div>
  );
};

export default Login;
