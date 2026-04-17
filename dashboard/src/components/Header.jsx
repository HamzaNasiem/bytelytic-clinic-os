import React from "react";
import { Bell, HelpCircle, Menu, Search } from "lucide-react";

const Header = ({ onMenuClick, pageTitle = "Precision Editorial Admin" }) => {
  const clinicInfo = JSON.parse(localStorage.getItem("clinic-info") || "{}");
  const clinicName = clinicInfo.clinicName || "Clinic";
  const initials = clinicName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header
      className="h-14 bg-surface-container-lowest flex items-center justify-between px-6 sticky top-0 z-20"
      style={{ boxShadow: "0px 1px 0px rgba(24,28,28,0.06)" }}
    >
      {/* Left: hamburger (mobile) + search */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="p-2 -ml-1 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg lg:hidden transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Search bar – hidden on small screens, shown from md */}
        <div className="relative hidden md:block">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
          <input
            type="text"
            placeholder="Search..."
            className="w-60 pl-8 pr-4 py-2 text-sm outline-none text-on-surface placeholder-on-surface-variant/40 rounded-[0.625rem] transition-all duration-200"
            style={{
              backgroundColor: "#edf1ef",
              border: "none",
            }}
            onFocus={(e) => (e.target.style.backgroundColor = "#e5ebe8")}
            onBlur={(e) => (e.target.style.backgroundColor = "#edf1ef")}
          />
        </div>
      </div>

      {/* Center: page title (hidden on small screens) */}
      <span className="hidden lg:block absolute left-1/2 -translate-x-1/2 text-sm font-semibold text-on-surface-variant">
        {pageTitle}
      </span>

      {/* Right: notification, help, avatar */}
      <div className="flex items-center gap-1.5">
        <button className="relative p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full border-2 border-surface-container-lowest" style={{ backgroundColor: "#7dbd42" }} />
        </button>

        <button className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors">
          <HelpCircle className="w-5 h-5" />
        </button>

        {/* Avatar */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ml-1 cursor-pointer flex-shrink-0 ring-2 ring-surface-container-low"
          style={{ backgroundColor: "#396a00" }}
        >
          {initials}
        </div>
      </div>
    </header>
  );
};

export default Header;
