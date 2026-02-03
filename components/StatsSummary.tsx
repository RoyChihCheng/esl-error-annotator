import React, { useMemo } from 'react';
import { Annotation } from '../types';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface StatsSummaryProps {
  annotations: Annotation[];
  title?: string;
}

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];

const StatsSummary: React.FC<StatsSummaryProps> = ({ annotations, title = "Analysis Statistics" }) => {
  const stats = useMemo(() => {
    const macroCounts: Record<string, number> = {};
    const microCounts: Record<string, number> = {};

    annotations.forEach(ann => {
      macroCounts[ann.macro_code] = (macroCounts[ann.macro_code] || 0) + 1;
      microCounts[ann.error_code] = (microCounts[ann.error_code] || 0) + 1;
    });

    const macroData = Object.entries(macroCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const microData = Object.entries(microCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return { macroData, microData, total: annotations.length };
  }, [annotations]);

  if (stats.total === 0) {
    return (
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-full">
        <h3 className="font-bold text-slate-700 mb-4 border-b border-slate-100 pb-2">{title}</h3>
        <div className="flex flex-col items-center justify-center h-40 text-slate-400">
          <p>No errors found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-full flex flex-col">
      <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-4">
        <h3 className="font-bold text-slate-700">{title}</h3>
        <span className="bg-red-100 text-red-700 text-xs font-bold px-3 py-1 rounded-full">
          {stats.total} Errors
        </span>
      </div>

      <div className="space-y-6 flex-grow">
        {/* Macro Codes */}
        <div>
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Macro Categories</h4>
          <div className="flex items-start gap-4">
            <div className="h-24 w-24 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.macroData}
                    cx="50%"
                    cy="50%"
                    innerRadius={15}
                    outerRadius={35}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {stats.macroData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-grow space-y-1.5 overflow-y-auto max-h-32 custom-scrollbar pr-2">
              {stats.macroData.map((item, idx) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                    <span className="text-slate-600 font-medium">{item.name}</span>
                  </div>
                  <span className="text-slate-900 font-semibold">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Micro Codes */}
        <div>
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Error Codes</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-2">
            {stats.microData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-sm bg-slate-50 p-2 rounded border border-slate-100">
                <span className="font-mono text-xs font-bold text-blue-600">{item.name}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full" 
                      style={{ width: `${(item.value / stats.total) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-slate-600 w-4 text-right">{item.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsSummary;
