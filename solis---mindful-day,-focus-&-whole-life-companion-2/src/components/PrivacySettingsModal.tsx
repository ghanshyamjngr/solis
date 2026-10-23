import React, { useState } from 'react';
import {
  ShieldCheck,
  Download,
  Upload,
  Trash2,
  Bell,
  Volume2,
  VolumeX,
  Moon,
  AlertCircle,
  CheckCircle2,
  Target
} from 'lucide-react';
import { ActivityEntry, AccentColor, AppearanceMode, DailyDeviceUsage, PlannedTask, SavingsGoal, StatsGraphStyle, ThemeStyle, UserPreferences } from '../types';
import { exportDataAsJSON, importDataFromJSON, loadStoredTasks, wipeAllLocalData } from '../utils/storage';
import { isAndroidApp } from '../utils/deviceUsage';
import { cancelTaskReminder, requestReminderPermission, updateTaskWidget } from '../utils/taskReminders';
import { calculateDetailedInsights, formatDuration, getTodayDateString } from '../utils/timeline';
import { loadFocusTimer, readNativeFocusTimer, saveFocusTimer } from '../utils/focusTimer';

interface PrivacySettingsProps {
  preferences: UserPreferences;
  onUpdatePreferences: (updates: Partial<UserPreferences>) => void;
  onDataReset: () => void;
  deviceUsage: DailyDeviceUsage | null;
  usageStatus: string;
  encouragementStatus: string;
  onRequestUsageAccess: () => void;
  onSyncDeviceUsage: () => void;
  tasks: PlannedTask[];
  entries: ActivityEntry[];
  savingsGoal: SavingsGoal;
}

