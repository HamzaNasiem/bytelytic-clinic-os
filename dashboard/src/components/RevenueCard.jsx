import React from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

const RevenueCard = ({
  title,
  amount,
  percentage,
  isPositive,
  icon: Icon,
  hero = false,
}) => {
  if (hero) {
    return (
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-brand-900 rounded-2xl p-6 shadow-xl border border-slate-700/50 flex flex-col h-full relative overflow-hidden group hover:shadow-2xl transition-all duration-300">
        {/* Glow effect */}
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-brand-500/20 rounded-full blur-3xl group-hover:bg-brand-500/30 transition-all duration-500" />
        <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-violet-500/10 rounded-full blur-2xl" />

        <div className="relative z-10 flex flex-col h-full">
          <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center text-white mb-4 border border-white/10">
            <Icon className="w-6 h-6" />
          </div>
          <h3 className="text-slate-300 font-medium text-sm mb-2">{title}</h3>
          <div className="text-4xl font-black text-white tracking-tight mt-auto">
            {amount}
          </div>
          <div className="flex items-center gap-2 mt-3">
            <div
              className={`flex items-center text-xs font-semibold px-2 py-1 rounded-full ${isPositive ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"}`}
            >
              {isPositive ? (
                <ArrowUpRight className="w-3 h-3 mr-0.5" />
              ) : (
                <ArrowDownRight className="w-3 h-3 mr-0.5" />
              )}
              {percentage}%
            </div>
            <span className="text-slate-500 text-xs">vs last month</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col h-full hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center text-brand-500 mb-4">
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="text-slate-500 font-medium text-sm mb-1">{title}</h3>
      <div className="flex items-end justify-between mt-auto pt-2">
        <div className="text-2xl font-bold text-slate-800">{amount}</div>
        <div
          className={`flex items-center text-xs font-semibold px-2 py-1 rounded-full ${isPositive ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-500"}`}
        >
          {isPositive ? (
            <ArrowUpRight className="w-3 h-3 mr-0.5" />
          ) : (
            <ArrowDownRight className="w-3 h-3 mr-0.5" />
          )}
          {percentage}%
        </div>
      </div>
    </div>
  );
};

export default RevenueCard;
