import { Capacitor, registerPlugin } from '@capacitor/core';
import { PlannedTask } from '../types';
import { getTodayDateString } from './timeline';

interface TaskRemindersPlugin {
  requestPermission(): Promise<{ granted: boolean }>;
  schedule(options: {
    id: string;
    title: string;
    body: string;
    at: number;
    repeat: 'never' | 'daily' | 'weekly';
  }): Promise<void>;
  cancel(options: { id: string }): Promise<void>;
  updateWidget(options: Partial<{
    stats: string;
    nextTask: string;
    progress: string;
    focus: string;
    focusAction: string;
    goals: string;
    goalsTitle: string;
    goalsCategory: string;
    goalsCurrency: string;
    goalsProgress: number;
    streak: string;
    usage: string;
    lastSync: string;
    focusHistory: string;
    usageApps: string;
    screenOnDurationMs: number;
    usageSyncedAt: number;
    usageTrackingEnabled: boolean;
  }>): Promise<void>;
  consumePendingReminder(): Promise<{
    taskId?: string;
    openTasks?: boolean;
    widgetAction?: string;
    widgetAmount?: number;
    widgetCategory?: string;
    widgetAppPackage?: string;
    widgetAppName?: string;
    answer?: 'completed' | 'postponed' | 'skipped';
    answerTaskId?: string;
    answerDate?: string;
  }>;
  getWallpaperAccent(): Promise<{ color?: string }>;
  notifyGoalComplete(options: {
    notificationTitle: string;
    message: string;
    soundEnabled: boolean;
    vibrationEnabled: boolean;
    quietHoursStart: string;
    quietHoursEnd: string;
  }): Promise<void>;
  configureUsageEncouragement(options: {
    enabled: boolean;
    thresholdMinutes: number;
    frequencyDays: number;
    quietHoursStart: string;
    quietHoursEnd: string;
    tone: 'gentle' | 'poetic' | 'practical' | 'off';
    completedCheckins: number;
    plannedCheckins: number;
    soundEnabled: boolean;
    vibrationEnabled: boolean;
  }): Promise<{ scheduled: boolean }>;
}

const NativeReminders = registerPlugin<TaskRemindersPlugin>('TaskReminders');
const webReminderTimers = new Map<string, number>();

