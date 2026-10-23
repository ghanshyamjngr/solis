import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  TrendingUp,
  Clock,
  Heart,
  Compass,
  Moon,
  Coffee,
  Activity,
  Trees,
  Utensils,
  BookOpen,
  CircleDot,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { ActivityCategory, ActivityEntry, AiDailyReflection, DailyDeviceUsage, PlannedTask, UserPreferences } from '../types';
import { calculateDetailedInsights, formatDuration } from '../utils/timeline';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '') ?? '';

interface DailyInsightsProps {
  entries: ActivityEntry[];
  tasks: PlannedTask[];
  deviceUsage: DailyDeviceUsage | null;
  usageTrackingEnabled: boolean;
  usageStatus: string;
  selectedDate: string;
  preferences: UserPreferences;
  onStartFocus?: () => void;
  onLogOffline?: () => void;
}

export const DailyInsights: React.FC<DailyInsightsProps> = ({
  entries,
  tasks,
  deviceUsage,
  usageTrackingEnabled,
  usageStatus,
  selectedDate,
  preferences,
  onStartFocus,
  onLogOffline,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [aiInsight, setAiInsight] = useState<AiDailyReflection | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState<boolean>(false);

  const dayEntries = entries.filter((e) => e.date === selectedDate);
  const firstContextDate = new Date(`${selectedDate}T12:00:00`);
  firstContextDate.setDate(firstContextDate.getDate() - 3);
  const contextStartDate = `${firstContextDate.getFullYear()}-${String(firstContextDate.getMonth() + 1).padStart(2, '0')}-${String(firstContextDate.getDate()).padStart(2, '0')}`;
  const contextEntries = entries.filter((entry) => entry.date >= contextStartDate && entry.date <= selectedDate);
  const contextDates = Array.from({ length: 4 }, (_, index) => {
    const date = new Date(`${contextStartDate}T12:00:00`);
    date.setDate(date.getDate() + index);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  });
  const contextTasks = tasks.flatMap((task) => contextDates
    .filter((date) => {
      if (date < task.date) return false;
      if (task.repeat === 'daily') return true;
      if (task.repeat === 'weekly') return new Date(`${task.date}T12:00:00`).getDay() === new Date(`${date}T12:00:00`).getDay();
      return task.date === date;
    })
    .map((date) => ({
      title: task.title,
      date,
      repeat: task.repeat,
      completed: task.completedDates.includes(date),
    })));
  const contextSignature = JSON.stringify({
    activities: contextEntries.map(({ date, category, title, durationMinutes, notes }) => ({ date, category, title, durationMinutes, notes })),
    tasks: contextTasks,
  });
  const stats = calculateDetailedInsights(
    dayEntries,
    preferences.dailyFocusGoalMinutes,
    preferences.dailyOfflineGoalMinutes
  );
  const recentStats = calculateDetailedInsights(
    contextEntries,
    preferences.dailyFocusGoalMinutes,
    preferences.dailyOfflineGoalMinutes
  );

  // Generate fallback local reflection when offline or no API key
  const generateLocalReflection = (): AiDailyReflection => {
    let summary = '';
    let encouragement = '';
    let gentleNudge = '';

    if (stats.totalFocusMinutes > 0 && stats.totalOfflineMinutes > 0) {
      summary = `A beautifully balanced day with ${formatDuration(stats.totalFocusMinutes)} of intentional focus and ${formatDuration(stats.totalOfflineMinutes)} of screen-free offline living.`;
      encouragement = 'You are honoring both attention and recovery. That balance is the foundation of lasting clarity.';
      gentleNudge = stats.totalRestAndSleepMinutes < 360 ? 'Consider winding down early tonight with tea or reading.' : 'Great job taking care of your rest.';
    } else if (stats.totalFocusMinutes > 0) {
      summary = `Dedicated ${formatDuration(stats.totalFocusMinutes)} to focused sessions across ${stats.focusSessionCount} session${stats.focusSessionCount > 1 ? 's' : ''}.`;
      encouragement = 'Every return to your chosen intention builds attention like a muscle. Strong momentum today.';
      gentleNudge = 'Remember that offline pauses and hydration count toward a meaningful day too.';
    } else if (stats.totalOfflineMinutes > 0) {
      summary = `Deep offline restoration today with ${formatDuration(stats.totalOfflineMinutes)} lived away from screens.`;
      encouragement = 'Your life is bigger than your devices. Offline hours replenish the creative mind.';
      gentleNudge = 'Ready for a quiet 20-minute focus block whenever you feel inspired.';
    } else if (contextEntries.length > 0 || contextTasks.length > 0) {
      const completedTasks = contextTasks.filter((task) => task.completed).length;
      summary = contextEntries.length > 0
        ? `Across the recent days, you logged ${formatDuration(recentStats.totalFocusMinutes)} of focus and ${formatDuration(recentStats.totalOfflineMinutes)} of offline activity. There is no activity log for ${selectedDate} yet.`
        : `You planned ${contextTasks.length} task occurrence${contextTasks.length === 1 ? '' : 's'} across the recent days; ${completedTasks} ${completedTasks === 1 ? 'has' : 'have'} a completion check-in.`;
      encouragement = contextTasks.length > 0
        ? `You marked ${completedTasks} of ${contextTasks.length} planned task${contextTasks.length === 1 ? '' : 's'} complete. An open task is information, not a judgment.`
        : 'Your recent logs give you a useful starting point. Pick one manageable next step for today.';
      const openTask = contextTasks.find((task) => task.date === selectedDate && !task.completed);
      gentleNudge = openTask
        ? `“${openTask.title}” is still open. If it still matters, make room for it; otherwise adjust your plan.`
        : 'Choose one small action that fits your energy today.';
    } else {
      summary = 'Your day is open and unhurried.';
      encouragement = 'No pressure to perform. Start with a gentle 15-minute focus session or an outdoor walk.';
      gentleNudge = 'Start with one mindful choice today.';
    }

    return {
      summary,
      encouragement,
      observedFacts: dayEntries.length > 0 ? stats.observedFacts : recentStats.observedFacts,
      gentleNudge,
      harmonyScore: stats.harmonyScore,
      generatedAt: Date.now(),
      source: 'local-engine',
    };
  };

  const fetchAiInsights = async () => {
    if (contextEntries.length === 0 && contextTasks.length === 0) {
      setAiInsight(null);
      return;
    }

    if (!preferences.aiDataSharingConsent) {
      setAiInsight(generateLocalReflection());
      return;
    }

    setIsLoadingAi(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/ai-insights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activities: contextEntries.map(({ date, category, title, durationMinutes, notes }) => ({
            date,
            category,
            title,
            durationMinutes,
            notes,
          })),
          tasks: contextTasks,
          preferences: { encouragementTone: preferences.encouragementTone },
          selectedDate,
          contextDays: 4,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.available && data.insight) {
          setAiInsight(data.insight);
          setIsLoadingAi(false);
          return;
        }
      }
    } catch {
      // Graceful local fallback
    }

    // Fallback to local intelligent engine
    setAiInsight(generateLocalReflection());
    setIsLoadingAi(false);
  };

  useEffect(() => {
    fetchAiInsights();
  }, [selectedDate, contextSignature, preferences.aiDataSharingConsent]);

  const getCategoryIcon = (cat: ActivityCategory) => {
    switch (cat) {
      case 'focus':
        return <Sparkles className="w-3.5 h-3.5 text-indigo-500" />;
      case 'sleep':
        return <Moon className="w-3.5 h-3.5 text-purple-500" />;
      case 'offline':
        return <Compass className="w-3.5 h-3.5 text-emerald-500" />;
      case 'nature':
        return <Trees className="w-3.5 h-3.5 text-teal-500" />;
      case 'exercise':
        return <Activity className="w-3.5 h-3.5 text-amber-500" />;
      case 'meal':
        return <Utensils className="w-3.5 h-3.5 text-orange-500" />;
      case 'break':
        return <Coffee className="w-3.5 h-3.5 text-sky-500" />;
      case 'reading':
        return <BookOpen className="w-3.5 h-3.5 text-cyan-500" />;
      default:
        return <CircleDot className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/90 dark:border-slate-700/80 p-5 sm:p-6 shadow-xs transition-all space-y-5">
      {/* Header Bar with Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Daily Insights & Activity Breakdown
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                {formatDuration(stats.totalTrackedMinutes)} Logged
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Clear, encouraging overview of focus depth and whole-life activity types.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAiInsights}
            disabled={isLoadingAi || dayEntries.length === 0}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            title={dayEntries.length === 0 ? 'Log real activity to see insights' : 'Refresh AI Insights'}
            aria-label="Refresh AI Insights"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingAi ? 'animate-spin text-amber-500' : ''}`} />
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            aria-label={isExpanded ? 'Collapse Insights' : 'Expand Insights'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && dayEntries.length === 0 && (
        <p className="rounded-xl bg-slate-50 dark:bg-slate-900/60 p-4 text-sm text-slate-600 dark:text-slate-300">
          No manual activity has been logged for this day yet. Android app usage, if enabled, is shown separately below.
        </p>
      )}

      {isExpanded && (
        <div className="space-y-6 pt-1 animate-in fade-in duration-200">
          <section className="rounded-2xl border border-sky-200 dark:border-sky-900/60 bg-sky-50/60 dark:bg-sky-950/20 p-4 space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Android app usage · Tracked separately</h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  UsageStats reports foreground app time; screen-on events are not touch-level interaction.
                </p>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                {deviceUsage
                  ? `Last sync ${new Date(deviceUsage.syncedAt).toLocaleString()}${usageTrackingEnabled ? '' : ' · tracking off'}`
                  : usageTrackingEnabled ? 'Not synced yet' : 'Tracking off'}
              </span>
            </div>

            {!usageTrackingEnabled ? (
              <p className="text-xs text-slate-600 dark:text-slate-300">Tracking is off. Turn it on in Settings and grant Android Usage Access to see real device usage. Manual logs above are not device-tracked.</p>
            ) : !deviceUsage ? (
              <p className="text-xs text-slate-600 dark:text-slate-300">{usageStatus} App usage is read after Solis opens or returns to the foreground.</p>
            ) : (
              <>
                <p className="text-[11px] text-slate-600 dark:text-slate-300" role="status">{usageStatus}</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-white/80 dark:bg-slate-900/60 p-3">
                    <span className="block text-[10px] text-slate-500 dark:text-slate-400">Screen-on time</span>
                    <strong className="text-sm text-slate-900 dark:text-white">{formatDuration(Math.round(deviceUsage.screen.screenOnDurationMs / 60000))}</strong>
                    <span className="block text-[10px] text-slate-500 dark:text-slate-400">Across {deviceUsage.screen.screenOnSessionCount} screen-on sessions · {deviceUsage.screen.unlockCount} unlocks</span>
                  </div>
                  <div className="rounded-xl bg-white/80 dark:bg-slate-900/60 p-3">
                    <span className="block text-[10px] text-slate-500 dark:text-slate-400">Foreground app time</span>
                    <strong className="text-sm text-slate-900 dark:text-white">{formatDuration(Math.round(deviceUsage.apps.reduce((sum, app) => sum + app.totalTimeInForegroundMs, 0) / 60000))}</strong>
                    <span className="block text-[10px] text-slate-500 dark:text-slate-400">{deviceUsage.apps.length} apps reported by Android</span>
                  </div>
                </div>
                {deviceUsage.apps.length === 0 ? (
                  <p className="text-xs text-slate-600 dark:text-slate-300">Android returned no per-app usage for this date. This can happen when there is no recorded activity or the device has not populated the usage report yet.</p>
                ) : (
                  <ul className="divide-y divide-sky-100 dark:divide-slate-700">
                    {[...deviceUsage.apps]
                      .sort((a, b) => b.totalTimeInForegroundMs - a.totalTimeInForegroundMs)
                      .slice(0, 6)
                      .map((app) => (
                        <li key={app.packageName} className="flex items-center justify-between gap-3 py-2 text-xs">
                          <span className="min-w-0 truncate font-medium text-slate-800 dark:text-slate-200">{app.appName}</span>
                          <span className="shrink-0 text-right text-slate-600 dark:text-slate-300">
                            <strong className="block font-mono">{formatDuration(Math.round(app.totalTimeInForegroundMs / 60000))}</strong>
                            <span className="text-[10px]">{app.launchCount} opens · last used {new Date(app.lastUsedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </span>
                        </li>
                      ))}
                  </ul>
                )}
                <p className="text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">
                  Android reports app usage, not visited websites. Website-level tracking needs a separate browser-specific extension/integration; Solis cannot infer sites from browser usage.
                </p>
              </>
            )}
          </section>

          {dayEntries.length > 0 && <>
          {/* Key Metric Highlights: Focus Time vs Offline vs Harmony */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Total Focus Time Card */}
            <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/60 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Total Focus Time
                </span>
                <span>{stats.focusGoalProgress}% of goal</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
                  {formatDuration(stats.totalFocusMinutes)}
                </span>
                <span className="text-xs text-slate-400">
                  / {formatDuration(preferences.dailyFocusGoalMinutes)}
                </span>
              </div>
              {/* Progress bar */}
              <div className="w-full h-1.5 bg-indigo-100 dark:bg-indigo-950 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, stats.focusGoalProgress)}%` }}
                />
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-0.5">
                <span>{stats.focusSessionCount} session{stats.focusSessionCount === 1 ? '' : 's'}</span>
                {stats.longestFocusSessionMinutes > 0 && (
                  <span>Longest: {formatDuration(stats.longestFocusSessionMinutes)}</span>
                )}
              </div>
            </div>

            {/* Offline & Nature Time Card */}
            <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/60 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                <span className="flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5" />
                  Offline & Nature
                </span>
                <span>{stats.offlineGoalProgress}% of goal</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
                  {formatDuration(stats.totalOfflineMinutes)}
                </span>
                <span className="text-xs text-slate-400">
                  / {formatDuration(preferences.dailyOfflineGoalMinutes)}
                </span>
              </div>
              <div className="w-full h-1.5 bg-emerald-100 dark:bg-emerald-950 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, stats.offlineGoalProgress)}%` }}
                />
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-0.5">
                <span>Disconnected living</span>
                <span>Restores attention</span>
              </div>
            </div>

            {/* Harmony Score Card */}
            <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/60 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-amber-800 dark:text-amber-300">
                <span className="flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-rose-500" />
                  Day Harmony Score
                </span>
                <span>{stats.harmonyScore}/100</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
                  {stats.harmonyScore >= 80 ? 'Balanced' : stats.harmonyScore >= 60 ? 'Steady' : 'Gentle'}
                </span>
                <span className="text-xs text-slate-400">Life Blend</span>
              </div>
              <div className="w-full h-1.5 bg-amber-100 dark:bg-amber-950 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-emerald-500 transition-all duration-500"
                  style={{ width: `${stats.harmonyScore}%` }}
                />
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-0.5">
                <span>Focus: {stats.lifeBalanceRatio.focusPct}%</span>
                <span>Offline: {stats.lifeBalanceRatio.offlinePct}%</span>
                <span>Rest: {stats.lifeBalanceRatio.restPct}%</span>
              </div>
            </div>
          </div>

          {/* Breakdown of Activity Types */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
                Activity Type Breakdown
              </span>
              <span className="text-slate-400">{stats.categoryBreakdown.length} active categories</span>
            </div>

            {stats.categoryBreakdown.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No activities logged yet for this day.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {stats.categoryBreakdown.map((item) => (
                  <div
                    key={item.category}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-700/60 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-1.5 rounded-xl bg-white dark:bg-slate-800 shadow-2xs shrink-0">
                        {getCategoryIcon(item.category)}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-slate-900 dark:text-white block truncate">
                          {item.label}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          {item.count} log{item.count === 1 ? '' : 's'} • {item.percentage}% of day
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-slate-900 dark:text-white font-mono">
                        {item.formatted}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Mindful AI Reflection Card */}
          {aiInsight && (
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-50/70 via-sky-50/40 to-emerald-50/50 dark:from-slate-900/90 dark:to-slate-900/60 border border-amber-200/70 dark:border-slate-700 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Mindful Behavioral Reflection
                  <span className="text-[10px] font-normal text-slate-400 ml-1">
                    ({aiInsight.source === 'gemini' ? 'Gemini 3.8 Flash' : 'On-Device Intelligence'})
                  </span>
                </span>
                <span className="text-[10px] text-slate-400">
                  {new Date(aiInsight.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                {aiInsight.summary}
              </p>

              <p className="text-xs text-slate-600 dark:text-slate-400 italic">
                "{aiInsight.encouragement}"
              </p>

              {aiInsight.gentleNudge && (
                <div className="flex items-start gap-2 pt-1 text-xs text-amber-900 dark:text-amber-200 bg-amber-100/60 dark:bg-amber-950/40 p-2.5 rounded-xl border border-amber-200/50 dark:border-amber-900/50">
                  <Lightbulb className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>{aiInsight.gentleNudge}</span>
                </div>
              )}
            </div>
          )}
          </>}
        </div>
      )}
    </div>
  );
};
