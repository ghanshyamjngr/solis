import { ActivityEntry, DailyDeviceUsage, DailyHabits, FinancialEntry, LoanEntry, PlannedTask, SavingsGoal, UserPreferences } from '../types';
import { getTodayDateString } from './timeline';

const STORAGE_KEYS = {
  ACTIVITIES: 'solis_activity_entries_v1',
  PREFERENCES: 'solis_user_preferences_v1',
  HABITS: 'solis_daily_habits_v1',
  SAVINGS_GOAL: 'solis_savings_goal_v1',
  FINANCES: 'solis_financial_entries_v1',
  TASKS: 'solis_planned_tasks_v1',
  LOANS: 'solis_loan_entries_v1',
  DEVICE_USAGE_PREFIX: 'solis_android_usage_v1_',
};

export const DEFAULT_PREFERENCES: UserPreferences = {
  themeStyle: 'playful-animated',
  accentColor: 'amber',
  statsGraphStyle: 'bar',
  appearanceMode: 'system',
  darkMode: false,
  soundEnabled: true,
  vibrationEnabled: true,
  goalCompletionNotificationsEnabled: true,
  usageEncouragementNotificationsEnabled: false,
  usageEncouragementThresholdMinutes: 120,
  usageEncouragementFrequencyDays: 1,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:30',
  encouragementTone: 'gentle',
  dailyFocusGoalMinutes: 120,
  dailyOfflineGoalMinutes: 180,
  aiDataSharingConsent: false,
  aiUsageDataSharingConsent: false,
  usageTrackingEnabled: false,
  profileName: '',
  personalGoals: '',
  dailyRoutine: '',
};

export const DEFAULT_SAVINGS_GOAL: SavingsGoal = {
  id: 'goal-default',
  title: 'Add a savings goal',
  targetAmount: 0,
  currentAmount: 0,
  category: 'Personal',
  currency: 'USD',
};

export function loadStoredTasks(): PlannedTask[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TASKS);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    const valid = parsed.filter((task) => task
      && typeof task.id === 'string'
      && typeof task.title === 'string'
      && typeof task.date === 'string'
      && typeof task.time === 'string');
    if (valid.length !== parsed.length) {
      console.warn(`Ignored ${parsed.length - valid.length} invalid planned task record(s).`);
    }
    return valid.map((task) => ({
      id: task.id,
      title: task.title,
      date: task.date,
      time: task.time,
      repeat: ['daily', 'weekly'].includes(task.repeat) ? task.repeat : 'never',
      reminderEnabled: task.reminderEnabled === true,
      completedDates: Array.isArray(task.completedDates)
        ? task.completedDates.filter((date: unknown): date is string => typeof date === 'string')
        : [],
      skippedDates: Array.isArray(task.skippedDates)
        ? task.skippedDates.filter((date: unknown): date is string => typeof date === 'string')
        : [],
      checkinResponses: task.checkinResponses && typeof task.checkinResponses === 'object'
        ? task.checkinResponses
        : {},
      createdAt: Number.isFinite(task.createdAt) ? task.createdAt : Date.now(),
    }));
  } catch (error) {
    console.error('Failed to load planned tasks from localStorage', error);
    return [];
  }
}

export function saveStoredTasks(tasks: PlannedTask[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
  } catch (error) {
    console.error('Failed to save planned tasks to localStorage', error);
  }
}

export function loadStoredLoans(): LoanEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LOANS);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Failed to load lending records from localStorage', error);
    return [];
  }
}

export function saveStoredLoans(loans: LoanEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.LOANS, JSON.stringify(loans));
  } catch (error) {
    console.error('Failed to save lending records to localStorage', error);
  }
}

export function loadStoredActivities(): ActivityEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACTIVITIES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.map((entry) =>
          /^seed-[1-6]$/.test(entry.id) && !entry.source
            ? { ...entry, source: 'demo' as const }
            : entry
        )
      : [];
  } catch (err) {
    console.error('Failed to load activities from localStorage', err);
    return [];
  }
}

export function saveStoredActivities(entries: ActivityEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(entries));
  } catch (err) {
    console.error('Failed to save activities to localStorage', err);
  }
}

