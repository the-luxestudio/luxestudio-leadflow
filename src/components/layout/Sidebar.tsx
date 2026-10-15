'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Kanban,
  CalendarClock,
  MessageSquareCode,
  BarChart3,
  FileSpreadsheet,
  ShieldCheck,
  Settings2,
  Sparkles,
  X,
} from 'lucide-react';

interface SidebarProps {
  currentUser?: {
    displayName: string;
    email: string;
    username?: string | null;
    role: string;
  };
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentUser, isOpen, onClose }) => {
  const pathname = usePathname();

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'All Leads', href: '/leads', icon: Users },
    { label: 'Sales Pipeline', href: '/pipeline', icon: Kanban },
    { label: 'Follow-up Centre', href: '/follow-ups', icon: CalendarClock },
    { label: 'Message Templates', href: '/templates', icon: MessageSquareCode },
    { label: 'Analytics', href: '/analytics', icon: BarChart3 },
    { label: 'CSV Import & Export', href: '/import', icon: FileSpreadsheet },
    ...(currentUser?.role !== 'SALES_MEMBER'
      ? [{ label: 'Team Management', href: '/team', icon: ShieldCheck }]
      : []),
    { label: 'Settings & Integrations', href: '/settings', icon: Settings2 },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-charcoal-950/70 z-40 lg:hidden backdrop-blur-xs"
          onClick={onClose}
        />
      )}

      {/* Persistent Sidebar */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 w-64 bg-[#0B0D12] border-r border-[#1C202C] flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-[#1C202C]">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shadow-sm shadow-gold-500/20">
              <Sparkles className="w-4 h-4 text-charcoal-950 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                LUXESTUDIO
                <span className="text-[10px] font-semibold text-gold-400 tracking-normal px-1 py-0.2 bg-gold-400/10 rounded border border-gold-400/20">
                  CRM
                </span>
              </span>
              <p className="text-[10px] text-charcoal-400 font-medium tracking-wide">LEADFLOW ENGINE</p>
            </div>
          </Link>

          {/* Mobile close button */}
          <button
            onClick={onClose}
            className="lg:hidden text-charcoal-400 hover:text-white p-1 rounded-md"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all group ${
                  isActive
                    ? 'bg-gold-500/10 text-gold-400 font-semibold border border-gold-500/25 shadow-xs'
                    : 'text-charcoal-300 hover:text-white hover:bg-[#151822]'
                }`}
              >
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive
                      ? 'text-gold-400'
                      : 'text-charcoal-400 group-hover:text-gold-300'
                  }`}
                />
                <span>{item.label}</span>
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-gold-400 shadow-sm shadow-gold-400" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Workspace & Current User Footer */}
        <div className="p-3 border-t border-[#1C202C] bg-[#0E1017]">
          <div className="flex items-center gap-3 p-2 rounded-lg bg-[#141721] border border-[#222736]">
            <div className="w-8 h-8 rounded-full bg-gold-500/20 border border-gold-400/30 flex items-center justify-center text-xs font-bold text-gold-400">
              {currentUser?.displayName ? currentUser.displayName.slice(0, 2).toUpperCase() : 'LS'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">
                {currentUser?.displayName || 'Active Member'}
              </p>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-charcoal-400 truncate">
                  {currentUser?.username ? `@${currentUser.username}` : (currentUser?.role?.replace('_', ' ') || 'SALES REP')}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
