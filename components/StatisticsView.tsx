import React, { useMemo, useState } from 'react';
import { DatabaseRecord } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { PieChart as PieChartIcon, BarChart as BarChartIcon, Activity, AlertCircle, Filter } from 'lucide-react';

interface StatisticsViewProps {
  history: DatabaseRecord[];
}

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];

const StatisticsView: React.FC<StatisticsViewProps> = ({ history }) => {
  const [selectedId, setSelectedId] = useState<string>('all');

  const filteredHistory = useMemo(() => {
    if (selectedId === 'all') return history;
    return history.filter(h => h.id?.toString() === selectedId);
  }, [history, selectedId]);

  const stats = useMemo(() => {
    let totalErrors = 0;
    const errorCodeCounts: Record<string, number> = {};
    const macroCodeCounts: Record<string, number> = {};

    filteredHistory.forEach(record => {
      totalErrors += record.annotations.length;
      record.annotations.forEach(ann => {
        // Count Error Codes
        errorCodeCounts[ann.error_code] = (errorCodeCounts[ann.error_code] || 0) + 1;
        // Count Macro Codes
        macroCodeCounts[ann.macro_code] = (macroCodeCounts[ann.macro_code] || 0) + 1;
      });
    });

    const topErrorCodes = Object.entries(errorCodeCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    const macroCodeData = Object.entries(macroCodeCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return {
      totalRecords: filteredHistory.length,
      totalErrors,
      avgErrors: filteredHistory.length ? (totalErrors / filteredHistory.length).toFixed(1) : 0,
      topErrorCodes,
      macroCodeData
    };
  }, [filteredHistory]);

  if (history.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-slate-200 border-dashed">
        <Activity className="mx-auto h-12 w-12 text-slate-300 mb-3" />
        <p className="text-slate-500">No data available for statistics. Start analyzing texts!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Dropdown */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
        <Filter className="text-slate-400" size={20} />
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="flex-grow p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm text-slate-700"
        >
          <option value="all">All Combined Statistics ({history.length} items)</option>
          {history.map((record) => (
            <option key={record.id} value={record.id?.toString()}>
              #{record.id} - {record.original_text.substring(0, 50)}{record.original_text.length > 50 ? '...' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
              <Activity size={20} />
            </div>
            <h3 className="text-sm font-medium text-slate-500">Total Analyzed</h3>
          </div>
          <p className="text-3xl font-bold text-slate-800">{stats.totalRecords}</p>
          <p className="text-xs text-slate-400 mt-1">Texts processed</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-100 rounded-lg text-red-600">
              <AlertCircle size={20} />
            </div>
            <h3 className="text-sm font-medium text-slate-500">Total Errors</h3>
          </div>
          <p className="text-3xl font-bold text-slate-800">{stats.totalErrors}</p>
          <p className="text-xs text-slate-400 mt-1">Errors identified</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 rounded-lg text-green-600">
              <BarChartIcon size={20} />
            </div>
            <h3 className="text-sm font-medium text-slate-500">Avg. Errors</h3>
          </div>
          <p className="text-3xl font-bold text-slate-800">{stats.avgErrors}</p>
          <p className="text-xs text-slate-400 mt-1">Per text submission</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Error Codes Bar Chart */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <BarChartIcon className="text-slate-400" size={20} />
            Top 10 Error Types
          </h3>
          <div className="h-80 w-full">
            {stats.totalErrors > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.topErrorCodes} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={40} tick={{fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    cursor={{fill: '#f1f5f9'}}
                  />
                  <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} name="Count" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">
                No errors to display
              </div>
            )}
          </div>
        </div>

        {/* Macro Code Distribution Pie Chart */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <PieChartIcon className="text-slate-400" size={20} />
            Error Category Distribution
          </h3>
          <div className="h-80 w-full">
            {stats.totalErrors > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.macroCodeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {stats.macroCodeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">
                No errors to display
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatisticsView;