package com.solis.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;

public class SolisWidgetProvider extends AppWidgetProvider {
    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] widgetIds) {
        updateWidgets(context, manager, widgetIds);
    }

    static void updateAllWidgets(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName provider = new ComponentName(context, SolisWidgetProvider.class);
        updateWidgets(context, manager, manager.getAppWidgetIds(provider));
    }

    private static void updateWidgets(Context context, AppWidgetManager manager, int[] widgetIds) {
        String nextTask = context.getSharedPreferences("solis_home_widget", Context.MODE_PRIVATE)
            .getString("nextTask", "No tasks planned yet");
        String progress = context.getSharedPreferences("solis_home_widget", Context.MODE_PRIVATE)
            .getString("progress", "Plan a small step today");

        Intent launch = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        PendingIntent pendingLaunch = null;
        if (launch != null) {
            launch.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            launch.putExtra("solisOpenTasks", true);
            pendingLaunch = PendingIntent.getActivity(
                context, 4901, launch,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
        }

        for (int widgetId : widgetIds) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.solis_widget);
            views.setTextViewText(R.id.solis_widget_task, nextTask);
            views.setTextViewText(R.id.solis_widget_progress, progress);
            if (pendingLaunch != null) views.setOnClickPendingIntent(R.id.solis_widget_action, pendingLaunch);
            manager.updateAppWidget(widgetId, views);
        }
    }
}
