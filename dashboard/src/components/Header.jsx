import React from "react";
import { Bell, Menu, Search } from "lucide-react";

const Header = ({ onMenuClick }) => {
  const clinicInfo = JSON.parse(localStorage.getItem("clinic-info") || "{}");
  const clinicName = clinicInfo.clinicName || "Clinic";
  const initials = clinicName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="p-2 -ml-1 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl lg:hidden transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative hidden md:block">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search..."
            className="w-64 pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 rounded-xl outline-none text-sm text-slate-700 placeholder-slate-400 transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Live indicator */}
        <div className="hidden sm:flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1.5 rounded-xl text-xs font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          AI Live
        </div>

        <button className="relative p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white" />
        </button>

        <div className="h-6 w-px bg-slate-200" />

        <div className="flex items-center gap-2.5 cursor-pointer group">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-slate-800 group-hover:text-brand-600 transition-colors leading-tight">
              {clinicName}
            </p>
            <p className="text-xs text-slate-400">Clinic Owner</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-sm font-bold shadow-sm flex-shrink-0">
            {initials}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
