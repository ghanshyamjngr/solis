import React, { useRef, useState } from 'react';
import {
  Clock,
  Sparkles,
  Moon,
  Compass,
  Trees,
  Activity,
  Utensils,
  Coffee,
  BookOpen,
  Heart,
  CircleDot,
  Trash2,
  Filter,
  CheckCircle2,
  Calendar,
  Smile,
  Plus
} from 'lucide-react';
import { ActivityCategory, ActivityEntry, DailyDeviceUsage, PlannedTask, UserPreferences } from '../types';
import {
  formatDuration,
  formatTimeDisplay,
  getCategoryMetadata,
  sortEntriesChronologically,
  calculateDayBreakdown,
  getRelativeDateLabel,
} from '../utils/timeline';
import { DailyInsights } from './DailyInsights';

interface DailyTimelineProps {
  date: string;
  entries: ActivityEntry[];
  tasks: PlannedTask[];
  deviceUsage: DailyDeviceUsage | null;
  usageTrackingEnabled: boolean;
  usageStatus: string;
  isUsageRefreshing: boolean;
  onRefreshUsage: () => void;
  preferences: UserPreferences;
  onDeleteEntry: (id: string) => void;
  onNavigateToLog: () => void;
  onNavigateToTimer: () => void;
}

export const DailyTimeline: React.FC<DailyTimelineProps> = ({
  date,
  entries,
  tasks,
  deviceUsage,
  usageTrackingEnabled,
  usageStatus,
  isUsageRefreshing,
  onRefreshUsage,
  preferences,
  onDeleteEntry,
  onNavigateToLog,
  onNavigateToTimer,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const pullStart = useRef<{ x: number; y: number } | null>(null);

  const dayEntries = entries.filter((e) => e.date === date);
  const sortedEntries = sortEntriesChronologically(dayEntries);
  const realDayEntries = dayEntries.filter((entry) => entry.source !== 'demo');

  const filteredEntries = sortedEntries.filter((e) => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'focus') return e.isFocusSession || e.category === 'focus';
    if (selectedFilter === 'offline') return e.category === 'offline' || e.category === 'nature' || e.category === 'reading';
    if (selectedFilter === 'rest') return e.category === 'sleep' || e.category === 'break';
    if (selectedFilter === 'nourish') return e.category === 'meal' || e.category === 'exercise';
    return e.category === selectedFilter;
  });

  const breakdown = calculateDayBreakdown(realDayEntries);
  const isPlayful = preferences.themeStyle === 'playful-animated';

  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'Sparkles':
        return <Sparkles className="w-4 h-4 text-indigo-500" />;
      case 'Moon':
        return <Moon className="w-4 h-4 text-purple-500" />;
      case 'Compass':
        return <Compass className="w-4 h-4 text-emerald-500" />;
      case 'Trees':
        return <Trees className="w-4 h-4 text-teal-500" />;
      case 'Activity':
        return <Activity className="w-4 h-4 text-amber-500" />;
      case 'Utensils':
        return <Utensils className="w-4 h-4 text-orange-500" />;
      case 'Coffee':
        return <Coffee className="w-4 h-4 text-sky-500" />;
      case 'BookOpen':
        return <BookOpen className="w-4 h-4 text-cyan-500" />;
      case 'Heart':
        return <Heart className="w-4 h-4 text-rose-500" />;
      default:
        return <CircleDot className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div
      className="max-w-4xl mx-auto space-y-8 py-4"
      onTouchStart={(event) => {
        const target = event.target;
        if (target instanceof Element && target.closest('button, input, select, textarea, [role="slider"]')) {
          pullStart.current = null;
          return;
        }
        const touch = event.touches[0];
        pullStart.current = window.scrollY <= 0 && touch ? { x: touch.clientX, y: touch.clientY } : null;
      }}
      onTouchEnd={(event) => {
        const start = pullStart.current;
        pullStart.current = null;
        const touch = event.changedTouches[0];
        if (!start || !touch || window.scrollY > 0) return;
        const deltaY = touch.clientY - start.y;
        const deltaX = Math.abs(touch.clientX - start.x);
        if (deltaY >= 72 && deltaX < 64 && !isUsageRefreshing) onRefreshUsage();
      }}
    >
      {/* Daily Insights Component: Total focus time, activity breakdown, and AI reflections */}
      <DailyInsights
        entries={entries.filter((entry) => entry.source !== 'demo')}
        tasks={tasks}
        deviceUsage={deviceUsage}
        usageTrackingEnabled={usageTrackingEnabled}
        usageStatus={usageStatus}
        isUsageRefreshing={isUsageRefreshing}
        onRefreshUsage={onRefreshUsage}
        selectedDate={date}
        preferences={preferences}
        onStartFocus={onNavigateToTimer}
        onLogOffline={onNavigateToLog}
      />

      {/* Top Banner: Day Summary & Philosophy */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700/80 p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-700/60">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {getRelativeDateLabel(date)}’s Flow
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Honoring your whole day—sleep, nourish, offline rhythm, and mindful focus.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onNavigateToTimer}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-semibold hover:bg-amber-100 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Focus Timer
            </button>
            <button
              onClick={onNavigateToLog}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold hover:opacity-95 transition-opacity"
            >
              <Plus className="w-3.5 h-3.5" />
              Log Activity
            </button>
          </div>
        </div>

        {/* Holistic Balance Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5">
          <div className="bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl p-3.5">
            <span className="text-[11px] font-medium text-indigo-700 dark:text-indigo-300 block">
              Mindful Focus
            </span>
            <span className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white block mt-0.5">
              {formatDuration(breakdown.focusMinutes)}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">
              {breakdown.focusMinutes >= 60 ? '✨ Good depth today' : 'Gentle progress'}
            </span>
          </div>

          <div className="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 rounded-2xl p-3.5">
            <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300 block">
              Offline & Nature
            </span>
            <span className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white block mt-0.5">
              {formatDuration(breakdown.offlineAndNature)}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">
              Screen-free living
            </span>
          </div>

          <div className="bg-purple-50/60 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/50 rounded-2xl p-3.5">
            <span className="text-[11px] font-medium text-purple-700 dark:text-purple-300 block">
              Sleep & Rest
            </span>
            <span className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white block mt-0.5">
              {formatDuration(breakdown.totals.sleep + breakdown.totals.break)}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">
              Rest restores focus
            </span>
          </div>

          <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/50 rounded-2xl p-3.5">
            <span className="text-[11px] font-medium text-amber-800 dark:text-amber-300 block">
              Total Logged
            </span>
            <span className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white block mt-0.5">
              {formatDuration(breakdown.totalTrackedMinutes)}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">
              {realDayEntries.length} moments noted
            </span>
          </div>
        </div>

        {/* Visual Day Balance Flow Bar */}
        {breakdown.totalTrackedMinutes > 0 && (
          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1.5 font-medium">
              <span>Day Weave (Proportional Flow)</span>
              <span>{preferences.aiDataSharingConsent ? 'Gemini sharing enabled' : 'Local data · AI sharing off'}</span>
            </div>
            <div className="h-3 w-full bg-slate-100 dark:bg-slate-700/60 rounded-full overflow-hidden flex">
              {breakdown.totals.sleep > 0 && (
                <div
                  style={{ width: `${(breakdown.totals.sleep / breakdown.totalTrackedMinutes) * 100}%` }}
                  className="bg-purple-400 hover:opacity-90 transition-all"
                  title={`Sleep: ${formatDuration(breakdown.totals.sleep)}`}
                />
              )}
              {breakdown.totals.focus > 0 && (
                <div
                  style={{ width: `${(breakdown.totals.focus / breakdown.totalTrackedMinutes) * 100}%` }}
                  className="bg-indigo-500 hover:opacity-90 transition-all"
                  title={`Focus: ${formatDuration(breakdown.totals.focus)}`}
                />
              )}
              {breakdown.offlineAndNature > 0 && (
                <div
                  style={{ width: `${(breakdown.offlineAndNature / breakdown.totalTrackedMinutes) * 100}%` }}
                  className="bg-emerald-500 hover:opacity-90 transition-all"
                  title={`Offline/Nature: ${formatDuration(breakdown.offlineAndNature)}`}
                />
              )}
              {breakdown.totals.meal > 0 && (
                <div
                  style={{ width: `${(breakdown.totals.meal / breakdown.totalTrackedMinutes) * 100}%` }}
                  className="bg-orange-400 hover:opacity-90 transition-all"
                  title={`Meals: ${formatDuration(breakdown.totals.meal)}`}
                />
              )}
              {breakdown.totals.exercise > 0 && (
                <div
                  style={{ width: `${(breakdown.totals.exercise / breakdown.totalTrackedMinutes) * 100}%` }}
                  className="bg-amber-400 hover:opacity-90 transition-all"
                  title={`Movement: ${formatDuration(breakdown.totals.exercise)}`}
                />
              )}
              {breakdown.totals.break > 0 && (
                <div
                  style={{ width: `${(breakdown.totals.break / breakdown.totalTrackedMinutes) * 100}%` }}
                  className="bg-sky-400 hover:opacity-90 transition-all"
                  title={`Breaks: ${formatDuration(breakdown.totals.break)}`}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Filter Chips Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        <Filter className="w-3.5 h-3.5 text-slate-400 mr-1 shrink-0" />
        {[
          { id: 'all', label: 'All Activities' },
          { id: 'focus', label: 'Focus Sessions' },
          { id: 'offline', label: 'Offline & Nature' },
          { id: 'rest', label: 'Rest & Sleep' },
          { id: 'nourish', label: 'Meals & Movement' },
        ].map((filt) => (
          <button
            key={filt.id}
            onClick={() => setSelectedFilter(filt.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
              selectedFilter === filt.id
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 hover:bg-slate-50'
            }`}
          >
            {filt.label}
          </button>
        ))}
      </div>

      {/* Chronological Timeline Stream */}
      <div className="space-y-4">
        {filteredEntries.length === 0 ? (
          <div className="text-center py-14 px-6 bg-white dark:bg-slate-800/60 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                No activities logged for this day yet
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
                Whether it is a 20-minute focus session, a walk outside, or a restful nap—every intentional moment counts.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={onNavigateToTimer}
                className="px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-semibold shadow-xs hover:bg-amber-500 transition-colors"
              >
                Start Focus Session
              </button>
              <button
                onClick={onNavigateToLog}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold hover:bg-slate-200 transition-colors"
              >
                Log Sleep or Offline Activity
              </button>
            </div>
          </div>
        ) : (
          <div className="relative pl-6 sm:pl-8 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700 space-y-4">
            {filteredEntries.map((entry) => {
              const meta = getCategoryMetadata(entry.category);
              return (
                <div
                  key={entry.id}
                  className="relative group bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 p-4 sm:p-5 shadow-xs hover:border-slate-300 dark:hover:border-slate-600 transition-all"
                >
                  {/* Timeline Node on the vertical axis */}
                  <div
                    className={`absolute -left-[1.85rem] sm:-left-[2.1rem] top-5 w-6 h-6 rounded-full border-2 border-white dark:border-slate-900 ${meta.badgeBg} flex items-center justify-center text-white shadow-xs`}
                  >
                    <span className="w-2 h-2 rounded-full bg-white" />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1">
                      {/* Category Badge & Times */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${meta.bgClass}`}
                        >
                          {getCategoryIcon(meta.icon)}
                          {meta.label}
                        </span>

                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 font-mono">
                          {formatTimeDisplay(entry.startTime)} – {formatTimeDisplay(entry.endTime)}
                        </span>

                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300">
                          {formatDuration(entry.durationMinutes)}
                        </span>

                        {entry.isFocusSession && (
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded">
                            Focus Session
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h4 className="text-base font-bold text-slate-900 dark:text-white">
                        {entry.title}
                      </h4>
                      <span className={`inline-flex mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        entry.source === 'demo'
                          ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300'
                          : entry.source === 'tracked'
                          ? 'bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-300'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}>
                        {entry.source === 'demo' ? 'Legacy demo data' : entry.source === 'tracked' ? 'Android tracked' : 'Manually logged'}
                      </span>

                      {/* Notes / Reflection */}
                      {entry.notes && (
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                          {entry.notes}
                        </p>
                      )}

                      {/* Mood Tag */}
                      {entry.moodAfter && (
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                          <Smile className="w-3.5 h-3.5 text-amber-500" />
                          <span>Felt after: <strong className="capitalize text-slate-700 dark:text-slate-300">{entry.moodAfter}</strong></span>
                        </div>
                      )}
                    </div>

                    {/* Actions: Delete with confirmation */}
                    <div className="shrink-0 flex items-center gap-2 self-end sm:self-start">
                      {confirmDeleteId === entry.id ? (
                        <div className="flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/60 p-1.5 rounded-xl border border-rose-200 dark:border-rose-900">
                          <span className="text-[11px] text-rose-700 dark:text-rose-300 font-medium px-1">Delete?</span>
                          <button
                            onClick={() => {
                              onDeleteEntry(entry.id);
                              setConfirmDeleteId(null);
                            }}
                            className="px-2 py-1 rounded bg-rose-600 text-white text-[11px] font-semibold hover:bg-rose-700"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px]"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(entry.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors opacity-70 group-hover:opacity-100"
                          title="Delete this entry"
                          aria-label={`Delete ${entry.title}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
