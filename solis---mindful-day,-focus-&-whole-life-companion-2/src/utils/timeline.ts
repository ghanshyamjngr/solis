import { ActivityCategory, ActivityEntry } from '../types';

export function formatDuration(minutes: number): string {
  if (minutes < 0) minutes = 0;
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);

  if (hrs === 0) {
    return `${mins}m`;
  }
  if (mins === 0) {
    return `${hrs}h`;
  }
  return `${hrs}h ${mins}m`;
}

export function formatTimeDisplay(timeStr: string): string {
  if (!timeStr) return '';
  if (/^\d{2}:\d{2}$/.test(timeStr)) {
    const [h, m] = timeStr.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 === 0 ? 12 : h % 12;
    return `${displayH}:${m.toString().padStart(2, '0')} ${period}`;
  }
  try {
    const d = new Date(timeStr);
    if (!isNaN(d.getTime())) {
      let h = d.getHours();
      const m = d.getMinutes();
      const period = h >= 12 ? 'PM' : 'AM';
      h = h % 12 === 0 ? 12 : h % 12;
      return `${h}:${m.toString().padStart(2, '0')} ${period}`;
    }
  } catch {
    // fallback
  }
  return timeStr;
}

export function sortEntriesChronologically(entries: ActivityEntry[]): ActivityEntry[] {
  return [...entries].sort((a, b) => {
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    const timeA = a.startTime.length === 5 ? `${a.date}T${a.startTime}:00` : a.startTime;
    const timeB = b.startTime.length === 5 ? `${b.date}T${b.startTime}:00` : b.startTime;
    return timeA.localeCompare(timeB);
  });
}

export function calculateDayBreakdown(entries: ActivityEntry[]) {
  const totals: Record<ActivityCategory, number> = {
    focus: 0,
    sleep: 0,
    meal: 0,
    break: 0,
    exercise: 0,
    offline: 0,
    reading: 0,
    nature: 0,
    social: 0,
    other: 0,
  };

  for (const entry of entries) {
    const cat = entry.category || 'other';
    totals[cat] = (totals[cat] || 0) + (entry.durationMinutes || 0);
  }

  const focusMinutes = totals.focus;
  const offlineAndNature = totals.offline + totals.nature + totals.reading;
  const wellnessAndRest = totals.sleep + totals.break + totals.exercise + totals.meal + totals.social;
  const totalTracked = Object.values(totals).reduce((sum, val) => sum + val, 0);

  return {
    totals,
    focusMinutes,
    offlineAndNature,
    wellnessAndRest,
    totalTrackedMinutes: totalTracked,
  };
}

export interface CategoryBreakdownItem {
  category: ActivityCategory;
  label: string;
  minutes: number;
  formatted: string;
  count: number;
  percentage: number;
  color: string;
  badgeBg: string;
}

export interface DetailedInsightsResult {
  totalFocusMinutes: number;
  focusGoalProgress: number; // 0 - 100
  focusSessionCount: number;
  longestFocusSessionMinutes: number;
  totalOfflineMinutes: number;
  offlineGoalProgress: number;
  totalRestAndSleepMinutes: number;
  totalTrackedMinutes: number;
  categoryBreakdown: CategoryBreakdownItem[];
  harmonyScore: number; // 0 - 100
  lifeBalanceRatio: {
    focusPct: number;
    offlinePct: number;
    restPct: number;
    otherPct: number;
  };
  observedFacts: string[];
}

