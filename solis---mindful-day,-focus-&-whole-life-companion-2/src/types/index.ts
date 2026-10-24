export type ActivityCategory =
  | 'focus'
  | 'sleep'
  | 'meal'
  | 'break'
  | 'exercise'
  | 'offline'
  | 'reading'
  | 'nature'
  | 'social'
  | 'other';

export interface ActivityEntry {
  id: string;
  source?: 'manual' | 'tracked' | 'demo';
  category: ActivityCategory;
  title: string;
  startTime: string; // ISO String or HH:mm
  endTime: string;   // ISO String or HH:mm
  date: string;      // YYYY-MM-DD
  durationMinutes: number;
  notes?: string;
  tags?: string[];
  isFocusSession?: boolean;
  moodBefore?: 'calm' | 'distracted' | 'tired' | 'energized' | 'anxious' | 'neutral';
  moodAfter?: 'fulfilled' | 'steady' | 'refreshed' | 'tired' | 'proud' | 'neutral';
  createdAt: number;
}

export interface TrackedAppUsage {
  packageName: string;
  appName: string;
  appIconDataUrl?: string;
  isSystemApp?: boolean;
  totalTimeInForegroundMs: number;
  lastUsedAt: number;
  launchCount: number;
}

export interface TrackedScreenUsage {
  screenOnDurationMs: number;
  screenOnSessionCount: number;
  unlockCount: number;
  measurement: string;
}

export interface DailyDeviceUsage {
  date: string;
  syncedAt: number;
  measurementVersion?: number;
  apps: TrackedAppUsage[];
  screen: TrackedScreenUsage;
}

export type TaskRepeat = 'never' | 'daily' | 'weekly';

export interface PlannedTask {
  id: string;
  title: string;
  date: string;
  time: string;
  repeat: TaskRepeat;
  reminderEnabled: boolean;
  completedDates: string[];
  skippedDates?: string[];
  checkinResponses?: Record<string, 'completed' | 'postponed' | 'skipped'>;
  createdAt: number;
}

export type ThemeStyle = 'clean-minimal' | 'playful-animated' | 'soft-glass';
export type AccentColor = 'amber' | 'sage' | 'ocean' | 'lavender' | 'coral' | 'wallpaper';
export type AppearanceMode = 'system' | 'light' | 'dark';
export type StatsGraphStyle = 'bar' | 'line' | 'donut';

export interface UserPreferences {
  themeStyle: ThemeStyle;
  accentColor: AccentColor;
  statsGraphStyle: StatsGraphStyle;
  appearanceMode: AppearanceMode;
  darkMode: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  goalCompletionNotificationsEnabled: boolean;
  usageEncouragementNotificationsEnabled: boolean;
  usageEncouragementThresholdMinutes: number;
  usageEncouragementFrequencyDays: 1 | 2 | 7;
  quietHoursStart: string; // '22:00'
  quietHoursEnd: string;   // '07:00'
  encouragementTone: 'gentle' | 'poetic' | 'practical' | 'off';
  dailyFocusGoalMinutes: number;
  dailyOfflineGoalMinutes: number;
  aiDataSharingConsent: boolean;
  aiUsageDataSharingConsent: boolean;
  usageTrackingEnabled: boolean;
  profileName: string;
  firstName: string;
  lastName: string;
  profilePhotoDataUrl: string;
  profilePhotoPositionX: number;
  profilePhotoPositionY: number;
  personalGoals: string;
  dailyRoutine: string;
}

export interface DailyHabits {
  date: string; // YYYY-MM-DD
  waterGlasses: number; // target 8
  waterTarget: number;
  mindfulBreaksCount: number;
  impulseFreeDay: boolean;
}

export interface SavingsGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  category: string;
  targetDate?: string;
  currency?: string;
}

export interface FinancialEntry {
  id: string;
  source?: 'manual' | 'demo';
  date: string;
  amountSaved: number;
  note: string;
  type: 'saved' | 'spent_mindfully' | 'impulse_avoided';
  createdAt: number;
  currency?: string;
  relatedLoanId?: string;
}

export interface LoanEntry {
  id: string;
  person: string;
  direction: 'lent' | 'borrowed';
  amount: number;
  currency: string;
  date: string;
  dueDate?: string;
  note: string;
  status: 'pending' | 'settled';
  confirmedAt?: number;
  settledAt?: number;
  createdAt: number;
}

export interface AiDailyReflection {
  summary: string;
  encouragement: string;
  observedFacts: string[];
  gentleNudge?: string;
  harmonyScore: number; // 0 to 100
  generatedAt: number;
  source: 'gemini' | 'local-engine';
}

export type NotificationContextType =
  | 'momentum'
  | 'distraction_checkin'
  | 'rest_suggestion'
  | 'offline_celebration';

export interface InteractiveNotification {
  id: string;
  type: NotificationContextType;
  title: string;
  message: string;
  timestamp: string;
  primaryAction: {
    label: string;
    actionType: 'start_focus' | 'log_break' | 'log_offline' | 'drink_water' | 'dismiss';
  };
  secondaryAction?: {
    label: string;
    actionType: 'snooze' | 'dismiss';
  };
}
