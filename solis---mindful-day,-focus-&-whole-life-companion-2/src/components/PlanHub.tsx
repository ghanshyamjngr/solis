import React from 'react';
import { ActivityEntry, PlannedTask, UserPreferences } from '../types';
import { ActivityLogger } from './ActivityLogger';
import { TaskManager } from './TaskManager';

interface PlanHubProps {
  mode: 'tasks' | 'log';
  onModeChange: (mode: 'tasks' | 'log') => void;
  selectedDate: string;
  tasks: PlannedTask[];
  reminderStatus: string;
  pendingTaskId: string | null;
  preferences: UserPreferences;
  onAddTask: (task: PlannedTask) => Promise<void>;
  onToggleTask: (task: PlannedTask, date: string) => void;
  onDeleteTask: (id: string) => void;
  onDismissCheckin: () => void;
  onSaveEntry: (entry: ActivityEntry) => void;
  onViewToday: () => void;
}

export const PlanHub: React.FC<PlanHubProps> = ({
  mode,
  onModeChange,
  selectedDate,
  tasks,
  reminderStatus,
  pendingTaskId,
  preferences,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onDismissCheckin,
  onSaveEntry,
  onViewToday,
}) => (
  <div className="space-y-4">
    <div className="mx-auto flex w-fit rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-800" aria-label="Plan tools">
      <button
        type="button"
        onClick={() => onModeChange('tasks')}
        aria-pressed={mode === 'tasks'}
        className={`rounded-lg px-4 py-2 text-xs font-semibold ${mode === 'tasks' ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200' : 'text-slate-600 dark:text-slate-300'}`}
      >
        Tasks
      </button>
      <button
        type="button"
        onClick={() => onModeChange('log')}
        aria-pressed={mode === 'log'}
        className={`rounded-lg px-4 py-2 text-xs font-semibold ${mode === 'log' ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200' : 'text-slate-600 dark:text-slate-300'}`}
      >
        Log activity
      </button>
    </div>
    {mode === 'tasks' ? (
      <TaskManager
        selectedDate={selectedDate}
        tasks={tasks}
        reminderStatus={reminderStatus}
        pendingTaskId={pendingTaskId}
        onAddTask={onAddTask}
        onToggleTask={onToggleTask}
        onDeleteTask={onDeleteTask}
        onDismissCheckin={onDismissCheckin}
      />
    ) : (
      <ActivityLogger
        selectedDate={selectedDate}
        preferences={preferences}
        onSaveEntry={onSaveEntry}
        onViewTimeline={onViewToday}
      />
    )}
  </div>
);
