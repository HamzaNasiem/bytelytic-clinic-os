import React, { useState, useRef, useEffect } from "react";
import { Bell, HelpCircle, Menu, Search, LogOut, Settings, User } from "lucide-react";

const Header = ({ onMenuClick, pageTitle = "Bytelytic Clinic OS" }) => {
  const clinicInfo = JSON.parse(localStorage.getItem("clinic-info") || "{}");
  const clinicName = clinicInfo.clinicName || "Clinic";
  const initials = clinicName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const [activeDropdown, setActiveDropdown] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleDropdown = (name) => {
    setActiveDropdown((prev) => (prev === name ? null : name));
  };

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
      <div className="flex items-center gap-1.5 relative" ref={dropdownRef}>
        
        {/* Notifications */}
        <div>
          <button onClick={() => toggleDropdown('notifications')} className="relative p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full border-2 border-surface-container-lowest" style={{ backgroundColor: "#7dbd42" }} />
          </button>
          {activeDropdown === 'notifications' && (
            <div className="absolute top-full right-0 mt-1 w-72 bg-white rounded-xl shadow-lg border border-surface-container z-50 overflow-hidden">
              <div className="p-3 border-b border-surface-container flex justify-between items-center">
                <span className="font-bold text-sm text-on-surface">Notifications</span>
              </div>
              <div className="max-h-64 overflow-y-auto thin-scrollbar">
                <div className="p-3 hover:bg-surface-container-lowest transition-colors border-b border-surface-container cursor-pointer">
                  <p className="text-sm font-semibold text-on-surface">New AI Booking</p>
                  <p className="text-xs text-on-surface-variant">John Doe scheduled an appointment</p>
                  <p className="text-[0.65rem] text-primary mt-1">10 min ago</p>
                </div>
                <div className="p-3 hover:bg-surface-container-lowest transition-colors cursor-pointer">
                  <p className="text-sm font-semibold text-on-surface">Voicemail Received</p>
                  <p className="text-xs text-on-surface-variant">Sarah left a message about billing</p>
                  <p className="text-[0.65rem] text-primary mt-1">1 hr ago</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Help */}
        <div>
          <button onClick={() => toggleDropdown('help')} className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors">
            <HelpCircle className="w-5 h-5" />
          </button>
          {activeDropdown === 'help' && (
            <div className="absolute top-full right-0 mt-1 w-56 bg-white rounded-xl shadow-lg border border-surface-container z-50 overflow-hidden py-1">
              <a href="#" className="block px-4 py-2 hover:bg-surface-container text-sm text-on-surface">Documentation</a>
              <a href="#" className="block px-4 py-2 hover:bg-surface-container text-sm text-on-surface">Video Tutorials</a>
              <a href="#" className="block px-4 py-2 hover:bg-surface-container text-sm text-on-surface">Contact Support</a>
            </div>
          )}
        </div>

        {/* Avatar / Profile */}
        <div>
          <div
            onClick={() => toggleDropdown('profile')}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ml-1 cursor-pointer flex-shrink-0 ring-2 ring-surface-container-low"
            style={{ backgroundColor: "#396a00" }}
          >
            {initials}
          </div>
          {activeDropdown === 'profile' && (
            <div className="absolute top-full right-0 mt-1 w-56 bg-white rounded-xl shadow-lg border border-surface-container z-50 overflow-hidden py-1">
              <div className="px-4 py-3 border-b border-surface-container mb-1 bg-surface-container-lowest">
                <p className="text-sm font-bold text-on-surface truncate">{clinicName}</p>
                <p className="text-xs text-on-surface-variant truncate">admin@bytelytic.com</p>
              </div>
              <a href="/setup" className="flex items-center gap-2 px-4 py-2 hover:bg-surface-container text-sm text-on-surface">
                <Settings className="w-4 h-4" /> Account Settings
              </a>
              <button 
                onClick={() => {
                  localStorage.removeItem('sb-token');
                  window.location.href = '/login';
                }}
                className="w-full flex items-center gap-2 px-4 py-2 hover:bg-surface-container text-sm text-rose-600"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};

export default Header;
