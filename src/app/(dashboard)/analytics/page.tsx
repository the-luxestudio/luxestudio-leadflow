'use client';

import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  Award,
  Users,
  CalendarCheck,
  RefreshCw,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

const COLORS = ['#C5A84D', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#64748B'];

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [teamData, setTeamData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [resSummary, resTeam] = await Promise.all([
        fetch('/api/analytics'),
        fetch('/api/analytics?view=team'),
      ]);

      if (resSummary.ok) {
        const json = await resSummary.json();
        setData(json);
      }

      if (resTeam.ok) {
        const tJson = await resTeam.json();
        setTeamData(tJson.team || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="bg-white p-12 rounded-xl border border-charcoal-200 text-center space-y-3">
        <RefreshCw className="w-6 h-6 animate-spin text-gold-600 mx-auto" />
        <p className="text-xs text-charcoal-500">Aggregating pipeline analytics...</p>
      </div>
    );
  }

  const { overview, stageBreakdown, sourceBreakdown } = data;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-charcoal-900 tracking-tight flex items-center gap-2">
            Sales & Pipeline Analytics
            <BarChart3 className="w-5 h-5 text-gold-500" />
          </h1>
          <p className="text-xs text-charcoal-500 mt-0.5">
            Aggregated performance metrics, stage funnels, and sales team velocity.
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Download className="w-3.5 h-3.5" />
          <span>Export Analytics</span>
        </Button>
      </div>

      {/* KPI Highlight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-charcoal-200 shadow-subtle">
          <span className="text-[11px] font-semibold uppercase text-charcoal-500">Won Revenue</span>
          <p className="text-2xl font-bold text-emerald-700 mt-1">
            ₹{overview.closedWonRevenue.toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-charcoal-400 mt-1">Booked contracts (excludes uncollected cash)</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-charcoal-200 shadow-subtle">
          <span className="text-[11px] font-semibold uppercase text-charcoal-500">Open Pipeline Value</span>
          <p className="text-2xl font-bold text-charcoal-900 mt-1">
            ₹{overview.openPipelineValue.toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-gold-700 mt-1 font-semibold">
            Weighted: ₹{Math.round(overview.weightedPipelineValue).toLocaleString('en-IN')}
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-charcoal-200 shadow-subtle">
          <span className="text-[11px] font-semibold uppercase text-charcoal-500">Overall Win Rate</span>
          <p className="text-2xl font-bold text-charcoal-900 mt-1">{overview.winRate}%</p>
          <p className="text-[11px] text-charcoal-400 mt-1">{overview.wonDealsCount} deals closed won</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-charcoal-200 shadow-subtle">
          <span className="text-[11px] font-semibold uppercase text-charcoal-500">Active Leads</span>
          <p className="text-2xl font-bold text-charcoal-900 mt-1">{overview.totalLeads}</p>
          <p className="text-[11px] text-emerald-600 font-medium mt-1">+{overview.leadsCreatedThisWeek} this week</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stage Volume Bar Chart */}
        <div className="bg-white p-5 rounded-xl border border-charcoal-200 shadow-subtle">
          <h3 className="text-xs font-bold text-charcoal-900 uppercase tracking-wider mb-4">
            Leads Count by Pipeline Stage
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stageBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: '#64748B' }}
                  angle={-25}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis tick={{ fontSize: 10, fill: '#64748B' }} allowDecimals={false} />
                <Tooltip
                  formatter={(val: any, name: any) => [val, 'Leads']}
                  contentStyle={{ backgroundColor: '#1E293B', color: '#fff', borderRadius: '8px', fontSize: '11px' }}
                />
                <Bar dataKey="count" fill="#C5A84D" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lead Source Breakdown */}
        <div className="bg-white p-5 rounded-xl border border-charcoal-200 shadow-subtle">
          <h3 className="text-xs font-bold text-charcoal-900 uppercase tracking-wider mb-4">
            Prospect Acquisition Channels
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sourceBreakdown}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {sourceBreakdown.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1E293B', color: '#fff', borderRadius: '8px', fontSize: '11px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Team Member Performance Table */}
      {teamData.length > 0 && (
        <div className="bg-white rounded-xl border border-charcoal-200 shadow-subtle overflow-hidden">
          <div className="p-4 border-b border-charcoal-200">
            <h3 className="text-sm font-bold text-charcoal-900">Team Member Sales Velocity</h3>
            <p className="text-xs text-charcoal-500">Pipeline ownership and closed won deal breakdown</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-charcoal-50 text-[10px] uppercase font-semibold text-charcoal-600">
                <tr>
                  <th className="py-3 px-4">Representative</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Assigned Leads</th>
                  <th className="py-3 px-4">Open Pipeline</th>
                  <th className="py-3 px-4">Closed Won Revenue</th>
                  <th className="py-3 px-4">Won Deals</th>
                  <th className="py-3 px-4">Activities (30d)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-charcoal-100">
                {teamData.map((m) => (
                  <tr key={m.userId} className="hover:bg-charcoal-50/50 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-charcoal-900">{m.name}</td>
                    <td className="py-3.5 px-4 text-charcoal-500">{m.role.replace('_', ' ')}</td>
                    <td className="py-3.5 px-4 font-medium text-charcoal-900">{m.totalLeads}</td>
                    <td className="py-3.5 px-4 font-medium text-charcoal-900">
                      ₹{m.openPipelineValue.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-emerald-700">
                      ₹{m.wonRevenue.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-charcoal-900">{m.wonDealsCount}</td>
                    <td className="py-3.5 px-4 text-charcoal-600">{m.recentActivitiesCount} actions</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
