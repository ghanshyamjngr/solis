/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { SolisMark } from './components/SolisMark';
import { DailyTimeline } from './components/DailyTimeline';
import { FocusTimer } from './components/FocusTimer';
import { FinancialGoalsView } from './components/FinancialGoalsView';
import { PrivacySettingsModal } from './components/PrivacySettingsModal';
import { PlanHub } from './components/PlanHub';
import {
  ActivityEntry,
  DailyDeviceUsage,
  FinancialEntry,
  LoanEntry,
  PlannedTask,
  SavingsGoal,
  UserPreferences,
} from './types';
import {
  loadStoredActivities,
  saveStoredActivities,
  loadStoredPreferences,
  saveStoredPreferences,
  loadStoredSavingsGoal,
  saveStoredSavingsGoal,
  loadStoredFinancialEntries,
  saveStoredFinancialEntries,
  loadStoredTasks,
  saveStoredTasks,
  loadStoredLoans,
  saveStoredLoans,
  loadStoredDeviceUsage,
  saveStoredDeviceUsage,
  DEFAULT_PREFERENCES,
} from './utils/storage';
import { getTodayDateString } from './utils/timeline';
import { checkDeviceUsageAccess, isAndroidApp, openDeviceUsageSettings, readDailyDeviceUsage } from './utils/deviceUsage';
import { cancelTaskReminder, configureUsageEncouragement, consumePendingTaskReminder, getNativeWallpaperAccent, notifyGoalCompleted, requestReminderPermission, rescheduleTaskAfterCheckin, restoreGrantedWebReminders, scheduleTaskReminder, updateTaskWidget, updateWidgetData } from './utils/taskReminders';

