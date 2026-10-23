import { ActivityEntry, DailyHabits, FinancialEntry, SavingsGoal, UserPreferences } from '../types';
import { generateSeedEntries, getTodayDateString } from './timeline';

const STORAGE_KEYS = {
  ACTIVITIES: 'solis_activity_entries_v1',
  PREFERENCES: 'solis_user_preferences_v1',
  HABITS: 'solis_daily_habits_v1',
  SAVINGS_GOAL: 'solis_savings_goal_v1',
  FINANCES: 'solis_financial_entries_v1',
};

export const DEFAULT_PREFERENCES: UserPreferences = {
  themeStyle: 'playful-animated',
  accentColor: 'amber',
  darkMode: false,
  soundEnabled: true,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:30',
  encouragementTone: 'gentle',
  dailyFocusGoalMinutes: 120,
  dailyOfflineGoalMinutes: 180,
};

export const DEFAULT_SAVINGS_GOAL: SavingsGoal = {
  id: 'goal-default',
  title: 'Mindful Sanctuary / Quiet Desk Workspace',
  targetAmount: 850,
  currentAmount: 420,
  category: 'Environment',
  targetDate: '2026-12-31',
};

export function loadStoredActivities(): ActivityEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACTIVITIES);
    if (!raw) {
      const seed = generateSeedEntries();
      saveStoredActivities(seed);
      return seed;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
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
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) };
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
    return { date, waterGlasses: 4, waterTarget: 8, mindfulBreaksCount: 2, impulseFreeDay: true };
  }
  try {
    const raw = localStorage.getItem(`${STORAGE_KEYS.HABITS}_${date}`);
    if (!raw) {
      const def: DailyHabits = { date, waterGlasses: 4, waterTarget: 8, mindfulBreaksCount: 2, impulseFreeDay: true };
      saveStoredHabits(def);
      return def;
    }
    return JSON.parse(raw);
  } catch {
    return { date, waterGlasses: 4, waterTarget: 8, mindfulBreaksCount: 2, impulseFreeDay: true };
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
    if (!raw) {
      const seeds: FinancialEntry[] = [
        { id: 'fin-1', date: getTodayDateString(), amountSaved: 18, note: 'Home-cooked lunch instead of takeaway', type: 'saved', createdAt: Date.now() - 100000 },
        { id: 'fin-2', date: getTodayDateString(), amountSaved: 35, note: 'Resisted online impulse shopping cart', type: 'impulse_avoided', createdAt: Date.now() - 50000 },
      ];
      saveStoredFinancialEntries(seeds);
      return seeds;
    }
    return JSON.parse(raw);
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

export function exportDataAsJSON(): string {
  const activities = loadStoredActivities();
  const preferences = loadStoredPreferences();
  const savingsGoal = loadStoredSavingsGoal();
  const financialEntries = loadStoredFinancialEntries();
  const todayHabits = loadStoredHabits();

  const exportPayload = {
    version: '1.2.0',
    exportedAt: new Date().toISOString(),
    privacyNotice: 'All data was stored strictly locally on your device.',
    activities,
    preferences,
    savingsGoal,
    financialEntries,
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
      saveStoredPreferences({ ...DEFAULT_PREFERENCES, ...data.preferences });
    }
    if (data.savingsGoal) {
      saveStoredSavingsGoal(data.savingsGoal);
    }
    if (Array.isArray(data.financialEntries)) {
      saveStoredFinancialEntries(data.financialEntries);
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
}
