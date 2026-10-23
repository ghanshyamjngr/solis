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

export type ThemeStyle = 'clean-minimal' | 'playful-animated';
export type AccentColor = 'amber' | 'sage' | 'ocean' | 'lavender' | 'coral';

export interface UserPreferences {
  themeStyle: ThemeStyle;
  accentColor: AccentColor;
  darkMode: boolean;
  soundEnabled: boolean;
  quietHoursStart: string; // '22:00'
  quietHoursEnd: string;   // '07:00'
  encouragementTone: 'gentle' | 'poetic' | 'practical' | 'off';
  dailyFocusGoalMinutes: number;
  dailyOfflineGoalMinutes: number;
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
}

export interface FinancialEntry {
  id: string;
  date: string;
  amountSaved: number;
  note: string;
  type: 'saved' | 'spent_mindfully' | 'impulse_avoided';
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
