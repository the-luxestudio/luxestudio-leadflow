'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Shield, ArrowRight, Lock, Mail, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to authenticate');
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Password123!');
  };

  return (
    <div className="min-h-screen bg-[#0B0D12] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Subtle luxury background radial gradient */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gold-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center items-center gap-2.5 mb-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shadow-lg shadow-gold-500/20">
            <Sparkles className="w-5 h-5 text-charcoal-950 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              LUXESTUDIO
              <span className="text-xs font-semibold text-gold-400 px-1.5 py-0.5 bg-gold-400/10 rounded border border-gold-400/20">
                LEADFLOW
              </span>
            </h1>
            <p className="text-[11px] text-charcoal-400 font-medium tracking-wide">
              INTERNAL SALES PIPELINE CRM
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-[#12151F] border border-[#232838] py-8 px-6 shadow-2xl rounded-2xl sm:px-10">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white tracking-tight">Team Sign In</h2>
            <p className="text-xs text-charcoal-400 mt-1">
              Authorized access only. Workspace session verification enabled.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-charcoal-300 mb-1.5">
                Work Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-charcoal-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@theluxestudio.in"
                  className="w-full bg-[#181C2A] border border-[#2B3145] rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder:text-charcoal-500 focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:border-gold-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-charcoal-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-charcoal-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-[#181C2A] border border-[#2B3145] rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder:text-charcoal-500 focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:border-gold-500"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="gold"
              isLoading={loading}
              className="w-full py-2.5 font-bold shadow-md shadow-gold-500/10"
            >
              <span>Sign In to LeadFlow</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          {/* Quick Demo Access Switcher */}
          <div className="mt-8 pt-6 border-t border-[#232838]">
            <p className="text-[11px] font-semibold text-charcoal-400 uppercase tracking-wider mb-2.5 text-center">
              Quick Role Sign-In (Demo Testing)
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@theluxestudio.in')}
                className="p-2 rounded-lg bg-[#181C2A] hover:bg-[#202538] border border-[#2B3145] text-left transition-colors cursor-pointer"
              >
                <p className="text-white font-medium text-[11px]">Aditya Sharma</p>
                <p className="text-[10px] text-gold-400 font-semibold">Admin (Full Access)</p>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('manager@theluxestudio.in')}
                className="p-2 rounded-lg bg-[#181C2A] hover:bg-[#202538] border border-[#2B3145] text-left transition-colors cursor-pointer"
              >
                <p className="text-white font-medium text-[11px]">Pooja Verma</p>
                <p className="text-[10px] text-sky-400 font-semibold">Manager</p>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('sales1@theluxestudio.in')}
                className="p-2 rounded-lg bg-[#181C2A] hover:bg-[#202538] border border-[#2B3145] text-left transition-colors cursor-pointer"
              >
                <p className="text-white font-medium text-[11px]">Rohan Mehta</p>
                <p className="text-[10px] text-emerald-400 font-semibold">Sales Rep 1</p>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('sales2@theluxestudio.in')}
                className="p-2 rounded-lg bg-[#181C2A] hover:bg-[#202538] border border-[#2B3145] text-left transition-colors cursor-pointer"
              >
                <p className="text-white font-medium text-[11px]">Ananya Gupta</p>
                <p className="text-[10px] text-purple-400 font-semibold">Sales Rep 2</p>
              </button>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-charcoal-500">
            <Shield className="w-3.5 h-3.5 text-charcoal-400" />
            <span>Invite-only CRM • Encrypted session token</span>
          </div>
        </div>
      </div>
    </div>
  );
}
