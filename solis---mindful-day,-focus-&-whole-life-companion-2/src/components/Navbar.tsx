import React from 'react';
import { Sun, Moon, Sparkles, Compass, Clock, PlusCircle, ChevronLeft, ChevronRight, Palette, PiggyBank, Settings, ListChecks } from 'lucide-react';
import { AccentColor, ThemeStyle, UserPreferences } from '../types';
import { getRelativeDateLabel, getTodayDateString } from '../utils/timeline';

interface NavbarProps {
  activeTab: 'timeline' | 'tasks' | 'timer' | 'log' | 'finance' | 'settings';
  setActiveTab: (tab: 'timeline' | 'tasks' | 'timer' | 'log' | 'finance' | 'settings') => void;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  preferences: UserPreferences;
  onUpdatePreferences: (updates: Partial<UserPreferences>) => void;
  onOpenQuickLog?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  selectedDate,
  setSelectedDate,
  preferences,
  onUpdatePreferences,
}) => {
  const isPlayful = preferences.themeStyle === 'playful-animated';
  const today = getTodayDateString();

  const handlePrevDay = () => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() - 1);
    const prevStr = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    setSelectedDate(prevStr);
  };

  const handleNextDay = () => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + 1);
    const nextStr = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    setSelectedDate(nextStr);
  };

  const accentColors: { id: AccentColor; label: string; bg: string }[] = [
    { id: 'amber', label: 'Warm Amber', bg: 'bg-amber-500' },
    { id: 'sage', label: 'Sage Calm', bg: 'bg-emerald-600' },
    { id: 'ocean', label: 'Ocean Blue', bg: 'bg-sky-600' },
    { id: 'lavender', label: 'Lavender', bg: 'bg-purple-500' },
    { id: 'coral', label: 'Coral', bg: 'bg-rose-500' },
  ];

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-white/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand Identity */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('timeline')}
              className="flex items-center gap-2.5 text-left group focus:outline-none"
              aria-label="Solis Home Dashboard"
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-sm transition-transform ${
                  isPlayful ? 'group-hover:rotate-12 group-hover:scale-105' : ''
                } ${
                  preferences.accentColor === 'amber'
                    ? 'bg-gradient-to-tr from-amber-500 to-orange-400'
                    : preferences.accentColor === 'sage'
                    ? 'bg-gradient-to-tr from-emerald-600 to-teal-500'
                    : preferences.accentColor === 'ocean'
                    ? 'bg-gradient-to-tr from-sky-600 to-blue-500'
                    : preferences.accentColor === 'lavender'
                    ? 'bg-gradient-to-tr from-purple-500 to-indigo-400'
                    : 'bg-gradient-to-tr from-rose-500 to-pink-400'
                }`}
              >
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold tracking-tight text-lg text-slate-900 dark:text-white flex items-center gap-1.5">
                  Solis
                  {isPlayful && <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 font-medium">gentle</span>}
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">Whole-Day Life & Focus</p>
              </div>
            </button>
          </div>

          {/* Date Picker Navigation */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700/60">
            <button
              onClick={handlePrevDay}
              className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
              aria-label="Previous day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="px-2 text-center min-w-[110px]">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                {getRelativeDateLabel(selectedDate)}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-mono">
                {selectedDate}
              </span>
            </div>
            <button
              onClick={handleNextDay}
              className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
              aria-label="Next day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            {selectedDate !== today && (
              <button
                onClick={() => setSelectedDate(today)}
                className="text-[11px] font-medium text-amber-600 dark:text-amber-400 hover:underline px-1.5"
              >
                Today
              </button>
            )}
          </div>

          {/* Theme & Controls */}
          <div className="flex items-center gap-2">
            {/* Theme Style Toggle */}
            <div className="hidden md:flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium">
              <button
                onClick={() => onUpdatePreferences({ themeStyle: 'clean-minimal' })}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  preferences.themeStyle === 'clean-minimal'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                }`}
                title="Clean Minimal Style"
              >
                Minimal
              </button>
              <button
                onClick={() => onUpdatePreferences({ themeStyle: 'playful-animated' })}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                  preferences.themeStyle === 'playful-animated'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                }`}
                title="Playful Animated Style"
              >
                <Sparkles className="w-3 h-3 text-amber-500" />
                Playful
              </button>
            </div>

            {/* Accent Color Picker Dropdown/Cycle */}
            <div className="relative group">
              <button
                className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Change Accent Color"
                title="Change Color Theme"
              >
                <Palette className="w-4 h-4" />
              </button>
              <div className="absolute right-0 mt-2 hidden group-hover:flex group-focus-within:flex flex-col gap-1 p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-50 min-w-[140px]">
                <span className="text-[10px] uppercase font-semibold text-slate-400 px-2 py-1">Accent Color</span>
                {accentColors.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => onUpdatePreferences({ accentColor: c.id })}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-left transition-colors ${
                      preferences.accentColor === c.id
                        ? 'bg-slate-100 dark:bg-slate-700 font-semibold text-slate-900 dark:text-white'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750'
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 rounded-full ${c.bg}`} />
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Dark Mode Toggle */}
            <button
              onClick={() => onUpdatePreferences({ darkMode: !preferences.darkMode })}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label={preferences.darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {preferences.darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`p-2 rounded-xl transition-colors ${
                activeTab === 'settings'
                  ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              aria-label="Open Settings"
              title="Settings, tracking and AI"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
      <nav
        className="fixed bottom-0 inset-x-0 z-50 border-t border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
        aria-label="Main navigation"
      >
        <div className="max-w-2xl mx-auto grid grid-cols-6 gap-1 px-2 py-1.5">
          {[
            { id: 'timeline' as const, label: 'Today', icon: Clock },
            { id: 'tasks' as const, label: 'Tasks', icon: ListChecks },
            { id: 'timer' as const, label: 'Focus', icon: Sparkles },
            { id: 'log' as const, label: 'Log', icon: PlusCircle },
            { id: 'finance' as const, label: 'Money', icon: PiggyBank },
            { id: 'settings' as const, label: 'Settings', icon: Settings },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              aria-current={activeTab === id ? 'page' : undefined}
              className={`flex flex-col items-center justify-center gap-1 rounded-xl border py-2 text-[10px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                activeTab === id
                  ? 'border-amber-200 bg-amber-50 text-amber-800 shadow-sm dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200'
                  : 'border-transparent text-slate-500 hover:border-slate-200 hover:bg-slate-50 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-5 h-5" />
              {label}
            </button>
          ))}
        </div>
      </nav>
    </header>
  );
};