export function calculateDetailedInsights(
  entries: ActivityEntry[],
  dailyFocusGoalMinutes = 120,
  dailyOfflineGoalMinutes = 180
): DetailedInsightsResult {
  const categoryCounts: Record<ActivityCategory, number> = {
    focus: 0,
    sleep: 0,
    meal: 0,
    break: 0,
    exercise: 0,
    offline: 0,
    reading: 0,
    nature: 0,
    social: 0,
    other: 0,
  };

  const categoryMinutes: Record<ActivityCategory, number> = {
    focus: 0,
    sleep: 0,
    meal: 0,
    break: 0,
    exercise: 0,
    offline: 0,
    reading: 0,
    nature: 0,
    social: 0,
    other: 0,
  };

  let longestFocus = 0;
  let focusSessions = 0;

  for (const entry of entries) {
    const cat = entry.category || 'other';
    const mins = entry.durationMinutes || 0;
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    categoryMinutes[cat] = (categoryMinutes[cat] || 0) + mins;

    if (cat === 'focus' || entry.isFocusSession) {
      focusSessions += 1;
      if (mins > longestFocus) longestFocus = mins;
    }
  }

  const totalTracked = Object.values(categoryMinutes).reduce((a, b) => a + b, 0);
  const totalFocus = categoryMinutes.focus;
  const totalOffline = categoryMinutes.offline + categoryMinutes.nature + categoryMinutes.reading;
  const totalRest = categoryMinutes.sleep + categoryMinutes.break;

  const breakdown: CategoryBreakdownItem[] = [];
  const allCats: ActivityCategory[] = ['focus', 'sleep', 'offline', 'nature', 'meal', 'break', 'exercise', 'reading', 'social', 'other'];

  for (const cat of allCats) {
    const mins = categoryMinutes[cat];
    if (mins > 0) {
      const meta = getCategoryMetadata(cat);
      breakdown.push({
        category: cat,
        label: meta.label,
        minutes: mins,
        formatted: formatDuration(mins),
        count: categoryCounts[cat],
        percentage: totalTracked > 0 ? Math.round((mins / totalTracked) * 100) : 0,
        color: meta.color,
        badgeBg: meta.badgeBg,
      });
    }
  }

  // Sort breakdown descending by minutes
  breakdown.sort((a, b) => b.minutes - a.minutes);

  // Compute harmony score (healthy blend of rest, focus, and offline nourishment)
  let score = 50;
  if (totalFocus > 0) score += Math.min(25, (totalFocus / dailyFocusGoalMinutes) * 25);
  if (totalOffline > 0) score += Math.min(25, (totalOffline / dailyOfflineGoalMinutes) * 25);
  if (categoryMinutes.sleep >= 360) score += 10;
  if (categoryMinutes.break > 0 || categoryMinutes.meal > 0) score += 10;
  score = Math.min(100, Math.round(score));

  const focusPct = totalTracked > 0 ? Math.round((totalFocus / totalTracked) * 100) : 0;
  const offlinePct = totalTracked > 0 ? Math.round((totalOffline / totalTracked) * 100) : 0;
  const restPct = totalTracked > 0 ? Math.round((totalRest / totalTracked) * 100) : 0;
  const otherPct = Math.max(0, 100 - (focusPct + offlinePct + restPct));

  // Build strictly observed facts
  const observedFacts: string[] = [];
  if (totalFocus > 0) {
    observedFacts.push(`Recorded ${formatDuration(totalFocus)} of focused attention across ${focusSessions} session${focusSessions > 1 ? 's' : ''}.`);
  } else {
    observedFacts.push('No focus sessions logged yet today.');
  }

  if (totalOffline > 0) {
    observedFacts.push(`Spent ${formatDuration(totalOffline)} screen-free in offline living, reading, or nature.`);
  }

  if (categoryMinutes.sleep > 0) {
    observedFacts.push(`Logged ${formatDuration(categoryMinutes.sleep)} of sleep and recovery.`);
  }

  if (categoryCounts.break > 0) {
    observedFacts.push(`Paused for ${categoryCounts.break} mindful reset break${categoryCounts.break > 1 ? 's' : ''}.`);
  }

  return {
    totalFocusMinutes: totalFocus,
    focusGoalProgress: Math.min(100, Math.round((totalFocus / dailyFocusGoalMinutes) * 100)),
    focusSessionCount: focusSessions,
    longestFocusSessionMinutes: longestFocus,
    totalOfflineMinutes: totalOffline,
    offlineGoalProgress: Math.min(100, Math.round((totalOffline / dailyOfflineGoalMinutes) * 100)),
    totalRestAndSleepMinutes: totalRest,
    totalTrackedMinutes: totalTracked,
    categoryBreakdown: breakdown,
    harmonyScore: score,
    lifeBalanceRatio: {
      focusPct,
      offlinePct,
      restPct,
      otherPct,
    },
    observedFacts,
  };
}

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getRelativeDateLabel(dateStr: string): string {
  const today = getTodayDateString();
  if (dateStr === today) return 'Today';

  const [y, m, d] = dateStr.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  const [ty, tm, td] = today.split('-').map(Number);
  const todayDate = new Date(ty, tm - 1, td);

  const diffDays = Math.round((todayDate.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 1) return 'Yesterday';
  if (diffDays === -1) return 'Tomorrow';

  return target.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export function getCategoryMetadata(category: ActivityCategory) {
  switch (category) {
    case 'focus':
      return {
        label: 'Focus Session',
        color: 'indigo',
        bgClass: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
        badgeBg: 'bg-indigo-500',
        icon: 'Sparkles',
        description: 'Intentional work, learning or creative flow',
      };
    case 'sleep':
      return {
        label: 'Sleep & Rest',
        color: 'violet',
        bgClass: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
        badgeBg: 'bg-purple-500',
        icon: 'Moon',
        description: 'Night sleep, morning waking & restorative naps',
      };
    case 'offline':
      return {
        label: 'Offline Time',
        color: 'emerald',
        bgClass: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        badgeBg: 'bg-emerald-500',
        icon: 'Compass',
        description: 'Phone put away, screen-free living',
      };
    case 'nature':
      return {
        label: 'Nature & Outside',
        color: 'teal',
        bgClass: 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800',
        badgeBg: 'bg-teal-500',
        icon: 'Trees',
        description: 'Walks, sunlight, fresh air, plants',
      };
    case 'exercise':
      return {
        label: 'Movement',
        color: 'amber',
        bgClass: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        badgeBg: 'bg-amber-500',
        icon: 'Activity',
        description: 'Workouts, yoga, stretches, sports',
      };
    case 'meal':
      return {
        label: 'Meals & Nourish',
        color: 'orange',
        bgClass: 'bg-orange-50 dark:bg-orange-950/40 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-800',
        badgeBg: 'bg-orange-500',
        icon: 'Utensils',
        description: 'Breakfast, lunch, dinner, mindful tea',
      };
    case 'break':
      return {
        label: 'Mindful Break',
        color: 'sky',
        bgClass: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800',
        badgeBg: 'bg-sky-500',
        icon: 'Coffee',
        description: 'Breathing, pauses, resetting between tasks',
      };
    case 'reading':
      return {
        label: 'Reading & Study',
        color: 'cyan',
        bgClass: 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-800 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
        badgeBg: 'bg-cyan-500',
        icon: 'BookOpen',
        description: 'Books, essays, paper notebooks',
      };
    case 'social':
      return {
        label: 'Connection & Loved Ones',
        color: 'rose',
        bgClass: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
        badgeBg: 'bg-rose-500',
        icon: 'Heart',
        description: 'Conversation, family time, community',
      };
    default:
      return {
        label: 'Activity',
        color: 'slate',
        bgClass: 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800',
        badgeBg: 'bg-slate-500',
        icon: 'CircleDot',
        description: 'Personal moments & routines',
      };
  }
}