const GraphStylePreview: React.FC<{ style: StatsGraphStyle }> = ({ style }) => {
  if (style === 'line') {
    return (
      <svg viewBox="0 0 96 36" className="h-9 w-24 text-[var(--solis-chart-accent)]" aria-hidden="true">
        <path d="M4 31H92" stroke="currentColor" opacity=".18" />
        <polyline points="5,25 25,18 44,22 65,9 91,13" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="65" cy="9" r="2.5" fill="currentColor" />
      </svg>
    );
  }
  if (style === 'donut') {
    return (
      <svg viewBox="0 0 40 40" className="h-10 w-10 -rotate-90 text-[var(--solis-chart-accent)]" aria-hidden="true">
        <circle cx="20" cy="20" r="15" fill="none" stroke="currentColor" opacity=".18" strokeWidth="6" />
        <circle cx="20" cy="20" r="15" fill="none" stroke="currentColor" strokeWidth="6" strokeDasharray="58 94" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <div className="flex h-9 w-24 items-end gap-1.5 px-1" aria-hidden="true">
      {[45, 72, 55, 90, 64].map((height, index) => (
        <span key={index} className="flex-1 rounded-t bg-[var(--solis-chart-accent)]" style={{ height: `${height}%`, opacity: 0.55 + index * 0.08 }} />
      ))}
    </div>
  );
};

export const PrivacySettingsModal: React.FC<PrivacySettingsProps> = ({
  preferences,
  onUpdatePreferences,
  onDataReset,
  deviceUsage,
  usageStatus,
  encouragementStatus,
  onRequestUsageAccess,
  onSyncDeviceUsage,
  tasks,
  entries,
  savingsGoal,
}) => {
  const [showConfirmWipe, setShowConfirmWipe] = useState(false);
  const [focusState, setFocusState] = useState(loadFocusTimer);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [appearanceFeedback, setAppearanceFeedback] = useState('');
  const [notificationFeedback, setNotificationFeedback] = useState('');
  const [appearanceDraft, setAppearanceDraft] = useState({
    appearanceMode: preferences.appearanceMode,
    themeStyle: preferences.themeStyle,
    accentColor: preferences.accentColor,
    statsGraphStyle: preferences.statsGraphStyle,
  });
  const [notificationDraft, setNotificationDraft] = useState({
    quietHoursStart: preferences.quietHoursStart,
    quietHoursEnd: preferences.quietHoursEnd,
    soundEnabled: preferences.soundEnabled,
    vibrationEnabled: preferences.vibrationEnabled,
    goalCompletionNotificationsEnabled: preferences.goalCompletionNotificationsEnabled,
    usageEncouragementNotificationsEnabled: preferences.usageEncouragementNotificationsEnabled,
    usageEncouragementThresholdMinutes: preferences.usageEncouragementThresholdMinutes,
    usageEncouragementFrequencyDays: preferences.usageEncouragementFrequencyDays,
    encouragementTone: preferences.encouragementTone,
    dailyFocusGoalMinutes: preferences.dailyFocusGoalMinutes,
    dailyOfflineGoalMinutes: preferences.dailyOfflineGoalMinutes,
  });
  const today = getTodayDateString();
  const todayTasks = tasks.filter((task) => {
    if (today < task.date) return false;
    if (task.repeat === 'daily') return true;
    if (task.repeat === 'weekly') return new Date(`${task.date}T12:00:00`).getDay() === new Date(`${today}T12:00:00`).getDay();
    return task.date === today;
  });
  const nextTask = todayTasks
    .filter((task) => !task.completedDates.includes(today))
    .sort((first, second) => first.time.localeCompare(second.time))[0];
  const completedTasks = todayTasks.filter((task) => task.completedDates.includes(today)).length;
  const completedTaskDates = new Set(tasks.flatMap((task) => task.completedDates));
  let taskStreak = 0;
  const streakCursor = new Date(`${today}T12:00:00`);
  while (completedTaskDates.has(`${streakCursor.getFullYear()}-${String(streakCursor.getMonth() + 1).padStart(2, '0')}-${String(streakCursor.getDate()).padStart(2, '0')}`)) {
    taskStreak += 1;
    streakCursor.setDate(streakCursor.getDate() - 1);
  }
  const todayStats = calculateDetailedInsights(
    entries.filter((entry) => entry.date === today),
    preferences.dailyFocusGoalMinutes,
    preferences.dailyOfflineGoalMinutes,
  );
  const focusRemainingSeconds = Math.max(0, focusState.durationSeconds - focusState.elapsedSeconds);
  const topUsageApp = [...(deviceUsage?.apps ?? [])].sort((first, second) => second.totalTimeInForegroundMs - first.totalTimeInForegroundMs)[0];
  const savingsProgress = savingsGoal.targetAmount > 0
    ? Math.min(100, Math.round((savingsGoal.currentAmount / savingsGoal.targetAmount) * 100))
    : 0;

  React.useEffect(() => {
    if (!isAndroidApp()) return;
    let mounted = true;
    void readNativeFocusTimer()
      .then((state) => {
        if (!mounted) return;
        setFocusState(state);
        saveFocusTimer(state);
      })
      .catch((error) => console.error('Could not load the native focus state for widget previews', error));
    return () => { mounted = false; };
  }, []);

  React.useEffect(() => {
    setAppearanceDraft({
      appearanceMode: preferences.appearanceMode,
      themeStyle: preferences.themeStyle,
      accentColor: preferences.accentColor,
      statsGraphStyle: preferences.statsGraphStyle,
    });
  }, [preferences.appearanceMode, preferences.themeStyle, preferences.accentColor, preferences.statsGraphStyle]);

  React.useEffect(() => {
    setNotificationDraft({
      quietHoursStart: preferences.quietHoursStart,
      quietHoursEnd: preferences.quietHoursEnd,
      soundEnabled: preferences.soundEnabled,
      vibrationEnabled: preferences.vibrationEnabled,
      goalCompletionNotificationsEnabled: preferences.goalCompletionNotificationsEnabled,
      usageEncouragementNotificationsEnabled: preferences.usageEncouragementNotificationsEnabled,
      usageEncouragementThresholdMinutes: preferences.usageEncouragementThresholdMinutes,
      usageEncouragementFrequencyDays: preferences.usageEncouragementFrequencyDays,
      encouragementTone: preferences.encouragementTone,
      dailyFocusGoalMinutes: preferences.dailyFocusGoalMinutes,
      dailyOfflineGoalMinutes: preferences.dailyOfflineGoalMinutes,
    });
  }, [
    preferences.quietHoursStart,
    preferences.quietHoursEnd,
    preferences.soundEnabled,
    preferences.vibrationEnabled,
    preferences.goalCompletionNotificationsEnabled,
    preferences.usageEncouragementNotificationsEnabled,
    preferences.usageEncouragementThresholdMinutes,
    preferences.usageEncouragementFrequencyDays,
    preferences.encouragementTone,
    preferences.dailyFocusGoalMinutes,
    preferences.dailyOfflineGoalMinutes,
  ]);

  const saveAppearance = () => {
    onUpdatePreferences(appearanceDraft);
    setAppearanceFeedback('Appearance saved and applied across Awake.');
  };

  const saveNotificationSettings = async () => {
    let permissionMessage = '';
    if (notificationDraft.goalCompletionNotificationsEnabled
      || (notificationDraft.usageEncouragementNotificationsEnabled && preferences.usageTrackingEnabled)) {
      try {
        const granted = await requestReminderPermission();
        permissionMessage = granted
          ? 'Android notifications are allowed.'
          : 'Notifications are not allowed. Enable them in Android settings to receive alerts.';
      } catch (error) {
        console.error('Could not request notification permission', error);
        permissionMessage = 'Notification permission could not be requested.';
      }
    }
    onUpdatePreferences(notificationDraft);
    setNotificationFeedback(`Reminder and goal settings saved. ${permissionMessage}`.trim());
  };

  const handleExportJSON = () => {
    const jsonStr = exportDataAsJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `awake-mindful-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = importDataFromJSON(content);
      if (res.success) {
        setImportStatus(`Successfully restored ${res.count} entries!`);
        onDataReset();
      } else {
        setImportStatus(`Import error: ${res.error}`);
      }
      setTimeout(() => setImportStatus(null), 4000);
    };
    reader.readAsText(file);
  };

  const handleWipe = async () => {
    const reminderIds = loadStoredTasks().map((task) => task.id);
    const cancellations = await Promise.allSettled(reminderIds.map((id) => cancelTaskReminder(id)));
    const widgetUpdate = updateTaskWidget([], new Date().toISOString().slice(0, 10));
    wipeAllLocalData();
    setShowConfirmWipe(false);
    onDataReset();
    const failed = cancellations.filter((result) => result.status === 'rejected').length;
    try {
      await widgetUpdate;
    } catch (error) {
      console.error('Could not clear the Awake widget after erasing local data', error);
    }
    if (failed) {
      console.error(`${failed} task reminder(s) could not be cancelled while erasing local data.`);
      setImportStatus('Local data was erased, but one or more system reminders could not be cancelled. Check Android notification settings.');
      setTimeout(() => setImportStatus(null), 6000);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-4">
      {/* Title */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Privacy, Storage & Preferences
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
          Your activity stays on this device unless you explicitly enable Gemini AI sharing below.
        </p>
      </div>

      {/* Data and AI sharing status */}
      <div className="p-6 rounded-3xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/60 flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Your data stays local by default
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Device usage remains on this device unless you enable its separate sharing option below. Activity/task context and device-usage summaries have separate controls; both are off by default for Gemini. The Gemini key remains server-side and is not included in the Android app.
          </p>
        </div>
      </div>

      <section className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700/80 p-6 sm:p-8 shadow-xs space-y-3">
        <div className="flex items-start gap-3">
          <input
            id="ai-data-sharing-consent"
            type="checkbox"
            checked={preferences.aiDataSharingConsent}
            onChange={(event) => onUpdatePreferences({ aiDataSharingConsent: event.target.checked })}
            className="mt-1 h-4 w-4 accent-amber-600"
          />
          <div>
            <label htmlFor="ai-data-sharing-consent" className="text-sm font-semibold text-slate-900 dark:text-white">
              Allow Gemini to use recent activity categories and task check-ins
            </label>
            <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              Off by default. When enabled, Awake sends up to four recent days of activity categories and durations, task titles and completion check-ins, and your accept/edit/dismiss feedback from earlier suggestions to the existing server. Private activity notes, exact event times, and Android device usage are not included by this control. This is temporary context, not model training.
            </p>
            <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              Status: {preferences.aiDataSharingConsent ? 'Activity and task context sharing enabled' : 'Activity and task context stay on this device'}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-sky-200 bg-sky-50/60 p-6 dark:border-sky-900/60 dark:bg-sky-950/20">
        <div className="flex items-start gap-3">
          <input
            id="ai-usage-data-sharing-consent"
            type="checkbox"
            checked={preferences.aiUsageDataSharingConsent}
            onChange={(event) => onUpdatePreferences({ aiUsageDataSharingConsent: event.target.checked })}
            className="mt-1 h-4 w-4 accent-sky-600"
          />
          <div>
            <label htmlFor="ai-usage-data-sharing-consent" className="text-sm font-semibold text-slate-900 dark:text-white">
              Separately allow minimized Android usage totals for Gemini suggestions
            </label>
            <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              Off by default and independent of activity sharing. If enabled, only up to four dated daily totals for screen-on minutes and foreground-app minutes are sent; app names, package IDs, timelines, websites, and private reflections are excluded. Android usage can show that a browser was used, not what you did inside it.
            </p>
            <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              Status: {preferences.aiUsageDataSharingConsent ? 'Minimized usage summary may be shared when synced data exists' : 'Device usage stays on this device'}
            </p>
          </div>
        </div>
      </section>

      <section id="appearance-settings" className="scroll-mt-24 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700/80 p-6 sm:p-8 shadow-xs space-y-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Appearance</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Choose a theme that feels comfortable to use.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <label className="space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
            Appearance mode
            <select
              value={appearanceDraft.appearanceMode}
              onChange={(event) => setAppearanceDraft((current) => ({ ...current, appearanceMode: event.target.value as AppearanceMode }))}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
          <label className="space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
            Theme style
            <select
              value={appearanceDraft.themeStyle}
              onChange={(event) => setAppearanceDraft((current) => ({ ...current, themeStyle: event.target.value as ThemeStyle }))}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
            >
              <option value="clean-minimal">Clean minimal</option>
              <option value="playful-animated">Playful</option>
              <option value="soft-glass">Soft glass</option>
            </select>
          </label>
          <label className="space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
            Accent color
            <select
              value={appearanceDraft.accentColor}
              onChange={(event) => setAppearanceDraft((current) => ({ ...current, accentColor: event.target.value as AccentColor }))}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
            >
              <option value="amber">Sunrise clay</option>
              <option value="sage">Quiet sage</option>
              <option value="ocean">Calm blue</option>
              <option value="lavender">Dusty lilac</option>
              <option value="coral">Soft terracotta</option>
              <option value="wallpaper">Android wallpaper color</option>
            </select>
          </label>
        </div>
        <fieldset className="space-y-2">
          <legend className="text-xs font-semibold text-slate-700 dark:text-slate-300">Stats graph style</legend>
          <div className="grid grid-cols-3 gap-2">
            {([
              { value: 'bar', label: 'Bar' },
              { value: 'line', label: 'Line' },
              { value: 'donut', label: 'Donut' },
            ] as const).map(({ value, label }) => (
              <button
                key={value}
                type="button"
                aria-pressed={appearanceDraft.statsGraphStyle === value}
                onClick={() => setAppearanceDraft((current) => ({ ...current, statsGraphStyle: value }))}
                className={`flex min-h-20 flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-xs font-semibold transition-colors ${
                  appearanceDraft.statsGraphStyle === value
                    ? 'border-[var(--solis-accent-border)] bg-[var(--solis-accent-soft)] text-[var(--solis-accent-strong)]'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                }`}
              >
                <GraphStylePreview style={value} />
                {label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Used for Android app-usage charts. Choose Save and apply to keep this style.</p>
        </fieldset>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Wallpaper color is read from Android when available; web and unsupported devices use the curated sunrise-clay fallback.
        </p>
        <button
          type="button"
          onClick={saveAppearance}
          className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:opacity-90 dark:bg-white dark:text-slate-900"
        >
          Save and apply appearance
        </button>
        {appearanceFeedback && <p role="status" className="text-xs text-emerald-700 dark:text-emerald-300">{appearanceFeedback}</p>}
      </section>

      <section className="bg-slate-50 dark:bg-slate-800/60 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 space-y-2">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Connection status</h3>
        <p className="text-xs text-slate-600 dark:text-slate-300">Sync: Not configured. Your data remains on this device.</p>
        <p className="text-xs text-slate-600 dark:text-slate-300">Android Usage Access: {isAndroidApp() ? 'Supported by this Android build.' : 'Unavailable in a web browser; open the Android app to use device tracking.'}</p>
        <p className="text-xs text-slate-600 dark:text-slate-300">Task reminders use Android system notifications in the Android app; browser reminders work only while Awake stays open.</p>
      </section>

      <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-700 dark:bg-slate-800 sm:p-6">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Awake widget previews</h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            Four distinct Android launcher widgets. Previews use saved activity, task, goal, focus, and usage data where available; launcher updates are event-driven, not second-by-second.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-[#F7F7FC] p-4 dark:border-slate-700 dark:bg-slate-900" data-no-tab-swipe="true">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200">Today Stats</h4>
              <span className="text-[10px] text-slate-500">3 × 2 · resizable</span>
            </div>
            <div className="rounded-xl bg-white p-3 shadow-sm dark:bg-slate-800">
              <p className="text-[9px] font-bold tracking-wide text-slate-500">FOCUS &amp; OFFLINE</p>
              <div className="mt-1 flex gap-4">
                <div><strong className="block text-sm text-slate-900 dark:text-white">{formatDuration(todayStats.totalFocusMinutes)}</strong><span className="text-[9px] text-slate-500">focus logged</span></div>
                <div><strong className="block text-sm text-slate-900 dark:text-white">{formatDuration(todayStats.totalOfflineMinutes)}</strong><span className="text-[9px] text-slate-500">offline logged</span></div>
              </div>
              <p className="mt-2 truncate text-[10px] text-[var(--solis-accent-strong)]">{nextTask ? `${nextTask.time} · ${nextTask.title}` : 'No tasks planned yet'}</p>
              <p className="mt-0.5 text-[9px] text-slate-500">{todayTasks.length ? `${completedTasks} of ${todayTasks.length} tasks complete` : 'Plan a small step in Awake'}</p>
            </div>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-[#F7F7FC] p-4 dark:border-slate-700 dark:bg-slate-900" data-no-tab-swipe="true">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200">Focus Timer</h4>
              <span className="text-[10px] text-slate-500">2 × 2 · resizable</span>
            </div>
            <div className="flex min-h-28 flex-col items-center justify-center rounded-xl bg-white p-3 text-center shadow-sm dark:bg-slate-800">
              <span className="text-[9px] font-bold tracking-wide text-slate-500">FOCUS SESSION</span>
              <strong className="mt-1 text-2xl tabular-nums text-slate-900 dark:text-white">
                {focusState.active
                  ? `${String(Math.floor(focusRemainingSeconds / 60)).padStart(2, '0')}:${String(focusRemainingSeconds % 60).padStart(2, '0')}`
                  : 'Ready'}
              </strong>
              <span className="mt-1 max-w-full truncate text-[10px] text-slate-500">
                {focusState.active ? `${focusState.running ? 'Running' : 'Paused'}${focusState.intention ? ` · ${focusState.intention}` : ''}` : 'Tap the widget to start focus'}
              </span>
              <span className="mt-2 rounded-full bg-[var(--solis-accent-soft)] px-3 py-1 text-[9px] font-semibold text-[var(--solis-accent-strong)]">Start / resume</span>
            </div>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-[#F7F7FC] p-4 dark:border-slate-700 dark:bg-slate-900" data-no-tab-swipe="true">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200">Goals &amp; Streak</h4>
              <span className="text-[10px] text-slate-500">3 × 2 · resizable</span>
            </div>
            <div className="rounded-xl bg-white p-3 shadow-sm dark:bg-slate-800">
              <p className="text-[9px] font-bold tracking-wide text-slate-500">SAVINGS GOAL</p>
              <strong className="mt-1 block truncate text-sm text-slate-900 dark:text-white">
                {savingsGoal.targetAmount > 0
                  ? `${savingsGoal.currency ?? 'USD'} ${savingsGoal.currentAmount.toFixed(0)} / ${savingsGoal.targetAmount.toFixed(0)}`
                  : 'No savings goal yet'}
              </strong>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                <div className="h-full rounded-full bg-[#789384]" style={{ width: `${savingsProgress}%` }} />
              </div>
              <p className="mt-2 text-[10px] text-slate-600 dark:text-slate-300">{taskStreak}-day task-completion streak</p>
            </div>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-[#F7F7FC] p-4 dark:border-slate-700 dark:bg-slate-900" data-no-tab-swipe="true">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200">Daily Usage</h4>
              <span className="text-[10px] text-slate-500">3 × 2 · resizable</span>
            </div>
            <div className="rounded-xl bg-white p-3 shadow-sm dark:bg-slate-800">
              <p className="text-[9px] font-bold tracking-wide text-slate-500">ANDROID APP USAGE</p>
              {deviceUsage ? (
                <>
                  <strong className="mt-1 block text-xs text-slate-900 dark:text-white">
                    {formatDuration(Math.round(deviceUsage.apps.reduce((sum, app) => sum + app.totalTimeInForegroundMs, 0) / 60000))} foreground · {formatDuration(Math.round(deviceUsage.screen.screenOnDurationMs / 60000))} screen-on
                  </strong>
                  <p className="mt-1 truncate text-[10px] text-slate-600 dark:text-slate-300">{topUsageApp ? `Top app: ${topUsageApp.appName && topUsageApp.appName !== topUsageApp.packageName ? topUsageApp.appName : 'Unknown app'}` : `No per-app data for ${deviceUsage.date}`}</p>
                  <p className="mt-1 truncate text-[9px] text-slate-500">{deviceUsage.date} · synced {new Date(deviceUsage.syncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </>
              ) : <p className="mt-2 text-[10px] text-slate-500">No saved Android usage sync yet.</p>}
            </div>
          </article>
        </div>
        {isAndroidApp() ? (
          <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            Add one: long-press an empty area of your launcher home screen, choose <strong>Widgets</strong>, select Awake, then drag the widget onto the screen. Each type has its own preview and layout.
          </p>
        ) : (
          <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            These are in-app previews only in this browser. Native widgets require the Awake Android app; then long-press an empty launcher area, choose <strong>Widgets</strong>, select Awake, and drag a widget onto the screen.
          </p>
        )}
      </section>

      <section className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700/80 p-6 sm:p-8 shadow-xs space-y-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Android app-usage tracking</h3>
          <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300 mt-1">
            Optional. Awake reads Android UsageStats for foreground app time and screen-on/keyguard events. Android records these while Awake is closed or another app is in front; Awake syncs them when opened or returned to the foreground. Data is kept locally and is not added to manual logs or sent to Gemini.
          </p>
        </div>
        {preferences.usageTrackingEnabled ? (
          <button
            type="button"
            onClick={() => onUpdatePreferences({ usageTrackingEnabled: false })}
            className="rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200"
          >
            Turn off app-usage tracking
          </button>
        ) : (
          <button
            type="button"
            onClick={onRequestUsageAccess}
            className="rounded-xl bg-slate-900 dark:bg-white px-4 py-2 text-xs font-semibold text-white dark:text-slate-900"
          >
            Enable tracking and open Usage Access
          </button>
        )}
        {preferences.usageTrackingEnabled && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onRequestUsageAccess}
              className="rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200"
            >
              Open Android Usage Access settings
            </button>
            <button
              type="button"
              onClick={onSyncDeviceUsage}
              disabled={!isAndroidApp()}
              className="rounded-xl border border-sky-300 dark:border-sky-800 px-4 py-2 text-xs font-semibold text-sky-800 dark:text-sky-200 disabled:opacity-50"
            >
              Sync selected day’s app usage
            </button>
          </div>
        )}
        <p className="text-xs text-slate-600 dark:text-slate-300" role="status">{usageStatus}</p>
        <p className="text-xs text-slate-600 dark:text-slate-300">
          Last successful sync: {deviceUsage ? new Date(deviceUsage.syncedAt).toLocaleString() : 'No usage sync saved for the selected day.'}
        </p>
        <div className="rounded-xl bg-slate-50 dark:bg-slate-900/60 p-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          Website tracking is separate. Android app usage only identifies that a browser was used, not the websites visited. Exact site data would require a browser-specific extension or an explicitly configured local VPN/filter integration; Awake does not currently have that integration and will not claim to know visited sites.
        </div>
      </section>

      {/* Backup and Data Export / Import */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700/80 p-6 sm:p-8 shadow-xs space-y-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Data Sovereignty: Export & Restore</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            You can take your data with you anytime in standard JSON format or restore a previous backup.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 flex flex-col justify-between space-y-3">
            <div>
              <strong className="text-xs font-bold text-slate-900 dark:text-white block">Download Full Backup</strong>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Export activities, tasks, preferences, savings, device-usage snapshots, and lending records as a JSON backup.
              </p>
            </div>
            <button
              onClick={handleExportJSON}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold hover:opacity-90 transition-opacity"
            >
              <Download className="w-3.5 h-3.5" />
              Export JSON File
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 flex flex-col justify-between space-y-3">
            <div>
              <strong className="text-xs font-bold text-slate-900 dark:text-white block">Restore from Backup</strong>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Upload a previous Awake JSON export to restore your historical timeline.
              </p>
            </div>
            <label className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold cursor-pointer transition-colors">
              <Upload className="w-3.5 h-3.5" />
              Upload Backup File
              <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
            </label>
          </div>
        </div>

        {importStatus && (
          <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-700/60 text-xs font-medium text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            {importStatus}
          </div>
        )}
      </div>

      {/* Gentle Boundaries & Notification Rules */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700/80 p-6 sm:p-8 shadow-xs space-y-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Gentle Boundaries & Daily Goals</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure quiet hours, audio chimes, and realistic daily intentions.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
              Quiet Hours (Start to End)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={notificationDraft.quietHoursStart}
                onChange={(e) => setNotificationDraft((current) => ({ ...current, quietHoursStart: e.target.value }))}
                className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono"
              />
              <span className="text-xs text-slate-400">until</span>
              <input
                type="time"
                value={notificationDraft.quietHoursEnd}
                onChange={(e) => setNotificationDraft((current) => ({ ...current, quietHoursEnd: e.target.value }))}
                className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono"
              />
            </div>
            <span className="text-[11px] text-slate-400 block">
              Task check-ins are intentionally silent. Quiet hours mute sound and vibration for focus and goal alerts, while still showing the notification; Android channel and device settings can also silence alerts.
            </span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
              Sound Chimes & Bells
            </label>
            <button
              onClick={() => setNotificationDraft((current) => ({ ...current, soundEnabled: !current.soundEnabled }))}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-semibold transition-all ${
                notificationDraft.soundEnabled
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 text-amber-900 dark:text-amber-200'
                  : 'bg-slate-50 dark:bg-slate-900 border-slate-200 text-slate-500'
              }`}
            >
              {notificationDraft.soundEnabled ? <Volume2 className="w-4 h-4 text-amber-600" /> : <VolumeX className="w-4 h-4" />}
              {notificationDraft.soundEnabled ? 'Gentle chimes enabled' : 'Muted (silent)'}
            </button>
          </div>

          <label className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={notificationDraft.vibrationEnabled}
              onChange={(event) => setNotificationDraft((current) => ({ ...current, vibrationEnabled: event.target.checked }))}
              className="mt-0.5"
            />
            Vibrate for focus and goal completion alerts (Android)
          </label>

          <label className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={notificationDraft.goalCompletionNotificationsEnabled}
              onChange={(event) => setNotificationDraft((current) => ({ ...current, goalCompletionNotificationsEnabled: event.target.checked }))}
              className="mt-0.5"
            />
            Notify me when a savings goal is reached
          </label>

          <div className="space-y-2 rounded-xl border border-violet-200 bg-violet-50/60 p-3 dark:border-violet-900 dark:bg-violet-950/20">
            <label className="flex items-start gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
              <input
                type="checkbox"
                checked={notificationDraft.usageEncouragementNotificationsEnabled}
                onChange={(event) => setNotificationDraft((current) => ({
                  ...current,
                  usageEncouragementNotificationsEnabled: event.target.checked,
                }))}
                className="mt-0.5"
              />
              Allow optional app-usage check-in notifications (Android)
            </label>
            <p className="pl-6 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
              Off by default. Requires Android Usage Access and app-usage tracking to be enabled. Awake checks app-usage totals locally on an Android-managed, inexact schedule, sends at most one message per configured interval, and does not send usage data to Gemini or identify websites. Check-ins are skipped during quiet hours.
            </p>
            <label className="block pl-6 text-[11px] font-medium text-slate-700 dark:text-slate-300">
              Check-in threshold
              <select
                value={notificationDraft.usageEncouragementThresholdMinutes}
                onChange={(event) => setNotificationDraft((current) => ({
                  ...current,
                  usageEncouragementThresholdMinutes: Number(event.target.value),
                }))}
                className="ml-2 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900"
                disabled={!notificationDraft.usageEncouragementNotificationsEnabled}
              >
                {[60, 90, 120, 180, 240].map((minutes) => (
                  <option key={minutes} value={minutes}>{minutes} min app use that day</option>
                ))}
              </select>
            </label>
            <label className="block pl-6 text-[11px] font-medium text-slate-700 dark:text-slate-300">
              Maximum frequency
              <select
                value={notificationDraft.usageEncouragementFrequencyDays}
                onChange={(event) => setNotificationDraft((current) => ({
                  ...current,
                  usageEncouragementFrequencyDays: event.target.value === '7'
                    ? 7
                    : event.target.value === '2' ? 2 : 1,
                }))}
                className="ml-2 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900"
                disabled={!notificationDraft.usageEncouragementNotificationsEnabled}
              >
                <option value={1}>At most once a day</option>
                <option value={2}>At most every other day</option>
                <option value={7}>At most once a week</option>
              </select>
            </label>
            {notificationDraft.usageEncouragementNotificationsEnabled && !isAndroidApp() && (
              <p className="pl-6 text-[11px] text-amber-800 dark:text-amber-200">
                This notification is Android-only. No app-usage monitoring occurs in the web version.
              </p>
            )}
            {notificationDraft.usageEncouragementNotificationsEnabled && isAndroidApp() && (
              <p role="status" className="pl-6 text-[11px] text-slate-600 dark:text-slate-300">
                {encouragementStatus || 'Local check-ins need Android Usage Access and notification permission. Android checks periodically and may delay them; they are not instant.'}
              </p>
            )}
          </div>

          <label className="space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
            Encouragement style
            <select
              value={notificationDraft.encouragementTone}
              onChange={(event) => setNotificationDraft((current) => ({
                ...current,
                encouragementTone: event.target.value as UserPreferences['encouragementTone'],
              }))}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
            >
              <option value="gentle">Gentle</option>
              <option value="poetic">Poetic</option>
              <option value="practical">Practical</option>
              <option value="off">No encouragement</option>
            </select>
          </label>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
              Daily Focus Target (Minutes)
            </label>
            <input
              type="number"
              min="15"
              max="600"
              step="15"
              value={notificationDraft.dailyFocusGoalMinutes}
              onChange={(e) => setNotificationDraft((current) => ({ ...current, dailyFocusGoalMinutes: parseInt(e.target.value) || 60 }))}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono"
            />
            <span className="text-[11px] text-slate-400 block">
              Current: {Math.floor(notificationDraft.dailyFocusGoalMinutes / 60)}h {notificationDraft.dailyFocusGoalMinutes % 60}m per day.
            </span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
              Daily Offline & Rest Target (Minutes)
            </label>
            <input
              type="number"
              min="30"
              max="720"
              step="30"
              value={notificationDraft.dailyOfflineGoalMinutes}
              onChange={(e) => setNotificationDraft((current) => ({ ...current, dailyOfflineGoalMinutes: parseInt(e.target.value) || 120 }))}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono"
            />
            <span className="text-[11px] text-slate-400 block">
              Current: {Math.floor(notificationDraft.dailyOfflineGoalMinutes / 60)}h {notificationDraft.dailyOfflineGoalMinutes % 60}m screen-free.
            </span>
          </div>
          <button
            type="button"
            onClick={() => void saveNotificationSettings()}
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:opacity-90 dark:bg-white dark:text-slate-900"
          >
            Save reminder and goal settings
          </button>
          {notificationFeedback && <p role="status" className="text-xs text-emerald-700 dark:text-emerald-300">{notificationFeedback}</p>}
        </div>
      </div>

      {/* Danger Zone: Wipe All Data */}
      <div className="bg-rose-50/50 dark:bg-rose-950/20 rounded-3xl border border-rose-200/80 dark:border-rose-900/60 p-6 space-y-4">
        <div>
          <h3 className="text-base font-bold text-rose-900 dark:text-rose-300 flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-rose-600" />
            Erase Local Data
          </h3>
          <p className="text-xs text-rose-700/80 dark:text-rose-400/80 mt-1">
            Permanently delete locally stored activities, tasks, preferences, savings, reminders, loans, and device-usage snapshots from this device.
          </p>
        </div>

        {showConfirmWipe ? (
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-rose-300 space-y-3">
            <p className="text-xs text-rose-800 dark:text-rose-300 font-semibold">
              Are you sure? This cannot be undone unless you previously exported a JSON backup.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => void handleWipe()}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700"
              >
                Yes, Permanently Delete All
              </button>
              <button
                onClick={() => setShowConfirmWipe(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowConfirmWipe(true)}
            className="px-4 py-2 rounded-xl bg-rose-100 dark:bg-rose-900/60 hover:bg-rose-200 text-rose-800 dark:text-rose-200 text-xs font-semibold transition-colors"
          >
            Clear All Data on this Device
          </button>
        )}
      </div>
    </div>
  );
};
