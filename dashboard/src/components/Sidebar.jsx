import React from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Phone,
  Settings,
  LogOut,
  X,
  Zap,
} from "lucide-react";

const Sidebar = ({ isOpen, setIsOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem("sb-token");
    localStorage.removeItem("clinic-info");
    navigate("/login");
  };

  const navItems = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard },
    { name: "Appointments", path: "/appointments", icon: Calendar },
    { name: "Patients", path: "/patients", icon: Users },
    { name: "Call Logs", path: "/calls", icon: Phone },
    { name: "Clinic Setup", path: "/setup", icon: Settings },
  ];

  const clinicInfo = JSON.parse(localStorage.getItem("clinic-info") || "{}");
  const initials = (clinicInfo.clinicName || "C")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={`w-64 bg-slate-950 flex flex-col h-screen fixed left-0 top-0 z-50 transition-transform duration-300 ease-in-out ${
          isOpen
            ? "translate-x-0 shadow-2xl"
            : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Logo */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center shadow-lg shadow-brand-500/40 flex-shrink-0">
              <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-xl font-black text-white tracking-tight">
              Bytelytic
            </span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="lg:hidden p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-6 px-3 flex flex-col gap-1 overflow-y-auto">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest px-3 mb-3">
            Main Menu
          </p>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-150 group ${
                  isActive
                    ? "bg-brand-500 text-white shadow-lg shadow-brand-500/30"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Icon
                  className={`w-5 h-5 flex-shrink-0 ${isActive ? "text-white" : "text-slate-500 group-hover:text-brand-400"} transition-colors`}
                />
                <span className="font-medium text-sm">{item.name}</span>
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/60" />
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User + Logout */}
        <div className="p-3 border-t border-slate-800 space-y-1">
          {/* Clinic badge */}
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-slate-900">
            <div className="w-8 h-8 rounded-lg bg-brand-500/20 border border-brand-500/30 text-brand-300 flex items-center justify-center text-xs font-bold flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-semibold truncate">
                {clinicInfo.clinicName || "Clinic"}
              </p>
              <p className="text-slate-500 text-xs">Clinic Owner</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-3 w-full rounded-xl text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 transition-all group"
          >
            <LogOut className="w-4 h-4" />
            <span className="font-medium text-sm">Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
