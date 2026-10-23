import React, { useState } from 'react';
import {
  LayoutGrid,
  Smartphone,
  Droplets,
  Sparkles,
  Utensils,
  Trees,
  CheckCircle2,
  Clock,
  Compass,
  DollarSign,
  Play,
  RotateCcw,
  Coffee,
  Code2,
  Copy,
  Check,
  Watch
} from 'lucide-react';
import { ActivityEntry, DailyHabits, SavingsGoal, UserPreferences } from '../types';
import { formatDuration, calculateDetailedInsights, getTodayDateString } from '../utils/timeline';

interface LivingWidgetsStudioProps {
  entries: ActivityEntry[];
  habits: DailyHabits;
  savingsGoal: SavingsGoal;
  preferences: UserPreferences;
  onUpdateHabits: (updated: DailyHabits) => void;
  onQuickLog: (category: any, title: string, durationMinutes: number) => void;
  onStartFocusTimer: () => void;
}

export const LivingWidgetsStudio: React.FC<LivingWidgetsStudioProps> = ({
  entries,
  habits,
  savingsGoal,
  preferences,
  onUpdateHabits,
  onQuickLog,
  onStartFocusTimer,
}) => {
  const [activeWidgetSize, setActiveWidgetSize] = useState<'all' | 'small' | 'medium' | 'large' | 'lockscreen'>('all');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const today = getTodayDateString();
  const dayEntries = entries.filter((e) => e.date === today);
  const stats = calculateDetailedInsights(dayEntries, preferences.dailyFocusGoalMinutes, preferences.dailyOfflineGoalMinutes);

  const handleToggleWater = (index: number) => {
    const current = habits.waterGlasses;
    const newGlasses = index < current ? index : index + 1;
    onUpdateHabits({ ...habits, waterGlasses: newGlasses });
  };

  const copySnippet = (name: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(name);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const swiftWidgetSnippet = `// iOS 17+ Interactive WidgetKit (SwiftUI)
struct SolisMediumWidget: Widget {
    let kind: String = "SolisMediumWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: SolisTimelineProvider()) { entry in
            HStack(spacing: 12) {
                VStack(alignment: .leading) {
                    Text("Focus: \(entry.focusMinutes)m").font(.headline)
                    Text("Offline: \(entry.offlineMinutes)m").font(.subheadline)
                }
                Button(intent: LogWaterIntent()) {
                    Image(systemName: "drop.fill")
                }
                Button(intent: StartFocusIntent()) {
                    Image(systemName: "sparkles")
                }
            }
            .containerBackground(for: .widget) { Color.background }
        }
    }
}`;

  const composeWidgetSnippet = `// Android Jetpack Glance Widget (Kotlin)
class SolisGlanceWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        provideContent {
            Row(modifier = GlanceModifier.fillMaxSize().padding(12.dp)) {
                Column {
                    Text("Focus: \${stats.focusMinutes}m")
                    Text("Offline: \${stats.offlineMinutes}m")
                }
                Button(text = "+Water", onClick = actionRunCallback<LogWaterAction>())
                Button(text = "+Focus", onClick = actionRunCallback<StartFocusAction>())
            }
        }
    }
}`;

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-4">
      {/* Studio Header */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700/80 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-full">
              Living Widgets & Quick Actions
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Interactive Home-Screen Widgets
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl">
              Glance at your whole day and log moments with one tap—without opening the full app. Click the buttons below to test live interactive state!
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-700/60 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-semibold">
            <button
              onClick={() => setActiveWidgetSize('all')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                activeWidgetSize === 'all' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'
              }`}
            >
              All Sizes
            </button>
            <button
              onClick={() => setActiveWidgetSize('small')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                activeWidgetSize === 'small' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'
              }`}
            >
              Small (2x2)
            </button>
            <button
              onClick={() => setActiveWidgetSize('medium')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                activeWidgetSize === 'medium' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'
              }`}
            >
              Medium (4x2)
            </button>
            <button
              onClick={() => setActiveWidgetSize('large')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                activeWidgetSize === 'large' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'
              }`}
            >
              Large (4x4)
            </button>
            <button
              onClick={() => setActiveWidgetSize('lockscreen')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                activeWidgetSize === 'lockscreen' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'
              }`}
            >
              Dynamic Island
            </button>
          </div>
        </div>
      </div>

      {/* Widgets Showcase Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Medium Widget 4x2: Most Popular */}
        {(activeWidgetSize === 'all' || activeWidgetSize === 'medium') && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium px-1">
              <span>Medium Widget (4x2) • iOS & Android</span>
              <span>Interactive 1-Tap Quick Actions</span>
            </div>

            <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-3xl p-5 shadow-lg border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs">
                    ☀️
                  </div>
                  <span className="text-xs font-bold tracking-tight">Solis Daily Balance</span>
                </div>
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800">
                  {stats.harmonyScore}% Harmony
                </span>
              </div>

              {/* Stats overview */}
              <div className="grid grid-cols-2 gap-3 bg-white/5 rounded-2xl p-3 border border-white/5">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Focus Time</span>
                  <span className="text-lg font-bold font-mono text-indigo-300">
                    {formatDuration(stats.totalFocusMinutes)}
                  </span>
                  <span className="text-[10px] text-slate-500 block">Goal: {formatDuration(preferences.dailyFocusGoalMinutes)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Offline Living</span>
                  <span className="text-lg font-bold font-mono text-emerald-300">
                    {formatDuration(stats.totalOfflineMinutes)}
                  </span>
                  <span className="text-[10px] text-slate-500 block">Goal: {formatDuration(preferences.dailyOfflineGoalMinutes)}</span>
                </div>
              </div>

              {/* Interactive Quick-Action Buttons */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                  Quick Actions (Tap to log without opening app)
                </span>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    onClick={() => onUpdateHabits({ ...habits, waterGlasses: habits.waterGlasses + 1 })}
                    className="flex flex-col items-center justify-center p-2 rounded-xl bg-white/10 hover:bg-sky-500/20 active:scale-95 text-sky-300 border border-white/5 transition-all text-center"
                    title="Log glass of water"
                  >
                    <Droplets className="w-4 h-4 mb-1" />
                    <span className="text-[10px] font-semibold">+Water</span>
                    <span className="text-[9px] text-slate-400">{habits.waterGlasses}/8</span>
                  </button>

                  <button
                    onClick={() => onQuickLog('meal', 'Mindful Lunch Break', 35)}
                    className="flex flex-col items-center justify-center p-2 rounded-xl bg-white/10 hover:bg-orange-500/20 active:scale-95 text-orange-300 border border-white/5 transition-all text-center"
                    title="Log lunch"
                  >
                    <Utensils className="w-4 h-4 mb-1" />
                    <span className="text-[10px] font-semibold">+Lunch</span>
                    <span className="text-[9px] text-slate-400">35m</span>
                  </button>

                  <button
                    onClick={() => onQuickLog('nature', 'Outdoor Sun Walk', 30)}
                    className="flex flex-col items-center justify-center p-2 rounded-xl bg-white/10 hover:bg-teal-500/20 active:scale-95 text-teal-300 border border-white/5 transition-all text-center"
                    title="Log outdoor walk"
                  >
                    <Trees className="w-4 h-4 mb-1" />
                    <span className="text-[10px] font-semibold">+Walk</span>
                    <span className="text-[9px] text-slate-400">30m</span>
                  </button>

                  <button
                    onClick={onStartFocusTimer}
                    className="flex flex-col items-center justify-center p-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 active:scale-95 text-amber-300 border border-amber-500/30 transition-all text-center"
                    title="Start 25m Focus Session"
                  >
                    <Play className="w-4 h-4 mb-1 fill-current" />
                    <span className="text-[10px] font-semibold">+Focus</span>
                    <span className="text-[9px] text-amber-400">25m</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Small Widget 2x2: Glanceable Ring */}
        {(activeWidgetSize === 'all' || activeWidgetSize === 'small') && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium px-1">
              <span>Small Widget (2x2) • Glanceable</span>
              <span>1-Tap Action</span>
            </div>

            <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 text-white rounded-3xl p-5 shadow-lg border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">Today</span>
                <span className="text-[11px] font-bold text-amber-400">🔥 4 Day Streak</span>
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <div>
                  <span className="text-2xl font-bold font-mono text-white block">
                    {formatDuration(stats.totalFocusMinutes)}
                  </span>
                  <span className="text-[11px] text-indigo-300 block font-medium">Focus Time</span>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    {formatDuration(stats.totalOfflineMinutes)} offline
                  </span>
                </div>

                <div className="w-16 h-16 relative flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="14" fill="none" className="stroke-slate-800" strokeWidth="3" />
                    <circle
                      cx="18"
                      cy="18"
                      r="14"
                      fill="none"
                      className="stroke-amber-400"
                      strokeWidth="3"
                      strokeDasharray="88"
                      strokeDashoffset={88 - (88 * Math.min(100, stats.focusGoalProgress)) / 100}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute text-[11px] font-bold font-mono">
                    {stats.focusGoalProgress}%
                  </span>
                </div>
              </div>

              <button
                onClick={onStartFocusTimer}
                className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-98 text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition-all"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Start Focus Session
              </button>
            </div>
          </div>
        )}

        {/* Large Widget 4x4: Command Center with Hydration & Savings */}
        {(activeWidgetSize === 'all' || activeWidgetSize === 'large') && (
          <div className="space-y-2 md:col-span-2">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium px-1">
              <span>Large Widget (4x4) • Whole-Life Command Center</span>
              <span>Interactive Hydration & Goals</span>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-md border border-slate-200 dark:border-slate-700/80 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Life Command Center Widget
                    </h3>
                    <p className="text-xs text-slate-500">Hydration, mindful savings, and attention balance</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                    All On-Device
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Interactive Hydration Tracker */}
                <div className="p-4 rounded-2xl bg-sky-50/60 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/60 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-sky-800 dark:text-sky-300">
                    <span className="flex items-center gap-1.5">
                      <Droplets className="w-4 h-4 text-sky-500" />
                      Hydration Tracker
                    </span>
                    <span>{habits.waterGlasses} / 8 glasses</span>
                  </div>

                  {/* 8 Interactive Water Droplets */}
                  <div className="grid grid-cols-8 gap-1.5 pt-1">
                    {[0, 1, 2, 3, 4, 5, 6, 7].map((idx) => (
                      <button
                        key={idx}
                        onClick={() => handleToggleWater(idx)}
                        className={`h-7 rounded-lg flex items-center justify-center text-xs transition-all ${
                          idx < habits.waterGlasses
                            ? 'bg-sky-500 text-white shadow-2xs'
                            : 'bg-white dark:bg-slate-700/60 text-slate-300 border border-slate-200 dark:border-slate-600'
                        }`}
                        title={`Glass ${idx + 1}`}
                      >
                        💧
                      </button>
                    ))}
                  </div>
                  <span className="text-[10px] text-slate-400 block pt-0.5">Tap droplet to fill / unfill</span>
                </div>

                {/* Financial Savings Goal */}
                <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/60 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    <span className="flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                      Mindful Savings Goal
                    </span>
                    <span>${savingsGoal.currentAmount} / ${savingsGoal.targetAmount}</span>
                  </div>
                  <div className="w-full h-2 bg-emerald-100 dark:bg-emerald-950 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${Math.min(100, (savingsGoal.currentAmount / savingsGoal.targetAmount) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-slate-600 dark:text-slate-300 font-medium block truncate">
                    {savingsGoal.title}
                  </span>
                  <span className="text-[10px] text-slate-400 block">Zero bank accounts linked — 100% private</span>
                </div>

                {/* Impulse-Free Day Tracker */}
                <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/60 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-800 dark:text-amber-300">
                    <span>Impulse-Free Day</span>
                    <span>{habits.impulseFreeDay ? '✨ Maintained' : 'Reset'}</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-tight">
                    Celebrating intentional choices over compulsive online cart additions.
                  </p>
                  <button
                    onClick={() => onUpdateHabits({ ...habits, impulseFreeDay: !habits.impulseFreeDay })}
                    className="text-xs px-3 py-1.5 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100"
                  >
                    {habits.impulseFreeDay ? '✓ Checked Today' : 'Mark Impulse-Free'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Island / Lock Screen Pill */}
        {(activeWidgetSize === 'all' || activeWidgetSize === 'lockscreen') && (
          <div className="space-y-2 md:col-span-2">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium px-1">
              <span>Dynamic Island & Lock Screen Live Activity</span>
              <span>iOS 16.1+ & Android 14+</span>
            </div>

            <div className="bg-black text-white max-w-md mx-auto rounded-full py-3 px-6 shadow-2xl flex items-center justify-between border border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
                <div>
                  <span className="text-xs font-bold text-white block">Solis Active Focus</span>
                  <span className="text-[10px] text-slate-400 block">Deep Architecture Block</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm font-mono font-bold text-amber-400">21:40</span>
                <button
                  onClick={onStartFocusTimer}
                  className="px-2.5 py-1 rounded-full bg-white/20 hover:bg-white/30 text-[10px] font-semibold text-white"
                >
                  View
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Native Code Reference for Developers */}
      <div className="bg-slate-900 text-slate-200 rounded-3xl p-6 space-y-4 font-mono text-xs border border-slate-800">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-amber-400" />
            <span className="font-semibold text-white">Native Mobile Widget Architectures</span>
          </div>
          <span className="text-[11px] text-slate-400">Prepared for Milestone 3</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Apple WidgetKit (SwiftUI)</span>
              <button
                onClick={() => copySnippet('swift', swiftWidgetSnippet)}
                className="flex items-center gap-1 text-slate-300 hover:text-white"
              >
                {copiedCode === 'swift' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copiedCode === 'swift' ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre className="bg-slate-950 p-3 rounded-xl overflow-x-auto text-[11px] text-slate-300 leading-relaxed">
              {swiftWidgetSnippet}
            </pre>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Android Glance (Kotlin)</span>
              <button
                onClick={() => copySnippet('kotlin', composeWidgetSnippet)}
                className="flex items-center gap-1 text-slate-300 hover:text-white"
              >
                {copiedCode === 'kotlin' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copiedCode === 'kotlin' ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre className="bg-slate-950 p-3 rounded-xl overflow-x-auto text-[11px] text-slate-300 leading-relaxed">
              {composeWidgetSnippet}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
