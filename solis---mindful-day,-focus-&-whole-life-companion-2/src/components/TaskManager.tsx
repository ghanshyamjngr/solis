import React, { useMemo, useState } from 'react';
import { Bell, BellOff, CalendarClock, Check, Circle, Plus, Trash2 } from 'lucide-react';
import { PlannedTask, TaskRepeat } from '../types';
import { getTodayDateString } from '../utils/timeline';

interface TaskManagerProps {
  selectedDate: string;
  tasks: PlannedTask[];
  reminderStatus: string;
  pendingTaskId: string | null;
  onAddTask: (task: PlannedTask) => Promise<void>;
  onToggleTask: (task: PlannedTask, date: string) => void;
  onDeleteTask: (id: string) => void;
  onDismissCheckin: () => void;
}

function isScheduledOn(task: PlannedTask, date: string): boolean {
  if (date < task.date) return false;
  if (task.repeat === 'daily') return true;
  if (task.repeat === 'weekly') {
    const start = new Date(`${task.date}T12:00:00`);
    const current = new Date(`${date}T12:00:00`);
    return start.getDay() === current.getDay();
  }
  return task.date === date;
}

export const TaskManager: React.FC<TaskManagerProps> = ({
  selectedDate,
  tasks,
  reminderStatus,
  pendingTaskId,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onDismissCheckin,
}) => {
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('09:00');
  const [repeat, setRepeat] = useState<TaskRepeat>('never');
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const today = getTodayDateString();
  const scheduledTasks = useMemo(
    () => tasks.filter((task) => isScheduledOn(task, selectedDate)).sort((a, b) => a.time.localeCompare(b.time)),
    [tasks, selectedDate]
  );
  const pendingTask = pendingTaskId ? tasks.find((task) => task.id === pendingTaskId) : undefined;
  const completedCount = scheduledTasks.filter((task) => task.completedDates.includes(selectedDate)).length;
  const checkedInDates = new Set(tasks.flatMap((task) => task.completedDates));
  let completionStreak = 0;
  const streakCursor = new Date(`${today}T12:00:00`);
  while (checkedInDates.has(`${streakCursor.getFullYear()}-${String(streakCursor.getMonth() + 1).padStart(2, '0')}-${String(streakCursor.getDate()).padStart(2, '0')}`)) {
    completionStreak += 1;
    streakCursor.setDate(streakCursor.getDate() - 1);
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) {
      setFormError('Add a short task name first.');
      return;
    }
    const task: PlannedTask = {
      id: `task-${Date.now()}`,
      title: title.trim(),
      date: selectedDate,
      time,
      repeat,
      reminderEnabled,
      completedDates: [],
      createdAt: Date.now(),
    };
    setIsSaving(true);
    setFormError('');
    try {
      await onAddTask(task);
      setTitle('');
      setFormError('');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not save this task.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-4">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">Plan · Do · Reflect</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">Tasks & follow-through</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Choose a realistic next step. Solis will remind you, then you can check in honestly.</p>
      </header>

      <form onSubmit={submit} className="space-y-4 rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 sm:p-6">
        <label className="block space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
          What would you like to do?
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={120}
            placeholder="e.g. Take a 15-minute walk"
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2.5 text-sm"
          />
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
            First day
            <input type="date" value={selectedDate} readOnly className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm" />
          </label>
          <label className="space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
            Preferred time
            <input type="time" value={time} onChange={(event) => setTime(event.target.value)} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm" />
          </label>
          <label className="space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
            Repeat
            <select value={repeat} onChange={(event) => setRepeat(event.target.value as TaskRepeat)} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm">
              <option value="never">One time</option>
              <option value="daily">Every day</option>
              <option value="weekly">Weekly</option>
            </select>
          </label>
        </div>
        <label className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
          <input type="checkbox" checked={reminderEnabled} onChange={(event) => setReminderEnabled(event.target.checked)} className="mt-0.5 accent-amber-600" />
          <span><strong className="font-semibold">Remind me at the preferred time.</strong> Notifications are delivered by Android when available; in a browser, Solis must remain open.</span>
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={isSaving} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50 dark:bg-white dark:text-slate-900">
            <Plus className="h-4 w-4" /> Add task
          </button>
          {formError && <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">{formError}</p>}
        </div>
        <p role="status" className="text-xs text-slate-500 dark:text-slate-400">{reminderStatus}</p>
      </form>

      <section className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{selectedDate === today ? 'Today’s plan' : `Plan for ${selectedDate}`}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">{completedCount} of {scheduledTasks.length} complete</p>
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">{completionStreak}-day task check-in streak</p>
          </div>
          {pendingTaskId && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
              <p className="font-medium">
                {pendingTask?.checkinResponses?.[selectedDate] === 'skipped'
                  ? `You marked “${pendingTask?.title || 'this task'}” as skipped. You can still check it off if you did complete it.`
                  : pendingTask?.checkinResponses?.[selectedDate] === 'postponed'
                    ? `“${pendingTask?.title || 'this task'}” was postponed. Did you complete it?`
                    : `Did you complete “${pendingTask?.title || 'this task'}”?`}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {pendingTask && !pendingTask.completedDates.includes(selectedDate) && (
                  <button type="button" onClick={() => {
                    onToggleTask(pendingTask, selectedDate);
                    onDismissCheckin();
                  }} className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white">Yes, I did it</button>
                )}
                <button type="button" onClick={onDismissCheckin} className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-semibold">Not yet — keep it open</button>
              </div>
            </div>
          )}
          <CalendarClock className="h-5 w-5 text-amber-600" />
        </div>
        {scheduledTasks.length === 0 ? (
          <p className="rounded-2xl bg-slate-50 dark:bg-slate-900/60 p-4 text-sm text-slate-500 dark:text-slate-400">Nothing planned for this day yet. Add one small task above to get started.</p>
        ) : (
          <ul className="space-y-2">
            {scheduledTasks.map((task) => {
              const complete = task.completedDates.includes(selectedDate);
              return (
                <li key={task.id} className={`flex items-center gap-3 rounded-2xl border px-3 py-3 ${task.id === pendingTaskId ? 'border-amber-400 bg-amber-50/50 dark:border-amber-700 dark:bg-amber-950/20' : 'border-slate-100 dark:border-slate-700'}`}>
                  <button type="button" onClick={() => onToggleTask(task, selectedDate)} aria-label={complete ? `Mark ${task.title} as not done` : `Mark ${task.title} done`} className={`shrink-0 ${complete ? 'text-emerald-600' : 'text-slate-400 hover:text-amber-600'}`}>
                    {complete ? <Check className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm font-semibold ${complete ? 'text-slate-400 line-through' : 'text-slate-900 dark:text-white'}`}>{task.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {task.time} · {task.repeat === 'never' ? 'One-time' : task.repeat === 'daily' ? 'Daily' : 'Weekly'} · {task.reminderEnabled ? <Bell className="inline h-3 w-3" /> : <BellOff className="inline h-3 w-3" />}
                      {task.skippedDates?.includes(selectedDate) ? ' · Skipped' : ''}
                    </p>
                  </div>
                  <button type="button" onClick={() => onDeleteTask(task.id)} aria-label={`Delete ${task.title}`} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"><Trash2 className="h-4 w-4" /></button>
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-xs text-slate-500 dark:text-slate-400">Checking a task off is your check-in. Missed tasks stay open—adjust the plan if it no longer fits.</p>
      </section>
    </div>
  );
};
