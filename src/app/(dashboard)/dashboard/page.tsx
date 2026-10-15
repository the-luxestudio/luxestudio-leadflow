'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  CalendarX,
  CalendarCheck,
  TrendingUp,
  Award,
  Clock,
  ArrowUpRight,
  Plus,
  PhoneCall,
  FileText,
  Calendar,
  AlertTriangle,
  ChevronRight,
  Sparkles,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Quick Action Modal states
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [followUpModalOpen, setFollowUpModalOpen] = useState(false);
  const [leadsList, setLeadsList] = useState<any[]>([]);

  // Form states
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [activityType, setActivityType] = useState('CALL');
  const [activitySummary, setActivitySummary] = useState('');
  const [activityOutcome, setActivityOutcome] = useState('CONNECTED');

  const [followUpTitle, setFollowUpTitle] = useState('');
  const [followUpAction, setFollowUpAction] = useState('CALL');
  const [followUpDueAt, setFollowUpDueAt] = useState('');
  const [followUpMessage, setFollowUpMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    fetchLeadsForQuickActions();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/analytics');
      if (!res.ok) throw new Error('Failed to load dashboard metrics');
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeadsForQuickActions = async () => {
    try {
      const res = await fetch('/api/leads?limit=50');
      if (res.ok) {
        const json = await res.json();
        setLeadsList(json.leads || []);
        if (json.leads?.length > 0) {
          setSelectedLeadId(json.leads[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeadId || !activitySummary.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: selectedLeadId,
          type: activityType,
          summary: activitySummary,
          outcome: activityOutcome,
        }),
      });
      if (res.ok) {
        setActivityModalOpen(false);
        setActivitySummary('');
        fetchDashboardData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleScheduleFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeadId || !followUpTitle.trim() || !followUpDueAt) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/follow-ups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: selectedLeadId,
          title: followUpTitle,
          actionType: followUpAction,
          dueAt: followUpDueAt,
          plannedMessage: followUpMessage,
        }),
      });
      if (res.ok) {
        setFollowUpModalOpen(false);
        setFollowUpTitle('');
        setFollowUpMessage('');
        fetchDashboardData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-charcoal-200 rounded w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-white rounded-xl border border-charcoal-200" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-charcoal-200 shadow-sm">
        <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h3 className="text-sm font-bold text-charcoal-900">Failed to load dashboard metrics</h3>
        <p className="text-xs text-charcoal-500 mt-1">{error || 'Unknown error'}</p>
        <Button onClick={fetchDashboardData} variant="outline" size="sm" className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  const { overview, stageBreakdown, recentActivities, todayFollowUps = [] } = data;

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-xl border border-charcoal-200 shadow-subtle">
        <div>
          <h1 className="text-xl font-bold text-charcoal-900 tracking-tight flex items-center gap-2">
            Sales Overview
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gold-50 text-gold-700 border border-gold-200">
              LuxeStudio Live
            </span>
          </h1>
          <p className="text-xs text-charcoal-500 mt-0.5">
            Real-time pipeline metrics, overdue tasks, and client engagement history.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/leads/new">
            <Button variant="gold" size="sm">
              <Plus className="w-4 h-4" />
              <span>Add Lead</span>
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActivityModalOpen(true)}
            className="text-xs"
          >
            <PhoneCall className="w-3.5 h-3.5 text-gold-600" />
            <span>Log Call</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFollowUpModalOpen(true)}
            className="text-xs"
          >
            <Calendar className="w-3.5 h-3.5 text-sky-600" />
            <span>Schedule Follow-up</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Leads */}
        <div className="bg-white p-5 rounded-xl border border-charcoal-200 shadow-subtle card-interactive">
          <div className="flex items-center justify-between text-charcoal-500">
            <span className="text-xs font-medium uppercase tracking-wider">Active Leads</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-charcoal-900">{overview.totalLeads}</span>
            <span className="text-xs text-emerald-600 font-medium">
              +{overview.leadsCreatedThisWeek} this week
            </span>
          </div>
          <Link
            href="/leads"
            className="mt-3 text-[11px] font-semibold text-charcoal-600 hover:text-gold-600 flex items-center gap-1 transition-colors"
          >
            View all leads <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Follow-ups Due Today */}
        <div className="bg-white p-5 rounded-xl border border-charcoal-200 shadow-subtle card-interactive">
          <div className="flex items-center justify-between text-charcoal-500">
            <span className="text-xs font-medium uppercase tracking-wider">Follow-ups Today</span>
            <div
              className={`p-2 rounded-lg ${
                overview.followUpsDueToday > 0 ? 'bg-amber-100 text-amber-700' : 'bg-amber-50 text-amber-600'
              }`}
            >
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold ${
                overview.followUpsDueToday > 0 ? 'text-amber-700' : 'text-charcoal-900'
              }`}
            >
              {overview.followUpsDueToday}
            </span>
            <span className="text-xs text-charcoal-500">scheduled for today</span>
          </div>
          <Link
            href="/follow-ups?tab=today"
            className="mt-3 text-[11px] font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1 transition-colors"
          >
            Open today's tasks <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Overdue Follow-ups Alert */}
        <div
          className={`p-5 rounded-xl border shadow-subtle card-interactive ${
            overview.overdueFollowUps > 0
              ? 'bg-rose-50/40 border-rose-200'
              : 'bg-white border-charcoal-200'
          }`}
        >
          <div className="flex items-center justify-between text-charcoal-500">
            <span className="text-xs font-medium uppercase tracking-wider">Overdue Tasks</span>
            <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
              <CalendarX className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold ${
                overview.overdueFollowUps > 0 ? 'text-rose-600' : 'text-charcoal-900'
              }`}
            >
              {overview.overdueFollowUps}
            </span>
            <span className="text-xs text-rose-500 font-medium">requires immediate action</span>
          </div>
          <Link
            href="/follow-ups?tab=overdue"
            className="mt-3 text-[11px] font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 transition-colors"
          >
            Review overdue tasks <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Open Pipeline Value */}
        <div className="bg-white p-5 rounded-xl border border-charcoal-200 shadow-subtle card-interactive">
          <div className="flex items-center justify-between text-charcoal-500">
            <span className="text-xs font-medium uppercase tracking-wider">Open Pipeline</span>
            <div className="p-2 rounded-lg bg-gold-50 text-gold-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-charcoal-900">
              ₹{overview.openPipelineValue.toLocaleString('en-IN')}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-charcoal-500">
            Weighted: ₹{Math.round(overview.weightedPipelineValue).toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {/* Secondary Metric Bar: Won Deals, Closed Revenue & Win Rate */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-charcoal-200 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase text-charcoal-500">Closed Won Revenue</p>
            <p className="text-lg font-bold text-emerald-700">
              ₹{overview.closedWonRevenue.toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-charcoal-200 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-gold-50 text-gold-600">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase text-charcoal-500">Won Deals</p>
            <p className="text-lg font-bold text-charcoal-900">
              {overview.wonDealsCount} <span className="text-xs font-normal text-charcoal-500">closed clients</span>
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-charcoal-200 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-purple-50 text-purple-600">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase text-charcoal-500">Opportunity Win Rate</p>
            <p className="text-lg font-bold text-charcoal-900">{overview.winRate}%</p>
          </div>
        </div>
      </div>

      {/* Warning Alert: Leads with No Next Action */}
      {overview.leadsWithNoNextActionCount > 0 && (
        <div className="bg-amber-50/80 border border-amber-200 p-4 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-amber-900">
                {overview.leadsWithNoNextActionCount} Leads have no scheduled next action!
              </h4>
              <p className="text-[11px] text-amber-700 mt-0.5">
                Every lead must have an identifiable next action to avoid pipeline leakage.
              </p>
            </div>
          </div>
          <Link href="/leads?followUpStatus=none">
            <Button variant="outline" size="sm" className="bg-white border-amber-300 text-amber-900 hover:bg-amber-100/50">
              Schedule Next Actions
            </Button>
          </Link>
        </div>
      )}

      {/* Pipeline Stage Breakdown */}
      <div className="bg-white p-5 rounded-xl border border-charcoal-200 shadow-subtle">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-charcoal-900">Pipeline Stages & Volume</h3>
            <p className="text-xs text-charcoal-500">Active deal distribution across sales funnel</p>
          </div>
          <Link href="/pipeline">
            <Button variant="outline" size="sm">
              <span>Open Kanban Board</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {stageBreakdown.map((stage: any) => (
            <div
              key={stage.id}
              className="p-3 rounded-lg border border-charcoal-100 bg-charcoal-50/60 hover:bg-charcoal-50 transition-colors"
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: stage.color || '#C5A84D' }}
                />
                <span className="text-xs font-semibold text-charcoal-800 truncate">
                  {stage.name}
                </span>
              </div>
              <p className="text-lg font-bold text-charcoal-900">{stage.count}</p>
              <p className="text-[10px] text-charcoal-500 mt-0.5 font-medium truncate">
                ₹{stage.totalValue.toLocaleString('en-IN')}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 2-Column Grid: Today's Action Agenda & Recent CRM Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Priority Follow-ups */}
        <div className="bg-white p-5 rounded-xl border border-charcoal-200 shadow-subtle flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-charcoal-900">Today&apos;s Follow-up Agenda</h3>
                  {overview.followUpsDueToday > 0 && (
                    <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      {overview.followUpsDueToday} Due Today
                    </span>
                  )}
                </div>
                <p className="text-xs text-charcoal-500 mt-0.5">Calls, messages, and scheduled meetings for today</p>
              </div>
              <Link href="/follow-ups?tab=today">
                <Button variant="outline" size="sm" className="text-xs">
                  <span>View All</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>

            {todayFollowUps.length === 0 ? (
              <div className="py-8 text-center bg-charcoal-50/50 rounded-lg border border-charcoal-100">
                <CalendarCheck className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-xs font-semibold text-charcoal-800">All caught up for today!</p>
                <p className="text-[11px] text-charcoal-500 mt-0.5">No pending follow-ups due today.</p>
              </div>
            ) : (
              <div className="divide-y divide-charcoal-100 max-h-[420px] overflow-y-auto pr-1">
                {todayFollowUps.map((item: any) => {
                  const contact = item.lead.contacts[0];
                  const timeStr = new Date(item.dueAt).toLocaleTimeString('en-IN', {
                    timeZone: 'Asia/Kolkata',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                  });
                  return (
                    <div key={item.id} className="py-2.5 flex items-center justify-between gap-3 hover:bg-charcoal-50/60 px-2 rounded-lg transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-2 rounded-lg shrink-0 ${
                          item.actionType === 'WHATSAPP'
                            ? 'bg-emerald-50 text-emerald-600'
                            : item.actionType === 'CALL'
                            ? 'bg-sky-50 text-sky-600'
                            : 'bg-gold-50 text-gold-600'
                        }`}>
                          {item.actionType === 'WHATSAPP' ? (
                            <MessageSquare className="w-3.5 h-3.5" />
                          ) : (
                            <PhoneCall className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/leads/${item.lead.id}`}
                              className="text-xs font-bold text-charcoal-900 hover:text-gold-600 truncate hover:underline"
                            >
                              {item.lead.businessName}
                            </Link>
                            {item.lead.dealValue && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-charcoal-100 text-charcoal-700">
                                ₹{item.lead.dealValue.toLocaleString('en-IN')}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-charcoal-500 flex items-center gap-2 mt-0.5">
                            {contact?.name && <span className="truncate">{contact.name}</span>}
                            {contact?.phone && (
                              <a
                                href={`tel:${contact.phone}`}
                                className="text-sky-600 hover:underline font-mono"
                              >
                                {contact.phone}
                              </a>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                          {timeStr}
                        </span>
                        <Link href={`/leads/${item.lead.id}`}>
                          <Button variant="outline" size="sm" className="h-7 px-2 text-[11px]">
                            View →
                          </Button>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {todayFollowUps.length > 0 && (
            <div className="pt-3 mt-3 border-t border-charcoal-100 flex items-center justify-between text-xs text-charcoal-500">
              <span>Showing top {todayFollowUps.length} tasks scheduled for today</span>
              <Link href="/follow-ups?tab=today" className="font-semibold text-gold-600 hover:underline flex items-center gap-1">
                Open Follow-up Centre <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
          )}
        </div>

        {/* Recent Activity Timeline */}
        <div className="bg-white p-5 rounded-xl border border-charcoal-200 shadow-subtle flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-charcoal-900">Recent CRM Activities</h3>
                <p className="text-xs text-charcoal-500 mt-0.5">Calls logged, meetings held, and stage changes</p>
              </div>
            </div>

            {recentActivities.length === 0 ? (
              <p className="text-xs text-charcoal-500 py-4 text-center">No recent activities logged yet.</p>
            ) : (
              <div className="divide-y divide-charcoal-100 max-h-[420px] overflow-y-auto pr-1">
                {recentActivities.map((act: any) => (
                  <div key={act.id} className="py-2.5 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-charcoal-100 text-charcoal-700 mt-0.5 shrink-0">
                        {act.type === 'CALL' ? (
                          <PhoneCall className="w-3.5 h-3.5" />
                        ) : act.type === 'STAGE_CHANGE' ? (
                          <TrendingUp className="w-3.5 h-3.5 text-gold-600" />
                        ) : (
                          <FileText className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-charcoal-900 truncate">{act.summary}</p>
                        <p className="text-[11px] text-charcoal-500 truncate">
                          Lead:{' '}
                          <Link
                            href={`/leads/${act.lead.id}`}
                            className="font-medium text-charcoal-700 hover:text-gold-600 hover:underline"
                          >
                            {act.lead.businessName}
                          </Link>{' '}
                          • By <span className="font-medium">{act.actor?.displayName || 'System'}</span>
                        </p>
                        {act.details && (
                          <p className="text-xs text-charcoal-600 mt-0.5 italic line-clamp-1">{act.details}</p>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] text-charcoal-400 whitespace-nowrap shrink-0">
                      {new Date(act.occurredAt).toLocaleDateString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Action: Log Call Modal */}
      <Modal
        isOpen={activityModalOpen}
        onClose={() => setActivityModalOpen(false)}
        title="Quick Log Call or Activity"
        description="Record verified client communication into the CRM timeline"
      >
        <form onSubmit={handleLogActivity} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-charcoal-700 mb-1">Select Lead</label>
            <select
              value={selectedLeadId}
              onChange={(e) => setSelectedLeadId(e.target.value)}
              className="w-full text-xs border border-charcoal-300 rounded-lg p-2 bg-white text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-gold-500"
            >
              {leadsList.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.businessName} ({l.contacts[0]?.name || 'N/A'})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-charcoal-700 mb-1">Activity Type</label>
              <select
                value={activityType}
                onChange={(e) => setActivityType(e.target.value)}
                className="w-full text-xs border border-charcoal-300 rounded-lg p-2 bg-white text-charcoal-900"
              >
                <option value="CALL">Phone Call</option>
                <option value="WHATSAPP">WhatsApp Message</option>
                <option value="MEETING">Meeting</option>
                <option value="NOTE">Quick Note</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-charcoal-700 mb-1">Outcome</label>
              <select
                value={activityOutcome}
                onChange={(e) => setActivityOutcome(e.target.value)}
                className="w-full text-xs border border-charcoal-300 rounded-lg p-2 bg-white text-charcoal-900"
              >
                <option value="CONNECTED">Connected</option>
                <option value="NO_ANSWER">No Answer</option>
                <option value="MESSAGE_SENT">Message Sent</option>
                <option value="REPLY_RECEIVED">Reply Received</option>
                <option value="MEETING_SCHEDULED">Meeting Scheduled</option>
                <option value="NOT_INTERESTED">Not Interested</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-charcoal-700 mb-1">
              Discussion Summary *
            </label>
            <textarea
              required
              rows={3}
              value={activitySummary}
              onChange={(e) => setActivitySummary(e.target.value)}
              placeholder="Spoke with client regarding new website requirements..."
              className="w-full text-xs border border-charcoal-300 rounded-lg p-2.5 text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setActivityModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="gold" size="sm" isLoading={submitting}>
              Save Activity
            </Button>
          </div>
        </form>
      </Modal>

      {/* Quick Action: Schedule Follow-up Modal */}
      <Modal
        isOpen={followUpModalOpen}
        onClose={() => setFollowUpModalOpen(false)}
        title="Schedule Follow-up Task"
        description="Set a date, action, and notification instructions"
      >
        <form onSubmit={handleScheduleFollowUp} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-charcoal-700 mb-1">Select Lead</label>
            <select
              value={selectedLeadId}
              onChange={(e) => setSelectedLeadId(e.target.value)}
              className="w-full text-xs border border-charcoal-300 rounded-lg p-2 bg-white text-charcoal-900"
            >
              {leadsList.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.businessName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-charcoal-700 mb-1">Task Title *</label>
            <input
              type="text"
              required
              value={followUpTitle}
              onChange={(e) => setFollowUpTitle(e.target.value)}
              placeholder="e.g. Call to discuss proposal revisions"
              className="w-full text-xs border border-charcoal-300 rounded-lg p-2 text-charcoal-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-charcoal-700 mb-1">Action Type</label>
              <select
                value={followUpAction}
                onChange={(e) => setFollowUpAction(e.target.value)}
                className="w-full text-xs border border-charcoal-300 rounded-lg p-2 bg-white text-charcoal-900"
              >
                <option value="CALL">Phone Call</option>
                <option value="WHATSAPP">WhatsApp</option>
                <option value="EMAIL">Email</option>
                <option value="MEETING">Meeting</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-charcoal-700 mb-1">Due Date & Time *</label>
              <input
                type="datetime-local"
                required
                value={followUpDueAt}
                onChange={(e) => setFollowUpDueAt(e.target.value)}
                className="w-full text-xs border border-charcoal-300 rounded-lg p-2 text-charcoal-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-charcoal-700 mb-1">
              Planned Message or Instructions
            </label>
            <textarea
              rows={2}
              value={followUpMessage}
              onChange={(e) => setFollowUpMessage(e.target.value)}
              placeholder="Instructions or questions to ask the prospect..."
              className="w-full text-xs border border-charcoal-300 rounded-lg p-2 text-charcoal-900"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setFollowUpModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="gold" size="sm" isLoading={submitting}>
              Schedule Task
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
