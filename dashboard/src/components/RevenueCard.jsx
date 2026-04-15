import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

const RevenueCard = ({ title, amount, percentage, isPositive, icon: Icon }) => {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col h-full hover:shadow-md transition-shadow">
      <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center text-brand-500 mb-4">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-slate-500 font-medium text-sm mb-1">{title}</h3>
      <div className="flex items-end justify-between mt-auto">
        <div className="text-2xl font-bold text-slate-800">{amount}</div>
        <div className={`flex items-center text-sm font-medium ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
          {isPositive ? <ArrowUpRight className="w-4 h-4 mr-1" /> : <ArrowDownRight className="w-4 h-4 mr-1" />}
          {percentage}%
        </div>
      </div>
    </div>
  );
};

export default RevenueCard;
