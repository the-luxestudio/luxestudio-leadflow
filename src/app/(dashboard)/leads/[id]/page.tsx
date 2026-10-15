'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Building,
  Phone,
  MessageCircle,
  Mail,
  MapPin,
  ExternalLink,
  Calendar,
  Clock,
  User,
  Plus,
  TrendingUp,
  FileText,
  Briefcase,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Share2,
  Award,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { renderTemplate, generateWhatsAppUrl } from '@/lib/services/templates';

export default function LeadDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [lead, setLead] = useState<any>(null);
  const [stages, setStages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'followups' | 'deals' | 'notes'>('overview');

  // Modals
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [followUpModalOpen, setFollowUpModalOpen] = useState(false);
  const [stageModalOpen, setStageModalOpen] = useState(false);

  // Form states
  const [activityType, setActivityType] = useState('CALL');
  const [activitySummary, setActivitySummary] = useState('');
  const [activityOutcome, setActivityOutcome] = useState('CONNECTED');
  const [activityDetails, setActivityDetails] = useState('');

  const [noteContent, setNoteContent] = useState('');

  const [followUpTitle, setFollowUpTitle] = useState('');
  const [followUpAction, setFollowUpAction] = useState('CALL');
  const [followUpDueAt, setFollowUpDueAt] = useState('');
  const [followUpMessage, setFollowUpMessage] = useState('');

  const [targetStageId, setTargetStageId] = useState('');
  const [wonAmount, setWonAmount] = useState(0);
  const [lostReason, setLostReason] = useState('Competitor');
  const [stageNotes, setStageNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchLead();
    fetchStages();
  }, [params.id]);

  const fetchLead = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/leads/${params.id}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Lead not found');
      }
      const json = await res.json();
      setLead(json.lead);
      setWonAmount(json.lead.dealValue || 0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStages = async () => {
    try {
      const res = await fetch('/api/pipeline');
      if (res.ok) {
        const json = await res.json();
        setStages(json.columns?.map((c: any) => c.stage) || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activitySummary.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: params.id,
          type: activityType,
          summary: activitySummary,
          outcome: activityOutcome,
          details: activityDetails,
        }),
      });
      if (res.ok) {
        setActivityModalOpen(false);
        setActivitySummary('');
        setActivityDetails('');
        fetchLead();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: params.id,
          content: noteContent,
        }),
      });
      if (res.ok) {
        setNoteModalOpen(false);
        setNoteContent('');
        fetchLead();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleScheduleFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpTitle.trim() || !followUpDueAt) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/follow-ups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: params.id,
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
        fetchLead();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStageChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStageId) return;
    setSubmitting(true);

    const targetStage = stages.find((s) => s.id === targetStageId);
    const body: any = {
      leadId: params.id,
      targetStageId,
    };

    if (targetStage?.isWon) {
      body.wonDetails = {
        agreedAmount: Number(wonAmount) || 0,
        notes: stageNotes,
      };
    } else if (targetStage?.isLost) {
      body.lostDetails = {
        reason: lostReason,
        notes: stageNotes,
      };
    }

    try {
      const res = await fetch('/api/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setStageModalOpen(false);
        fetchLead();
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
        <div className="h-6 bg-charcoal-200 rounded w-32" />
        <div className="h-40 bg-white rounded-xl border border-charcoal-200" />
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-charcoal-200 shadow-sm">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h3 className="text-sm font-bold text-charcoal-900">Lead Access Prohibited or Not Found</h3>
        <p className="text-xs text-charcoal-500 mt-1">{error || 'Unable to retrieve lead record.'}</p>
        <Link href="/leads">
          <Button variant="outline" size="sm" className="mt-4">
            Back to All Leads
          </Button>
        </Link>
      </div>
    );
  }

  const primaryContact = lead.contacts?.find((c: any) => c.isPrimary) || lead.contacts?.[0];
  const targetStage = stages.find((s) => s.id === targetStageId);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Back button & stage indicator */}
      <div className="flex items-center justify-between">
        <Link
          href="/leads"
          className="text-xs text-charcoal-500 hover:text-charcoal-900 flex items-center gap-1 font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Leads
        </Link>
        <span className="text-xs text-charcoal-400">Lead ID: {lead.id.slice(0, 8)}...</span>
      </div>

      {/* Main Hero Card */}
      <div className="bg-white p-6 rounded-xl border border-charcoal-200 shadow-subtle">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className="px-2.5 py-0.5 text-xs font-semibold rounded-full border"
                style={{
                  borderColor: `${lead.stage.color || '#C5A84D'}40`,
                  backgroundColor: `${lead.stage.color || '#C5A84D'}15`,
                  color: lead.stage.color || '#C5A84D',
                }}
              >
                {lead.stage.name}
              </span>
              <Badge
                variant={lead.priority === 'URGENT' ? 'danger' : lead.priority === 'HIGH' ? 'warning' : 'default'}
                size="sm"
              >
                {lead.priority} Priority
              </Badge>
            </div>

            <h1 className="text-2xl font-bold text-charcoal-900 tracking-tight">
              {lead.businessName}
            </h1>

            <div className="flex flex-wrap items-center gap-3 text-xs text-charcoal-500 mt-1.5">
              {lead.category && <span>{lead.category}</span>}
              {lead.city && (
                <span className="flex items-center gap-1">
                  • <MapPin className="w-3.5 h-3.5 text-charcoal-400" /> {lead.city}, {lead.state}
                </span>
              )}
              <span>• Source: {lead.source || 'Direct'}</span>
              <span>• Owner: {lead.owner?.displayName || 'Unassigned'}</span>
            </div>
          </div>

          {/* Value Callout */}
          <div className="text-left md:text-right p-4 rounded-xl bg-charcoal-50 border border-charcoal-200/80">
            <p className="text-[11px] font-semibold text-charcoal-500 uppercase tracking-wider">
              Expected Project Investment
            </p>
            <p className="text-xl font-bold text-charcoal-900 mt-0.5">
              {lead.dealValue ? `₹${lead.dealValue.toLocaleString('en-IN')}` : 'Undecided'}
            </p>
            <p className="text-[11px] text-charcoal-500">{lead.opportunityType || 'Website & Automation'}</p>
          </div>
        </div>

        {/* Quick Interaction Toolbar */}
        <div className="mt-6 pt-4 border-t border-charcoal-100 flex flex-wrap items-center gap-2">
          {primaryContact?.phone && (
            <>
              <a href={`tel:${primaryContact.phone}`}>
                <Button variant="primary" size="sm">
                  <Phone className="w-3.5 h-3.5" /> Call {primaryContact.phone}
                </Button>
              </a>
              <a
                href={generateWhatsAppUrl(
                  primaryContact.whatsappPhone || primaryContact.phone,
                  `Hi ${primaryContact.name}, this is regarding LuxeStudio website solutions for ${lead.businessName}.`
                )}
                target="_blank"
                rel="noreferrer"
              >
                <Button variant="gold" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                </Button>
              </a>
            </>
          )}

          {lead.mapsUrl && (
            <a href={lead.mapsUrl} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm">
                <MapPin className="w-3.5 h-3.5 text-sky-600" /> Google Maps
              </Button>
            </a>
          )}

          {lead.prototypeUrl && (
            <a href={lead.prototypeUrl} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm" className="text-purple-700 border-purple-200 bg-purple-50 hover:bg-purple-100">
                <ExternalLink className="w-3.5 h-3.5" /> View Prototype
              </Button>
            </a>
          )}

          {lead.proposalUrl && (
            <a href={lead.proposalUrl} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm" className="text-blue-700 border-blue-200 bg-blue-50 hover:bg-blue-100">
                <ExternalLink className="w-3.5 h-3.5" /> View Proposal
              </Button>
            </a>
          )}

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto sm:ml-auto">
            <Button variant="outline" size="sm" onClick={() => setStageModalOpen(true)}>
              <TrendingUp className="w-3.5 h-3.5 text-gold-600" /> Change Stage
            </Button>
            <Button variant="outline" size="sm" onClick={() => setFollowUpModalOpen(true)}>
              <Calendar className="w-3.5 h-3.5 text-amber-600" /> Add Follow-up
            </Button>
            <Button variant="outline" size="sm" onClick={() => setActivityModalOpen(true)}>
              <Phone className="w-3.5 h-3.5 text-emerald-600" /> Log Activity
            </Button>
            <Button variant="outline" size="sm" onClick={() => setNoteModalOpen(true)}>
              <FileText className="w-3.5 h-3.5 text-charcoal-600" /> Add Note
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-charcoal-200 flex items-center gap-6 text-xs font-semibold overflow-x-auto no-scrollbar whitespace-nowrap">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 border-b-2 transition-all cursor-pointer shrink-0 ${
            activeTab === 'overview'
              ? 'border-gold-500 text-charcoal-900 font-bold'
              : 'border-transparent text-charcoal-500 hover:text-charcoal-800'
          }`}
        >
          Overview & Info
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className={`pb-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
            activeTab === 'activity'
              ? 'border-gold-500 text-charcoal-900 font-bold'
              : 'border-transparent text-charcoal-500 hover:text-charcoal-800'
          }`}
        >
          <span>Activity Timeline</span>
          <span className="px-1.5 py-0.2 rounded-full bg-charcoal-100 text-charcoal-700 text-[10px]">
            {lead.activities?.length || 0}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('followups')}
          className={`pb-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
            activeTab === 'followups'
              ? 'border-gold-500 text-charcoal-900 font-bold'
              : 'border-transparent text-charcoal-500 hover:text-charcoal-800'
          }`}
        >
          <span>Follow-up Tasks</span>
          <span className="px-1.5 py-0.2 rounded-full bg-charcoal-100 text-charcoal-700 text-[10px]">
            {lead.followUps?.length || 0}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('deals')}
          className={`pb-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
            activeTab === 'deals'
              ? 'border-gold-500 text-charcoal-900 font-bold'
              : 'border-transparent text-charcoal-500 hover:text-charcoal-800'
          }`}
        >
          <span>Deals</span>
          <span className="px-1.5 py-0.2 rounded-full bg-charcoal-100 text-charcoal-700 text-[10px]">
            {lead.deals?.length || 0}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('notes')}
          className={`pb-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
            activeTab === 'notes'
              ? 'border-gold-500 text-charcoal-900 font-bold'
              : 'border-transparent text-charcoal-500 hover:text-charcoal-800'
          }`}
        >
          <span>Internal Notes</span>
          <span className="px-1.5 py-0.2 rounded-full bg-charcoal-100 text-charcoal-700 text-[10px]">
            {lead.notes?.length || 0}
          </span>
        </button>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Contact Details Card */}
          <div className="bg-white p-5 rounded-xl border border-charcoal-200 shadow-subtle space-y-4">
            <h3 className="text-xs font-bold text-charcoal-900 uppercase tracking-wider border-b border-charcoal-100 pb-2">
              Primary Contact Details
            </h3>

            {primaryContact ? (
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-charcoal-500">Name:</span>
                  <p className="font-semibold text-charcoal-900 text-sm">{primaryContact.name}</p>
                </div>
                <div>
                  <span className="text-charcoal-500">Phone:</span>
                  <p className="font-medium text-charcoal-900">{primaryContact.phone || 'Not provided'}</p>
                </div>
                <div>
                  <span className="text-charcoal-500">WhatsApp:</span>
                  <p className="font-medium text-charcoal-900">{primaryContact.whatsappPhone || 'Not provided'}</p>
                </div>
                <div>
                  <span className="text-charcoal-500">Email:</span>
                  <p className="font-medium text-charcoal-900">{primaryContact.email || 'Not provided'}</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-charcoal-500">No contact person recorded.</p>
            )}
          </div>

          {/* Location & Links Card */}
          <div className="bg-white p-5 rounded-xl border border-charcoal-200 shadow-subtle space-y-4">
            <h3 className="text-xs font-bold text-charcoal-900 uppercase tracking-wider border-b border-charcoal-100 pb-2">
              Location & Digital Presence
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-charcoal-500">Physical Address:</span>
                <p className="font-medium text-charcoal-900">{lead.address || 'No address specified'}</p>
              </div>
              <div>
                <span className="text-charcoal-500">Website:</span>
                <p className="font-medium text-charcoal-900">
                  {lead.websiteUrl ? (
                    <a href={lead.websiteUrl} target="_blank" rel="noreferrer" className="text-gold-600 hover:underline">
                      {lead.websiteUrl}
                    </a>
                  ) : (
                    'None (Opportunity for new site)'
                  )}
                </p>
              </div>
              <div>
                <span className="text-charcoal-500">Social Profile:</span>
                <p className="font-medium text-charcoal-900">
                  {lead.socialUrl ? (
                    <a href={lead.socialUrl} target="_blank" rel="noreferrer" className="text-gold-600 hover:underline">
                      {lead.socialUrl}
                    </a>
                  ) : (
                    'Not specified'
                  )}
                </p>
              </div>
              <div>
                <span className="text-charcoal-500">Last Contacted:</span>
                <p className="font-medium text-charcoal-900">
                  {lead.lastContactedAt ? new Date(lead.lastContactedAt).toLocaleString('en-IN') : 'Never'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Activity Timeline */}
      {activeTab === 'activity' && (
        <div className="bg-white p-6 rounded-xl border border-charcoal-200 shadow-subtle space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-charcoal-900">Activity & Engagement History</h3>
            <Button variant="gold" size="sm" onClick={() => setActivityModalOpen(true)}>
              <Plus className="w-3.5 h-3.5" /> Log Activity
            </Button>
          </div>

          {lead.activities?.length === 0 ? (
            <p className="text-xs text-charcoal-500 py-6 text-center">No activity entries recorded yet.</p>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-charcoal-200">
              {lead.activities.map((act: any) => (
                <div key={act.id} className="relative">
                  <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-white border-2 border-gold-500 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-gold-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-charcoal-900">{act.summary}</span>
                      {act.outcome && <Badge variant="info" size="sm">{act.outcome}</Badge>}
                      <span className="text-[10px] text-charcoal-400">
                        {new Date(act.occurredAt).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <p className="text-xs text-charcoal-500 mt-0.5">
                      Actor: <span className="font-medium text-charcoal-700">{act.actor?.displayName || 'System'}</span>
                    </p>
                    {act.details && (
                      <p className="text-xs text-charcoal-700 bg-charcoal-50 p-2.5 rounded-lg border border-charcoal-200 mt-2">
                        {act.details}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Follow-ups */}
      {activeTab === 'followups' && (
        <div className="bg-white p-6 rounded-xl border border-charcoal-200 shadow-subtle space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-charcoal-900">Scheduled & Completed Follow-ups</h3>
            <Button variant="gold" size="sm" onClick={() => setFollowUpModalOpen(true)}>
              <Plus className="w-3.5 h-3.5" /> Schedule Follow-up
            </Button>
          </div>

          {lead.followUps?.length === 0 ? (
            <p className="text-xs text-charcoal-500 py-6 text-center">No follow-ups recorded.</p>
          ) : (
            <div className="space-y-3">
              {lead.followUps.map((fu: any) => (
                <div
                  key={fu.id}
                  className="p-4 rounded-xl border border-charcoal-200 bg-charcoal-50/40 flex items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={fu.status === 'COMPLETED' ? 'success' : fu.status === 'CANCELLED' ? 'default' : 'warning'} size="sm">
                        {fu.status}
                      </Badge>
                      <span className="font-bold text-xs text-charcoal-900">{fu.title}</span>
                      <span className="text-[11px] text-charcoal-500 font-medium">({fu.actionType})</span>
                    </div>
                    <p className="text-xs text-charcoal-600 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-charcoal-400" />
                      Due: {new Date(fu.dueAt).toLocaleString('en-IN')}
                    </p>
                    {fu.plannedMessage && (
                      <p className="text-xs text-charcoal-500 italic">"{fu.plannedMessage}"</p>
                    )}
                  </div>

                  {fu.status === 'SCHEDULED' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        const outcome = prompt('Enter outcome (CONNECTED, NO_ANSWER, MESSAGE_SENT, MEETING_SCHEDULED):', 'CONNECTED');
                        if (!outcome) return;
                        await fetch(`/api/follow-ups/${fu.id}/complete`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ outcome }),
                        });
                        fetchLead();
                      }}
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Complete Task
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Deals */}
      {activeTab === 'deals' && (
        <div className="bg-white p-6 rounded-xl border border-charcoal-200 shadow-subtle space-y-4">
          <h3 className="text-sm font-bold text-charcoal-900">Sales Opportunities & Deals</h3>
          {lead.deals?.length === 0 ? (
            <p className="text-xs text-charcoal-500 py-4 text-center">No deals recorded for this lead.</p>
          ) : (
            <div className="space-y-3">
              {lead.deals.map((deal: any) => (
                <div key={deal.id} className="p-4 rounded-xl border border-charcoal-200 bg-charcoal-50 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant={deal.status === 'WON' ? 'success' : deal.status === 'LOST' ? 'danger' : 'gold'} size="sm">
                        {deal.status}
                      </Badge>
                      <span className="font-bold text-xs text-charcoal-900">{deal.title}</span>
                    </div>
                    <p className="text-xs text-charcoal-500 mt-1">
                      Probability: {deal.probability}% • Created: {new Date(deal.createdAt).toLocaleDateString('en-IN')}
                    </p>
                    {deal.lostReason && (
                      <p className="text-xs text-rose-600 mt-0.5">Lost Reason: {deal.lostReason}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-base font-bold text-charcoal-900">
                      ₹{deal.amount?.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Notes */}
      {activeTab === 'notes' && (
        <div className="bg-white p-6 rounded-xl border border-charcoal-200 shadow-subtle space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-charcoal-900">Internal Team Notes</h3>
            <Button variant="gold" size="sm" onClick={() => setNoteModalOpen(true)}>
              <Plus className="w-3.5 h-3.5" /> Add Note
            </Button>
          </div>

          {lead.notes?.length === 0 ? (
            <p className="text-xs text-charcoal-500 py-4 text-center">No notes recorded.</p>
          ) : (
            <div className="space-y-3">
              {lead.notes.map((note: any) => (
                <div key={note.id} className="p-4 rounded-xl bg-charcoal-50 border border-charcoal-200">
                  <p className="text-xs text-charcoal-800 whitespace-pre-wrap">{note.content}</p>
                  <p className="text-[10px] text-charcoal-500 mt-2 font-medium">
                    By {note.author?.displayName || 'User'} on {new Date(note.createdAt).toLocaleString('en-IN')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal: Change Stage */}
      <Modal
        isOpen={stageModalOpen}
        onClose={() => setStageModalOpen(false)}
        title="Transition Pipeline Stage"
        description="Select new stage and confirm deal outcomes"
      >
        <form onSubmit={handleStageChange} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-charcoal-700 mb-1">Target Stage *</label>
            <select
              required
              value={targetStageId}
              onChange={(e) => setTargetStageId(e.target.value)}
              className="w-full text-xs border border-charcoal-300 rounded-lg p-2.5 bg-white text-charcoal-900"
            >
              <option value="">Select a stage...</option>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.isWon ? '(Won 🏆)' : s.isLost ? '(Lost ❌)' : ''}
                </option>
              ))}
            </select>
          </div>

          {targetStage?.isWon && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-3">
              <p className="text-xs font-bold text-emerald-900">🏆 Celebrate Closed Deal!</p>
              <div>
                <label className="block text-xs font-semibold text-emerald-800 mb-1">
                  Agreed Contract Value (INR) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={wonAmount}
                  onChange={(e) => setWonAmount(Number(e.target.value))}
                  className="w-full text-xs border border-emerald-300 rounded-lg p-2 text-charcoal-900 bg-white"
                />
              </div>
            </div>
          )}

          {targetStage?.isLost && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-3">
              <p className="text-xs font-bold text-rose-900">❌ Mark Lead as Lost</p>
              <div>
                <label className="block text-xs font-semibold text-rose-800 mb-1">
                  Reason for Lost Lead *
                </label>
                <select
                  value={lostReason}
                  onChange={(e) => setLostReason(e.target.value)}
                  className="w-full text-xs border border-rose-300 rounded-lg p-2 text-charcoal-900 bg-white"
                >
                  <option value="Chose Competitor">Chose Competitor</option>
                  <option value="Budget Constraint">Budget Constraint</option>
                  <option value="Built In-House">Built In-House</option>
                  <option value="No Response / Ghosted">No Response / Ghosted</option>
                  <option value="Not Qualified">Not Qualified</option>
                  <option value="Timing / Postponed">Timing / Postponed</option>
                </select>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-charcoal-700 mb-1">Transition Notes</label>
            <textarea
              rows={2}
              value={stageNotes}
              onChange={(e) => setStageNotes(e.target.value)}
              placeholder="Notes or context regarding this transition..."
              className="w-full text-xs border border-charcoal-300 rounded-lg p-2 text-charcoal-900"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setStageModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="gold" size="sm" isLoading={submitting}>
              Update Stage
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Log Activity */}
      <Modal
        isOpen={activityModalOpen}
        onClose={() => setActivityModalOpen(false)}
        title="Log Client Activity"
        description="Record verified communication into timeline"
      >
        <form onSubmit={handleLogActivity} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1">Type</label>
              <select
                value={activityType}
                onChange={(e) => setActivityType(e.target.value)}
                className="w-full text-xs border border-charcoal-300 rounded-lg p-2 bg-white text-charcoal-900"
              >
                <option value="CALL">Phone Call</option>
                <option value="WHATSAPP">WhatsApp</option>
                <option value="EMAIL">Email</option>
                <option value="MEETING">Meeting</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1">Outcome</label>
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
            <label className="block text-xs font-semibold text-charcoal-700 mb-1">Summary *</label>
            <input
              type="text"
              required
              value={activitySummary}
              onChange={(e) => setActivitySummary(e.target.value)}
              placeholder="e.g. Phone call to review prototype feedback"
              className="w-full text-xs border border-charcoal-300 rounded-lg p-2 text-charcoal-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-charcoal-700 mb-1">Detailed Notes</label>
            <textarea
              rows={3}
              value={activityDetails}
              onChange={(e) => setActivityDetails(e.target.value)}
              placeholder="Discussion points, client questions, or agreement details..."
              className="w-full text-xs border border-charcoal-300 rounded-lg p-2 text-charcoal-900"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setActivityModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="gold" size="sm" isLoading={submitting}>
              Save Activity
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add Note */}
      <Modal
        isOpen={noteModalOpen}
        onClose={() => setNoteModalOpen(false)}
        title="Add Internal Note"
        description="Private note visible only to your team"
      >
        <form onSubmit={handleAddNote} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-charcoal-700 mb-1">Note Content *</label>
            <textarea
              required
              rows={4}
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Enter internal comments or observations..."
              className="w-full text-xs border border-charcoal-300 rounded-lg p-2.5 text-charcoal-900"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setNoteModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="gold" size="sm" isLoading={submitting}>
              Add Note
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Schedule Follow-up */}
      <Modal
        isOpen={followUpModalOpen}
        onClose={() => setFollowUpModalOpen(false)}
        title="Schedule Next Follow-up Task"
        description="Set date, time, and instructions for team reminders"
      >
        <form onSubmit={handleScheduleFollowUp} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-charcoal-700 mb-1">Task Title *</label>
            <input
              type="text"
              required
              value={followUpTitle}
              onChange={(e) => setFollowUpTitle(e.target.value)}
              placeholder="e.g. Call to finalize proposal terms"
              className="w-full text-xs border border-charcoal-300 rounded-lg p-2 text-charcoal-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1">Action Type</label>
              <select
                value={followUpAction}
                onChange={(e) => setFollowUpAction(e.target.value)}
                className="w-full text-xs border border-charcoal-300 rounded-lg p-2 bg-white text-charcoal-900"
              >
                <option value="CALL">Phone Call</option>
                <option value="WHATSAPP">WhatsApp</option>
                <option value="EMAIL">Email</option>
                <option value="MEETING">Meeting</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1">Due Date & Time *</label>
              <input
                type="datetime-local"
                required
                value={followUpDueAt}
                onChange={(e) => setFollowUpDueAt(e.target.value)}
                className="w-full text-xs border border-charcoal-300 rounded-lg p-2 text-charcoal-900 bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-charcoal-700 mb-1">Planned Instructions</label>
            <textarea
              rows={2}
              value={followUpMessage}
              onChange={(e) => setFollowUpMessage(e.target.value)}
              placeholder="e.g. Ask if Ar. Rajesh wants to include 3D walkthrough video"
              className="w-full text-xs border border-charcoal-300 rounded-lg p-2 text-charcoal-900"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setFollowUpModalOpen(false)}>
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
