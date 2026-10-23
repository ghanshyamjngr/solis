import React, { useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, ListChecks, PiggyBank, Settings, Sparkles, UserRound } from 'lucide-react';
import { getRelativeDateLabel, getTodayDateString } from '../utils/timeline';
import { SolisMark } from './SolisMark';
import { UserPreferences } from '../types';

type MainTab = 'timeline' | 'tasks' | 'timer' | 'finance' | 'settings';

interface NavbarProps {
  activeTab: MainTab;
  setActiveTab: (tab: MainTab) => void;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  preferences: UserPreferences;
  onUpdatePreferences: (updates: Partial<UserPreferences>) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  selectedDate,
  setSelectedDate,
  preferences,
  onUpdatePreferences,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState('');
  const [profileDraft, setProfileDraft] = useState({
    profileName: preferences.profileName,
    personalGoals: preferences.personalGoals,
    dailyRoutine: preferences.dailyRoutine,
    encouragementTone: preferences.encouragementTone,
  });
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

  const openProfile = () => {
    setProfileDraft({
      profileName: preferences.profileName,
      personalGoals: preferences.personalGoals,
      dailyRoutine: preferences.dailyRoutine,
      encouragementTone: preferences.encouragementTone,
    });
    setProfileFeedback('');
    setProfileOpen((open) => !open);
  };

  const saveProfile = () => {
    onUpdatePreferences(profileDraft);
    setProfileFeedback('');
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-lg transition-colors dark:border-slate-800/80 dark:bg-slate-900/90">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="relative">
            <button
              type="button"
              onClick={() => { setMenuOpen((open) => !open); setProfileOpen(false); }}
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#AFC4F0] text-white shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              aria-label="Open profile and app menu"
              aria-expanded={menuOpen}
            >
              <SolisMark className="h-8 w-8" />
            </button>
            {menuOpen && (
              <div className="absolute left-0 top-12 z-50 max-h-[calc(100dvh-5rem)] w-72 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-800">
                <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Awake</p>
                <button type="button" onClick={openProfile} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700">
                  <UserRound className="h-4 w-4" /> Profile
                </button>
                <button type="button" onClick={() => openSettings()} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700">
                  <Settings className="h-4 w-4" /> Settings
                </button>
                <button type="button" onClick={() => openSettings('appearance-settings')} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700">
                  <Sparkles className="h-4 w-4" /> Appearance
                </button>
                {profileOpen && (
                  <div className="m-1 space-y-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-900" role="region" aria-label="Your profile">
                    <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                      Optional profile details stay on this device and can shape local suggestions. Avoid adding private or sensitive information.
                    </p>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300">
                      Preferred name
                      <input maxLength={80} value={profileDraft.profileName} onChange={(event) => setProfileDraft((draft) => ({ ...draft, profileName: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" placeholder="Optional" />
                    </label>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300">
                      Personal goals
                      <textarea maxLength={500} rows={2} value={profileDraft.personalGoals} onChange={(event) => setProfileDraft((draft) => ({ ...draft, personalGoals: event.target.value }))} className="mt-1 w-full resize-y rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" placeholder="What would you like to make room for?" />
                    </label>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300">
                      Routine or preferred time
                      <textarea maxLength={500} rows={2} value={profileDraft.dailyRoutine} onChange={(event) => setProfileDraft((draft) => ({ ...draft, dailyRoutine: event.target.value }))} className="mt-1 w-full resize-y rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" placeholder="Optional, e.g. quiet focus in the morning" />
                    </label>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300">
                      Encouragement style
                      <select value={profileDraft.encouragementTone} onChange={(event) => setProfileDraft((draft) => ({ ...draft, encouragementTone: event.target.value as UserPreferences['encouragementTone'] }))} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
                        <option value="gentle">Gentle</option>
                        <option value="poetic">Poetic</option>
                        <option value="practical">Practical</option>
                        <option value="off">Off</option>
                      </select>
                    </label>
                    <button type="button" onClick={saveProfile} className="w-full rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white">Save profile</button>
                    {profileFeedback && <p role="status" className="text-[10px] text-emerald-700 dark:text-emerald-300">{profileFeedback}</p>}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="text-center">
            <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">Awake</h1>
            <p className="hidden text-[10px] text-slate-500 dark:text-slate-400 sm:block">Mindful Day & Focus</p>
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
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+1.5rem)] z-50 flex justify-center px-4">
      <nav
        className="pointer-events-auto w-full max-w-[25rem] rounded-full border border-white/70 bg-white/85 p-1.5 shadow-[0_10px_36px_rgb(38_45_67/0.18)] backdrop-blur-2xl dark:border-slate-600/70 dark:bg-slate-900/85"
        aria-label="Main navigation"
        data-no-tab-swipe="true"
      >
        <div className="grid grid-cols-4 gap-1">
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
                  ? 'bg-[var(--solis-accent-soft)] text-[var(--solis-accent-strong)] shadow-sm dark:bg-[color-mix(in_srgb,var(--solis-accent)_22%,#1e293b)]'
                  : 'text-slate-500 hover:bg-slate-100/80 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className={`h-[18px] w-[18px] ${activeTab === id ? 'stroke-[2.4]' : ''}`} aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </nav>
      </div>
    </>
  );
};
