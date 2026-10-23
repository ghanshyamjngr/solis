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
        String title = "today".equals(type) ? "TODAY’S TASKS"
            : "focus".equals(type) ? "FOCUS"
            : "goals".equals(type) ? "GOALS & STREAK"
            : "DAILY STATS";
        String primary = data.getString("today".equals(type) ? "nextTask"
            : "focus".equals(type) ? "focus" : "goals".equals(type) ? "goals" : "usage",
            "today".equals(type) ? "No tasks planned yet" : "No saved data yet");
        String secondary = data.getString("today".equals(type) ? "progress"
            : "focus".equals(type) ? "focusAction" : "goals".equals(type) ? "streak" : "lastSync",
            "today".equals(type) ? "Plan a small step today" : "Open Solis to get started");

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
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.solis_widget);
            views.setTextViewText(R.id.solis_widget_title, "SOLIS · " + title);
            views.setTextViewText(R.id.solis_widget_task, primary);
            views.setTextViewText(R.id.solis_widget_progress, secondary);
            if ("focus".equals(type)) {
                views.setTextViewText(R.id.solis_widget_action_label, "Start / resume focus");
                Intent focusAction = new Intent(context, FocusTimerService.class);
                focusAction.setAction(FocusTimerService.ACTION_WIDGET_ACTION);
                PendingIntent pendingFocus = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                    ? PendingIntent.getForegroundService(context, 8720 + widgetId, focusAction,
                        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE)
                    : PendingIntent.getService(context, 8720 + widgetId, focusAction,
                        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
                views.setOnClickPendingIntent(R.id.solis_widget_action_label, pendingFocus);
            } else {
                views.setTextViewText(R.id.solis_widget_action_label, "");
            }
            if (pendingLaunch != null) views.setOnClickPendingIntent(R.id.solis_widget_action, pendingLaunch);
            manager.updateAppWidget(widgetId, views);
        }
    }
}
