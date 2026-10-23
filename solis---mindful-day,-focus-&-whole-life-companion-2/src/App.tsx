/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { DailyTimeline } from './components/DailyTimeline';
import { FocusTimer } from './components/FocusTimer';
import { ActivityLogger } from './components/ActivityLogger';
import { FinancialGoalsView } from './components/FinancialGoalsView';
import { PrivacySettingsModal } from './components/PrivacySettingsModal';
import { TaskManager } from './components/TaskManager';
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
import { cancelTaskReminder, consumePendingTaskReminder, requestReminderPermission, rescheduleTaskAfterCheckin, restoreGrantedWebReminders, scheduleTaskReminder, updateTaskWidget } from './utils/taskReminders';

export default function App() {
  const [activeTab, setActiveTab] = useState<'timeline' | 'tasks' | 'timer' | 'log' | 'finance' | 'settings'>('timeline');
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
  const [reminderStatus, setReminderStatus] = useState('Task reminders are optional. Android reminders can arrive while Solis is closed; browser reminders require Solis to stay open.');
  const [deviceUsage, setDeviceUsage] = useState<DailyDeviceUsage | null>(null);
  const [usageStatus, setUsageStatus] = useState('Android app usage tracking is off.');
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

  // Sync dark mode class on documentElement
  useEffect(() => {
    if (preferences.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [preferences.darkMode]);

  const handleSaveActivity = (entry: ActivityEntry) => {
    const updated = [entry, ...entries];
    setEntries(updated);
    saveStoredActivities(updated);
  };

  const handleDeleteActivity = (id: string) => {
    const updated = entries.filter((e) => e.id !== id);
    setEntries(updated);
    saveStoredActivities(updated);
  };

  const handleUpdatePreferences = (updates: Partial<UserPreferences>) => {
    const updated = { ...preferences, ...updates };
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
    void consumePendingTaskReminder()
      .then(({ taskId, openTasks }) => {
        openCheckin(taskId);
        if (openTasks) setActiveTab('tasks');
      })
      .catch((error) => console.error('Could not open task reminder check-in', error));
    const onWebReminder = (event: Event) => {
      const reminderEvent = event as CustomEvent<{ taskId?: string }>;
      openCheckin(reminderEvent.detail?.taskId ?? null);
    };
    window.addEventListener('solis-task-reminder', onWebReminder);
    return () => window.removeEventListener('solis-task-reminder', onWebReminder);
  }, [isLoaded]);

  const syncDeviceUsage = useCallback(async (date: string) => {
    if (!isAndroidApp()) {
      setUsageStatus('Android Usage Access is only available in the Android app. Website-level tracking is not available.');
      return;
    }
    if (!preferences.usageTrackingEnabled) {
      setUsageStatus('Android app usage tracking is off.');
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
    setSavingsGoal(goal);
    saveStoredSavingsGoal(goal);
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
    const updated = tasks.map((item) => item.id === task.id ? { ...item, completedDates } : item);
    setTasks(updated);
    saveStoredTasks(updated);
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
        <span className="text-sm font-medium animate-pulse">Awakening Solis...</span>
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
        preferences={preferences}
        onUpdatePreferences={handleUpdatePreferences}
      />

      {/* Main Content Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 pb-24 space-y-6">
        {activeTab === 'timeline' && (
          <DailyTimeline
            date={selectedDate}
            entries={entries}
            tasks={tasks}
            deviceUsage={selectedDeviceUsage}
            usageTrackingEnabled={preferences.usageTrackingEnabled}
            usageStatus={usageStatus}
            preferences={preferences}
            onDeleteEntry={handleDeleteActivity}
            onNavigateToLog={() => setActiveTab('log')}
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
          <TaskManager
            selectedDate={selectedDate}
            tasks={tasks}
            reminderStatus={reminderStatus}
            pendingTaskId={pendingTaskId}
            onAddTask={handleAddTask}
            onToggleTask={handleToggleTask}
            onDeleteTask={handleDeleteTask}
            onDismissCheckin={() => setPendingTaskId(null)}
          />
        )}

        {activeTab === 'log' && (
          <ActivityLogger
            selectedDate={selectedDate}
            preferences={preferences}
            onSaveEntry={handleSaveActivity}
            onViewTimeline={() => setActiveTab('timeline')}
          />
        )}

        {activeTab === 'finance' && (
          <FinancialGoalsView
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
