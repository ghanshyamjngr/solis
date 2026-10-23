/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { DailyTimeline } from './components/DailyTimeline';
import { FocusTimer } from './components/FocusTimer';
import { ActivityLogger } from './components/ActivityLogger';
import { LivingWidgetsStudio } from './components/LivingWidgetsStudio';
import { FinancialGoalsView } from './components/FinancialGoalsView';
import { ArchitecturePlanView } from './components/ArchitecturePlanView';
import { PrivacySettingsModal } from './components/PrivacySettingsModal';
import { InteractiveNotificationBanner } from './components/InteractiveNotificationBanner';
import {
  ActivityEntry,
  DailyHabits,
  FinancialEntry,
  InteractiveNotification,
  NotificationContextType,
  SavingsGoal,
  UserPreferences,
} from './types';
import {
  loadStoredActivities,
  saveStoredActivities,
  loadStoredPreferences,
  saveStoredPreferences,
  loadStoredHabits,
  saveStoredHabits,
  loadStoredSavingsGoal,
  saveStoredSavingsGoal,
  loadStoredFinancialEntries,
  saveStoredFinancialEntries,
  DEFAULT_PREFERENCES,
  DEFAULT_SAVINGS_GOAL,
} from './utils/storage';
import { getTodayDateString } from './utils/timeline';
import { playGentleBell } from './utils/audio';

