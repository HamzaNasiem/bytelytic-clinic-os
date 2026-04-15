import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChevronDown } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import api from '../lib/api';

const CallStats = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7); // default "This Week"

  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/dashboard/timeline?days=${days}`);
        // Backend returns [{ date: 'YYYY-MM-DD', calls: N, bookings: N }]
        // Format it for the chart
        const formattedData = res.data.data.map(item => ({
          name: format(parseISO(item.date), 'eee'), // Mon, Tue, etc.
          calls: item.calls,
          bookings: item.bookings
        }));
        
        // If data is empty, set empty array
        setData(formattedData);
      } catch (err) {
        console.error("Failed to load timeline data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTimeline();
  }, [days]);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col h-full w-full">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-slate-800 font-bold text-lg">Call Volume Analytics</h3>
        
        <div className="relative">
          <select 
            className="appearance-none bg-slate-50 border border-slate-200 text-slate-600 font-medium text-sm rounded-lg pl-4 pr-10 py-2 focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none hover:bg-slate-100 transition-colors cursor-pointer shadow-sm"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            <option value={7}>This Week</option>
            <option value={14}>Last 14 Days</option>
            <option value={30}>This Month</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
      </div>
      
      <div className="flex-1 min-h-[300px]">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center text-slate-400">Loading data...</div>
        ) : data.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-slate-400">No data available for this period.</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
              <Tooltip 
                cursor={{fill: '#f8fafc'}}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="calls" fill="#bed1fd" radius={[4, 4, 0, 0]} maxBarSize={40} />
              <Bar dataKey="bookings" fill="#2b60f5" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default CallStats;