export default function App() {
  const [activeTab, setActiveTab] = useState<'timeline' | 'tasks' | 'timer' | 'finance' | 'settings'>('timeline');
  const [planMode, setPlanMode] = useState<'tasks' | 'log'>('tasks');
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const mainTabs = ['timeline', 'tasks', 'timer', 'finance'] as const;
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [savingsGoal, setSavingsGoal] = useState<SavingsGoal>({
    id: 'goal-default',
    title: 'Add a savings goal',
    targetAmount: 0,
    currentAmount: 0,
    category: 'Personal',
  });
  const [financialEntries, setFinancialEntries] = useState<FinancialEntry[]>([]);
  const [loans, setLoans] = useState<LoanEntry[]>([]);
  const [tasks, setTasks] = useState<PlannedTask[]>([]);
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [financeStatus, setFinanceStatus] = useState('');
  const [notificationFeedback, setNotificationFeedback] = useState('');
  const [encouragementStatus, setEncouragementStatus] = useState('');
  const [reminderStatus, setReminderStatus] = useState('Task reminders are optional. Android reminders can arrive while Solis is closed; browser reminders require Solis to stay open.');
  const [deviceUsage, setDeviceUsage] = useState<DailyDeviceUsage | null>(null);
  const [usageStatus, setUsageStatus] = useState('Android app usage tracking is off.');
  const [isUsageRefreshing, setIsUsageRefreshing] = useState(false);
  const usageRefreshInProgress = useRef(false);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  // Initialize data on mount
  useEffect(() => {
    const loadedEntries = loadStoredActivities();
    const loadedPrefs = loadStoredPreferences();
    const loadedGoal = loadStoredSavingsGoal();
    const loadedFin = loadStoredFinancialEntries();
    const loadedTasks = loadStoredTasks();
    const loadedLoans = loadStoredLoans();

    setEntries(loadedEntries);
    setPreferences(loadedPrefs);
    setSavingsGoal(loadedGoal);
    setFinancialEntries(loadedFin);
    setTasks(loadedTasks);
    setLoans(loadedLoans);
    setIsLoaded(true);

  }, []);

  // Keep the active appearance in sync with persisted mode and system changes.
  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    let active = true;
    const refreshWallpaperAccent = () => {
      root.style.removeProperty('--solis-wallpaper-accent');
      if (preferences.accentColor !== 'wallpaper' || !isAndroidApp()) return;
      void getNativeWallpaperAccent().then((color) => {
        if (active && color) root.style.setProperty('--solis-wallpaper-accent', color);
      }).catch((error) => {
        console.error('Could not read the Android wallpaper accent color', error);
      });
    };
    const applyAppearance = () => {
      const isDark = preferences.appearanceMode === 'system'
        ? media.matches
        : preferences.appearanceMode === 'dark';
      root.classList.toggle('dark', isDark);
      root.dataset.accent = preferences.accentColor;
      root.dataset.themeStyle = preferences.themeStyle;
      refreshWallpaperAccent();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') refreshWallpaperAccent();
    };
    applyAppearance();
    media.addEventListener('change', applyAppearance);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      active = false;
      media.removeEventListener('change', applyAppearance);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [preferences.appearanceMode, preferences.accentColor, preferences.themeStyle]);

  const handleSaveActivity = (entry: ActivityEntry) => {
    const updated = [entry, ...entries];
    setEntries(updated);
    saveStoredActivities(updated);
    if (entry.source === 'demo' || entry.date !== getTodayDateString()
      || !preferences.goalCompletionNotificationsEnabled) return;

    const todayEntries = entries.filter((item) => item.date === entry.date && item.source !== 'demo');
    const updatedTodayEntries = [entry, ...todayEntries];
    const focusMinutes = (items: ActivityEntry[]) => items
      .filter((item) => item.isFocusSession || item.category === 'focus')
      .reduce((total, item) => total + item.durationMinutes, 0);
    const offlineMinutes = (items: ActivityEntry[]) => items
      .filter((item) => ['offline', 'nature', 'reading'].includes(item.category))
      .reduce((total, item) => total + item.durationMinutes, 0);
    const notifyOnce = (kind: 'focus' | 'offline', title: string, message: string) => {
      const notificationKey = `solis_goal_notice_${kind}_${entry.date}`;
      try {
        if (localStorage.getItem(notificationKey)) return;
        localStorage.setItem(notificationKey, 'pending');
        void notifyGoalCompleted(
          title,
          message,
          preferences.soundEnabled,
          preferences.vibrationEnabled,
          preferences.quietHoursStart,
          preferences.quietHoursEnd,
        )
          .then(() => {
            localStorage.setItem(notificationKey, 'sent');
            setNotificationFeedback(`${title}: ${message}`);
          })
          .catch((error) => {
            localStorage.removeItem(notificationKey);
            console.error(`Could not send the ${kind} goal notification`, error);
            setNotificationFeedback(error instanceof Error
              ? `Daily goal reached, but its notification could not be shown: ${error.message}`
              : 'Daily goal reached, but its notification could not be shown.');
          });
      } catch (error) {
        console.error('Could not track daily goal notification state', error);
      }
    };

    const beforeFocus = focusMinutes(todayEntries);
    const afterFocus = focusMinutes(updatedTodayEntries);
    if (beforeFocus < preferences.dailyFocusGoalMinutes
      && afterFocus >= preferences.dailyFocusGoalMinutes) {
      notifyOnce('focus', 'Daily focus target reached',
        `You logged ${afterFocus} minutes of focus against your ${preferences.dailyFocusGoalMinutes}-minute target.`);
    }
    const beforeOffline = offlineMinutes(todayEntries);
    const afterOffline = offlineMinutes(updatedTodayEntries);
    if (beforeOffline < preferences.dailyOfflineGoalMinutes
      && afterOffline >= preferences.dailyOfflineGoalMinutes) {
      notifyOnce('offline', 'Daily offline goal reached',
        `Your manual offline, nature, and reading logs reached ${afterOffline} minutes.`);
    }
  };

  const handleDeleteActivity = (id: string) => {
    const updated = entries.filter((e) => e.id !== id);
    setEntries(updated);
    saveStoredActivities(updated);
  };

  const handleUpdatePreferences = (updates: Partial<UserPreferences>) => {
    const normalizedUpdates = updates.appearanceMode
      ? { ...updates, darkMode: updates.appearanceMode === 'dark' }
      : updates.darkMode !== undefined
        ? { ...updates, appearanceMode: updates.darkMode ? 'dark' as const : 'light' as const }
        : updates;
    const updated = { ...preferences, ...normalizedUpdates };
    setPreferences(updated);
    saveStoredPreferences(updated);
  };

  useEffect(() => {
    if (!isLoaded) return;
    void updateTaskWidget(tasks, getTodayDateString()).catch((error) => {
      console.error('Could not update the Solis home-screen widget', error);
    });
  }, [isLoaded, tasks]);

  useEffect(() => {
    if (!isLoaded || !isAndroidApp()) return;
    const today = new Date();
    const dateKeys = Array.from({ length: 4 }, (_, offset) => {
      const date = new Date(today);
      date.setDate(today.getDate() - offset);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    });
    let plannedCheckins = 0;
    let completedCheckins = 0;
    for (const date of dateKeys) {
      for (const task of tasks) {
        const occurs = date >= task.date && (
          task.repeat === 'daily'
          || (task.repeat === 'weekly'
            && new Date(`${task.date}T12:00:00`).getDay() === new Date(`${date}T12:00:00`).getDay())
          || (task.repeat === 'never' && task.date === date)
        );
        if (!occurs) continue;
        plannedCheckins += 1;
        if (task.completedDates.includes(date)) completedCheckins += 1;
      }
    }
    const configure = () => {
      void configureUsageEncouragement({
        enabled: preferences.usageEncouragementNotificationsEnabled
          && preferences.usageTrackingEnabled
          && preferences.encouragementTone !== 'off',
        thresholdMinutes: preferences.usageEncouragementThresholdMinutes,
        frequencyDays: preferences.usageEncouragementFrequencyDays,
        quietHoursStart: preferences.quietHoursStart,
        quietHoursEnd: preferences.quietHoursEnd,
        tone: preferences.encouragementTone,
        completedCheckins,
        plannedCheckins,
        soundEnabled: preferences.soundEnabled,
        vibrationEnabled: preferences.vibrationEnabled,
      }).then((scheduled) => {
        if (preferences.usageEncouragementNotificationsEnabled && !preferences.usageTrackingEnabled) {
          setEncouragementStatus('App-usage check-ins are paused because Android usage tracking is off.');
        } else if (preferences.usageEncouragementNotificationsEnabled && scheduled) {
          setEncouragementStatus('Optional local app-usage check-ins are scheduled. Android may delay them.');
        } else {
          setEncouragementStatus('Optional app-usage check-ins are off.');
        }
      }).catch((error) => {
        console.error('Could not configure local usage encouragement', error);
        setEncouragementStatus(error instanceof Error
          ? error.message
          : 'Could not configure app-usage check-ins. Check Usage Access and notification permission.');
      });
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') configure();
    };
    configure();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', configure);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', configure);
    };
  }, [
    isLoaded,
    tasks,
    preferences.usageEncouragementNotificationsEnabled,
    preferences.usageEncouragementThresholdMinutes,
    preferences.usageEncouragementFrequencyDays,
    preferences.usageTrackingEnabled,
    preferences.quietHoursStart,
    preferences.quietHoursEnd,
    preferences.encouragementTone,
    preferences.soundEnabled,
    preferences.vibrationEnabled,
  ]);

  useEffect(() => {
    if (!isLoaded) return;
    void restoreGrantedWebReminders(tasks).catch((error) => {
      console.error('Could not restore saved browser reminders', error);
    });
  }, [isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    const openCheckin = (taskId: string | null) => {
      if (!taskId) return;
      setPendingTaskId(taskId);
      setActiveTab('tasks');
    };
    const consumePending = () => void consumePendingTaskReminder()
      .then(({ taskId, openTasks, widgetAction, answer, answerTaskId, answerDate }) => {
        openCheckin(taskId);
        if (openTasks) setActiveTab('tasks');
        if (widgetAction === 'focus') setActiveTab('timer');
        if (widgetAction === 'plan') setActiveTab('tasks');
        if (widgetAction === 'today') setActiveTab('timeline');
        if (answer && answerTaskId && answerDate) {
          setTasks((current) => {
            const updated = current.map((task) => {
              if (task.id !== answerTaskId) return task;
              const completedDates = new Set(task.completedDates);
              const skippedDates = new Set(task.skippedDates ?? []);
              if (answer === 'completed') {
                completedDates.add(answerDate);
                skippedDates.delete(answerDate);
              } else if (answer === 'skipped') {
                skippedDates.add(answerDate);
                completedDates.delete(answerDate);
              }
              return {
                ...task,
                completedDates: [...completedDates],
                skippedDates: [...skippedDates],
                checkinResponses: { ...(task.checkinResponses ?? {}), [answerDate]: answer },
              };
            });
            saveStoredTasks(updated);
            return updated;
          });
          setPendingTaskId(answerTaskId);
          setActiveTab('tasks');
          setReminderStatus(`Saved your reminder response: ${answer}.`);
        }
      })
      .catch((error) => console.error('Could not open task reminder check-in', error));
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') consumePending();
    };
    consumePending();
    document.addEventListener('visibilitychange', onVisibilityChange);
    const onWebReminder = (event: Event) => {
      const reminderEvent = event as CustomEvent<{ taskId?: string }>;
      openCheckin(reminderEvent.detail?.taskId ?? null);
    };
    window.addEventListener('solis-task-reminder', onWebReminder);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('solis-task-reminder', onWebReminder);
    };
  }, [isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    const date = getTodayDateString();
    const scheduled = tasks.filter((task) => {
      if (date < task.date) return false;
      if (task.repeat === 'daily') return true;
      if (task.repeat === 'weekly') return new Date(`${task.date}T12:00:00`).getDay() === new Date(`${date}T12:00:00`).getDay();
      return task.date === date;
    });
    const completed = scheduled.filter((task) => task.completedDates.includes(date)).length;
    const nextTask = scheduled.filter((task) => !task.completedDates.includes(date)).sort((a, b) => a.time.localeCompare(b.time))[0];
    const completedDates = new Set(tasks.flatMap((task) => task.completedDates));
    let streak = 0;
    const cursor = new Date(`${date}T12:00:00`);
    while (completedDates.has(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`)) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    const usage = deviceUsage?.date === date ? deviceUsage : loadStoredDeviceUsage(date);
    const foregroundMinutes = usage?.apps.reduce((sum, app) => sum + app.totalTimeInForegroundMs, 0) ?? 0;
    void updateWidgetData({
      nextTask: nextTask ? `${nextTask.time} · ${nextTask.title}` : scheduled.length ? 'You finished today’s plan' : 'No tasks planned yet',
      progress: scheduled.length ? `${completed} of ${scheduled.length} tasks complete` : 'Add a task in Solis',
      goals: savingsGoal.targetAmount > 0
        ? `${savingsGoal.currency ?? 'USD'} ${savingsGoal.currentAmount.toFixed(0)} / ${savingsGoal.targetAmount.toFixed(0)}`
        : 'No savings goal yet',
      streak: `${streak}-day task-completion streak`,
      usage: usage
        ? `${Math.round(foregroundMinutes / 60000)} min foreground app time · ${Math.round(usage.screen.screenOnDurationMs / 60000)} min screen-on`
        : 'No synced usage yet',
      lastSync: usage ? `Last sync ${new Date(usage.syncedAt).toLocaleString()}` : 'Sync from Today in Solis',
    }).catch((error) => console.error('Could not update Solis launcher widget data', error));
  }, [isLoaded, tasks, savingsGoal, deviceUsage]);

  const syncDeviceUsage = useCallback(async (date: string) => {
    if (usageRefreshInProgress.current) return;
    usageRefreshInProgress.current = true;
    setIsUsageRefreshing(true);
    if (!isAndroidApp()) {
      setUsageStatus('Android Usage Access is only available in the Android app. Website-level tracking is not available.');
      usageRefreshInProgress.current = false;
      setIsUsageRefreshing(false);
      return;
    }
    if (!preferences.usageTrackingEnabled) {
      setUsageStatus('Android app usage tracking is off.');
      usageRefreshInProgress.current = false;
      setIsUsageRefreshing(false);
      return;
    }

    try {
      const hasAccess = await checkDeviceUsageAccess();
      if (!hasAccess) {
        setUsageStatus('Usage Access is not granted. Enable it in Android Settings to read app usage.');
        return;
      }

      const usage = await readDailyDeviceUsage(date);
      if (!usage) {
        setUsageStatus('Android did not return usage data for this date. Try syncing again later.');
        return;
      }
      saveStoredDeviceUsage(usage);
      setDeviceUsage(usage);
      setUsageStatus(usage.apps.length > 0
        ? `Synced Android usage for ${date}.`
        : `Synced ${date}; Android returned no app usage for that day.`);
    } catch (error) {
      console.error('Android usage sync failed', error);
      setUsageStatus('Could not read Android usage. Check Usage Access and try again.');
    } finally {
      usageRefreshInProgress.current = false;
      setIsUsageRefreshing(false);
    }
  }, [preferences.usageTrackingEnabled]);

  const handleRequestUsageAccess = async () => {
    if (!isAndroidApp()) {
      setUsageStatus('Android Usage Access is only available in the Android app. No website data is being collected.');
      return;
    }
    handleUpdatePreferences({ usageTrackingEnabled: true });
    try {
      await openDeviceUsageSettings();
      setUsageStatus('Android Usage Access settings opened. Allow access for Solis, then return to sync.');
    } catch (error) {
      console.error('Could not open Android Usage Access settings', error);
      setUsageStatus('Could not open Android Usage Access settings. Open Settings → Apps → Special app access → Usage access manually.');
    }
  };

  useEffect(() => {
    setDeviceUsage(loadStoredDeviceUsage(selectedDate));
  }, [selectedDate]);

  useEffect(() => {
    if (!isLoaded) return;
    const refreshUsageStatus = async () => {
      if (!isAndroidApp()) {
        setUsageStatus('Android Usage Access is only available in the Android app. Website-level tracking is not available.');
        return;
      }
      try {
        const hasAccess = await checkDeviceUsageAccess();
        if (!hasAccess) {
          setUsageStatus('Usage Access is not granted. Enable it in Android Settings to read app usage.');
        } else if (preferences.usageTrackingEnabled) {
          await syncDeviceUsage(selectedDate);
        } else {
          setUsageStatus('Usage Access is granted; app-usage tracking is turned off in Solis.');
        }
      } catch (error) {
        console.error('Could not check Android Usage Access', error);
        setUsageStatus('Could not check Android Usage Access on this device.');
      }
    };
    void refreshUsageStatus();
    const syncWhenVisible = () => {
      if (document.visibilityState === 'visible') void refreshUsageStatus();
    };
    document.addEventListener('visibilitychange', syncWhenVisible);
    return () => document.removeEventListener('visibilitychange', syncWhenVisible);
  }, [isLoaded, preferences.usageTrackingEnabled, selectedDate, syncDeviceUsage]);

  const selectedDeviceUsage = deviceUsage?.date === selectedDate ? deviceUsage : null;

  const handleUpdateSavingsGoal = (goal: SavingsGoal) => {
    const wasComplete = savingsGoal.targetAmount > 0
      && savingsGoal.currentAmount >= savingsGoal.targetAmount;
    const isComplete = goal.targetAmount > 0 && goal.currentAmount >= goal.targetAmount;
    setSavingsGoal(goal);
    saveStoredSavingsGoal(goal);
    if (!wasComplete && isComplete && preferences.goalCompletionNotificationsEnabled) {
      void notifyGoalCompleted(
        'Savings goal reached',
        `${goal.title} is complete. Take a moment to celebrate.`,
        preferences.soundEnabled,
        preferences.vibrationEnabled,
        preferences.quietHoursStart,
        preferences.quietHoursEnd,
      ).then(() => {
        setFinanceStatus(`“${goal.title}” reached. Goal notification sent.`);
      }).catch((error) => {
        console.error('Could not notify about the completed savings goal', error);
        setFinanceStatus(error instanceof Error
          ? `Goal saved, but its notification could not be shown: ${error.message}`
          : 'Goal saved, but its notification could not be shown.');
      });
    }
  };

  const handleAddFinancialEntry = (entry: FinancialEntry) => {
    const updated = [entry, ...financialEntries];
    setFinancialEntries(updated);
    saveStoredFinancialEntries(updated);
  };

  const handleAddLoan = (loan: LoanEntry) => {
    const updated = [loan, ...loans];
    setLoans(updated);
    saveStoredLoans(updated);
  };

  const handleSettleLoan = (id: string) => {
    const updated = loans.map((loan) => loan.id === id
      ? { ...loan, status: 'settled' as const, settledAt: Date.now() }
      : loan);
    setLoans(updated);
    saveStoredLoans(updated);
  };

  const handleAddTask = async (task: PlannedTask) => {
    const updated = [...tasks, task];
    setTasks(updated);
    saveStoredTasks(updated);
    if (task.reminderEnabled) {
      try {
        const scheduled = await scheduleTaskReminder(task);
        setReminderStatus(scheduled
          ? `Reminder set for ${task.time}. Solis will ask whether you completed “${task.title}”.`
          : 'Task saved, but its one-time reminder was not scheduled because that time has passed.');
      } catch (error) {
        console.error('Could not schedule task reminder', error);
        setReminderStatus(error instanceof Error
          ? `Task saved, but its reminder could not be set: ${error.message}`
          : 'Task saved, but its reminder could not be set. Check notification permission.');
      }
    } else {
      setReminderStatus('Task saved without a reminder.');
    }
  };

  const handleToggleTask = (task: PlannedTask, date: string) => {
    const isComplete = task.completedDates.includes(date);
    const completedDates = isComplete
      ? task.completedDates.filter((completedDate) => completedDate !== date)
      : [...task.completedDates, date];
    const checkinResponses = { ...(task.checkinResponses ?? {}) };
    if (isComplete) delete checkinResponses[date];
    else checkinResponses[date] = 'completed';
    const updated = tasks.map((item) => item.id === task.id ? {
      ...item,
      completedDates,
      skippedDates: (item.skippedDates ?? []).filter((skippedDate) => skippedDate !== date),
      checkinResponses,
    } : item);
    setTasks(updated);
    saveStoredTasks(updated);
    setReminderStatus(isComplete
      ? `“${task.title}” marked not complete for ${date}.`
      : `“${task.title}” checked in as complete for ${date}.`);
    if (pendingTaskId === task.id) setPendingTaskId(null);
    void rescheduleTaskAfterCheckin(task, date, !isComplete).catch((error) => {
      console.error('Could not update task reminder after check-in', error);
      setReminderStatus('Task check-in saved, but its next reminder could not be updated.');
    });
  };

  const handleDeleteTask = (id: string) => {
    const updated = tasks.filter((task) => task.id !== id);
    setTasks(updated);
    saveStoredTasks(updated);
    if (pendingTaskId === id) setPendingTaskId(null);
    void cancelTaskReminder(id).catch((error) => {
      console.error('Could not cancel task reminder', error);
      setReminderStatus('Task deleted, but its system reminder could not be cancelled.');
    });
  };

  const handleDataReset = () => {
    const loaded = loadStoredActivities();
    const prefs = loadStoredPreferences();
    const loadedGoal = loadStoredSavingsGoal();
    const loadedFin = loadStoredFinancialEntries();
    const loadedTasks = loadStoredTasks();
    const loadedLoans = loadStoredLoans();

    setEntries(loaded);
    setPreferences(prefs);
    setSavingsGoal(loadedGoal);
    setFinancialEntries(loadedFin);
    setTasks(loadedTasks);
    setLoans(loadedLoans);
    if (loadedTasks.some((task) => task.reminderEnabled)) {
      void requestReminderPermission()
        .then((granted) => {
          if (!granted) throw new Error('Notification permission was not granted.');
          return Promise.all(loadedTasks.filter((task) => task.reminderEnabled).map((task) => scheduleTaskReminder(task)));
        })
        .then(() => setReminderStatus('Imported task reminders have been restored.'))
        .catch((error) => {
          console.error('Could not restore reminders from the imported backup', error);
          setReminderStatus('Backup restored, but one or more task reminders could not be restored.');
        });
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-500">
        <div className="flex items-center gap-3 rounded-3xl border border-amber-100 bg-white/80 px-5 py-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/80">
          <SolisMark className="h-11 w-11 animate-pulse" />
          <span className="text-sm font-medium">Getting your day ready…</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-slate-50/70 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors flex flex-col font-sans ${
      preferences.themeStyle === 'clean-minimal' ? 'font-sans' : 'tracking-normal'
    }`}>
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
      />

      {/* Main Content Container */}
      <main
        className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 pb-24 space-y-6"
        onTouchStart={(event) => {
          const target = event.target;
          if (target instanceof Element && target.closest('button, input, select, textarea, [role="slider"]')) {
            swipeStart.current = null;
            return;
          }
          const touch = event.touches[0];
          swipeStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
        }}
        onTouchEnd={(event) => {
          const start = swipeStart.current;
          swipeStart.current = null;
          const touch = event.changedTouches[0];
          if (!start || !touch) return;
          const deltaX = touch.clientX - start.x;
          const deltaY = Math.abs(touch.clientY - start.y);
          if (Math.abs(deltaX) < 80 || deltaY > 55 || activeTab === 'settings') return;
          const currentIndex = mainTabs.indexOf(activeTab);
          const nextIndex = Math.min(mainTabs.length - 1, Math.max(0, currentIndex + (deltaX < 0 ? 1 : -1)));
          if (nextIndex !== currentIndex) setActiveTab(mainTabs[nextIndex]);
        }}
      >
        {notificationFeedback && (
          <div role="status" className="flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
            <span>{notificationFeedback}</span>
            <button type="button" onClick={() => setNotificationFeedback('')} aria-label="Dismiss notification status" className="font-bold">×</button>
          </div>
        )}
        {activeTab === 'timeline' && (
          <DailyTimeline
            date={selectedDate}
            entries={entries}
            tasks={tasks}
            deviceUsage={selectedDeviceUsage}
            usageTrackingEnabled={preferences.usageTrackingEnabled}
            usageStatus={usageStatus}
            isUsageRefreshing={isUsageRefreshing}
            onRefreshUsage={() => syncDeviceUsage(selectedDate)}
            preferences={preferences}
            onDeleteEntry={handleDeleteActivity}
            onNavigateToLog={() => {
              setPlanMode('log');
              setActiveTab('tasks');
            }}
            onNavigateToTimer={() => setActiveTab('timer')}
          />
        )}

        {activeTab === 'timer' && (
          <FocusTimer
            preferences={preferences}
            onSaveSession={handleSaveActivity}
            onViewTimeline={() => setActiveTab('timeline')}
          />
        )}

        {activeTab === 'tasks' && (
          <PlanHub
            mode={planMode}
            onModeChange={setPlanMode}
            selectedDate={selectedDate}
            tasks={tasks}
            reminderStatus={reminderStatus}
            pendingTaskId={pendingTaskId}
            preferences={preferences}
            onAddTask={handleAddTask}
            onToggleTask={handleToggleTask}
            onDeleteTask={handleDeleteTask}
            onDismissCheckin={() => setPendingTaskId(null)}
            onSaveEntry={handleSaveActivity}
            onViewToday={() => setActiveTab('timeline')}
          />
        )}

        {activeTab === 'finance' && (
          <FinancialGoalsView
            statusMessage={financeStatus}
            savingsGoal={savingsGoal}
            financialEntries={financialEntries}
            loans={loans}
            preferences={preferences}
            onUpdateSavingsGoal={handleUpdateSavingsGoal}
            onAddFinancialEntry={handleAddFinancialEntry}
            onAddLoan={handleAddLoan}
            onSettleLoan={handleSettleLoan}
          />
        )}

        {activeTab === 'settings' && (
          <PrivacySettingsModal
            preferences={preferences}
            onUpdatePreferences={handleUpdatePreferences}
            onDataReset={handleDataReset}
            deviceUsage={selectedDeviceUsage}
            usageStatus={usageStatus}
            encouragementStatus={encouragementStatus}
            onRequestUsageAccess={handleRequestUsageAccess}
            onSyncDeviceUsage={() => syncDeviceUsage(selectedDate)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 dark:border-slate-800/80 py-5 text-center text-xs text-slate-400 dark:text-slate-500 bg-white/40 dark:bg-slate-900/40">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>Solis • Activity is stored locally; Gemini sharing is optional.</p>
        </div>
      </footer>
    </div>
  );
}
