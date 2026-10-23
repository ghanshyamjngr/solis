package com.solis.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.widget.RemoteViews;

public class SolisWidgetProvider extends AppWidgetProvider {
    protected String widgetType() {
        return "today";
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] widgetIds) {
        updateWidgets(context, manager, widgetIds, widgetType());
    }

    static void updateAllWidgets(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        Class<?>[] providers = {
            SolisWidgetProvider.class, FocusWidgetProvider.class,
            GoalsWidgetProvider.class, UsageWidgetProvider.class
        };
        for (Class<?> providerClass : providers) {
            ComponentName provider = new ComponentName(context, providerClass);
            updateWidgets(context, manager, manager.getAppWidgetIds(provider),
                providerClass == FocusWidgetProvider.class ? "focus"
                    : providerClass == GoalsWidgetProvider.class ? "goals"
                    : providerClass == UsageWidgetProvider.class ? "usage" : "today");
        }
    }

    private static void updateWidgets(Context context, AppWidgetManager manager, int[] widgetIds, String type) {
        android.content.SharedPreferences data =
            context.getSharedPreferences("solis_home_widget", Context.MODE_PRIVATE);
        String title = "today".equals(type) ? "TODAY STATS"
            : "focus".equals(type) ? "FOCUS"
            : "goals".equals(type) ? "GOALS & STREAK"
            : "DAILY USAGE";
        String primaryFallback = "today".equals(type) ? "No activity logged yet"
            : "focus".equals(type) ? "No focus session running"
            : "goals".equals(type) ? "No savings goal yet" : "No synced usage yet";
        String secondaryFallback = "today".equals(type) ? "No tasks planned yet"
            : "focus".equals(type) ? "Tap to start a focus session"
            : "goals".equals(type) ? "0-day task-completion streak" : "Sync from Today in Awake";
        String primary = data.getString("today".equals(type) ? "stats"
            : "focus".equals(type) ? "focus" : "goals".equals(type) ? "goals" : "usage", primaryFallback);
        String secondary = data.getString("today".equals(type) ? "nextTask"
            : "focus".equals(type) ? "focusAction" : "goals".equals(type) ? "streak" : "lastSync", secondaryFallback);
        String detail = "today".equals(type)
            ? data.getString("progress", "Add a task to see your plan")
        : "";

        Intent launch = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        PendingIntent pendingLaunch = null;
        if (launch != null) {
            launch.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            launch.putExtra("solisWidgetAction", "focus".equals(type) ? "focus"
                : "usage".equals(type) ? "today" : "plan");
            pendingLaunch = PendingIntent.getActivity(
                context, 4901 + type.hashCode(), launch,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
        }

        for (int widgetId : widgetIds) {
            int layout = "today".equals(type) ? R.layout.awake_widget_today
                : "focus".equals(type) ? R.layout.awake_widget_focus
                : "goals".equals(type) ? R.layout.awake_widget_goals
                : R.layout.awake_widget_usage;
            RemoteViews views = new RemoteViews(context.getPackageName(), layout);
            views.setTextViewText(R.id.solis_widget_title, "AWAKE · " + title);
            views.setTextViewText(R.id.solis_widget_task, primary);
            views.setTextViewText(R.id.solis_widget_progress, secondary);
            views.setTextViewText(R.id.solis_widget_action_label,
                "focus".equals(type) ? data.getString("focusAction", "Tap to start a focus session")
                    : "today".equals(type) ? detail
                    : "");
            if ("goals".equals(type)) {
                views.setProgressBar(
                    R.id.solis_widget_goal_progress,
                    100,
                    data.getInt("goalsProgress", 0),
                    false
                );
            }
            if ("focus".equals(type)) {
                Intent focusAction = new Intent(context, FocusTimerService.class);
                focusAction.setAction(FocusTimerService.ACTION_WIDGET_ACTION);
                PendingIntent pendingFocus = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                    ? PendingIntent.getForegroundService(context, 8720 + widgetId, focusAction,
                        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE)
                    : PendingIntent.getService(context, 8720 + widgetId, focusAction,
                        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
                views.setOnClickPendingIntent(R.id.solis_widget_action_label, pendingFocus);
            }
            if (pendingLaunch != null) views.setOnClickPendingIntent(R.id.solis_widget_action, pendingLaunch);
            manager.updateAppWidget(widgetId, views);
        }
    }
}
