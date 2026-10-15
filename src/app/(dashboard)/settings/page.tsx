'use client';

import React, { useEffect, useState } from 'react';
import {
  Settings2,
  Send,
  Mail,
  Clock,
  Shield,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  Bell,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function SettingsPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [organization, setOrganization] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Telegram Linking State
  const [telegramToken, setTelegramToken] = useState<string | null>(null);
  const [telegramLinkUrl, setTelegramLinkUrl] = useState<string | null>(null);
  const [telegramBotConfigured, setTelegramBotConfigured] = useState(false);
  const [generatingToken, setGeneratingToken] = useState(false);
  const [unlinkingTelegram, setUnlinkingTelegram] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  // Background Cron Worker test
  const [runningCron, setRunningCron] = useState(false);
  const [cronResult, setCronResult] = useState<any | null>(null);

  // Security / Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Email Test state
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [emailTestSuccess, setEmailTestSuccess] = useState<string | null>(null);
  const [emailTestError, setEmailTestError] = useState<string | null>(null);

  const handleSendTestEmail = async () => {
    setEmailTestSuccess(null);
    setEmailTestError(null);
    try {
      setSendingTestEmail(true);
      const res = await fetch('/api/email/test', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setEmailTestError(data.error || 'Failed to send test email');
      } else {
        setEmailTestSuccess(data.message || 'Test email dispatched successfully!');
      }
    } catch {
      setEmailTestError('Network error while requesting test email');
    } finally {
      setSendingTestEmail(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long');
      return;
    }

    try {
      setChangingPassword(true);
      const res = await fetch('/api/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPasswordError(data.error || 'Failed to update password');
      } else {
        setPasswordSuccess('Password successfully updated!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      setPasswordError('Network error while updating password');
    } finally {
      setChangingPassword(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const json = await res.json();
        setCurrentUser(json.user);
        setOrganization(json.organization);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateTelegramToken = async () => {
    setGeneratingToken(true);
    try {
      const res = await fetch('/api/telegram/token', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setTelegramToken(data.token);
        setTelegramLinkUrl(data.deepLinkUrl);
        setTelegramBotConfigured(data.isConfigured);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingToken(false);
    }
  };

  const handleUnlinkTelegram = async () => {
    if (!confirm('Unlink your Telegram account from LeadFlow reminders?')) return;
    setUnlinkingTelegram(true);
    try {
      const res = await fetch('/api/telegram/link', { method: 'DELETE' });
      if (res.ok) {
        fetchUserData();
        setTelegramToken(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUnlinkingTelegram(false);
    }
  };

  const handleTriggerCronWorker = async () => {
    setRunningCron(true);
    setCronResult(null);
    try {
      const res = await fetch('/api/cron', { method: 'POST' });
      const data = await res.json();
      setCronResult(data);
    } catch (err: any) {
      setCronResult({ error: err.message });
    } finally {
      setRunningCron(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  if (loading) {
    return (
      <div className="bg-white p-12 rounded-xl border border-charcoal-200 text-center space-y-3">
        <RefreshCw className="w-6 h-6 animate-spin text-gold-600 mx-auto" />
        <p className="text-xs text-charcoal-500">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-charcoal-900 tracking-tight flex items-center gap-2">
          Settings & Integrations
          <Settings2 className="w-5 h-5 text-gold-500" />
        </h1>
        <p className="text-xs text-charcoal-500 mt-0.5">
          Configure personal notification channels, Telegram bots, and workspace defaults.
        </p>
      </div>

      {/* Section 1: Telegram Bot Integration */}
      <div className="bg-white p-6 rounded-xl border border-charcoal-200 shadow-subtle space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 text-sky-600 flex items-center justify-center">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-charcoal-900">Personal Telegram Reminder Bot</h3>
              <p className="text-xs text-charcoal-500 mt-0.5">
                Receive instant follow-up alerts, overdue warnings, and morning sales digests directly in Telegram.
              </p>
            </div>
          </div>

          <div>
            {currentUser?.telegramChatId ? (
              <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Connected
              </span>
            ) : (
              <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" /> Disconnected
              </span>
            )}
          </div>
        </div>

        {currentUser?.telegramChatId ? (
          <div className="p-4 rounded-xl bg-charcoal-50 border border-charcoal-200 space-y-3">
            <div className="text-xs text-charcoal-700">
              <span className="font-semibold">Linked Telegram Chat:</span> {currentUser.telegramChatId}{' '}
              {currentUser.telegramUsername && <span>(@{currentUser.telegramUsername})</span>}
            </div>
            <p className="text-[11px] text-charcoal-500">
              Your account is actively receiving personal reminders in accordance with your follow-up schedules.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleUnlinkTelegram}
              isLoading={unlinkingTelegram}
              className="text-rose-600 hover:bg-rose-50 border-rose-200"
            >
              Unlink Telegram Account
            </Button>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            {!telegramToken ? (
              <div>
                <Button
                  variant="gold"
                  size="md"
                  onClick={handleGenerateTelegramToken}
                  isLoading={generatingToken}
                  className="font-bold"
                >
                  <Send className="w-4 h-4" />
                  <span>Generate Telegram Linking Code</span>
                </Button>
              </div>
            ) : (
              <div className="p-5 rounded-xl bg-charcoal-50 border border-charcoal-200 space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-charcoal-900 uppercase tracking-wider mb-2">
                    Follow These Steps to Connect
                  </h4>
                  <ol className="list-decimal list-inside space-y-2 text-xs text-charcoal-700">
                    <li>
                      Open our official bot in Telegram:{' '}
                      <a
                        href={telegramLinkUrl || '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-gold-600 hover:underline inline-flex items-center gap-1"
                      >
                        Launch Telegram Bot <ExternalLink className="w-3 h-3" />
                      </a>
                    </li>
                    <li>
                      Or click Start and send this single-use code to the bot:
                      <div className="mt-1 flex items-center gap-2">
                        <span className="px-3 py-1.5 rounded-lg bg-white border border-charcoal-300 font-mono text-base font-bold text-charcoal-900 tracking-widest select-all">
                          {telegramToken}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopy(telegramToken)}
                          className="text-xs"
                        >
                          {copiedToken ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          <span>{copiedToken ? 'Copied' : 'Copy'}</span>
                        </Button>
                      </div>
                    </li>
                    <li>Your account will be verified and bound securely within 3 seconds.</li>
                  </ol>
                </div>

                {!telegramBotConfigured && (
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800">
                    <p className="font-semibold">Note on Bot Configuration:</p>
                    <p>
                      TELEGRAM_BOT_TOKEN is currently empty in .env. Once you create a bot via @BotFather and add your token, real messages will be delivered directly to your device!
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Section 2: Transactional Email Integration */}
      <div className="bg-white p-6 rounded-xl border border-charcoal-200 shadow-subtle space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-charcoal-900">Transactional Email Provider</h3>
              <p className="text-xs text-charcoal-500 mt-0.5">
                Zoho Mail SMTP / Amazon SES adapter for lead alerts and client correspondence.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Connected (Zoho SMTP)
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSendTestEmail}
              isLoading={sendingTestEmail}
            >
              <Send className="w-3.5 h-3.5 text-purple-600" />
              <span>Send Test Email</span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-charcoal-50/70 p-3.5 rounded-xl border border-charcoal-200">
          <div>
            <span className="text-charcoal-500 block mb-0.5">Primary Recipient (To)</span>
            <span className="font-semibold text-charcoal-900 font-mono">hello@theluxestudio.in</span>
          </div>
          <div>
            <span className="text-charcoal-500 block mb-0.5">Carbon Copy (CC)</span>
            <span className="font-semibold text-gold-700 font-mono">rahulk19022@gmail.com</span>
          </div>
        </div>

        {emailTestSuccess && (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-start gap-2 text-xs text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>{emailTestSuccess}</span>
          </div>
        )}

        {emailTestError && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2 text-xs text-rose-800">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{emailTestError}</span>
          </div>
        )}
      </div>

      {/* Section 3: Background Worker & Cron Testing */}
      <div className="bg-white p-6 rounded-xl border border-charcoal-200 shadow-subtle space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold-50 border border-gold-200 text-gold-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-charcoal-900">Scheduled Reminder Worker (Cron)</h3>
              <p className="text-xs text-charcoal-500 mt-0.5">
                Claims due tasks idempotently, runs retries with exponential backoff, and cleans stale jobs.
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleTriggerCronWorker}
            isLoading={runningCron}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Trigger Worker Run</span>
          </Button>
        </div>

        {cronResult && (
          <div className="p-4 rounded-xl bg-charcoal-50 border border-charcoal-200 text-xs font-mono space-y-1">
            <p className="font-bold text-charcoal-900">Worker Run Output:</p>
            <p>Processed: {cronResult.processed || 0} tasks</p>
            <p>Sent: {cronResult.sent || 0} notifications</p>
            <p>Skipped: {cronResult.skipped || 0} (already delivered)</p>
            <p>Pending / Retrying: {cronResult.failed || 0}</p>
          </div>
        )}
      </div>

      {/* Section 4: Security & Password */}
      <div className="bg-white p-6 rounded-xl border border-charcoal-200 shadow-subtle space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-gold-500" />
          <div>
            <h3 className="text-sm font-bold text-charcoal-900">Security & Credentials</h3>
            <p className="text-xs text-charcoal-500">Update your account password</p>
          </div>
        </div>

        {passwordSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{passwordSuccess}</span>
          </div>
        )}

        {passwordError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{passwordError}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
          <div>
            <label className="text-xs font-medium text-charcoal-700 block mb-1">Current Password</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-charcoal-200 rounded-lg p-2.5 text-xs text-charcoal-900 focus:outline-none focus:ring-1 focus:ring-gold-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-charcoal-700 block mb-1">New Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 8 characters"
                className="w-full border border-charcoal-200 rounded-lg p-2.5 text-xs text-charcoal-900 focus:outline-none focus:ring-1 focus:ring-gold-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-charcoal-700 block mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="w-full border border-charcoal-200 rounded-lg p-2.5 text-xs text-charcoal-900 focus:outline-none focus:ring-1 focus:ring-gold-500"
              />
            </div>
          </div>

          <Button type="submit" variant="primary" size="sm" isLoading={changingPassword}>
            Update Password
          </Button>
        </form>
      </div>

      {/* Section 5: Workspace Defaults */}
      <div className="bg-white p-6 rounded-xl border border-charcoal-200 shadow-subtle space-y-4">
        <h3 className="text-sm font-bold text-charcoal-900">Workspace Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-charcoal-500 block mb-1">Organization Name</span>
            <input
              type="text"
              readOnly
              value={organization?.name || 'LuxeStudio'}
              className="w-full border border-charcoal-200 rounded-lg p-2.5 bg-charcoal-50 text-charcoal-700"
            />
          </div>

          <div>
            <span className="text-charcoal-500 block mb-1">Default Timezone</span>
            <input
              type="text"
              readOnly
              value={organization?.timezone || 'Asia/Kolkata'}
              className="w-full border border-charcoal-200 rounded-lg p-2.5 bg-charcoal-50 text-charcoal-700 font-mono"
            />
          </div>

          <div>
            <span className="text-charcoal-500 block mb-1">Default Currency</span>
            <input
              type="text"
              readOnly
              value="INR (₹)"
              className="w-full border border-charcoal-200 rounded-lg p-2.5 bg-charcoal-50 text-charcoal-700"
            />
          </div>

          <div>
            <span className="text-charcoal-500 block mb-1">Your Role</span>
            <input
              type="text"
              readOnly
              value={currentUser?.role || 'ADMIN'}
              className="w-full border border-charcoal-200 rounded-lg p-2.5 bg-charcoal-50 text-charcoal-700 font-semibold"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
