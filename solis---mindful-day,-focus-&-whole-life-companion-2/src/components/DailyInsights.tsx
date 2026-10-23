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
import { ActivityCategory, ActivityEntry, AiDailyReflection, UserPreferences } from '../types';
import { calculateDetailedInsights, formatDuration } from '../utils/timeline';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '') ?? '';

interface DailyInsightsProps {
  entries: ActivityEntry[];
  selectedDate: string;
  preferences: UserPreferences;
  onStartFocus?: () => void;
  onLogOffline?: () => void;
}

export const DailyInsights: React.FC<DailyInsightsProps> = ({
  entries,
  selectedDate,
  preferences,
  onStartFocus,
  onLogOffline,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [aiInsight, setAiInsight] = useState<AiDailyReflection | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState<boolean>(false);

  const dayEntries = entries.filter((e) => e.date === selectedDate);
  const stats = calculateDetailedInsights(
    dayEntries,
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
    } else {
      summary = 'Your day is open and unhurried.';
      encouragement = 'No pressure to perform. Start with a gentle 15-minute focus session or an outdoor walk.';
      gentleNudge = 'Start with one mindful choice today.';
    }

    return {
      summary,
      encouragement,
      observedFacts: stats.observedFacts,
      gentleNudge,
      harmonyScore: stats.harmonyScore,
      generatedAt: Date.now(),
      source: 'local-engine',
    };
  };

  const fetchAiInsights = async () => {
    setIsLoadingAi(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/ai-insights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activities: dayEntries,
          preferences,
          selectedDate,
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
  }, [selectedDate, dayEntries.length]);

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
                {formatDuration(stats.totalTrackedMinutes)} Tracked
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
            disabled={isLoadingAi}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            title="Refresh AI Insights"
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

      {isExpanded && (
        <div className="space-y-6 pt-1 animate-in fade-in duration-200">
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
        </div>
      )}
    </div>
  );
};
