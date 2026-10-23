import React from 'react';
import { Bell, Sparkles, AlertCircle, Heart, Compass, X, Check, Droplets, Coffee, Play } from 'lucide-react';
import { InteractiveNotification, NotificationContextType } from '../types';

interface InteractiveNotificationBannerProps {
  notification: InteractiveNotification | null;
  onDismiss: () => void;
  onAction: (actionType: string) => void;
  onTriggerPreset: (type: NotificationContextType) => void;
}

export const InteractiveNotificationBanner: React.FC<InteractiveNotificationBannerProps> = ({
  notification,
  onDismiss,
  onAction,
  onTriggerPreset,
}) => {
  const getContextIcon = (type: NotificationContextType) => {
    switch (type) {
      case 'momentum':
        return <Sparkles className="w-4 h-4 text-emerald-500" />;
      case 'distraction_checkin':
        return <AlertCircle className="w-4 h-4 text-amber-500" />;
      case 'rest_suggestion':
        return <Heart className="w-4 h-4 text-rose-500" />;
      case 'offline_celebration':
        return <Compass className="w-4 h-4 text-sky-500" />;
    }
  };

  return (
    <div className="space-y-3">
      {/* Active Floating Simulated Notification Toast */}
      {notification && (
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800 border-2 border-amber-400 dark:border-amber-500 shadow-xl transition-all animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 shrink-0 mt-0.5">
                {getContextIcon(notification.type)}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {notification.title}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {notification.timestamp}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {notification.message}
                </p>

                {/* Direct Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <button
                    onClick={() => onAction(notification.primaryAction.actionType)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold hover:opacity-90 shadow-2xs transition-opacity"
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600" />
                    {notification.primaryAction.label}
                  </button>

                  {notification.secondaryAction && (
                    <button
                      onClick={() => onAction(notification.secondaryAction!.actionType)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    >
                      {notification.secondaryAction.label}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={onDismiss}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Simulator Test Triggers Bar */}
      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-3 border border-slate-200/80 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium">
          <Bell className="w-3.5 h-3.5 text-amber-500" />
          <span>Test Behavior-Aware Notifications:</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => onTriggerPreset('momentum')}
            className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-emerald-50 text-[11px] font-medium transition-colors"
          >
            🌱 Momentum
          </button>
          <button
            onClick={() => onTriggerPreset('distraction_checkin')}
            className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-amber-50 text-[11px] font-medium transition-colors"
          >
            👀 Drift Check-in
          </button>
          <button
            onClick={() => onTriggerPreset('rest_suggestion')}
            className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-rose-50 text-[11px] font-medium transition-colors"
          >
            💛 Rest Counts
          </button>
          <button
            onClick={() => onTriggerPreset('offline_celebration')}
            className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-sky-50 text-[11px] font-medium transition-colors"
          >
            ✨ Offline Life
          </button>
        </div>
      </div>
    </div>
  );
};
