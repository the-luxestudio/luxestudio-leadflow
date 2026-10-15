'use client';

import React, { useEffect, useState } from 'react';
import {
  MessageSquareCode,
  Plus,
  Copy,
  Check,
  MessageCircle,
  Mail,
  Sparkles,
  FileText,
  RefreshCw,
  Eye,
  Pencil,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { renderTemplate } from '@/lib/services/templates';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Template Modal
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [category, setCategory] = useState('OUTREACH');
  const [channel, setChannel] = useState('WHATSAPP');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Edit Template Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('OUTREACH');
  const [editChannel, setEditChannel] = useState('WHATSAPP');
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editing, setEditing] = useState(false);

  // Delete Confirmation Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Preview Modal
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [renderedPreview, setRenderedPreview] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchTemplates();
    fetchLeads();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/templates');
      if (res.ok) {
        const json = await res.json();
        setTemplates(json.templates || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeads = async () => {
    try {
      const res = await fetch('/api/leads?limit=30');
      if (res.ok) {
        const json = await res.json();
        setLeads(json.leads || []);
        if (json.leads?.length > 0) {
          setSelectedLeadId(json.leads[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName || !body) return;
    setSubmitting(true);

    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: templateName,
          category,
          channel,
          subject: channel === 'EMAIL' ? subject : undefined,
          body,
        }),
      });

      if (res.ok) {
        setNewModalOpen(false);
        setTemplateName('');
        setSubject('');
        setBody('');
        fetchTemplates();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenPreview = (tmpl: any) => {
    setSelectedTemplate(tmpl);
    updatePreview(tmpl, selectedLeadId);
    setPreviewModalOpen(true);
  };

  const updatePreview = (tmpl: any, leadId: string) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) {
      setRenderedPreview(tmpl.body);
      return;
    }

    const contact = lead.contacts?.[0];
    const preview = renderTemplate(tmpl.body, {
      business_name: lead.businessName,
      contact_name: contact?.name,
      city: lead.city,
      prototype_url: lead.prototypeUrl,
      proposal_url: lead.proposalUrl,
      deal_value: lead.dealValue,
    });
    setRenderedPreview(preview);
  };

  const insertVariable = (tag: string) => {
    setBody((prev) => `${prev} {{${tag}}}`);
  };

  const handleOpenEdit = (tmpl: any) => {
    setEditingTemplateId(tmpl.id);
    setEditName(tmpl.name);
    setEditCategory(tmpl.category || 'OUTREACH');
    setEditChannel(tmpl.channel || 'WHATSAPP');
    setEditSubject(tmpl.subject || '');
    setEditBody(tmpl.body || '');
    setEditModalOpen(true);
  };

  const handleUpdateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplateId || !editName.trim() || !editBody.trim()) return;
    setEditing(true);

    try {
      const res = await fetch(`/api/templates/${editingTemplateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          category: editCategory,
          channel: editChannel,
          subject: editChannel === 'EMAIL' ? editSubject.trim() : null,
          body: editBody,
        }),
      });

      if (res.ok) {
        setEditModalOpen(false);
        setEditingTemplateId(null);
        fetchTemplates();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update template');
      }
    } catch (err) {
      console.error(err);
      alert('Network error while updating template');
    } finally {
      setEditing(false);
    }
  };

  const handleOpenDelete = (tmpl: any) => {
    setTemplateToDelete({ id: tmpl.id, name: tmpl.name });
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!templateToDelete) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/templates/${templateToDelete.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setDeleteModalOpen(false);
        setTemplateToDelete(null);
        fetchTemplates();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete template');
      }
    } catch (err) {
      console.error(err);
      alert('Network error while deleting template');
    } finally {
      setDeleting(false);
    }
  };

  const insertEditVariable = (tag: string) => {
    setEditBody((prev) => `${prev} {{${tag}}}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-charcoal-900 tracking-tight flex items-center gap-2">
            Outreach Message Templates
            <MessageSquareCode className="w-5 h-5 text-gold-500" />
          </h1>
          <p className="text-xs text-charcoal-500 mt-0.5">
            Craft standardized, personalized communication for WhatsApp click-to-chat and Email.
          </p>
        </div>

        <Button variant="gold" size="sm" onClick={() => setNewModalOpen(true)}>
          <Plus className="w-4 h-4" />
          <span>New Template</span>
        </Button>
      </div>

      {/* Available Variables Guide */}
      <div className="p-4 rounded-xl bg-charcoal-50 border border-charcoal-200">
        <p className="text-xs font-bold text-charcoal-800 mb-1 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-gold-600" /> Dynamic Tag Variables Available
        </p>
        <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
          {['business_name', 'contact_name', 'city', 'prototype_url', 'proposal_url', 'deal_value', 'sender_name'].map(
            (tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded bg-white border border-charcoal-200 font-mono text-charcoal-700 select-all"
              >
                {`{{${tag}}}`}
              </span>
            )
          )}
        </div>
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div className="bg-white p-12 rounded-xl border border-charcoal-200 text-center space-y-3">
          <RefreshCw className="w-6 h-6 animate-spin text-gold-600 mx-auto" />
          <p className="text-xs text-charcoal-500">Loading templates...</p>
        </div>
      ) : templates.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-charcoal-200 text-center space-y-3">
          <FileText className="w-10 h-10 text-charcoal-300 mx-auto" />
          <h3 className="text-sm font-bold text-charcoal-900">No message templates yet</h3>
          <p className="text-xs text-charcoal-500">Create your first reusable outreach or follow-up template.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((tmpl) => (
            <div
              key={tmpl.id}
              className="bg-white p-5 rounded-xl border border-charcoal-200 shadow-subtle hover:border-gold-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <Badge variant={tmpl.channel === 'WHATSAPP' ? 'success' : 'purple'} size="sm">
                    {tmpl.channel}
                  </Badge>
                  <span className="text-[10px] uppercase font-bold text-charcoal-400">
                    {tmpl.category}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-charcoal-900 mb-1">{tmpl.name}</h3>
                {tmpl.subject && (
                  <p className="text-xs font-semibold text-charcoal-600 mb-2 italic">
                    Subject: {tmpl.subject}
                  </p>
                )}

                <div className="p-3 rounded-lg bg-charcoal-50 border border-charcoal-100 text-xs text-charcoal-700 font-mono whitespace-pre-wrap line-clamp-4">
                  {tmpl.body}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-charcoal-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(tmpl)}
                    className="p-1.5 text-charcoal-400 hover:text-gold-600 hover:bg-gold-50 rounded-lg transition-colors cursor-pointer"
                    title="Edit template"
                    aria-label="Edit template"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleOpenDelete(tmpl)}
                    className="p-1.5 text-charcoal-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Delete template"
                    aria-label="Delete template"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <Button variant="outline" size="sm" onClick={() => handleOpenPreview(tmpl)}>
                  <Eye className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Preview with Lead</span>
                  <span className="sm:hidden">Preview</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Template Modal */}
      <Modal
        isOpen={newModalOpen}
        onClose={() => setNewModalOpen(false)}
        title="Create Message Template"
        description="Write a reusable message body with dynamic variable tags"
      >
        <form onSubmit={handleCreateTemplate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-charcoal-700 mb-1">Template Name *</label>
            <input
              type="text"
              required
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="e.g. Website Demo Walkthrough WhatsApp"
              className="w-full text-xs border border-charcoal-300 rounded-lg p-2.5 text-charcoal-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1">Channel</label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="w-full text-xs border border-charcoal-300 rounded-lg p-2 bg-white text-charcoal-900"
              >
                <option value="WHATSAPP">WhatsApp</option>
                <option value="EMAIL">Email</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-xs border border-charcoal-300 rounded-lg p-2 bg-white text-charcoal-900"
              >
                <option value="OUTREACH">Initial Outreach</option>
                <option value="PROTOTYPE">Prototype Sharing</option>
                <option value="PROPOSAL">Proposal Sharing</option>
                <option value="FOLLOW_UP">Follow-up</option>
                <option value="CLOSING">Closing</option>
              </select>
            </div>
          </div>

          {channel === 'EMAIL' && (
            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1">Email Subject *</label>
              <input
                type="text"
                required={channel === 'EMAIL'}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Website Growth Proposal for {{business_name}}"
                className="w-full text-xs border border-charcoal-300 rounded-lg p-2 text-charcoal-900"
              />
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-charcoal-700">Message Body *</label>
              <div className="flex items-center gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => insertVariable('business_name')}
                  className="px-1.5 py-0.5 rounded bg-charcoal-100 hover:bg-charcoal-200 text-charcoal-700"
                >
                  + Business
                </button>
                <button
                  type="button"
                  onClick={() => insertVariable('contact_name')}
                  className="px-1.5 py-0.5 rounded bg-charcoal-100 hover:bg-charcoal-200 text-charcoal-700"
                >
                  + Contact
                </button>
                <button
                  type="button"
                  onClick={() => insertVariable('prototype_url')}
                  className="px-1.5 py-0.5 rounded bg-charcoal-100 hover:bg-charcoal-200 text-charcoal-700"
                >
                  + Prototype
                </button>
              </div>
            </div>
            <textarea
              required
              rows={5}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Hi {{contact_name}}, this is {{sender_name}} from LuxeStudio..."
              className="w-full text-xs border border-charcoal-300 rounded-lg p-2.5 text-charcoal-900"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setNewModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="gold" size="sm" isLoading={submitting}>
              Save Template
            </Button>
          </div>
        </form>
      </Modal>

      {/* Preview Modal */}
      <Modal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        title={`Preview: ${selectedTemplate?.name}`}
        description="See how variables render with real client records"
      >
        {selectedTemplate && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                Select Lead for Dynamic Testing
              </label>
              <select
                value={selectedLeadId}
                onChange={(e) => {
                  setSelectedLeadId(e.target.value);
                  updatePreview(selectedTemplate, e.target.value);
                }}
                className="w-full text-xs border border-charcoal-300 rounded-lg p-2.5 bg-white text-charcoal-900"
              >
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.businessName} ({l.contacts?.[0]?.name || 'No Contact'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-charcoal-700">
                  Rendered Output
                </label>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(renderedPreview);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="text-xs text-gold-600 hover:text-gold-700 flex items-center gap-1 font-semibold cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy Text'}</span>
                </button>
              </div>
              <div className="p-3.5 rounded-lg bg-charcoal-50 border border-charcoal-200 text-xs text-charcoal-800 whitespace-pre-wrap">
                {renderedPreview}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setPreviewModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Template Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Message Template"
        description="Update the template parameters, subject, or message body"
      >
        <form onSubmit={handleUpdateTemplate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-charcoal-700 mb-1">Template Name *</label>
            <input
              type="text"
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="e.g. Website Demo Walkthrough WhatsApp"
              className="w-full text-xs border border-charcoal-300 rounded-lg p-2.5 text-charcoal-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1">Channel</label>
              <select
                value={editChannel}
                onChange={(e) => setEditChannel(e.target.value)}
                className="w-full text-xs border border-charcoal-300 rounded-lg p-2 bg-white text-charcoal-900"
              >
                <option value="WHATSAPP">WhatsApp</option>
                <option value="EMAIL">Email</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1">Category</label>
              <select
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                className="w-full text-xs border border-charcoal-300 rounded-lg p-2 bg-white text-charcoal-900"
              >
                <option value="OUTREACH">Initial Outreach</option>
                <option value="PROTOTYPE">Prototype Sharing</option>
                <option value="PROPOSAL">Proposal Sharing</option>
                <option value="FOLLOW_UP">Follow-up</option>
                <option value="CLOSING">Closing</option>
              </select>
            </div>
          </div>

          {editChannel === 'EMAIL' && (
            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1">Email Subject *</label>
              <input
                type="text"
                required={editChannel === 'EMAIL'}
                value={editSubject}
                onChange={(e) => setEditSubject(e.target.value)}
                placeholder="e.g. Website Growth Proposal for {{business_name}}"
                className="w-full text-xs border border-charcoal-300 rounded-lg p-2 text-charcoal-900"
              />
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-charcoal-700">Message Body *</label>
              <div className="flex items-center gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => insertEditVariable('business_name')}
                  className="px-1.5 py-0.5 rounded bg-charcoal-100 hover:bg-charcoal-200 text-charcoal-700 cursor-pointer"
                >
                  + Business
                </button>
                <button
                  type="button"
                  onClick={() => insertEditVariable('contact_name')}
                  className="px-1.5 py-0.5 rounded bg-charcoal-100 hover:bg-charcoal-200 text-charcoal-700 cursor-pointer"
                >
                  + Contact
                </button>
                <button
                  type="button"
                  onClick={() => insertEditVariable('prototype_url')}
                  className="px-1.5 py-0.5 rounded bg-charcoal-100 hover:bg-charcoal-200 text-charcoal-700 cursor-pointer"
                >
                  + Prototype
                </button>
                <button
                  type="button"
                  onClick={() => insertEditVariable('proposal_url')}
                  className="px-1.5 py-0.5 rounded bg-charcoal-100 hover:bg-charcoal-200 text-charcoal-700 cursor-pointer"
                >
                  + Proposal
                </button>
              </div>
            </div>
            <textarea
              required
              rows={5}
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              placeholder="Hi {{contact_name}}, this is {{sender_name}} from LuxeStudio..."
              className="w-full text-xs border border-charcoal-300 rounded-lg p-2.5 text-charcoal-900 font-mono"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="gold" size="sm" isLoading={editing}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setTemplateToDelete(null);
        }}
        title="Delete Message Template"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
            Are you sure you want to delete <span className="font-bold">"{templateToDelete?.name}"</span>? This will remove the template from outreach and follow-up quick actions.
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setDeleteModalOpen(false);
                setTemplateToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleConfirmDelete}
              isLoading={deleting}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold"
            >
              Delete Template
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