export function loadStoredPreferences(): UserPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PREFERENCES);
    if (!raw) return DEFAULT_PREFERENCES;
    const stored = JSON.parse(raw);
    return {
      ...DEFAULT_PREFERENCES,
      ...stored,
      statsGraphStyle: ['bar', 'line', 'donut'].includes(stored.statsGraphStyle)
        ? stored.statsGraphStyle
        : DEFAULT_PREFERENCES.statsGraphStyle,
      profileName: typeof stored.profileName === 'string' ? stored.profileName.slice(0, 80) : '',
      personalGoals: typeof stored.personalGoals === 'string' ? stored.personalGoals.slice(0, 500) : '',
      dailyRoutine: typeof stored.dailyRoutine === 'string' ? stored.dailyRoutine.slice(0, 500) : '',
      appearanceMode: stored.appearanceMode
        ?? (stored.darkMode === true ? 'dark' : stored.darkMode === false ? 'light' : DEFAULT_PREFERENCES.appearanceMode),
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function saveStoredPreferences(prefs: UserPreferences): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(prefs));
  } catch (err) {
    console.error('Failed to save preferences to localStorage', err);
  }
}

export function loadStoredHabits(date = getTodayDateString()): DailyHabits {
  if (typeof window === 'undefined') {
    return { date, waterGlasses: 0, waterTarget: 8, mindfulBreaksCount: 0, impulseFreeDay: false };
  }
  try {
    const raw = localStorage.getItem(`${STORAGE_KEYS.HABITS}_${date}`);
    if (!raw) {
      return { date, waterGlasses: 0, waterTarget: 8, mindfulBreaksCount: 0, impulseFreeDay: false };
    }
    return JSON.parse(raw);
  } catch {
    return { date, waterGlasses: 0, waterTarget: 8, mindfulBreaksCount: 0, impulseFreeDay: false };
  }
}

export function saveStoredHabits(habits: DailyHabits): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${STORAGE_KEYS.HABITS}_${habits.date}`, JSON.stringify(habits));
  } catch (err) {
    console.error('Failed to save habits to localStorage', err);
  }
}

export function loadStoredSavingsGoal(): SavingsGoal {
  if (typeof window === 'undefined') return DEFAULT_SAVINGS_GOAL;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SAVINGS_GOAL);
    if (!raw) return DEFAULT_SAVINGS_GOAL;
    return JSON.parse(raw);
  } catch {
    return DEFAULT_SAVINGS_GOAL;
  }
}

export function saveStoredSavingsGoal(goal: SavingsGoal): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.SAVINGS_GOAL, JSON.stringify(goal));
  } catch (err) {
    console.error('Failed to save savings goal to localStorage', err);
  }
}

export function loadStoredFinancialEntries(): FinancialEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.FINANCES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.map((entry) =>
          ['fin-1', 'fin-2'].includes(entry.id) && !entry.source
            ? { ...entry, source: 'demo' as const }
            : entry
        )
      : [];
  } catch {
    return [];
  }
}

export function saveStoredFinancialEntries(entries: FinancialEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.FINANCES, JSON.stringify(entries));
  } catch (err) {
    console.error('Failed to save financial entries to localStorage', err);
  }
}

export function loadStoredDeviceUsage(date = getTodayDateString()): DailyDeviceUsage | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`${STORAGE_KEYS.DEVICE_USAGE_PREFIX}${date}`);
    return raw ? JSON.parse(raw) as DailyDeviceUsage : null;
  } catch (err) {
    console.error('Failed to load Android usage data from localStorage', err);
    return null;
  }
}

export function saveStoredDeviceUsage(usage: DailyDeviceUsage): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${STORAGE_KEYS.DEVICE_USAGE_PREFIX}${usage.date}`, JSON.stringify(usage));
  } catch (err) {
    console.error('Failed to save Android usage data to localStorage', err);
  }
}

