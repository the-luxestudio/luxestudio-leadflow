'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Building,
  User,
  Phone,
  MapPin,
  Target,
  Briefcase,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function NewLeadPage() {
  const router = useRouter();

  // Form state
  const [businessName, setBusinessName] = useState('');
  const [contactName, setContactName] = useState('');
  const [category, setCategory] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [socialUrl, setSocialUrl] = useState('');

  const [phone, setPhone] = useState('');
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [email, setEmail] = useState('');

  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('Uttar Pradesh');
  const [country, setCountry] = useState('India');
  const [mapsUrl, setMapsUrl] = useState('');

  const [source, setSource] = useState('Google Maps Research');
  const [sourceUrl, setSourceUrl] = useState('');
  const [stageId, setStageId] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [ownerId, setOwnerId] = useState('');
  const [opportunityType, setOpportunityType] = useState('Redesign & Growth Automation');

  const [prototypeUrl, setPrototypeUrl] = useState('');
  const [proposalUrl, setProposalUrl] = useState('');
  const [dealValue, setDealValue] = useState<number>(75000);

  const [initialNote, setInitialNote] = useState('');
  const [hasFollowUp, setHasFollowUp] = useState(true);
  const [followUpDueAt, setFollowUpDueAt] = useState('');
  const [followUpAction, setFollowUpAction] = useState('CALL');
  const [followUpMessage, setFollowUpMessage] = useState('');

  // Dropdown options
  const [stages, setStages] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live duplicate warning state
  const [duplicateWarning, setDuplicateWarning] = useState<any[]>([]);

  useEffect(() => {
    // Default tomorrow for initial follow-up
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(11, 0, 0, 0);
    setFollowUpDueAt(tomorrow.toISOString().slice(0, 16));

    const loadMetadata = async () => {
      try {
        const [pipelineRes, teamRes] = await Promise.all([
          fetch('/api/pipeline'),
          fetch('/api/team'),
        ]);

        if (pipelineRes.ok) {
          const pData = await pipelineRes.json();
          const loadedStages = pData.columns?.map((c: any) => c.stage) || [];
          setStages(loadedStages);
          if (loadedStages.length > 0) setStageId(loadedStages[0].id);
        }

        if (teamRes.ok) {
          const tData = await teamRes.json();
          setTeamMembers(tData.members || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingOptions(false);
      }
    };

    loadMetadata();
  }, []);

  // Check duplicate whenever phone or businessName changes
  useEffect(() => {
    const timer = setTimeout(async () => {
      if ((phone && phone.length >= 7) || (businessName && businessName.length >= 3)) {
        try {
          const params = new URLSearchParams({ checkDuplicate: 'true' });
          if (phone) params.set('phone', phone);
          if (businessName) params.set('businessName', businessName);
          const res = await fetch(`/api/leads?${params.toString()}`);
          if (res.ok) {
            const data = await res.json();
            setDuplicateWarning(data.duplicates || []);
          }
        } catch (err) {
          console.error(err);
        }
      } else {
        setDuplicateWarning([]);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [phone, businessName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const payload: any = {
        businessName,
        contactName,
        category,
        websiteUrl,
        socialUrl,
        phone,
        whatsappPhone: whatsappPhone || phone,
        email,
        address,
        city,
        state,
        country,
        mapsUrl,
        source,
        sourceUrl,
        stageId,
        priority,
        ownerId: ownerId || undefined,
        opportunityType,
        prototypeUrl,
        proposalUrl,
        dealValue: Number(dealValue) || 0,
        initialNote,
      };

      if (hasFollowUp && followUpDueAt) {
        payload.followUpDueAt = new Date(followUpDueAt).toISOString();
        payload.followUpAction = followUpAction;
        payload.followUpMessage = followUpMessage;
      }

      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create lead');
      }

      router.push(`/leads/${data.lead.id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Breadcrumb */}
      <div className="flex items-center gap-2">
        <Link
          href="/leads"
          className="text-xs text-charcoal-500 hover:text-charcoal-900 flex items-center gap-1 font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Leads
        </Link>
      </div>

      <div className="bg-white p-6 rounded-xl border border-charcoal-200 shadow-subtle">
        <div className="flex items-center justify-between border-b border-charcoal-100 pb-4 mb-6">
          <div>
            <h1 className="text-xl font-bold text-charcoal-900 tracking-tight flex items-center gap-2">
              Add New Lead
              <Sparkles className="w-4 h-4 text-gold-500" />
            </h1>
            <p className="text-xs text-charcoal-500 mt-0.5">
              Enter verified client details, project scope, and schedule the first follow-up action.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Live Duplicate Warning */}
        {duplicateWarning.length > 0 && (
          <div className="mb-6 p-4 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
            <div className="flex items-center gap-2 font-bold mb-1">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Possible Duplicate Lead Detected</span>
            </div>
            <p className="mb-2">
              A lead with a matching business name or phone number already exists in your workspace:
            </p>
            <ul className="list-disc list-inside space-y-1 font-medium">
              {duplicateWarning.map((d) => (
                <li key={d.id}>
                  <Link
                    href={`/leads/${d.id}`}
                    className="underline text-gold-800 hover:text-gold-900"
                    target="_blank"
                  >
                    {d.businessName}
                  </Link>{' '}
                  (Owner: {d.owner?.displayName || 'Unassigned'})
                </li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Section 1: Business Details */}
          <div>
            <h3 className="text-xs font-bold text-charcoal-900 uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-charcoal-100 pb-2">
              <Building className="w-4 h-4 text-gold-600" /> 1. Business & Brand Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                  Business / Brand Name *
                </label>
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Naksh Interio & Architecture"
                  className="w-full text-xs border border-charcoal-300 rounded-lg p-2.5 text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-gold-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                  Business Category
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. Interior Design, Dental Lounge, Restaurant"
                  className="w-full text-xs border border-charcoal-300 rounded-lg p-2.5 text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-gold-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                  Existing Website URL (Optional)
                </label>
                <input
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full text-xs border border-charcoal-300 rounded-lg p-2.5 text-charcoal-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                  Instagram / Social Profile
                </label>
                <input
                  type="url"
                  value={socialUrl}
                  onChange={(e) => setSocialUrl(e.target.value)}
                  placeholder="https://instagram.com/studio"
                  className="w-full text-xs border border-charcoal-300 rounded-lg p-2.5 text-charcoal-900"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Contact Person */}
          <div>
            <h3 className="text-xs font-bold text-charcoal-900 uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-charcoal-100 pb-2">
              <User className="w-4 h-4 text-gold-600" /> 2. Key Contact Person
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                  Contact Person Name *
                </label>
                <input
                  type="text"
                  required
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="e.g. Ar. Rajesh Sharma"
                  className="w-full text-xs border border-charcoal-300 rounded-lg p-2.5 text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-gold-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full text-xs border border-charcoal-300 rounded-lg p-2.5 text-charcoal-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                  WhatsApp Number
                </label>
                <input
                  type="tel"
                  value={whatsappPhone}
                  onChange={(e) => setWhatsappPhone(e.target.value)}
                  placeholder="Leave empty if same as phone"
                  className="w-full text-xs border border-charcoal-300 rounded-lg p-2.5 text-charcoal-900"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@studio.in"
                  className="w-full text-xs border border-charcoal-300 rounded-lg p-2.5 text-charcoal-900"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Location */}
          <div>
            <h3 className="text-xs font-bold text-charcoal-900 uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-charcoal-100 pb-2">
              <MapPin className="w-4 h-4 text-gold-600" /> 3. Location Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. 24 Delhi Road, Near Sports Complex"
                  className="w-full text-xs border border-charcoal-300 rounded-lg p-2.5 text-charcoal-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Meerut, Noida, Delhi"
                  className="w-full text-xs border border-charcoal-300 rounded-lg p-2.5 text-charcoal-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">State</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full text-xs border border-charcoal-300 rounded-lg p-2.5 text-charcoal-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                  Google Maps URL
                </label>
                <input
                  type="url"
                  value={mapsUrl}
                  onChange={(e) => setMapsUrl(e.target.value)}
                  placeholder="https://maps.google.com/?q=..."
                  className="w-full text-xs border border-charcoal-300 rounded-lg p-2.5 text-charcoal-900"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Sales Pipeline & Opportunity */}
          <div>
            <h3 className="text-xs font-bold text-charcoal-900 uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-charcoal-100 pb-2">
              <Target className="w-4 h-4 text-gold-600" /> 4. Sales Pipeline & Opportunity
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                  Initial Pipeline Stage
                </label>
                <select
                  value={stageId}
                  onChange={(e) => setStageId(e.target.value)}
                  className="w-full text-xs border border-charcoal-300 rounded-lg p-2.5 text-charcoal-900 bg-white"
                >
                  {stages.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full text-xs border border-charcoal-300 rounded-lg p-2.5 text-charcoal-900 bg-white"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                  Assigned Owner
                </label>
                <select
                  value={ownerId}
                  onChange={(e) => setOwnerId(e.target.value)}
                  className="w-full text-xs border border-charcoal-300 rounded-lg p-2.5 text-charcoal-900 bg-white"
                >
                  <option value="">Assign to Me (Default)</option>
                  {teamMembers.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.displayName} ({m.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                  Lead Source
                </label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="w-full text-xs border border-charcoal-300 rounded-lg p-2.5 text-charcoal-900 bg-white"
                >
                  <option value="Google Maps Research">Google Maps Research</option>
                  <option value="Directory">Directory</option>
                  <option value="Referral">Referral</option>
                  <option value="Instagram Research">Instagram Research</option>
                  <option value="Outreach">Outreach</option>
                  <option value="Inbound Enquiry">Inbound Enquiry</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                  Opportunity Type
                </label>
                <input
                  type="text"
                  value={opportunityType}
                  onChange={(e) => setOpportunityType(e.target.value)}
                  placeholder="e.g. New Website, 3D Showcase, Booking System"
                  className="w-full text-xs border border-charcoal-300 rounded-lg p-2.5 text-charcoal-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                  Expected Deal Value (INR)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={dealValue}
                  onChange={(e) => setDealValue(parseInt(e.target.value, 10) || 0)}
                  className="w-full text-xs border border-charcoal-300 rounded-lg p-2.5 text-charcoal-900"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Project Assets (Optional) */}
          <div>
            <h3 className="text-xs font-bold text-charcoal-900 uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-charcoal-100 pb-2">
              <Briefcase className="w-4 h-4 text-gold-600" /> 5. Project Prototypes & Proposals
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                  Interactive Prototype URL
                </label>
                <input
                  type="url"
                  value={prototypeUrl}
                  onChange={(e) => setPrototypeUrl(e.target.value)}
                  placeholder="https://prototype.theluxestudio.in/..."
                  className="w-full text-xs border border-charcoal-300 rounded-lg p-2.5 text-charcoal-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                  Proposal Document URL
                </label>
                <input
                  type="url"
                  value={proposalUrl}
                  onChange={(e) => setProposalUrl(e.target.value)}
                  placeholder="https://proposals.theluxestudio.in/..."
                  className="w-full text-xs border border-charcoal-300 rounded-lg p-2.5 text-charcoal-900"
                />
              </div>
            </div>
          </div>

          {/* Section 6: Initial Follow-up & Note */}
          <div>
            <h3 className="text-xs font-bold text-charcoal-900 uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-charcoal-100 pb-2">
              <Calendar className="w-4 h-4 text-gold-600" /> 6. Initial Next Action & Note
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                  Internal Prospect Note
                </label>
                <textarea
                  rows={2}
                  value={initialNote}
                  onChange={(e) => setInitialNote(e.target.value)}
                  placeholder="Notes about prospect requirements, design preferences, or discovery context..."
                  className="w-full text-xs border border-charcoal-300 rounded-lg p-2.5 text-charcoal-900"
                />
              </div>

              <div className="p-4 rounded-lg bg-charcoal-50 border border-charcoal-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="hasFollowUp"
                      checked={hasFollowUp}
                      onChange={(e) => setHasFollowUp(e.target.checked)}
                      className="rounded text-gold-600 focus:ring-gold-500 w-4 h-4 cursor-pointer"
                    />
                    <label htmlFor="hasFollowUp" className="text-xs font-bold text-charcoal-900 cursor-pointer">
                      Schedule Initial Follow-up Task (Recommended)
                    </label>
                  </div>
                </div>

                {hasFollowUp && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-charcoal-700 mb-1">
                        Follow-up Action
                      </label>
                      <select
                        value={followUpAction}
                        onChange={(e) => setFollowUpAction(e.target.value)}
                        className="w-full text-xs border border-charcoal-300 rounded-lg p-2 text-charcoal-900 bg-white"
                      >
                        <option value="CALL">Phone Call</option>
                        <option value="WHATSAPP">WhatsApp</option>
                        <option value="EMAIL">Email</option>
                        <option value="MEETING">Meeting</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-charcoal-700 mb-1">
                        Due Date & Time *
                      </label>
                      <input
                        type="datetime-local"
                        required={hasFollowUp}
                        value={followUpDueAt}
                        onChange={(e) => setFollowUpDueAt(e.target.value)}
                        className="w-full text-xs border border-charcoal-300 rounded-lg p-2 text-charcoal-900 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-charcoal-700 mb-1">
                        Follow-up Message / Goal
                      </label>
                      <input
                        type="text"
                        value={followUpMessage}
                        onChange={(e) => setFollowUpMessage(e.target.value)}
                        placeholder="e.g. Walkthrough interactive website demo"
                        className="w-full text-xs border border-charcoal-300 rounded-lg p-2 text-charcoal-900 bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-charcoal-200">
            <Link href="/leads">
              <Button type="button" variant="outline" size="md">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              variant="gold"
              size="md"
              isLoading={submitting}
              className="font-bold px-6 shadow-md shadow-gold-500/10"
            >
              Create Lead Record
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
