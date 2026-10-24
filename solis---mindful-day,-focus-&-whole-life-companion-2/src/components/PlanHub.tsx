import React from 'react';
import { ActivityEntry, DailyDeviceUsage, PlannedTask, UserPreferences } from '../types';
import { ActivityLogger } from './ActivityLogger';
import { DailyTimeline } from './DailyTimeline';

interface PlanHubProps {
  mode: 'flow' | 'log';
  onModeChange: (mode: 'flow' | 'log') => void;
  selectedDate: string;
  entries: ActivityEntry[];
  tasks: PlannedTask[];
  deviceUsage: DailyDeviceUsage | null;
  usageTrackingEnabled: boolean;
  usageStatus: string;
  isUsageRefreshing: boolean;
  onRefreshUsage: () => void;
  preferences: UserPreferences;
  onDeleteEntry: (id: string) => void;
  onSaveEntry: (entry: ActivityEntry) => void;
  onViewToday: () => void;
  onViewFocus: () => void;
}

export const PlanHub: React.FC<PlanHubProps> = ({
  mode,
  onModeChange,
  selectedDate,
  entries,
  tasks,
  deviceUsage,
  usageTrackingEnabled,
  usageStatus,
  isUsageRefreshing,
  onRefreshUsage,
  preferences,
  onDeleteEntry,
  onSaveEntry,
  onViewToday,
  onViewFocus,
}) => (
  <div className="space-y-4">
    <div className="mx-auto flex w-fit rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-800" aria-label="Plan tools">
      <button
        type="button"
        onClick={() => onModeChange('flow')}
        aria-pressed={mode === 'flow'}
        className={`rounded-lg px-4 py-2 text-xs font-semibold ${mode === 'flow' ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200' : 'text-slate-600 dark:text-slate-300'}`}
      >
        Today’s Flow
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
    {mode === 'flow' ? (
      <DailyTimeline
        date={selectedDate}
        entries={entries}
        tasks={tasks}
        deviceUsage={deviceUsage}
        usageTrackingEnabled={usageTrackingEnabled}
        usageStatus={usageStatus}
        isUsageRefreshing={isUsageRefreshing}
        onRefreshUsage={onRefreshUsage}
        preferences={preferences}
        onDeleteEntry={onDeleteEntry}
        onNavigateToLog={() => onModeChange('log')}
        onNavigateToTimer={onViewFocus}
        showInsights={false}
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