export function isNativeReminderPlatform(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

export async function requestReminderPermission(): Promise<boolean> {
  if (isNativeReminderPlatform()) {
    const result = await NativeReminders.requestPermission();
    return result.granted;
  }
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  return (await Notification.requestPermission()) === 'granted';
}

export async function scheduleTaskReminder(task: PlannedTask): Promise<boolean> {
  if (!task.reminderEnabled) {
    await cancelTaskReminder(task.id);
    return false;
  }
  const nextOccurrence = getNextOccurrence(task);
  if (!nextOccurrence) {
    await cancelTaskReminder(task.id);
    return false;
  }
  const { date, at } = nextOccurrence;
  const scheduledTask = { ...task, date };
  if (!('Notification' in window) && !isNativeReminderPlatform()) {
    throw new Error('This browser does not support notifications.');
  }
  const granted = await requestReminderPermission();
  if (!granted) throw new Error('Notification permission was not granted.');
  await cancelTaskReminder(task.id);

  if (isNativeReminderPlatform()) {
    await NativeReminders.schedule({
      id: scheduledTask.id,
      title: scheduledTask.title,
      body: 'A gentle reminder from Awake. Did you complete this task?',
      at,
      repeat: scheduledTask.repeat,
    });
    return true;
  }

  const scheduleWebReminder = (target: number) => {
    const remaining = target - Date.now();
    if (remaining > 2_147_000_000) {
      const timer = window.setTimeout(() => scheduleWebReminder(target), 2_147_000_000);
      webReminderTimers.set(task.id, timer);
      return;
    }
    const timer = window.setTimeout(() => {
    const notification = new Notification('Awake task reminder', {
      body: `Did you complete “${task.title}”? Open Awake to check in.`,
      tag: `solis-task-${task.id}`,
    });
    notification.onclick = () => {
      window.focus();
      window.dispatchEvent(new CustomEvent('solis-task-reminder', { detail: { taskId: task.id } }));
    };
    webReminderTimers.delete(task.id);
    if (task.repeat !== 'never') {
      const next = new Date(target);
      next.setDate(next.getDate() + (task.repeat === 'daily' ? 1 : 7));
      const nextDate = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
      void scheduleTaskReminder({ ...scheduledTask, date: nextDate }).catch((error) => {
        console.error('Could not reschedule repeating browser task reminder', error);
      });
    }
    }, Math.max(0, remaining));
    webReminderTimers.set(task.id, timer);
  };
  scheduleWebReminder(at);
  return true;
}

function getNextOccurrence(task: PlannedTask): { date: string; at: number } | null {
  const due = new Date(`${task.date}T${task.time}:00`);
  if (!Number.isFinite(due.getTime())) return null;
  const intervalDays = task.repeat === 'daily' ? 1 : task.repeat === 'weekly' ? 7 : 0;
  while (due.getTime() <= Date.now() && intervalDays > 0) due.setDate(due.getDate() + intervalDays);
  if (due.getTime() <= Date.now()) return null;
  const date = `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, '0')}-${String(due.getDate()).padStart(2, '0')}`;
  return { date, at: due.getTime() };
}

export async function cancelTaskReminder(id: string): Promise<void> {
  const timer = webReminderTimers.get(id);
  if (timer !== undefined) {
    window.clearTimeout(timer);
    webReminderTimers.delete(id);
  }
  if (isNativeReminderPlatform()) await NativeReminders.cancel({ id });
}

export async function updateTaskWidget(tasks: PlannedTask[], date: string): Promise<void> {
  if (!isNativeReminderPlatform()) return;
  const scheduled = tasks.filter((task) => {
    if (date < task.date) return false;
    if (task.repeat === 'daily') return true;
    if (task.repeat === 'weekly') {
      return new Date(`${task.date}T12:00:00`).getDay() === new Date(`${date}T12:00:00`).getDay();
    }
    return task.date === date;
  }).sort((first, second) => first.time.localeCompare(second.time));
  const completed = scheduled.filter((task) => task.completedDates.includes(date)).length;
  const nextTask = scheduled.find((task) => !task.completedDates.includes(date));
  await NativeReminders.updateWidget({
    nextTask: nextTask ? `${nextTask.time} · ${nextTask.title}` : scheduled.length ? 'You finished today’s plan' : 'No tasks planned yet',
    progress: scheduled.length ? `${completed} of ${scheduled.length} tasks complete · Open Awake` : 'Plan a small step in Awake',
  });
}

export async function updateWidgetData(data: Parameters<TaskRemindersPlugin['updateWidget']>[0]): Promise<void> {
  if (!isNativeReminderPlatform()) return;
  await NativeReminders.updateWidget(data);
}

export async function getNativeWallpaperAccent(): Promise<string | null> {
  if (!isNativeReminderPlatform()) return null;
  const result = await NativeReminders.getWallpaperAccent();
  return result.color ?? null;
}

export async function notifyGoalCompleted(
  notificationTitle: string,
  message: string,
  soundEnabled: boolean,
  vibrationEnabled: boolean,
  quietHoursStart: string,
  quietHoursEnd: string,
): Promise<void> {
  if (isNativeReminderPlatform()) {
    await NativeReminders.notifyGoalComplete({
      notificationTitle,
      message,
      soundEnabled,
      vibrationEnabled,
      quietHoursStart,
      quietHoursEnd,
    });
    return;
  }
  if (!('Notification' in window)) throw new Error('This browser does not support notifications.');
  if (Notification.permission !== 'granted') throw new Error('Notification permission is not granted.');
  const current = new Date().getHours() * 60 + new Date().getMinutes();
  const [startHour, startMinute] = quietHoursStart.split(':').map(Number);
  const [endHour, endMinute] = quietHoursEnd.split(':').map(Number);
  const start = startHour * 60 + startMinute;
  const end = endHour * 60 + endMinute;
  const quiet = Number.isFinite(start) && Number.isFinite(end) && start !== end
    && (start < end ? current >= start && current < end : current >= start || current < end);
  new Notification(notificationTitle, {
    body: message,
    tag: `solis-${notificationTitle}`,
    silent: quiet || !soundEnabled,
  });
}

export async function configureUsageEncouragement(options: {
  enabled: boolean;
  thresholdMinutes: number;
  frequencyDays: number;
  quietHoursStart: string;
  quietHoursEnd: string;
  tone: 'gentle' | 'poetic' | 'practical' | 'off';
  completedCheckins: number;
  plannedCheckins: number;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}): Promise<boolean> {
  if (!isNativeReminderPlatform()) return false;
  const result = await NativeReminders.configureUsageEncouragement(options);
  return result.scheduled;
}

export async function consumePendingTaskReminder(): Promise<{
  taskId: string | null;
  openTasks: boolean;
  widgetAction: string | null;
  answer: 'completed' | 'postponed' | 'skipped' | null;
  answerTaskId: string | null;
  answerDate: string | null;
}> {
  if (!isNativeReminderPlatform()) return {
    taskId: null, openTasks: false, widgetAction: null,
    answer: null, answerTaskId: null, answerDate: null,
  };
  const result = await NativeReminders.consumePendingReminder();
  return {
    taskId: result.taskId ?? null,
    openTasks: result.openTasks ?? false,
    widgetAction: result.widgetAction ?? null,
    answer: result.answer ?? null,
    answerTaskId: result.answerTaskId ?? null,
    answerDate: result.answerDate ?? null,
  };
}

export async function restoreGrantedWebReminders(tasks: PlannedTask[]): Promise<void> {
  if (isNativeReminderPlatform() || !('Notification' in window) || Notification.permission !== 'granted') return;
  for (const task of tasks) {
    if (task.reminderEnabled) await scheduleTaskReminder(task);
  }
}

export async function rescheduleTaskAfterCheckin(task: PlannedTask, date: string, completed: boolean): Promise<void> {
  if (task.repeat === 'never') {
    if (completed) await cancelTaskReminder(task.id);
    else await scheduleTaskReminder(task);
    return;
  }
  if (!completed && date >= getTodayDateString()
    && new Date(`${date}T${task.time}:00`).getTime() > Date.now()) {
    await scheduleTaskReminder(task);
    return;
  }
  const baseDate = date < getTodayDateString() ? getTodayDateString() : date;
  const day = new Date(`${baseDate}T12:00:00`);
  if (task.repeat === 'daily') {
    day.setDate(day.getDate() + 1);
  } else {
    const taskWeekday = new Date(`${task.date}T12:00:00`).getDay();
    const daysUntilNext = (taskWeekday - day.getDay() + 7) % 7 || 7;
    day.setDate(day.getDate() + daysUntilNext);
  }
  const nextDate = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
  await scheduleTaskReminder({ ...task, date: nextDate });
}
