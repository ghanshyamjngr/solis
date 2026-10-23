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
  updateWidget(options: { nextTask: string; progress: string }): Promise<void>;
  consumePendingReminder(): Promise<{ taskId?: string; openTasks?: boolean }>;
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
      body: 'A gentle reminder from Solis. Did you complete this task?',
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
    const notification = new Notification('Solis task reminder', {
      body: `Did you complete “${task.title}”? Open Solis to check in.`,
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
    progress: scheduled.length ? `${completed} of ${scheduled.length} tasks complete · Open Solis` : 'Plan a small step in Solis',
  });
}

export async function consumePendingTaskReminder(): Promise<{ taskId: string | null; openTasks: boolean }> {
  if (!isNativeReminderPlatform()) return { taskId: null, openTasks: false };
  const result = await NativeReminders.consumePendingReminder();
  return { taskId: result.taskId ?? null, openTasks: result.openTasks ?? false };
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
