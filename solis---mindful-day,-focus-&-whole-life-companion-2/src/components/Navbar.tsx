import React, { useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, ListChecks, PiggyBank, Settings, Sparkles, UserRound } from 'lucide-react';
import { getRelativeDateLabel, getTodayDateString } from '../utils/timeline';
import { SolisMark } from './SolisMark';

type MainTab = 'timeline' | 'tasks' | 'timer' | 'finance' | 'settings';

interface NavbarProps {
  activeTab: MainTab;
  setActiveTab: (tab: MainTab) => void;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  selectedDate,
  setSelectedDate,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const today = getTodayDateString();

  const moveDate = (days: number) => {
    const [year, month, day] = selectedDate.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + days);
    setSelectedDate(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`);
  };

  const openSettings = (section?: string) => {
    setActiveTab('settings');
    setMenuOpen(false);
    if (section) {
      window.setTimeout(() => document.getElementById(section)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-lg transition-colors dark:border-slate-800/80 dark:bg-slate-900/90">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="relative">
            <button
              type="button"
              onClick={() => { setMenuOpen((open) => !open); setProfileOpen(false); }}
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              aria-label="Open profile and app menu"
              aria-expanded={menuOpen}
            >
              <SolisMark className="h-8 w-8" />
            </button>
            {menuOpen && (
              <div className="absolute left-0 top-12 z-50 w-60 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-800">
                <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Solis</p>
                <button type="button" onClick={() => setProfileOpen((open) => !open)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700">
                  <UserRound className="h-4 w-4" /> Profile
                </button>
                <button type="button" onClick={() => openSettings()} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700">
                  <Settings className="h-4 w-4" /> Settings
                </button>
                <button type="button" onClick={() => openSettings('appearance-settings')} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700">
                  <Sparkles className="h-4 w-4" /> Appearance
                </button>
                {profileOpen && (
                  <div className="m-1 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-600 dark:bg-slate-900 dark:text-slate-300" role="status">
                    Local profile · Your tasks and reflections stay on this device unless you choose to share selected context.
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="text-center">
            <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">Solis</h1>
            <p className="hidden text-[10px] text-slate-500 dark:text-slate-400 sm:block">Whole-Day Life & Focus</p>
          </div>

          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-800">
            <button type="button" onClick={() => moveDate(-1)} className="rounded-lg p-1.5 text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-700" aria-label="Previous day">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="min-w-[86px] text-center sm:min-w-[110px]">
              <span className="block text-[11px] font-semibold text-slate-800 dark:text-slate-200">{getRelativeDateLabel(selectedDate)}</span>
              <span className="hidden font-mono text-[9px] text-slate-500 sm:block">{selectedDate}</span>
            </div>
            <button type="button" onClick={() => moveDate(1)} className="rounded-lg p-1.5 text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-700" aria-label="Next day">
              <ChevronRight className="h-4 w-4" />
            </button>
            {selectedDate !== today && (
              <button type="button" onClick={() => setSelectedDate(today)} className="px-1 text-[10px] font-semibold text-amber-700 dark:text-amber-300">Today</button>
            )}
            <CalendarDays className="mr-1 hidden h-3.5 w-3.5 text-slate-400 sm:block" aria-hidden="true" />
          </div>
        </div>
      </header>
      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200/70 bg-white/80 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgb(15_23_42/0.06)] backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-900/80"
        aria-label="Main navigation"
      >
        <div className="mx-auto grid max-w-md grid-cols-4 gap-1 px-3 py-2">
          {[
            { id: 'timeline' as const, label: 'Today', icon: Clock },
            { id: 'tasks' as const, label: 'Plan', icon: ListChecks },
            { id: 'timer' as const, label: 'Focus', icon: Sparkles },
            { id: 'finance' as const, label: 'Money', icon: PiggyBank },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              aria-current={activeTab === id ? 'page' : undefined}
              className={`flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[10px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                activeTab === id
                  ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-200'
                  : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="h-[18px] w-[18px]" />
              {label}
            </button>
          ))}
        </div>
      </nav>
    </>
  );
};
