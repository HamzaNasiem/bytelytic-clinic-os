import React from "react";
import { Search, Bell, Mail, Settings, Menu } from "lucide-react";

const Header = ({ onMenuClick }) => {
  const clinicInfo = JSON.parse(localStorage.getItem("clinic-info") || "{}");
  const clinicName = clinicInfo.clinicName || "Clinic";

  return (
    <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-10 w-full">
      <div className="flex items-center gap-4">
        {/* Hamburger Menu for Mobile */}
        <button
          onClick={onMenuClick}
          className="p-2 -ml-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg lg:hidden transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>

        {/* Search - Hidden on small screens */}
        <div className="relative hidden md:block w-full max-w-[200px] lg:max-w-md xl:w-96">
          <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Type to search..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-transparent focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 rounded-xl transition-all outline-none text-sm font-medium text-slate-700 placeholder-slate-400"
          />
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2 sm:gap-4 lg:gap-6">
        <div className="flex items-center gap-1 sm:gap-2 text-slate-400">
          <button className="p-2 hover:bg-slate-50 hover:text-slate-700 rounded-lg transition-colors hidden sm:block">
            <Settings className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-slate-50 hover:text-slate-700 rounded-lg transition-colors relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
          </button>
          <button className="p-2 hover:bg-slate-50 hover:text-slate-700 rounded-lg transition-colors hidden sm:block">
            <Mail className="w-5 h-5" />
          </button>
        </div>

        <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>

        <div className="flex items-center gap-3 cursor-pointer group">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-slate-800 group-hover:text-brand-600 transition-colors">
              {clinicName}
            </p>
            <p className="text-xs text-slate-500 font-medium">Clinic Owner</p>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-brand-100 border border-brand-200 flex items-center justify-center text-brand-600 font-bold overflow-hidden shadow-sm flex-shrink-0">
            <img
              src="https://api.dicebear.com/7.x/notionists/svg?seed=Sarah&backgroundColor=e1ebfe"
              alt="Avatar"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
