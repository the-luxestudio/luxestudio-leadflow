'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search,
  Filter,
  Plus,
  Table as TableIcon,
  LayoutGrid,
  Phone,
  MessageCircle,
  MapPin,
  ExternalLink,
  MoreHorizontal,
  Download,
  Upload,
  Calendar,
  AlertCircle,
  Eye,
  Trash2,
  RefreshCw,
  Copy,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { renderTemplate, generateWhatsAppUrl } from '@/lib/services/templates';

export default function LeadsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [leads, setLeads] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 15, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Filter states
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [stageId, setStageId] = useState(searchParams.get('stageId') || '');
  const [priority, setPriority] = useState(searchParams.get('priority') || '');
  const [followUpStatus, setFollowUpStatus] = useState(searchParams.get('followUpStatus') || '');
  const [city, setCity] = useState(searchParams.get('city') || '');

  // Quick WhatsApp Template Modal
  const [whatsAppModalOpen, setWhatsAppModalOpen] = useState(false);
  const [activeLeadForWhatsApp, setActiveLeadForWhatsApp] = useState<any>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [renderedMessage, setRenderedMessage] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchLeads();
    fetchStages();
    fetchTemplates();
  }, [stageId, priority, followUpStatus, pagination.page]);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (stageId) params.set('stageId', stageId);
      if (priority) params.set('priority', priority);
      if (followUpStatus) params.set('followUpStatus', followUpStatus);
      if (city) params.set('city', city);
      params.set('page', pagination.page.toString());
      params.set('limit', pagination.limit.toString());

      const res = await fetch(`/api/leads?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setLeads(json.leads || []);
        setPagination(json.pagination);
      }
    } catch (err) {
      console.error(err);
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

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/templates');
      if (res.ok) {
        const json = await res.json();
        setTemplates(json.templates || []);
        if (json.templates?.length > 0) {
          setSelectedTemplateId(json.templates[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchLeads();
  };

  const handleArchive = async (leadId: string) => {
    if (!confirm('Are you sure you want to archive this lead?')) return;
    try {
      const res = await fetch(`/api/leads/${leadId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchLeads();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openWhatsAppModal = (lead: any) => {
    setActiveLeadForWhatsApp(lead);
    const tmpl = templates.find((t) => t.id === selectedTemplateId) || templates[0];
    if (tmpl) {
      const contact = lead.contacts[0];
      const msg = renderTemplate(tmpl.body, {
        business_name: lead.businessName,
        contact_name: contact?.name,
        city: lead.city,
        prototype_url: lead.prototypeUrl,
        proposal_url: lead.proposalUrl,
        deal_value: lead.dealValue,
      });
      setRenderedMessage(msg);
    }
    setWhatsAppModalOpen(true);
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const tmpl = templates.find((t) => t.id === templateId);
    if (tmpl && activeLeadForWhatsApp) {
      const contact = activeLeadForWhatsApp.contacts[0];
      const msg = renderTemplate(tmpl.body, {
        business_name: activeLeadForWhatsApp.businessName,
        contact_name: contact?.name,
        city: activeLeadForWhatsApp.city,
        prototype_url: activeLeadForWhatsApp.prototypeUrl,
        proposal_url: activeLeadForWhatsApp.proposalUrl,
        deal_value: activeLeadForWhatsApp.dealValue,
      });
      setRenderedMessage(msg);
    }
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(renderedMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportCSV = () => {
    window.location.href = '/api/csv/export';
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-charcoal-900 tracking-tight">Leads & Prospects</h1>
          <p className="text-xs text-charcoal-500 mt-0.5">
            Search, filter, assign, and communicate with potential agency clients.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export CSV</span>
          </Button>

          <Link href="/import">
            <Button variant="outline" size="sm">
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Import CSV</span>
            </Button>
          </Link>

          <Link href="/leads/new">
            <Button variant="gold" size="sm">
              <Plus className="w-4 h-4" />
              <span>Add Lead</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-charcoal-200 shadow-subtle space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by business, contact, phone, email, or category..."
              className="w-full text-xs bg-charcoal-50 border border-charcoal-300 rounded-lg pl-9 pr-3 py-2 text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
          </div>
          <Button type="submit" variant="primary" size="sm">
            Search
          </Button>
        </form>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-charcoal-100 text-xs">
          {/* Stage Filter */}
          <select
            value={stageId}
            onChange={(e) => {
              setStageId(e.target.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className="text-xs border border-charcoal-200 rounded-lg p-1.5 bg-white text-charcoal-700"
          >
            <option value="">All Pipeline Stages</option>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={priority}
            onChange={(e) => {
              setPriority(e.target.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className="text-xs border border-charcoal-200 rounded-lg p-1.5 bg-white text-charcoal-700"
          >
            <option value="">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          {/* Follow-up Status Filter */}
          <select
            value={followUpStatus}
            onChange={(e) => {
              setFollowUpStatus(e.target.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className="text-xs border border-charcoal-200 rounded-lg p-1.5 bg-white text-charcoal-700"
          >
            <option value="">Follow-up Status: All</option>
            <option value="due_today">Due Today</option>
            <option value="overdue">Overdue</option>
            <option value="upcoming">Upcoming</option>
            <option value="none">No Next Action (Danger)</option>
          </select>

          {/* Clear Filters */}
          {(stageId || priority || followUpStatus || search) && (
            <button
              onClick={() => {
                setStageId('');
                setPriority('');
                setFollowUpStatus('');
                setSearch('');
              }}
              className="text-xs text-rose-600 hover:underline font-medium ml-1 cursor-pointer"
            >
              Reset Filters
            </button>
          )}

          {/* View Mode Toggle */}
          <div className="ml-auto flex items-center border border-charcoal-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 ${
                viewMode === 'table' ? 'bg-charcoal-100 text-charcoal-900' : 'text-charcoal-400'
              }`}
              aria-label="Table view"
            >
              <TableIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 ${
                viewMode === 'cards' ? 'bg-charcoal-100 text-charcoal-900' : 'text-charcoal-400'
              }`}
              aria-label="Card view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Leads Table or Card Grid */}
      {loading ? (
        <div className="bg-white p-8 rounded-xl border border-charcoal-200 text-center space-y-3">
          <RefreshCw className="w-6 h-6 animate-spin text-gold-600 mx-auto" />
          <p className="text-xs text-charcoal-500">Loading prospects...</p>
        </div>
      ) : leads.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-charcoal-200 text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-charcoal-300 mx-auto" />
          <h3 className="text-sm font-bold text-charcoal-900">No matching leads found</h3>
          <p className="text-xs text-charcoal-500 max-w-sm mx-auto">
            Try adjusting your search query, clearing filters, or adding a new prospect.
          </p>
          <Link href="/leads/new">
            <Button variant="gold" size="sm" className="mt-2">
              <Plus className="w-4 h-4" /> Add Lead
            </Button>
          </Link>
        </div>
      ) : viewMode === 'table' ? (
        <div className="bg-white rounded-xl border border-charcoal-200 shadow-subtle overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-charcoal-50/80 border-b border-charcoal-200 text-charcoal-600 uppercase font-semibold text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Business / Lead</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Stage</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Deal Value</th>
                  <th className="py-3 px-4">Next Action</th>
                  <th className="py-3 px-4">Owner</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-charcoal-100 text-charcoal-800">
                {leads.map((lead) => {
                  const contact = lead.contacts[0];
                  const followUp = lead.followUps[0];
                  const isOverdue = followUp ? new Date(followUp.dueAt) < new Date() : false;

                  return (
                    <tr
                      key={lead.id}
                      className="hover:bg-charcoal-50/50 transition-colors group cursor-default"
                    >
                      <td className="py-3.5 px-4 font-medium">
                        <Link
                          href={`/leads/${lead.id}`}
                          className="font-semibold text-charcoal-900 hover:text-gold-600 block transition-colors"
                        >
                          {lead.businessName}
                        </Link>
                        <div className="flex items-center gap-2 text-[11px] text-charcoal-500 mt-0.5">
                          {lead.category && <span>{lead.category}</span>}
                          {lead.city && (
                            <span className="flex items-center gap-0.5">
                              • <MapPin className="w-3 h-3 text-charcoal-400" /> {lead.city}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {contact ? (
                          <div>
                            <p className="font-medium text-charcoal-900">{contact.name}</p>
                            <p className="text-[11px] text-charcoal-500">{contact.phone || contact.email || 'No contact'}</p>
                          </div>
                        ) : (
                          <span className="text-charcoal-400">None</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className="px-2 py-0.5 text-[10px] font-semibold rounded-full border"
                          style={{
                            borderColor: `${lead.stage.color || '#C5A84D'}40`,
                            backgroundColor: `${lead.stage.color || '#C5A84D'}15`,
                            color: lead.stage.color || '#C5A84D',
                          }}
                        >
                          {lead.stage.name}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <Badge
                          variant={
                            lead.priority === 'URGENT'
                              ? 'danger'
                              : lead.priority === 'HIGH'
                              ? 'warning'
                              : 'default'
                          }
                          size="sm"
                        >
                          {lead.priority}
                        </Badge>
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-charcoal-900">
                        {lead.dealValue ? `₹${lead.dealValue.toLocaleString('en-IN')}` : '—'}
                      </td>

                      <td className="py-3.5 px-4">
                        {followUp ? (
                          <div className="text-[11px]">
                            <span
                              className={`font-semibold flex items-center gap-1 ${
                                isOverdue ? 'text-rose-600' : 'text-charcoal-700'
                              }`}
                            >
                              <Calendar className="w-3 h-3" />
                              {new Date(followUp.dueAt).toLocaleDateString('en-IN', {
                                month: 'short',
                                day: 'numeric',
                              })}
                              {isOverdue && <span className="text-[9px] uppercase font-bold text-rose-600">(Overdue)</span>}
                            </span>
                            <span className="text-charcoal-500 truncate block max-w-[150px]">
                              {followUp.title}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] font-semibold text-rose-500 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                            No follow-up
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-[11px] text-charcoal-600">
                        {lead.owner?.displayName?.split(' ')[0] || 'Unassigned'}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {contact?.phone && (
                            <>
                              <a
                                href={`tel:${contact.phone}`}
                                title="Call phone"
                                className="p-1.5 rounded-md text-charcoal-500 hover:text-charcoal-900 hover:bg-charcoal-100 transition-colors"
                              >
                                <Phone className="w-3.5 h-3.5" />
                              </a>
                              <button
                                onClick={() => openWhatsAppModal(lead)}
                                title="Open WhatsApp template"
                                className="p-1.5 rounded-md text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                          {lead.mapsUrl && (
                            <a
                              href={lead.mapsUrl}
                              target="_blank"
                              rel="noreferrer"
                              title="Open in Google Maps"
                              className="p-1.5 rounded-md text-sky-600 hover:text-sky-700 hover:bg-sky-50 transition-colors"
                            >
                              <MapPin className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <Link
                            href={`/leads/${lead.id}`}
                            className="p-1.5 rounded-md text-charcoal-500 hover:text-gold-600 hover:bg-charcoal-100 transition-colors"
                            title="View lead details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            onClick={() => handleArchive(lead.id)}
                            className="p-1.5 rounded-md text-charcoal-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Archive lead"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-4 py-3 bg-charcoal-50/50 border-t border-charcoal-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-charcoal-500">
            <span>
              Showing {leads.length} of {pagination.total} leads
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
              >
                Previous
              </Button>
              <span className="px-2 font-medium">
                Page {pagination.page} of {pagination.totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* Compact Card View */
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {leads.map((lead) => {
              const contact = lead.contacts[0];
              const followUp = lead.followUps[0];
              const isOverdue = followUp ? new Date(followUp.dueAt) < new Date() : false;

              return (
                <div
                  key={lead.id}
                  className="bg-white p-5 rounded-xl border border-charcoal-200 shadow-subtle hover:shadow-card transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span
                        className="px-2 py-0.5 text-[10px] font-semibold rounded-full border"
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
                        {lead.priority}
                      </Badge>
                    </div>

                    <Link
                      href={`/leads/${lead.id}`}
                      className="font-bold text-sm text-charcoal-900 hover:text-gold-600 block transition-colors"
                    >
                      {lead.businessName}
                    </Link>

                    <p className="text-xs text-charcoal-500 mt-0.5">
                      {lead.category || 'Digital Prospect'} • {lead.city || 'India'}
                    </p>

                    <div className="mt-4 p-3 bg-charcoal-50 rounded-lg space-y-1.5 text-xs">
                      <p className="text-charcoal-700">
                        <span className="font-semibold">Contact:</span> {contact?.name || 'N/A'}
                      </p>
                      <p className="text-charcoal-700">
                        <span className="font-semibold">Phone:</span> {contact?.phone || 'N/A'}
                      </p>
                      <p className="text-charcoal-700">
                        <span className="font-semibold">Deal Value:</span>{' '}
                        <span className="font-bold text-charcoal-900">
                          {lead.dealValue ? `₹${lead.dealValue.toLocaleString('en-IN')}` : '—'}
                        </span>
                      </p>
                    </div>

                    {followUp ? (
                      <div className="mt-3 text-[11px] p-2 rounded bg-amber-50/60 border border-amber-200/60 text-amber-900">
                        <span className="font-semibold block">Next Follow-up ({followUp.actionType}):</span>
                        <span>{followUp.title}</span>
                      </div>
                    ) : (
                      <div className="mt-3 text-[11px] p-2 rounded bg-rose-50 border border-rose-200 text-rose-700 font-semibold">
                        ⚠️ No follow-up scheduled
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-charcoal-100 flex items-center justify-between">
                    <span className="text-[11px] text-charcoal-500">
                      Owner: {lead.owner?.displayName?.split(' ')[0] || 'Unassigned'}
                    </span>
                    <div className="flex items-center gap-1">
                      {contact?.phone && (
                        <button
                          onClick={() => openWhatsAppModal(lead)}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded"
                          title="WhatsApp message"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                      )}
                      <Link
                        href={`/leads/${lead.id}`}
                        className="text-xs font-semibold text-gold-600 hover:text-gold-700 flex items-center gap-1"
                      >
                        Details &rarr;
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Card View Pagination */}
          <div className="bg-white px-4 py-3 rounded-xl border border-charcoal-200 shadow-subtle flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-charcoal-500">
            <span>
              Showing {leads.length} of {pagination.total} leads
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
              >
                Previous
              </Button>
              <span className="px-2 font-medium">
                Page {pagination.page} of {pagination.totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Template Outreach Modal */}
      <Modal
        isOpen={whatsAppModalOpen}
        onClose={() => setWhatsAppModalOpen(false)}
        title="Send Personalized WhatsApp Outreach"
        description="Choose a LuxeStudio template or customize your message before opening WhatsApp"
      >
        {activeLeadForWhatsApp && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-charcoal-700 mb-1">
                Select Message Template
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => handleTemplateChange(e.target.value)}
                className="w-full text-xs border border-charcoal-300 rounded-lg p-2 bg-white text-charcoal-900"
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.category})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-charcoal-700">
                  Rendered Message Preview
                </label>
                <button
                  type="button"
                  onClick={handleCopyMessage}
                  className="text-xs text-gold-600 hover:text-gold-700 flex items-center gap-1 font-medium cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy Text'}</span>
                </button>
              </div>
              <textarea
                rows={5}
                value={renderedMessage}
                onChange={(e) => setRenderedMessage(e.target.value)}
                className="w-full text-xs border border-charcoal-300 rounded-lg p-2.5 text-charcoal-900 bg-charcoal-50/50"
              />
            </div>

            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-xs text-emerald-800">
              <p className="font-semibold">Recipient:</p>
              <p>
                {activeLeadForWhatsApp.contacts[0]?.name} ({activeLeadForWhatsApp.contacts[0]?.phone})
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setWhatsAppModalOpen(false)}>
                Close
              </Button>
              <a
                href={generateWhatsAppUrl(
                  activeLeadForWhatsApp.contacts[0]?.whatsappPhone || activeLeadForWhatsApp.contacts[0]?.phone || '',
                  renderedMessage
                )}
                target="_blank"
                rel="noreferrer"
              >
                <Button variant="gold" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <MessageCircle className="w-4 h-4" />
                  <span>Open in WhatsApp</span>
                </Button>
              </a>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
