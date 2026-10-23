import React, { useState } from 'react';
import {
  ShieldCheck,
  Download,
  Upload,
  Trash2,
  Bell,
  Volume2,
  VolumeX,
  Moon,
  AlertCircle,
  CheckCircle2,
  Target
} from 'lucide-react';
import { AccentColor, DailyDeviceUsage, ThemeStyle, UserPreferences } from '../types';
import { exportDataAsJSON, importDataFromJSON, loadStoredTasks, wipeAllLocalData } from '../utils/storage';
import { isAndroidApp } from '../utils/deviceUsage';
import { cancelTaskReminder, updateTaskWidget } from '../utils/taskReminders';

interface PrivacySettingsProps {
  preferences: UserPreferences;
  onUpdatePreferences: (updates: Partial<UserPreferences>) => void;
  onDataReset: () => void;
  deviceUsage: DailyDeviceUsage | null;
  usageStatus: string;
  onRequestUsageAccess: () => void;
  onSyncDeviceUsage: () => void;
}

export const PrivacySettingsModal: React.FC<PrivacySettingsProps> = ({
  preferences,
  onUpdatePreferences,
  onDataReset,
  deviceUsage,
  usageStatus,
  onRequestUsageAccess,
  onSyncDeviceUsage,
}) => {
  const [showConfirmWipe, setShowConfirmWipe] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const handleExportJSON = () => {
    const jsonStr = exportDataAsJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `solis-mindful-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = importDataFromJSON(content);
      if (res.success) {
        setImportStatus(`Successfully restored ${res.count} entries!`);
        onDataReset();
      } else {
        setImportStatus(`Import error: ${res.error}`);
      }
      setTimeout(() => setImportStatus(null), 4000);
    };
    reader.readAsText(file);
  };

  const handleWipe = async () => {
    const reminderIds = loadStoredTasks().map((task) => task.id);
    const cancellations = await Promise.allSettled(reminderIds.map((id) => cancelTaskReminder(id)));
    const widgetUpdate = updateTaskWidget([], new Date().toISOString().slice(0, 10));
    wipeAllLocalData();
    setShowConfirmWipe(false);
    onDataReset();
    const failed = cancellations.filter((result) => result.status === 'rejected').length;
    try {
      await widgetUpdate;
    } catch (error) {
      console.error('Could not clear the Solis widget after erasing local data', error);
    }
    if (failed) {
      console.error(`${failed} task reminder(s) could not be cancelled while erasing local data.`);
      setImportStatus('Local data was erased, but one or more system reminders could not be cancelled. Check Android notification settings.');
      setTimeout(() => setImportStatus(null), 6000);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-4">
      {/* Title */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Privacy, Storage & Preferences
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
          Your activity stays on this device unless you explicitly enable Gemini AI sharing below.
        </p>
      </div>

      {/* Data and AI sharing status */}
      <div className="p-6 rounded-3xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/60 flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Your data stays local by default
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Activity logs, tasks, notes, and preferences are stored on this device. If you enable Gemini AI sharing, up to four recent days of activity and task follow-through plus your encouragement preference are sent to Solis's existing server for suggestions. The Gemini key remains server-side and is not included in the Android app.
          </p>
        </div>
      </div>

      <section className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700/80 p-6 sm:p-8 shadow-xs space-y-3">
        <div className="flex items-start gap-3">
          <input
            id="ai-data-sharing-consent"
            type="checkbox"
            checked={preferences.aiDataSharingConsent}
            onChange={(event) => onUpdatePreferences({ aiDataSharingConsent: event.target.checked })}
            className="mt-1 h-4 w-4 accent-amber-600"
          />
          <div>
            <label htmlFor="ai-data-sharing-consent" className="text-sm font-semibold text-slate-900 dark:text-white">
              Allow Gemini to use recent activity and task check-ins for personalized suggestions
            </label>
            <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              Off by default. When enabled, Solis sends up to four recent days of activity categories, titles, notes, durations, planned task titles and completion dates, plus your encouragement preference to the existing Solis server, which forwards them to Gemini. Solis does not send entry IDs, exact times, or device-usage data. This is short-term context, not model training. You can turn this off at any time; local reflections remain available.
            </p>
            <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              Status: {preferences.aiDataSharingConsent ? 'Gemini sharing enabled' : 'No activity is sent to Gemini'}
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700/80 p-6 sm:p-8 shadow-xs space-y-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Appearance</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Choose a theme that feels comfortable to use.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <label className="space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
            Theme style
            <select
              value={preferences.themeStyle}
              onChange={(event) => onUpdatePreferences({ themeStyle: event.target.value as ThemeStyle })}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
            >
              <option value="clean-minimal">Clean minimal</option>
              <option value="playful-animated">Playful</option>
            </select>
          </label>
          <label className="space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
            Accent color
            <select
              value={preferences.accentColor}
              onChange={(event) => onUpdatePreferences({ accentColor: event.target.value as AccentColor })}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
            >
              <option value="amber">Amber</option>
              <option value="sage">Sage</option>
              <option value="ocean">Ocean</option>
              <option value="lavender">Lavender</option>
              <option value="coral">Coral</option>
            </select>
          </label>
          <label className="flex items-center gap-2 self-end pb-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={preferences.darkMode}
              onChange={(event) => onUpdatePreferences({ darkMode: event.target.checked })}
              className="h-4 w-4 accent-amber-600"
            />
            Dark appearance
          </label>
        </div>
      </section>

      <section className="bg-slate-50 dark:bg-slate-800/60 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 space-y-2">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Connection status</h3>
        <p className="text-xs text-slate-600 dark:text-slate-300">Sync: Not configured. Your data remains on this device.</p>
        <p className="text-xs text-slate-600 dark:text-slate-300">Android Usage Access: {isAndroidApp() ? 'Supported by this Android build.' : 'Unavailable in a web browser; open the Android app to use device tracking.'}</p>
        <p className="text-xs text-slate-600 dark:text-slate-300">Task reminders use Android system notifications in the Android app; browser reminders work only while Solis stays open.</p>
      </section>

      <section className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700/80 p-6 sm:p-8 shadow-xs space-y-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Android app-usage tracking</h3>
          <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300 mt-1">
            Optional. Solis reads Android UsageStats for foreground app time and screen-on/keyguard events. Android records these while Solis is closed or another app is in front; Solis syncs them when opened or returned to the foreground. Data is kept locally and is not added to manual logs or sent to Gemini.
          </p>
        </div>
        {preferences.usageTrackingEnabled ? (
          <button
            type="button"
            onClick={() => onUpdatePreferences({ usageTrackingEnabled: false })}
            className="rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200"
          >
            Turn off app-usage tracking
          </button>
        ) : (
          <button
            type="button"
            onClick={onRequestUsageAccess}
            className="rounded-xl bg-slate-900 dark:bg-white px-4 py-2 text-xs font-semibold text-white dark:text-slate-900"
          >
            Enable tracking and open Usage Access
          </button>
        )}
        {preferences.usageTrackingEnabled && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onRequestUsageAccess}
              className="rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200"
            >
              Open Android Usage Access settings
            </button>
            <button
              type="button"
              onClick={onSyncDeviceUsage}
              disabled={!isAndroidApp()}
              className="rounded-xl border border-sky-300 dark:border-sky-800 px-4 py-2 text-xs font-semibold text-sky-800 dark:text-sky-200 disabled:opacity-50"
            >
              Sync selected day’s app usage
            </button>
          </div>
        )}
        <p className="text-xs text-slate-600 dark:text-slate-300" role="status">{usageStatus}</p>
        <p className="text-xs text-slate-600 dark:text-slate-300">
          Last successful sync: {deviceUsage ? new Date(deviceUsage.syncedAt).toLocaleString() : 'No usage sync saved for the selected day.'}
        </p>
        <div className="rounded-xl bg-slate-50 dark:bg-slate-900/60 p-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          Website tracking is separate. Android app usage only identifies that a browser was used, not the websites visited. Exact site data would require a browser-specific extension or an explicitly configured local VPN/filter integration; Solis does not currently have that integration and will not claim to know visited sites.
        </div>
      </section>

      {/* Backup and Data Export / Import */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700/80 p-6 sm:p-8 shadow-xs space-y-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Data Sovereignty: Export & Restore</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            You can take your data with you anytime in standard JSON format or restore a previous backup.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 flex flex-col justify-between space-y-3">
            <div>
              <strong className="text-xs font-bold text-slate-900 dark:text-white block">Download Full Backup</strong>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Export activities, tasks, preferences, savings, device-usage snapshots, and lending records as a JSON backup.
              </p>
            </div>
            <button
              onClick={handleExportJSON}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold hover:opacity-90 transition-opacity"
            >
              <Download className="w-3.5 h-3.5" />
              Export JSON File
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 flex flex-col justify-between space-y-3">
            <div>
              <strong className="text-xs font-bold text-slate-900 dark:text-white block">Restore from Backup</strong>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Upload a previous Solis JSON export to restore your historical timeline.
              </p>
            </div>
            <label className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold cursor-pointer transition-colors">
              <Upload className="w-3.5 h-3.5" />
              Upload Backup File
              <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
            </label>
          </div>
        </div>

        {importStatus && (
          <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-700/60 text-xs font-medium text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            {importStatus}
          </div>
        )}
      </div>

      {/* Gentle Boundaries & Notification Rules */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700/80 p-6 sm:p-8 shadow-xs space-y-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Gentle Boundaries & Daily Goals</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure quiet hours, audio chimes, and realistic daily intentions.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
              Quiet Hours (Start to End)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={preferences.quietHoursStart}
                onChange={(e) => onUpdatePreferences({ quietHoursStart: e.target.value })}
                className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono"
              />
              <span className="text-xs text-slate-400">until</span>
              <input
                type="time"
                value={preferences.quietHoursEnd}
                onChange={(e) => onUpdatePreferences({ quietHoursEnd: e.target.value })}
                className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono"
              />
            </div>
            <span className="text-[11px] text-slate-400 block">
              Solis task notifications are silent. Quiet hours apply to in-app audio cues.
            </span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
              Sound Chimes & Bells
            </label>
            <button
              onClick={() => onUpdatePreferences({ soundEnabled: !preferences.soundEnabled })}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-semibold transition-all ${
                preferences.soundEnabled
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 text-amber-900 dark:text-amber-200'
                  : 'bg-slate-50 dark:bg-slate-900 border-slate-200 text-slate-500'
              }`}
            >
              {preferences.soundEnabled ? <Volume2 className="w-4 h-4 text-amber-600" /> : <VolumeX className="w-4 h-4" />}
              {preferences.soundEnabled ? 'Gentle Web Audio Chimes Enabled' : 'Muted (Silent)'}
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
              Daily Focus Target (Minutes)
            </label>
            <input
              type="number"
              min="15"
              max="600"
              step="15"
              value={preferences.dailyFocusGoalMinutes}
              onChange={(e) => onUpdatePreferences({ dailyFocusGoalMinutes: parseInt(e.target.value) || 60 })}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono"
            />
            <span className="text-[11px] text-slate-400 block">
              Current: {Math.floor(preferences.dailyFocusGoalMinutes / 60)}h {preferences.dailyFocusGoalMinutes % 60}m per day.
            </span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
              Daily Offline & Rest Target (Minutes)
            </label>
            <input
              type="number"
              min="30"
              max="720"
              step="30"
              value={preferences.dailyOfflineGoalMinutes}
              onChange={(e) => onUpdatePreferences({ dailyOfflineGoalMinutes: parseInt(e.target.value) || 120 })}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono"
            />
            <span className="text-[11px] text-slate-400 block">
              Current: {Math.floor(preferences.dailyOfflineGoalMinutes / 60)}h {preferences.dailyOfflineGoalMinutes % 60}m screen-free.
            </span>
          </div>
        </div>
      </div>

      {/* Danger Zone: Wipe All Data */}
      <div className="bg-rose-50/50 dark:bg-rose-950/20 rounded-3xl border border-rose-200/80 dark:border-rose-900/60 p-6 space-y-4">
        <div>
          <h3 className="text-base font-bold text-rose-900 dark:text-rose-300 flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-rose-600" />
            Erase Local Data
          </h3>
          <p className="text-xs text-rose-700/80 dark:text-rose-400/80 mt-1">
            Permanently delete locally stored activities, tasks, preferences, savings, reminders, loans, and device-usage snapshots from this device.
          </p>
        </div>

        {showConfirmWipe ? (
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-rose-300 space-y-3">
            <p className="text-xs text-rose-800 dark:text-rose-300 font-semibold">
              Are you sure? This cannot be undone unless you previously exported a JSON backup.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => void handleWipe()}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700"
              >
                Yes, Permanently Delete All
              </button>
              <button
                onClick={() => setShowConfirmWipe(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowConfirmWipe(true)}
            className="px-4 py-2 rounded-xl bg-rose-100 dark:bg-rose-900/60 hover:bg-rose-200 text-rose-800 dark:text-rose-200 text-xs font-semibold transition-colors"
          >
            Clear All Data on this Device
          </button>
        )}
      </div>
    </div>
  );
};
