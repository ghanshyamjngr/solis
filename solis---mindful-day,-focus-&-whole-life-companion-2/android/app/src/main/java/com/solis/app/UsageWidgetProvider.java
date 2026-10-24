package com.solis.app;

import android.appwidget.AppWidgetManager;
import android.content.Context;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class UsageWidgetProvider extends SolisWidgetProvider {
    @Override
    protected String widgetType() {
        return "usage";
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] widgetIds) {
        super.onUpdate(context, manager, widgetIds);
        final PendingResult pendingResult = goAsync();
        ExecutorService executor = Executors.newSingleThreadExecutor();
        executor.execute(() -> {
            try {
                DeviceUsagePlugin.refreshWidgetUsage(context);
            } finally {
                pendingResult.finish();
                executor.shutdown();
            }
        });
    }
}
