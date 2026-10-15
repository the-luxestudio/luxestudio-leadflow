'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Menu,
  Search,
  Plus,
  LogOut,
  ChevronDown,
  Building,
  Bell,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface HeaderProps {
  onToggleSidebar: () => void;
  currentUser?: {
    displayName: string;
    email: string;
    username?: string | null;
    role: string;
  };
  organization?: {
    name: string;
  };
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  currentUser,
  organization,
}) => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/leads?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-charcoal-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-subtle">
      {/* Left: Mobile hamburger & Organization info */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 text-charcoal-600 hover:text-charcoal-900 hover:bg-charcoal-100 rounded-lg transition-colors cursor-pointer"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2 text-xs text-charcoal-500 font-medium">
          <Building className="w-3.5 h-3.5 text-gold-600" />
          <span className="text-charcoal-900 font-semibold">{organization?.name || 'LuxeStudio'}</span>
          <span className="text-charcoal-300">/</span>
          <span className="text-charcoal-600">Sales Workspace</span>
        </div>
      </div>

      {/* Center: Global Search Bar */}
      <div className="flex-1 max-w-md mx-4 hidden md:block">
        <form onSubmit={handleSearchSubmit} className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search leads by business, contact, phone, or email..."
            className="w-full text-xs bg-charcoal-50 border border-charcoal-200 rounded-lg pl-9 pr-3 py-2 text-charcoal-900 placeholder:text-charcoal-400 focus:outline-none focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500 transition-all"
          />
        </form>
      </div>

      {/* Right: Actions & User Menu */}
      <div className="flex items-center gap-3">
        {/* Prominent Add Lead Button */}
        <Link href="/leads/new">
          <Button variant="gold" size="sm" className="font-semibold shadow-xs">
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span className="hidden sm:inline">Add Lead</span>
          </Button>
        </Link>

        {/* User Menu Dropdown */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-charcoal-50 border border-transparent hover:border-charcoal-200 transition-all cursor-pointer"
          >
            <div className="w-7 h-7 rounded-full bg-charcoal-900 text-white font-bold text-xs flex items-center justify-center border border-charcoal-700">
              {currentUser?.displayName ? currentUser.displayName.slice(0, 1).toUpperCase() : 'U'}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-charcoal-900 leading-tight">
                {currentUser?.displayName?.split(' ')[0] || 'User'}
              </p>
              <p className="text-[10px] text-charcoal-500 capitalize leading-tight">
                {currentUser?.role?.toLowerCase().replace('_', ' ') || 'member'}
              </p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-charcoal-400" />
          </button>

          {/* Dropdown Menu */}
          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-charcoal-200 py-2 z-50 animate-fade-in">
              <div className="px-4 py-2 border-b border-charcoal-100">
                <p className="text-xs font-bold text-charcoal-900">{currentUser?.displayName}</p>
                {currentUser?.username && (
                  <p className="text-[11px] font-mono text-gold-600 font-medium">@{currentUser.username}</p>
                )}
                <p className="text-[11px] text-charcoal-500 truncate">{currentUser?.email}</p>
                <div className="mt-1.5 inline-block px-2 py-0.5 text-[10px] font-semibold rounded-full bg-gold-50 text-gold-700 border border-gold-200">
                  {currentUser?.role?.replace('_', ' ')}
                </div>
              </div>

              <div className="py-1">
                <Link
                  href="/settings"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-xs text-charcoal-700 hover:bg-charcoal-50 transition-colors"
                >
                  Workspace Settings
                </Link>
                <Link
                  href="/follow-ups"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-xs text-charcoal-700 hover:bg-charcoal-50 transition-colors"
                >
                  My Follow-ups
                </Link>
              </div>

              <div className="border-t border-charcoal-100 pt-1">
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="w-full flex items-center gap-2 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer text-left font-medium"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{isLoggingOut ? 'Signing out...' : 'Sign out'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