export function loadRecentStoredDeviceUsage(endDate: string, dayCount = 7): DailyDeviceUsage[] {
  if (typeof window === 'undefined' || !Number.isInteger(dayCount) || dayCount < 1) return [];
  const [year, month, day] = endDate.split('-').map(Number);
  const cursor = new Date(year, month - 1, day);
  const snapshots: DailyDeviceUsage[] = [];
  for (let offset = dayCount - 1; offset >= 0; offset -= 1) {
    const date = new Date(cursor);
    date.setDate(date.getDate() - offset);
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const usage = loadStoredDeviceUsage(dateKey);
    if (usage) snapshots.push(usage);
  }
  return snapshots;
}

function loadAllStoredDeviceUsage(): DailyDeviceUsage[] {
  if (typeof window === 'undefined') return [];
  const snapshots: DailyDeviceUsage[] = [];
  for (let index = 0; index < localStorage.length; index++) {
    const key = localStorage.key(index);
    if (!key?.startsWith(STORAGE_KEYS.DEVICE_USAGE_PREFIX)) continue;
    const date = key.slice(STORAGE_KEYS.DEVICE_USAGE_PREFIX.length);
    const snapshot = loadStoredDeviceUsage(date);
    if (snapshot) snapshots.push(snapshot);
  }
  return snapshots;
}

export function exportDataAsJSON(): string {
  const activities = loadStoredActivities();
  const preferences = loadStoredPreferences();
  const savingsGoal = loadStoredSavingsGoal();
  const financialEntries = loadStoredFinancialEntries();
  const todayHabits = loadStoredHabits();

  const exportPayload = {
    version: '1.2.0',
    exportedAt: new Date().toISOString(),
    privacyNotice: 'This backup contains data stored locally on this device. If Gemini sharing was enabled, previously transmitted data is not recalled by exporting or changing this setting.',
    activities,
    preferences,
    savingsGoal,
    financialEntries,
    tasks: loadStoredTasks(),
    loans: loadStoredLoans(),
    deviceUsage: loadAllStoredDeviceUsage(),
    todayHabits,
  };
  return JSON.stringify(exportPayload, null, 2);
}

export function importDataFromJSON(jsonString: string): { success: boolean; count?: number; error?: string } {
  try {
    const data = JSON.parse(jsonString);
    if (!data || !Array.isArray(data.activities)) {
      return { success: false, error: 'Invalid backup format. Missing activities list.' };
    }
    saveStoredActivities(data.activities);
    if (data.preferences) {
      const importedPreferences = { ...DEFAULT_PREFERENCES, ...data.preferences };
      if (!data.preferences.appearanceMode) {
        importedPreferences.appearanceMode = data.preferences.darkMode === true ? 'dark' : 'light';
      }
      saveStoredPreferences(importedPreferences);
    }
    if (data.savingsGoal) {
      saveStoredSavingsGoal(data.savingsGoal);
    }
    if (Array.isArray(data.financialEntries)) {
      saveStoredFinancialEntries(data.financialEntries);
    }
    if (Array.isArray(data.tasks)) {
      saveStoredTasks(data.tasks);
    }
    if (Array.isArray(data.loans)) {
      saveStoredLoans(data.loans);
    }
    if (Array.isArray(data.deviceUsage)) {
      data.deviceUsage.forEach((usage: DailyDeviceUsage) => saveStoredDeviceUsage(usage));
    }
    return { success: true, count: data.activities.length };
  } catch (e: unknown) {
    return { success: false, error: (e as Error).message || 'Failed to parse JSON file' };
  }
}

export function wipeAllLocalData(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEYS.ACTIVITIES);
  localStorage.removeItem(STORAGE_KEYS.PREFERENCES);
  localStorage.removeItem(STORAGE_KEYS.SAVINGS_GOAL);
  localStorage.removeItem(STORAGE_KEYS.FINANCES);
  localStorage.removeItem(STORAGE_KEYS.TASKS);
  localStorage.removeItem(STORAGE_KEYS.LOANS);
  for (let index = localStorage.length - 1; index >= 0; index--) {
    const key = localStorage.key(index);
    if (key?.startsWith(STORAGE_KEYS.DEVICE_USAGE_PREFIX) || key?.startsWith(`${STORAGE_KEYS.HABITS}_`)) {
      localStorage.removeItem(key);
    }
  }
}
