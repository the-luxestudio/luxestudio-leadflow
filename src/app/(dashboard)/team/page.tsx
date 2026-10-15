'use client';

import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  UserPlus,
  RefreshCw,
  Users,
  Send,
  AlertCircle,
  CheckCircle2,
  Share2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';

export default function TeamManagementPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite Modal
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('SALES_MEMBER');
  const [invitePassword, setInvitePassword] = useState('Password123!');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Bulk Reassignment Modal
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [fromUserId, setFromUserId] = useState('');
  const [toUserId, setToUserId] = useState('');
  const [reassigning, setReassigning] = useState(false);
  const [reassignMessage, setReassignMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchTeam();
  }, []);

  const fetchTeam = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/team');
      if (res.ok) {
        const json = await res.json();
        setMembers(json.members || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    setInviting(true);

    try {
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          displayName: inviteName,
          role: inviteRole,
          password: invitePassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add member');

      setInviteModalOpen(false);
      setInviteEmail('');
      setInviteName('');
      fetchTeam();
    } catch (err: any) {
      setInviteError(err.message);
    } finally {
      setInviting(false);
    }
  };

  const handleReassignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromUserId || !toUserId) return;
    if (fromUserId === toUserId) {
      setReassignMessage('From and To users cannot be the same');
      return;
    }
    setReassigning(true);

    try {
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reassign_all',
          fromUserId,
          toUserId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reassign');

      setReassignModalOpen(false);
      alert(`Successfully transferred ${data.reassignedCount} leads!`);
      fetchTeam();
    } catch (err: any) {
      setReassignMessage(err.message);
    } finally {
      setReassigning(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-charcoal-900 tracking-tight flex items-center gap-2">
            Team & Permissions
            <ShieldCheck className="w-5 h-5 text-gold-500" />
          </h1>
          <p className="text-xs text-charcoal-500 mt-0.5">
            Manage organization members, role-based boundaries, and lead reassignments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (members.length >= 2) {
                setFromUserId(members[0].userId);
                setToUserId(members[1].userId);
              }
              setReassignModalOpen(true);
            }}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Reassign Leads</span>
          </Button>

          <Button variant="gold" size="sm" onClick={() => setInviteModalOpen(true)}>
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add Member</span>
          </Button>
        </div>
      </div>

      {/* Role Access Matrix Info */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white border border-charcoal-200 shadow-subtle">
          <p className="text-xs font-bold text-charcoal-900">Admin</p>
          <p className="text-[11px] text-charcoal-500 mt-1">
            Full control over workspace settings, pipeline stages, team members, integrations, and all leads.
          </p>
        </div>
        <div className="p-4 rounded-xl bg-white border border-charcoal-200 shadow-subtle">
          <p className="text-xs font-bold text-charcoal-900">Manager</p>
          <p className="text-[11px] text-charcoal-500 mt-1">
            Can view and assign team leads, track overall team sales velocity, and reassign opportunities.
          </p>
        </div>
        <div className="p-4 rounded-xl bg-white border border-charcoal-200 shadow-subtle">
          <p className="text-xs font-bold text-charcoal-900">Sales Member</p>
          <p className="text-[11px] text-charcoal-500 mt-1">
            Strictly isolated to viewing and managing assigned leads. Cannot view or edit unassigned prospect data.
          </p>
        </div>
      </div>

      {/* Members Table */}
      {loading ? (
        <div className="bg-white p-12 rounded-xl border border-charcoal-200 text-center space-y-3">
          <RefreshCw className="w-6 h-6 animate-spin text-gold-600 mx-auto" />
          <p className="text-xs text-charcoal-500">Loading team directory...</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-charcoal-200 shadow-subtle overflow-hidden">
          <div className="p-4 border-b border-charcoal-200 flex items-center justify-between">
            <h3 className="text-sm font-bold text-charcoal-900">Active Organization Members</h3>
            <span className="text-xs text-charcoal-500">{members.length} Total Users</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-charcoal-50 text-[10px] uppercase font-semibold text-charcoal-600">
                <tr>
                  <th className="py-3 px-4">Member</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Assigned Leads</th>
                  <th className="py-3 px-4">Telegram Linked</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Joined Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-charcoal-100">
                {members.map((m) => (
                  <tr key={m.userId} className="hover:bg-charcoal-50/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-charcoal-900">{m.displayName}</p>
                      <div className="flex items-center gap-1.5 text-[11px] text-charcoal-500">
                        {m.username && (
                          <span className="font-mono text-gold-700 bg-gold-50 px-1 py-0.2 rounded border border-gold-200/60 font-medium">
                            @{m.username}
                          </span>
                        )}
                        <span>{m.email}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <Badge
                        variant={m.role === 'ADMIN' ? 'gold' : m.role === 'MANAGER' ? 'info' : 'default'}
                        size="sm"
                      >
                        {m.role.replace('_', ' ')}
                      </Badge>
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-charcoal-900">
                      {m.assignedLeadsCount} Leads
                    </td>

                    <td className="py-3.5 px-4">
                      {m.telegramLinked ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Connected</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-charcoal-400">Not linked</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {m.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-charcoal-500 text-[11px]">
                      {new Date(m.joinedAt).toLocaleDateString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      <Modal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        title="Add New Team Member"
        description="Create account credentials with assigned role permissions"
      >
        <form onSubmit={handleInviteSubmit} className="space-y-4">
          {inviteError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
              {inviteError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-charcoal-700 mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              placeholder="e.g. Rahul Gupta"
              className="w-full text-xs border border-charcoal-300 rounded-lg p-2.5 text-charcoal-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-charcoal-700 mb-1">Email Address *</label>
            <input
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="rahul@theluxestudio.in"
              className="w-full text-xs border border-charcoal-300 rounded-lg p-2.5 text-charcoal-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-charcoal-700 mb-1">Access Role</label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="w-full text-xs border border-charcoal-300 rounded-lg p-2.5 bg-white text-charcoal-900"
            >
              <option value="SALES_MEMBER">Sales Member (Assigned leads only)</option>
              <option value="MANAGER">Manager (Team visibility & reassignment)</option>
              <option value="ADMIN">Admin (Full workspace control)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-charcoal-700 mb-1">
              Temporary Password
            </label>
            <input
              type="text"
              required
              value={invitePassword}
              onChange={(e) => setInvitePassword(e.target.value)}
              className="w-full text-xs border border-charcoal-300 rounded-lg p-2.5 text-charcoal-900 font-mono"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setInviteModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="gold" size="sm" isLoading={inviting}>
              Create Member Account
            </Button>
          </div>
        </form>
      </Modal>

      {/* Bulk Lead Reassignment Modal */}
      <Modal
        isOpen={reassignModalOpen}
        onClose={() => setReassignModalOpen(false)}
        title="Bulk Reassign Leads"
        description="Transfer all active leads from one sales representative to another"
      >
        <form onSubmit={handleReassignSubmit} className="space-y-4">
          {reassignMessage && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
              {reassignMessage}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-charcoal-700 mb-1">
              Transfer From Member *
            </label>
            <select
              value={fromUserId}
              onChange={(e) => setFromUserId(e.target.value)}
              className="w-full text-xs border border-charcoal-300 rounded-lg p-2.5 bg-white text-charcoal-900"
            >
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.displayName} ({m.assignedLeadsCount} active leads)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-charcoal-700 mb-1">
              Transfer To Member *
            </label>
            <select
              value={toUserId}
              onChange={(e) => setToUserId(e.target.value)}
              className="w-full text-xs border border-charcoal-300 rounded-lg p-2.5 bg-white text-charcoal-900"
            >
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.displayName} ({m.role})
                </option>
              ))}
            </select>
          </div>

          <div className="p-3.5 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900">
            <p className="font-semibold">Important:</p>
            <p>
              All active leads currently owned by the source member will be updated to the destination member.
              Audit activities will be recorded automatically.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setReassignModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="gold" size="sm" isLoading={reassigning}>
              Execute Reassignment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
