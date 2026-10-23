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
  Check,
  Pencil,
  ThumbsDown,
  X,
} from 'lucide-react';
import { ActivityCategory, ActivityEntry, AiDailyReflection, DailyDeviceUsage, PlannedTask, StatsGraphStyle, UserPreferences } from '../types';
import { calculateDetailedInsights, formatDuration } from '../utils/timeline';
import { loadRecentStoredDeviceUsage } from '../utils/storage';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '') ?? '';
type SuggestionResponse = {
  date: string;
  action: 'accepted' | 'dismissed' | 'not-useful' | 'edited';
  editedSummary?: string;
};

interface UsageChartDatum {
  label: string;
  value: number;
  color?: string;
}

const usageChartColors = [
  'var(--solis-accent-action)',
  '#789384',
  '#7895A8',
  '#9B88A8',
  '#C58B78',
  '#9A9CA8',
];

const UsageChart: React.FC<{
  data: UsageChartDatum[];
  style: StatsGraphStyle;
  label: string;
}> = ({ data, style, label }) => {
  const chartData = data.slice(0, 7);
  const donutData = chartData.filter((item) => item.value > 0);
  const maxValue = Math.max(1, ...chartData.map((item) => item.value));
  const accessibleSummary = chartData.map((item) => `${item.label}: ${formatDuration(item.value)}`).join(', ');
  if (!chartData.some((item) => item.value > 0)) return <p className="text-xs text-slate-500 dark:text-slate-400">No usage data to chart yet.</p>;

  return (
    <div role="img" aria-label={`${label}. ${accessibleSummary}`} data-no-tab-swipe="true" className="space-y-2">
      {style === 'bar' && chartData.map((item, index) => (
        <div key={item.label} className="grid grid-cols-[minmax(4rem,auto)_1fr_auto] items-center gap-2 text-[10px]">
          <span className="max-w-24 truncate text-slate-600 dark:text-slate-300">{item.label}</span>
          <span className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
            <span
              className="block h-full rounded-full"
              style={{ width: `${item.value > 0 ? Math.max(2, (item.value / maxValue) * 100) : 0}%`, backgroundColor: item.color ?? 'var(--solis-chart-accent)' }}
            />
          </span>
          <span className="font-mono text-slate-600 dark:text-slate-300">{formatDuration(item.value)}</span>
        </div>
      ))}
      {style === 'line' && (
        <div className="min-w-0">
          <svg viewBox="0 0 240 88" className="h-28 w-full overflow-visible" preserveAspectRatio="none" aria-hidden="true">
            <path d="M8 76H232 M8 44H232 M8 12H232" stroke="currentColor" className="text-slate-200 dark:text-slate-700" strokeDasharray="3 4" />
            <polyline
              points={chartData.map((item, index) => {
                const x = chartData.length === 1 ? 120 : 10 + (index * 220) / (chartData.length - 1);
                const y = 76 - (item.value / maxValue) * 62;
                return `${x},${y}`;
              }).join(' ')}
              fill="none"
              stroke="var(--solis-chart-accent)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {chartData.map((item, index) => {
              const x = chartData.length === 1 ? 120 : 10 + (index * 220) / (chartData.length - 1);
              const y = 76 - (item.value / maxValue) * 62;
              return <circle key={item.label} cx={x} cy={y} r="3" fill="var(--solis-chart-accent)" />;
            })}
          </svg>
          <div className="grid grid-cols-7 gap-1 text-center text-[9px] text-slate-500 dark:text-slate-400">
            {chartData.map((item) => <span key={item.label} className="truncate">{item.label}</span>)}
          </div>
        </div>
      )}
      {style === 'donut' && (
        <div className="flex flex-wrap items-center gap-4">
          <svg viewBox="0 0 44 44" className="h-24 w-24 shrink-0 -rotate-90" aria-hidden="true">
            <circle cx="22" cy="22" r="16" fill="none" stroke="currentColor" className="text-slate-100 dark:text-slate-700" strokeWidth="8" />
            {(() => {
              const circumference = 2 * Math.PI * 16;
              let offset = 0;
              return donutData.map((item, index) => {
                const length = (item.value / donutData.reduce((sum, datum) => sum + datum.value, 0)) * circumference;
                const circle = (
                  <circle
                    key={item.label}
                    cx="22"
                    cy="22"
                    r="16"
                    fill="none"
                    stroke={item.color ?? usageChartColors[index % usageChartColors.length]}
                    strokeWidth="8"
                    strokeDasharray={`${length} ${circumference - length}`}
                    strokeDashoffset={-offset}
                  />
                );
                offset += length;
                return circle;
              });
            })()}
          </svg>
          <ul className="min-w-32 flex-1 space-y-1.5 text-[10px]">
            {donutData.map((item, index) => (
              <li key={item.label} className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <i className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: item.color ?? usageChartColors[index % usageChartColors.length] }} />
                  <span className="truncate">{item.label}</span>
                </span>
                <strong className="shrink-0 font-mono text-slate-700 dark:text-slate-200">{formatDuration(item.value)}</strong>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

function loadRecentSuggestionFeedback(endDate: string): Array<{ date: string; action: SuggestionResponse['action'] }> {
  if (typeof window === 'undefined') return [];
  const [year, month, day] = endDate.split('-').map(Number);
  const cursor = new Date(year, month - 1, day);
  const result: Array<{ date: string; action: SuggestionResponse['action'] }> = [];
  for (let offset = 3; offset >= 1; offset -= 1) {
    const date = new Date(cursor);
    date.setDate(date.getDate() - offset);
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    try {
      const raw = localStorage.getItem(`solis_suggestion_response_${dateKey}`);
      if (!raw) continue;
      const saved = JSON.parse(raw) as SuggestionResponse;
      if (['accepted', 'dismissed', 'not-useful', 'edited'].includes(saved.action)) {
        result.push({ date: dateKey, action: saved.action });
      }
    } catch (error) {
      console.error(`Could not load suggestion feedback for ${dateKey}`, error);
    }
  }
  return result;
}

interface DailyInsightsProps {
  entries: ActivityEntry[];
  tasks: PlannedTask[];
  deviceUsage: DailyDeviceUsage | null;
  usageTrackingEnabled: boolean;
  usageStatus: string;
  isUsageRefreshing: boolean;
  onRefreshUsage: () => void;
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
  isUsageRefreshing,
  onRefreshUsage,
  selectedDate,
  preferences,
  onStartFocus,
  onLogOffline,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [showSystemApps, setShowSystemApps] = useState(false);
  const [aiInsight, setAiInsight] = useState<AiDailyReflection | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState<boolean>(false);
  const [aiStatus, setAiStatus] = useState('Personalized suggestions are optional.');
  const [suggestionResponse, setSuggestionResponse] = useState<SuggestionResponse | null>(null);
  const [isEditingSuggestion, setIsEditingSuggestion] = useState(false);
  const [editedSummary, setEditedSummary] = useState('');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`solis_suggestion_response_${selectedDate}`);
      setSuggestionResponse(saved ? JSON.parse(saved) as SuggestionResponse : null);
      setIsEditingSuggestion(false);
    } catch (error) {
      console.error('Could not load saved suggestion response', error);
      setSuggestionResponse(null);
    }
  }, [selectedDate]);

  const recordSuggestionResponse = (response: SuggestionResponse) => {
    try {
      localStorage.setItem(`solis_suggestion_response_${selectedDate}`, JSON.stringify(response));
      setSuggestionResponse(response);
      setIsEditingSuggestion(false);
      setAiStatus(response.action === 'accepted'
        ? 'Suggestion accepted and saved on this device.'
        : response.action === 'edited'
          ? 'Your edited suggestion is saved on this device.'
          : response.action === 'not-useful'
            ? 'Feedback saved; this suggestion is hidden.'
            : 'Suggestion dismissed and saved on this device.');
    } catch (error) {
      console.error('Could not save suggestion response', error);
      setAiStatus('Could not save your suggestion response on this device.');
    }
  };

  const dayEntries = entries.filter((e) => e.date === selectedDate);
  const recentDeviceUsage = loadRecentStoredDeviceUsage(selectedDate, 7);
  const latestDeviceSync = [...recentDeviceUsage].sort((a, b) => b.syncedAt - a.syncedAt)[0];
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
  const usageSummary = preferences.aiUsageDataSharingConsent
    ? recentDeviceUsage.slice(-4).map((snapshot) => ({
        date: snapshot.date,
        screenOnMinutes: Math.round(snapshot.screen.screenOnDurationMs / 60000),
        foregroundAppMinutes: Math.round(snapshot.apps.reduce((total, app) => total + app.totalTimeInForegroundMs, 0) / 60000),
      }))
    : [];
  const recentSuggestionFeedback = preferences.aiDataSharingConsent
    ? loadRecentSuggestionFeedback(selectedDate)
    : [];
  const contextSignature = JSON.stringify({
    activities: contextEntries.map(({ date, category, durationMinutes }) => ({ date, category, durationMinutes })),
    tasks: contextTasks,
    usageSummary,
    recentSuggestionFeedback,
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

    if (preferences.personalGoals.trim()) {
      gentleNudge = `If it feels right, take one small step toward your goal: ${preferences.personalGoals.trim()}.`;
    } else if (preferences.dailyRoutine.trim()) {
      gentleNudge = `A gentle option that fits your routine: ${preferences.dailyRoutine.trim()}.`;
    }
    if (preferences.profileName.trim()) {
      summary = `${preferences.profileName.trim()}, ${summary.charAt(0).toLowerCase()}${summary.slice(1)}`;
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
    const hasProfileContext = Boolean(preferences.personalGoals.trim() || preferences.dailyRoutine.trim());
    if (contextEntries.length === 0 && contextTasks.length === 0 && usageSummary.length === 0 && !hasProfileContext) {
      setAiInsight(null);
      setAiStatus('No recent synced or logged data is available for a suggestion.');
      return;
    }

    if ((!preferences.aiDataSharingConsent && !preferences.aiUsageDataSharingConsent)
      || (contextEntries.length === 0 && contextTasks.length === 0 && usageSummary.length === 0)) {
      setAiInsight(generateLocalReflection());
      setAiStatus('Local suggestion; no activity or device usage was sent to Gemini.');
      return;
    }

    setIsLoadingAi(true);
    setAiStatus(preferences.aiUsageDataSharingConsent
      ? 'Preparing only the categories you explicitly enabled for sharing…'
      : 'Preparing recent activity and task context…');
    try {
      const res = await fetch(`${apiBaseUrl}/api/ai-insights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activities: preferences.aiDataSharingConsent
            ? contextEntries.map(({ date, category, durationMinutes }) => ({ date, category, durationMinutes }))
            : [],
          tasks: preferences.aiDataSharingConsent ? contextTasks : [],
          deviceUsageSummary: preferences.aiUsageDataSharingConsent ? usageSummary : [],
          suggestionFeedback: preferences.aiDataSharingConsent ? recentSuggestionFeedback : [],
          preferences: { encouragementTone: preferences.encouragementTone },
          selectedDate,
          contextDays: 4,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.available && data.insight) {
          const insight = { ...data.insight };
          if (preferences.personalGoals.trim()) {
            insight.gentleNudge = `If it feels right, take one small step toward your goal: ${preferences.personalGoals.trim()}.`;
          } else if (preferences.dailyRoutine.trim()) {
            insight.gentleNudge = `A gentle option that fits your routine: ${preferences.dailyRoutine.trim()}.`;
          }
          if (preferences.profileName.trim()) {
            insight.summary = `${preferences.profileName.trim()}, ${insight.summary.charAt(0).toLowerCase()}${insight.summary.slice(1)}`;
          }
          setAiInsight(insight);
          setAiStatus('Gemini suggestion based on the sharing options you enabled. Tracked facts remain separate.');
          setIsLoadingAi(false);
          return;
        }
        setAiStatus(data.reason || data.error || 'Gemini is currently unavailable.');
      }
      else setAiStatus('Gemini server is unavailable; a local reflection is shown instead.');
    } catch {
      setAiStatus('Gemini server could not be reached; a local reflection is shown instead.');
    }

    setAiInsight(generateLocalReflection());
    setIsLoadingAi(false);
  };

  useEffect(() => {
    fetchAiInsights();
  }, [
    selectedDate,
    contextSignature,
    preferences.aiDataSharingConsent,
    preferences.aiUsageDataSharingConsent,
    preferences.encouragementTone,
    preferences.profileName,
    preferences.personalGoals,
    preferences.dailyRoutine,
  ]);

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
                {formatDuration(stats.totalTrackedMinutes)} manually logged
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
            disabled={isLoadingAi || (contextEntries.length === 0 && contextTasks.length === 0 && usageSummary.length === 0)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            title={contextEntries.length === 0 && contextTasks.length === 0 && usageSummary.length === 0 ? 'Sync usage or add a real task or activity first' : 'Refresh Awake suggestion'}
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
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  {deviceUsage
                    ? `Last sync ${new Date(deviceUsage.syncedAt).toLocaleString()}${usageTrackingEnabled ? '' : ' · tracking off'}`
                    : latestDeviceSync
                      ? `Last successful sync ${latestDeviceSync.date} · ${new Date(latestDeviceSync.syncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · selected day not synced`
                      : usageTrackingEnabled ? 'Not synced yet' : 'Tracking off'}
                </span>
                <button
                  type="button"
                  onClick={onRefreshUsage}
                  disabled={isUsageRefreshing}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 dark:border-sky-800 px-2.5 py-1.5 text-[11px] font-semibold text-sky-800 dark:text-sky-200 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Refresh Android app usage"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isUsageRefreshing ? 'animate-spin' : ''}`} />
                  {isUsageRefreshing ? 'Refreshing' : 'Refresh'}
                </button>
              </div>
            </div>

            {!usageTrackingEnabled ? (
              <p className="text-xs text-slate-600 dark:text-slate-300" role="status">
                {usageStatus} Turn on Android app-usage tracking in Settings, then grant Awake Usage Access in Android Settings. Refresh does not change this setting. Manual logs above remain separate.
              </p>
            ) : !deviceUsage ? (
              <p className="text-xs text-slate-600 dark:text-slate-300" role="status">
                {usageStatus} {isUsageRefreshing ? 'Refreshing selected day…' : 'After enabling tracking and Usage Access, refresh here or pull down at the top of Today. Awake also syncs on return to the foreground.'}
              </p>
            ) : (
              <>
                <p className="text-[11px] text-slate-600 dark:text-slate-300" role="status">{isUsageRefreshing ? 'Refreshing Android usage…' : usageStatus} · Pull down to refresh</p>
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
                  <>
                  <div className="rounded-xl bg-white/70 p-3 dark:bg-slate-900/40">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <h5 className="text-xs font-semibold text-slate-800 dark:text-slate-200">Top apps · foreground time</h5>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">{preferences.statsGraphStyle} chart</span>
                    </div>
                    <UsageChart
                      style={preferences.statsGraphStyle}
                      label="Top apps by foreground time"
                      data={[...deviceUsage.apps]
                        .filter((app) => showSystemApps || !app.isSystemApp)
                        .sort((a, b) => b.totalTimeInForegroundMs - a.totalTimeInForegroundMs)
                        .slice(0, 6)
                        .map((app, index) => ({
                          label: app.appName && app.appName !== app.packageName ? app.appName : 'Unknown app',
                          value: Math.round(app.totalTimeInForegroundMs / 60000),
                          color: usageChartColors[index % usageChartColors.length],
                        }))}
                    />
                  </div>
                  <ul className="divide-y divide-sky-100 dark:divide-slate-700">
                    {[...deviceUsage.apps]
                      .filter((app) => showSystemApps || !app.isSystemApp)
                      .sort((a, b) => b.totalTimeInForegroundMs - a.totalTimeInForegroundMs)
                      .map((app) => (
                        <li key={app.packageName} data-no-tab-swipe="true" className="flex items-center justify-between gap-3 py-2 text-xs">
                          <span className="flex min-w-0 flex-1 items-center gap-2">
                            {app.appIconDataUrl ? <img src={app.appIconDataUrl} alt="" className="h-8 w-8 shrink-0 rounded-lg object-contain" /> : (
                              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-sky-100 text-[10px] font-bold text-sky-800 dark:bg-slate-700 dark:text-sky-200" aria-hidden="true">
                                {(app.appName || app.packageName).slice(0, 1).toUpperCase()}
                              </span>
                            )}
                            <span className="min-w-0 flex-1">
                              <strong className="block truncate font-medium text-slate-800 dark:text-slate-200">
                                {app.appName && app.appName !== app.packageName ? app.appName : 'Unknown app'}
                              </strong>
                              {(!app.appName || app.appName === app.packageName || app.appName === 'Unknown app') && <span className="block truncate text-[10px] text-slate-500">{app.packageName}</span>}
                              <span data-no-tab-swipe="true" className="mt-1 block h-1.5 overflow-hidden rounded-full bg-sky-100 dark:bg-slate-700" role="progressbar" aria-label={`${app.appName || 'Unknown app'} foreground share`}>
                                <span
                                  className="block h-full rounded-full"
                                  style={{ backgroundColor: 'var(--solis-chart-accent)', width: `${Math.max(2, Math.round((app.totalTimeInForegroundMs / Math.max(1, ...deviceUsage.apps.map((item) => item.totalTimeInForegroundMs))) * 100))}%` }}
                                />
                              </span>
                            </span>
                          </span>
                          <span className="shrink-0 text-right text-slate-600 dark:text-slate-300">
                            <strong className="block font-mono">{formatDuration(Math.round(app.totalTimeInForegroundMs / 60000))}</strong>
                            <span className="text-[10px]">{app.launchCount} opens · last used {new Date(app.lastUsedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </span>
                        </li>
                      ))}
                  </ul>
                  {deviceUsage.apps.some((app) => app.isSystemApp) && (
                    <button
                      type="button"
                      onClick={() => setShowSystemApps((show) => !show)}
                      className="mt-2 rounded-lg px-2 py-1 text-[11px] font-semibold text-sky-800 hover:bg-sky-100 dark:text-sky-200 dark:hover:bg-slate-800"
                    >
                      {showSystemApps ? 'Hide system apps' : 'Show system apps'}
                    </button>
                  )}
                  {recentDeviceUsage.length > 0 && (
                    <div className="mt-4 border-t border-sky-100 pt-3 dark:border-slate-700">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <h5 className="text-xs font-semibold text-slate-800 dark:text-slate-200">Synced device usage · last 7 days</h5>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">{preferences.statsGraphStyle} chart</span>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="min-w-0">
                          <h6 className="mb-2 text-[11px] font-semibold text-slate-700 dark:text-slate-300">Foreground-app time</h6>
                          <UsageChart
                            style={preferences.statsGraphStyle}
                            label="Daily foreground-app time"
                            data={recentDeviceUsage.map((snapshot) => ({
                              label: snapshot.date.slice(5),
                              value: Math.round(snapshot.apps.reduce((sum, app) => sum + app.totalTimeInForegroundMs, 0) / 60000),
                            }))}
                          />
                        </div>
                        <div className="min-w-0">
                          <h6 className="mb-2 text-[11px] font-semibold text-slate-700 dark:text-slate-300">Screen-on time</h6>
                          <UsageChart
                            style={preferences.statsGraphStyle}
                            label="Daily screen-on time"
                            data={recentDeviceUsage.map((snapshot) => ({
                              label: snapshot.date.slice(5),
                              value: Math.round(snapshot.screen.screenOnDurationMs / 60000),
                              color: '#8293B6',
                            }))}
                          />
                        </div>
                      </div>
                      <p className="mt-2 text-[10px] text-slate-500 dark:text-slate-400">Only days with a saved Android sync are shown. Foreground-app time and screen-on time are separate measurements; neither is added to the other.</p>
                    </div>
                  )}
                  </>
                )}
                <p className="text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">
                  Android reports app usage, not visited websites. Website-level tracking needs a separate browser-specific extension/integration; Awake cannot infer sites from browser usage.
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
          {aiInsight && !(suggestionResponse?.date === selectedDate
            && ['dismissed', 'not-useful'].includes(suggestionResponse.action)) && (
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-50/70 via-sky-50/40 to-emerald-50/50 dark:from-slate-900/90 dark:to-slate-900/60 border border-amber-200/70 dark:border-slate-700 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Awake suggestion · not a tracked fact
                  <span className="text-[10px] font-normal text-slate-400 ml-1">
                    ({aiInsight.source === 'gemini' ? 'Gemini 3.8 Flash' : 'On-Device Intelligence'})
                  </span>
                </span>
                <span className="text-[10px] text-slate-400">
                  {new Date(aiInsight.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <p className="text-[10px] text-slate-500 dark:text-slate-400" role="status">{aiStatus}</p>

              {isEditingSuggestion ? (
                <div className="space-y-2">
                  <label className="sr-only" htmlFor="edit-solis-suggestion">Edit suggestion</label>
                  <textarea
                    id="edit-solis-suggestion"
                    value={editedSummary}
                    onChange={(event) => setEditedSummary(event.target.value)}
                    rows={3}
                    maxLength={500}
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                  <button
                    type="button"
                    onClick={() => recordSuggestionResponse({ date: selectedDate, action: 'edited', editedSummary: editedSummary.trim() || aiInsight.summary })}
                    className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white dark:bg-white dark:text-slate-900"
                  >
                    Save edit
                  </button>
                </div>
              ) : (
                <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                  {suggestionResponse?.editedSummary ?? aiInsight.summary}
                </p>
              )}

              {preferences.encouragementTone !== 'off' && aiInsight.encouragement && (
                <p className="text-xs text-slate-600 dark:text-slate-400 italic">
                  "{aiInsight.encouragement}"
                </p>
              )}

              {aiInsight.gentleNudge && (
                <div className="flex items-start gap-2 pt-1 text-xs text-amber-900 dark:text-amber-200 bg-amber-100/60 dark:bg-amber-950/40 p-2.5 rounded-xl border border-amber-200/50 dark:border-amber-900/50">
                  <Lightbulb className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>{aiInsight.gentleNudge}</span>
                </div>
              )}
              <div className="flex flex-wrap gap-2 pt-1">
                <button type="button" onClick={() => recordSuggestionResponse({ date: selectedDate, action: 'accepted', editedSummary: suggestionResponse?.editedSummary })} className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-800 dark:border-emerald-800 dark:text-emerald-200">
                  <Check className="h-3 w-3" /> Accept
                </button>
                <button type="button" onClick={() => { setEditedSummary(suggestionResponse?.editedSummary ?? aiInsight.summary); setIsEditingSuggestion(true); }} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">
                  <Pencil className="h-3 w-3" /> Edit
                </button>
                <button type="button" onClick={() => recordSuggestionResponse({ date: selectedDate, action: 'not-useful' })} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">
                  <ThumbsDown className="h-3 w-3" /> Not useful
                </button>
                <button type="button" onClick={() => recordSuggestionResponse({ date: selectedDate, action: 'dismissed' })} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">
                  <X className="h-3 w-3" /> Dismiss
                </button>
              </div>
            </div>
          )}
          {aiInsight && suggestionResponse?.date === selectedDate
            && ['dismissed', 'not-useful'].includes(suggestionResponse.action) && (
            <button type="button" onClick={() => recordSuggestionResponse({ date: selectedDate, action: 'accepted', editedSummary: suggestionResponse.editedSummary })} className="text-xs font-semibold text-sky-800 underline dark:text-sky-200">
              Show suggestion again
            </button>
          )}
          </>}
        </div>
      )}
    </div>
  );
};
