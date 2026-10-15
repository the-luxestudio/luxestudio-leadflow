'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CalendarClock,
  Phone,
  MessageCircle,
  Mail,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  XCircle,
  Copy,
  Check,
  Plus,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { generateWhatsAppUrl } from '@/lib/services/templates';

export default function FollowUpsPage() {
  const [activeTab, setActiveTab] = useState<'today' | 'upcoming' | 'overdue' | 'completed'>('today');
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Complete Modal
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [completionOutcome, setCompletionOutcome] = useState('CONNECTED');
  const [completionNotes, setCompletionNotes] = useState('');
  const [scheduleNext, setScheduleNext] = useState(false);
  const [nextTitle, setNextTitle] = useState('');
  const [nextActionType, setNextActionType] = useState('CALL');
  const [nextDueAt, setNextDueAt] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Snooze Modal
  const [snoozeModalOpen, setSnoozeModalOpen] = useState(false);
  const [snoozeDueAt, setSnoozeDueAt] = useState('');

  // Copy Feedback state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchFollowUps();
  }, [activeTab]);

  const fetchFollowUps = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/follow-ups?tab=${activeTab}`);
      if (res.ok) {
        const json = await res.json();
        setFollowUps(json.followUps || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenComplete = (task: any) => {
    setSelectedTask(task);
    setCompletionOutcome('CONNECTED');
    setCompletionNotes('');
    setScheduleNext(false);
    const in3Days = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    setNextDueAt(in3Days.toISOString().slice(0, 16));
    setNextTitle(`Follow up after ${task.actionType}`);
    setCompleteModalOpen(true);
  };

  const handleOpenSnooze = (task: any) => {
    setSelectedTask(task);
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    setSnoozeDueAt(tomorrow.toISOString().slice(0, 16));
    setSnoozeModalOpen(true);
  };

  const handleCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    setSubmitting(true);

    try {
      const payload: any = {
        outcome: completionOutcome,
        notes: completionNotes,
      };

      if (scheduleNext && nextTitle && nextDueAt) {
        payload.nextFollowUp = {
          title: nextTitle,
          actionType: nextActionType,
          dueAt: new Date(nextDueAt).toISOString(),
        };
      }

      const res = await fetch(`/api/follow-ups/${selectedTask.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setCompleteModalOpen(false);
        fetchFollowUps();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSnoozeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !snoozeDueAt) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/follow-ups/${selectedTask.id}/snooze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newDueAt: snoozeDueAt }),
      });

      if (res.ok) {
        setSnoozeModalOpen(false);
        fetchFollowUps();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelTask = async (taskId: string) => {
    if (!confirm('Cancel this follow-up task and disable any scheduled notifications?')) return;
    try {
      const res = await fetch(`/api/follow-ups/${taskId}/cancel`, {
        method: 'POST',
      });
      if (res.ok) {
        fetchFollowUps();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-charcoal-900 tracking-tight flex items-center gap-2">
            Follow-up Centre
            <CalendarClock className="w-5 h-5 text-gold-500" />
          </h1>
          <p className="text-xs text-charcoal-500 mt-0.5">
            Manage scheduled client check-ins, record outcomes, and trigger personal Telegram notifications.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchFollowUps}>
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-charcoal-200 gap-6 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('today')}
          className={`pb-3 border-b-2 transition-all cursor-pointer ${
            activeTab === 'today'
              ? 'border-gold-500 text-charcoal-900 font-bold'
              : 'border-transparent text-charcoal-500 hover:text-charcoal-800'
          }`}
        >
          Due Today
        </button>
        <button
          onClick={() => setActiveTab('overdue')}
          className={`pb-3 border-b-2 transition-all cursor-pointer ${
            activeTab === 'overdue'
              ? 'border-rose-500 text-rose-700 font-bold'
              : 'border-transparent text-charcoal-500 hover:text-charcoal-800'
          }`}
        >
          Overdue
        </button>
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`pb-3 border-b-2 transition-all cursor-pointer ${
            activeTab === 'upcoming'
              ? 'border-gold-500 text-charcoal-900 font-bold'
              : 'border-transparent text-charcoal-500 hover:text-charcoal-800'
          }`}
        >
          Upcoming
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`pb-3 border-b-2 transition-all cursor-pointer ${
            activeTab === 'completed'
              ? 'border-emerald-500 text-emerald-800 font-bold'
              : 'border-transparent text-charcoal-500 hover:text-charcoal-800'
          }`}
        >
          Completed History
        </button>
      </div>

      {/* Tasks List */}
      {loading ? (
        <div className="bg-white p-12 rounded-xl border border-charcoal-200 text-center space-y-3">
          <RefreshCw className="w-6 h-6 animate-spin text-gold-600 mx-auto" />
          <p className="text-xs text-charcoal-500">Loading follow-ups...</p>
        </div>
      ) : followUps.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-charcoal-200 text-center space-y-3">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
          <h3 className="text-sm font-bold text-charcoal-900">All clear! No tasks in this tab</h3>
          <p className="text-xs text-charcoal-500 max-w-sm mx-auto">
            You're completely caught up. Schedule new actions from the Leads page to keep prospects warm.
          </p>
          <Link href="/leads">
            <Button variant="outline" size="sm" className="mt-2">
              Browse Leads
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {followUps.map((task) => {
            const contact = task.lead?.contacts?.[0];
            const isOverdue = new Date(task.dueAt) < new Date();

            return (
              <div
                key={task.id}
                className="bg-white p-5 rounded-xl border border-charcoal-200 shadow-subtle hover:border-charcoal-300 transition-all flex flex-col md:flex-row md:items-center md:justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-charcoal-100 text-charcoal-800 uppercase tracking-wider">
                      {task.actionType}
                    </span>
                    <h3 className="text-sm font-bold text-charcoal-900">{task.title}</h3>
                    {task.outcome && (
                      <Badge variant="info" size="sm">
                        {task.outcome}
                      </Badge>
                    )}
                  </div>

                  <p className="text-xs text-charcoal-600">
                    Lead:{' '}
                    <Link
                      href={`/leads/${task.lead?.id}`}
                      className="font-bold text-charcoal-900 hover:text-gold-600 hover:underline"
                    >
                      {task.lead?.businessName}
                    </Link>{' '}
                    • Contact:{' '}
                    <span className="font-medium text-charcoal-800">
                      {contact?.name || 'N/A'} ({contact?.phone || 'No phone'})
                    </span>
                  </p>

                  <div className="flex items-center gap-4 text-xs text-charcoal-500 pt-0.5">
                    <span
                      className={`flex items-center gap-1 font-semibold ${
                        isOverdue && task.status === 'SCHEDULED' ? 'text-rose-600' : 'text-charcoal-600'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      Due:{' '}
                      {new Date(task.dueAt).toLocaleString('en-IN', {
                        timeZone: task.timezone || 'Asia/Kolkata',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {isOverdue && task.status === 'SCHEDULED' && (
                        <span className="text-[10px] uppercase font-bold text-rose-600 ml-1">
                          (Overdue)
                        </span>
                      )}
                    </span>
                    <span>• Owner: {task.owner?.displayName || 'Unassigned'}</span>
                  </div>

                  {task.plannedMessage && (
                    <div className="mt-2 p-2.5 rounded-lg bg-charcoal-50 border border-charcoal-200/70 text-xs text-charcoal-700 flex items-start justify-between gap-2">
                      <p className="italic">"{task.plannedMessage}"</p>
                      <button
                        onClick={() => handleCopy(task.id, task.plannedMessage)}
                        className="text-charcoal-400 hover:text-charcoal-700 p-1 rounded shrink-0 cursor-pointer"
                        title="Copy instructions / message"
                      >
                        {copiedId === task.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Task Actions */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {contact?.phone && (
                    <>
                      <a href={`tel:${contact.phone}`}>
                        <Button variant="outline" size="sm" title="Call">
                          <Phone className="w-3.5 h-3.5" />
                        </Button>
                      </a>
                      <a
                        href={generateWhatsAppUrl(
                          contact.whatsappPhone || contact.phone,
                          task.plannedMessage || `Hi ${contact.name}, following up regarding LuxeStudio services.`
                        )}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Button variant="outline" size="sm" className="text-emerald-700 hover:bg-emerald-50">
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>WhatsApp</span>
                        </Button>
                      </a>
                    </>
                  )}

                  {task.status === 'SCHEDULED' && (
                    <>
                      <Button
                        variant="gold"
                        size="sm"
                        onClick={() => handleOpenComplete(task)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Complete</span>
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenSnooze(task)}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Snooze</span>
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancelTask(task.id)}
                        className="text-charcoal-400 hover:text-rose-600"
                        title="Cancel task"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Complete Task Modal */}
      <Modal
        isOpen={completeModalOpen}
        onClose={() => setCompleteModalOpen(false)}
        title="Complete Follow-up Task"
        description={`Record outcome for ${selectedTask?.lead?.businessName}`}
      >
        <form onSubmit={handleCompleteSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-charcoal-700 mb-1">
              Contact Outcome *
            </label>
            <select
              value={completionOutcome}
              onChange={(e) => setCompletionOutcome(e.target.value)}
              className="w-full text-xs border border-charcoal-300 rounded-lg p-2.5 bg-white text-charcoal-900"
            >
              <option value="CONNECTED">Connected & Spoke</option>
              <option value="NO_ANSWER">No Answer / Call Back Later</option>
              <option value="MESSAGE_SENT">Message Sent</option>
              <option value="REPLY_RECEIVED">Reply Received</option>
              <option value="MEETING_SCHEDULED">Meeting Scheduled</option>
              <option value="NOT_INTERESTED">Not Interested</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-charcoal-700 mb-1">
              Outcome Summary & Notes
            </label>
            <textarea
              rows={2}
              value={completionNotes}
              onChange={(e) => setCompletionNotes(e.target.value)}
              placeholder="e.g. Client loved the prototype, requested formal proposal on Monday."
              className="w-full text-xs border border-charcoal-300 rounded-lg p-2.5 text-charcoal-900"
            />
          </div>

          {/* Prompt to schedule next task */}
          <div className="p-3.5 rounded-lg bg-charcoal-50 border border-charcoal-200 space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="scheduleNext"
                checked={scheduleNext}
                onChange={(e) => setScheduleNext(e.target.checked)}
                className="rounded text-gold-600 focus:ring-gold-500 w-4 h-4 cursor-pointer"
              />
              <label htmlFor="scheduleNext" className="text-xs font-bold text-charcoal-900 cursor-pointer">
                Schedule Next Follow-up Task Now (Recommended)
              </label>
            </div>

            {scheduleNext && (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-[11px] font-semibold text-charcoal-700 mb-1">Next Task Title *</label>
                  <input
                    type="text"
                    required={scheduleNext}
                    value={nextTitle}
                    onChange={(e) => setNextTitle(e.target.value)}
                    placeholder="e.g. Follow up on proposal contract signing"
                    className="w-full text-xs border border-charcoal-300 rounded-lg p-2 text-charcoal-900 bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-charcoal-700 mb-1">Action Type</label>
                    <select
                      value={nextActionType}
                      onChange={(e) => setNextActionType(e.target.value)}
                      className="w-full text-xs border border-charcoal-300 rounded-lg p-2 bg-white text-charcoal-900"
                    >
                      <option value="CALL">Call</option>
                      <option value="WHATSAPP">WhatsApp</option>
                      <option value="EMAIL">Email</option>
                      <option value="MEETING">Meeting</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-charcoal-700 mb-1">Due Date & Time *</label>
                    <input
                      type="datetime-local"
                      required={scheduleNext}
                      value={nextDueAt}
                      onChange={(e) => setNextDueAt(e.target.value)}
                      className="w-full text-xs border border-charcoal-300 rounded-lg p-2 text-charcoal-900 bg-white"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setCompleteModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="gold"
              size="sm"
              isLoading={submitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              Complete Task
            </Button>
          </div>
        </form>
      </Modal>

      {/* Snooze Modal */}
      <Modal
        isOpen={snoozeModalOpen}
        onClose={() => setSnoozeModalOpen(false)}
        title="Snooze / Reschedule Follow-up"
        description="Pick a new date and time. Stale reminders will be cancelled automatically."
      >
        <form onSubmit={handleSnoozeSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-charcoal-700 mb-1">
              New Due Date & Time *
            </label>
            <input
              type="datetime-local"
              required
              value={snoozeDueAt}
              onChange={(e) => setSnoozeDueAt(e.target.value)}
              className="w-full text-xs border border-charcoal-300 rounded-lg p-2.5 text-charcoal-900"
            />
          </div>

          {/* Quick presets */}
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              type="button"
              onClick={() => {
                const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
                setSnoozeDueAt(tomorrow.toISOString().slice(0, 16));
              }}
              className="px-2.5 py-1 rounded bg-charcoal-100 hover:bg-charcoal-200 text-charcoal-800 cursor-pointer font-medium"
            >
              Tomorrow
            </button>
            <button
              type="button"
              onClick={() => {
                const in3Days = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
                setSnoozeDueAt(in3Days.toISOString().slice(0, 16));
              }}
              className="px-2.5 py-1 rounded bg-charcoal-100 hover:bg-charcoal-200 text-charcoal-800 cursor-pointer font-medium"
            >
              In 3 Days
            </button>
            <button
              type="button"
              onClick={() => {
                const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
                setSnoozeDueAt(nextWeek.toISOString().slice(0, 16));
              }}
              className="px-2.5 py-1 rounded bg-charcoal-100 hover:bg-charcoal-200 text-charcoal-800 cursor-pointer font-medium"
            >
              Next Week
            </button>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setSnoozeModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="gold" size="sm" isLoading={submitting}>
              Reschedule
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