export default function App() {
  const [activeTab, setActiveTab] = useState<'timeline' | 'timer' | 'log' | 'widgets' | 'finance' | 'architecture' | 'privacy'>('timeline');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [habits, setHabits] = useState<DailyHabits>({ date: getTodayDateString(), waterGlasses: 4, waterTarget: 8, mindfulBreaksCount: 2, impulseFreeDay: true });
  const [savingsGoal, setSavingsGoal] = useState<SavingsGoal>(DEFAULT_SAVINGS_GOAL);
  const [financialEntries, setFinancialEntries] = useState<FinancialEntry[]>([]);
  const [activeNotification, setActiveNotification] = useState<InteractiveNotification | null>(null);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  // Initialize data on mount
  useEffect(() => {
    const loadedEntries = loadStoredActivities();
    const loadedPrefs = loadStoredPreferences();
    const loadedHabits = loadStoredHabits();
    const loadedGoal = loadStoredSavingsGoal();
    const loadedFin = loadStoredFinancialEntries();

    setEntries(loadedEntries);
    setPreferences(loadedPrefs);
    setHabits(loadedHabits);
    setSavingsGoal(loadedGoal);
    setFinancialEntries(loadedFin);
    setIsLoaded(true);

    // Initial greeting notification for demonstration
    setTimeout(() => {
      setActiveNotification({
        id: 'notif-init',
        type: 'momentum',
        title: 'Daily Attention Check-in',
        message: 'You have focused for 50 minutes and lived 1h 20m offline today 🌱 Keep going if you feel good, or pause for water.',
        timestamp: 'Just now',
        primaryAction: {
          label: 'Drink Water (+1)',
          actionType: 'drink_water',
        },
        secondaryAction: {
          label: 'Start Focus',
          actionType: 'start_focus',
        },
      });
    }, 1500);
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

  const handleUpdateHabits = (updated: DailyHabits) => {
    setHabits(updated);
    saveStoredHabits(updated);
  };

  const handleUpdateSavingsGoal = (goal: SavingsGoal) => {
    setSavingsGoal(goal);
    saveStoredSavingsGoal(goal);
  };

  const handleAddFinancialEntry = (entry: FinancialEntry) => {
    const updated = [entry, ...financialEntries];
    setFinancialEntries(updated);
    saveStoredFinancialEntries(updated);
  };

  const handleQuickLog = (category: any, title: string, durationMinutes: number) => {
    const now = new Date();
    const endH = now.getHours().toString().padStart(2, '0');
    const endM = now.getMinutes().toString().padStart(2, '0');
    const endTime = `${endH}:${endM}`;

    const startDate = new Date(now.getTime() - durationMinutes * 60000);
    const startH = startDate.getHours().toString().padStart(2, '0');
    const startM = startDate.getMinutes().toString().padStart(2, '0');
    const startTime = `${startH}:${startM}`;

    const newEntry: ActivityEntry = {
      id: `act-${Date.now()}`,
      category,
      title,
      startTime,
      endTime,
      date: getTodayDateString(),
      durationMinutes,
      createdAt: Date.now(),
    };

    handleSaveActivity(newEntry);
    playGentleBell(preferences.soundEnabled);
  };

  const handleTriggerNotification = (type: NotificationContextType) => {
    playGentleBell(preferences.soundEnabled);
    switch (type) {
      case 'momentum':
        setActiveNotification({
          id: `notif-${Date.now()}`,
          type: 'momentum',
          title: 'Building Steady Momentum 🌱',
          message: 'You have focused with clarity for 35 minutes. Keep going if you feel good — you are making real progress.',
          timestamp: 'Just now',
          primaryAction: {
            label: 'Keep Going',
            actionType: 'start_focus',
          },
          secondaryAction: {
            label: 'Take 5m Breather',
            actionType: 'log_break',
          },
        });
        break;
      case 'distraction_checkin':
        setActiveNotification({
          id: `notif-${Date.now()}`,
          type: 'distraction_checkin',
          title: 'Gentle Check-in 👀',
          message: 'Was this your plan, or did your attention drift here? You can return to your chosen goal whenever you are ready.',
          timestamp: 'Just now',
          primaryAction: {
            label: 'Return to Focus',
            actionType: 'start_focus',
          },
          secondaryAction: {
            label: 'Extend Rest',
            actionType: 'log_break',
          },
        });
        break;
      case 'rest_suggestion':
        setActiveNotification({
          id: `notif-${Date.now()}`,
          type: 'rest_suggestion',
          title: 'Rest Counts Too 💛',
          message: 'You have put in solid mental effort today. A short pause, fresh water, or stretching your shoulders will recharge you.',
          timestamp: 'Just now',
          primaryAction: {
            label: 'Drink Water (+1)',
            actionType: 'drink_water',
          },
          secondaryAction: {
            label: 'Log 15m Break',
            actionType: 'log_break',
          },
        });
        break;
      case 'offline_celebration':
        setActiveNotification({
          id: `notif-${Date.now()}`,
          type: 'offline_celebration',
          title: 'Another Moment Lived Offline ✨',
          message: 'Your day is bigger than your screen. Walking outdoors, talking with loved ones, and offline living count equally.',
          timestamp: 'Just now',
          primaryAction: {
            label: 'Log 30m Walk',
            actionType: 'log_offline',
          },
          secondaryAction: {
            label: 'Dismiss',
            actionType: 'dismiss',
          },
        });
        break;
    }
  };

  const handleNotificationAction = (actionType: string) => {
    switch (actionType) {
      case 'drink_water':
        handleUpdateHabits({ ...habits, waterGlasses: habits.waterGlasses + 1 });
        setActiveNotification(null);
        break;
      case 'start_focus':
        setActiveTab('timer');
        setActiveNotification(null);
        break;
      case 'log_break':
        handleQuickLog('break', 'Mindful 15m Reset Pause', 15);
        setActiveNotification(null);
        break;
      case 'log_offline':
        handleQuickLog('nature', 'Outdoor Sun Walk', 30);
        setActiveNotification(null);
        break;
      case 'dismiss':
      default:
        setActiveNotification(null);
        break;
    }
  };

  const handleDataReset = () => {
    const loaded = loadStoredActivities();
    const prefs = loadStoredPreferences();
    const loadedHabits = loadStoredHabits();
    const loadedGoal = loadStoredSavingsGoal();
    const loadedFin = loadStoredFinancialEntries();

    setEntries(loaded);
    setPreferences(prefs);
    setHabits(loadedHabits);
    setSavingsGoal(loadedGoal);
    setFinancialEntries(loadedFin);
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
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Interactive Behavior-Aware Notification Toast */}
        <InteractiveNotificationBanner
          notification={activeNotification}
          onDismiss={() => setActiveNotification(null)}
          onAction={handleNotificationAction}
          onTriggerPreset={handleTriggerNotification}
        />

        {activeTab === 'timeline' && (
          <DailyTimeline
            date={selectedDate}
            entries={entries}
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

        {activeTab === 'log' && (
          <ActivityLogger
            selectedDate={selectedDate}
            preferences={preferences}
            onSaveEntry={handleSaveActivity}
            onViewTimeline={() => setActiveTab('timeline')}
          />
        )}

        {activeTab === 'widgets' && (
          <LivingWidgetsStudio
            entries={entries}
            habits={habits}
            savingsGoal={savingsGoal}
            preferences={preferences}
            onUpdateHabits={handleUpdateHabits}
            onQuickLog={handleQuickLog}
            onStartFocusTimer={() => setActiveTab('timer')}
          />
        )}

        {activeTab === 'finance' && (
          <FinancialGoalsView
            savingsGoal={savingsGoal}
            financialEntries={financialEntries}
            preferences={preferences}
            onUpdateSavingsGoal={handleUpdateSavingsGoal}
            onAddFinancialEntry={handleAddFinancialEntry}
          />
        )}

        {activeTab === 'architecture' && (
          <ArchitecturePlanView />
        )}

        {activeTab === 'privacy' && (
          <PrivacySettingsModal
            preferences={preferences}
            onUpdatePreferences={handleUpdatePreferences}
            onDataReset={handleDataReset}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 dark:border-slate-800/80 py-5 text-center text-xs text-slate-400 dark:text-slate-500 bg-white/40 dark:bg-slate-900/40">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>Solis • Whole-Day Life OS & Focus Companion • 100% On-Device & Non-Shaming</p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('widgets')}
              className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors underline"
            >
              Living Widgets
            </button>
            <span>•</span>
            <button
              onClick={() => setActiveTab('finance')}
              className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors underline"
            >
              Financial Goals
            </button>
            <span>•</span>
            <button
              onClick={() => setActiveTab('architecture')}
              className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors underline"
            >
              Multi-Platform Roadmap
            </button>
            <span>•</span>
            <button
              onClick={() => setActiveTab('privacy')}
              className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors underline"
            >
              Data & Export
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
