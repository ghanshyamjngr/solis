package com.solis.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.RectF;
import android.os.Build;
import android.os.Bundle;
import android.util.Base64;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.NumberFormat;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Currency;

public class SolisWidgetProvider extends AppWidgetProvider {
    private static final String[] PALETTE_NAMES = { "Lavender", "Amber", "Sage", "Ocean" };
    private static final int[] PALETTE_SURFACES = {
        R.drawable.awake_widget_surface, R.drawable.awake_widget_surface_amber,
        R.drawable.awake_widget_surface_sage, R.drawable.awake_widget_surface_ocean
    };
    private static final int[][] PALETTE_CHART_COLORS = {
        CHART_COLORS,
        { Color.rgb(216, 145, 49), Color.rgb(97, 145, 108), Color.rgb(94, 142, 180), Color.rgb(202, 113, 89), Color.rgb(169, 129, 65), Color.rgb(135, 155, 115) },
        { Color.rgb(92, 145, 112), Color.rgb(108, 161, 135), Color.rgb(124, 146, 174), Color.rgb(174, 133, 158), Color.rgb(185, 166, 107), Color.rgb(121, 163, 157) },
        { Color.rgb(65, 128, 174), Color.rgb(93, 153, 183), Color.rgb(106, 144, 166), Color.rgb(139, 123, 170), Color.rgb(102, 161, 149), Color.rgb(197, 146, 109) }
    };
    private static final int[] PALETTE_ACCENTS = {
        Color.rgb(113, 97, 139), Color.rgb(166, 105, 24),
        Color.rgb(74, 122, 95), Color.rgb(62, 112, 149)
    };
    private static final int[] CHART_COLORS = {
        Color.rgb(132, 113, 176), Color.rgb(120, 147, 132),
        Color.rgb(120, 149, 168), Color.rgb(197, 139, 120),
        Color.rgb(155, 136, 168), Color.rgb(181, 158, 92)
    };

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

    static void updateWidgetById(Context context, int widgetId) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        android.appwidget.AppWidgetProviderInfo info = manager.getAppWidgetInfo(widgetId);
        if (info == null) return;
        String provider = info.provider.getClassName();
        String type = provider.endsWith("FocusWidgetProvider") ? "focus"
            : provider.endsWith("GoalsWidgetProvider") ? "goals"
            : provider.endsWith("UsageWidgetProvider") ? "usage" : "today";
        updateWidgets(context, manager, new int[] { widgetId }, type);
    }

    private static void updateWidgets(
        Context context, AppWidgetManager manager, int[] widgetIds, String type
    ) {
        android.content.SharedPreferences data =
            context.getSharedPreferences("solis_home_widget", Context.MODE_PRIVATE);
        for (int widgetId : widgetIds) {
            int layout = "today".equals(type) ? R.layout.awake_widget_today
                : "focus".equals(type) ? R.layout.awake_widget_focus
                : "goals".equals(type) ? R.layout.awake_widget_goals
                : R.layout.awake_widget_usage;
            RemoteViews views = new RemoteViews(context.getPackageName(), layout);
            applyPalette(views, data, widgetId);
            setLaunchAction(context, views, widgetId, type);

            if ("today".equals(type)) updateFocusStats(views, data);
            else if ("focus".equals(type)) updateActiveFocus(context, views, data, widgetId);
            else if ("goals".equals(type)) updateMoney(context, views, data, widgetId);
            else updateUsage(context, views, data, widgetId);

            manager.updateAppWidget(widgetId, views);
        }
    }

    private static void applyPalette(
        RemoteViews views, android.content.SharedPreferences data, int widgetId
    ) {
        String name = data.getString("widget_palette_" + widgetId, "Lavender");
        int index = 0;
        for (int item = 0; item < PALETTE_NAMES.length; item++) {
            if (PALETTE_NAMES[item].equals(name)) index = item;
        }
        views.setInt(R.id.solis_widget_action, "setBackgroundResource", PALETTE_SURFACES[index]);
        views.setTextColor(R.id.solis_widget_title, PALETTE_ACCENTS[index]);
        views.setTextColor(R.id.solis_widget_action_label, PALETTE_ACCENTS[index]);
    }

    private static void setLaunchAction(
        Context context, RemoteViews views, int widgetId, String type
    ) {
        Intent launch = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (launch == null) return;
        launch.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        launch.putExtra("solisWidgetAction", "focus".equals(type) ? "focus"
            : "goals".equals(type) ? "money" : "today");
        PendingIntent pendingLaunch = PendingIntent.getActivity(
            context, 4901 + widgetId, launch,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.solis_widget_action, pendingLaunch);
    }

    private static void updateFocusStats(
        RemoteViews views, android.content.SharedPreferences data
    ) {
        JSONArray history;
        try {
            history = new JSONArray(data.getString("focusHistory", "[]"));
        } catch (Exception exception) {
            history = new JSONArray();
        }
        long maxMinutes = 0;
        long totalMinutes = 0;
        for (int index = 0; index < 7; index++) {
            JSONObject day = history.optJSONObject(index);
            long minutes = day == null ? 0 : Math.max(0, day.optLong("focusMinutes", 0));
            maxMinutes = Math.max(maxMinutes, minutes);
            totalMinutes += minutes;
        }
        int[] labels = {
            R.id.focus_day_0, R.id.focus_day_1, R.id.focus_day_2, R.id.focus_day_3,
            R.id.focus_day_4, R.id.focus_day_5, R.id.focus_day_6
        };
        int[] bars = {
            R.id.focus_bar_0, R.id.focus_bar_1, R.id.focus_bar_2, R.id.focus_bar_3,
            R.id.focus_bar_4, R.id.focus_bar_5, R.id.focus_bar_6
        };
        int[] values = {
            R.id.focus_value_0, R.id.focus_value_1, R.id.focus_value_2, R.id.focus_value_3,
            R.id.focus_value_4, R.id.focus_value_5, R.id.focus_value_6
        };
        for (int index = 0; index < 7; index++) {
            JSONObject day = history.optJSONObject(index);
            long minutes = day == null ? 0 : Math.max(0, day.optLong("focusMinutes", 0));
            String label = day == null ? "—" : day.optString("label", "—");
            views.setTextViewText(labels[index], label);
            views.setProgressBar(bars[index], 100,
                maxMinutes == 0 ? 0 : (int) Math.max(2, Math.round(minutes * 100.0 / maxMinutes)),
                false);
            views.setTextViewText(values[index], formatDuration(minutes));
        }
        views.setTextViewText(R.id.solis_widget_task,
            "7-day total · " + formatDuration(totalMinutes));
    }

    private static void updateActiveFocus(
        Context context,
        RemoteViews views,
        android.content.SharedPreferences data,
        int widgetId
    ) {
        Bundle state = FocusTimerService.readWidgetState(context);
        boolean active = state.getBoolean("active");
        boolean running = state.getBoolean("running");
        boolean preset = "preset".equals(state.getString("mode"));
        long elapsed = Math.max(0, state.getLong("elapsedSeconds"));
        long duration = Math.max(60, state.getInt("durationSeconds", 1500));
        long displaySeconds = preset ? Math.max(0, duration - elapsed) : elapsed;
        views.setTextViewText(R.id.solis_widget_task, formatClock(displaySeconds));
        views.setTextViewText(R.id.solis_widget_progress, active
            ? (running ? "Running · " : "Paused · ") + (preset ? "remaining" : "elapsed")
            : "No session running");
        views.setTextViewText(R.id.solis_widget_action_label,
            active && state.getString("intention") != null
                ? state.getString("intention") : "Configured quick-start · " + data.getInt("widget_focus_minutes_" + widgetId, 25) + " min");
        views.setTextViewText(R.id.solis_focus_start, active ? "Open" : "Start");
        views.setTextViewText(R.id.solis_focus_toggle, active ? (running ? "Pause" : "Resume") : "—");
        views.setTextViewText(R.id.solis_focus_stop, "Stop");
        if (active) {
            Intent launch = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
            if (launch != null) {
                launch.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                launch.putExtra("solisWidgetAction", "focus");
                PendingIntent open = PendingIntent.getActivity(context, 8720 + widgetId * 3, launch,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
                views.setOnClickPendingIntent(R.id.solis_focus_start, open);
            }
            Intent toggle = new Intent(context, FocusTimerService.class)
                .setAction(FocusTimerService.ACTION_WIDGET_ACTION);
            setServiceAction(context, views, R.id.solis_focus_toggle, toggle,
                8721 + widgetId * 3, true);
            Intent stop = new Intent(context, FocusTimerService.class)
                .setAction(FocusTimerService.ACTION_FINISH);
            setServiceAction(context, views, R.id.solis_focus_stop, stop,
                8722 + widgetId * 3, true);
        } else {
            Intent start = new Intent(context, FocusTimerService.class)
                .setAction(FocusTimerService.ACTION_WIDGET_ACTION)
                .putExtra("durationSeconds",
                    Math.max(1, data.getInt("widget_focus_minutes_" + widgetId, 25)) * 60);
            setServiceAction(context, views, R.id.solis_focus_start, start,
                8720 + widgetId * 3, true);
        }
    }

    private static void setServiceAction(
        Context context, RemoteViews views, int viewId, Intent intent, int requestCode,
        boolean foregroundService
    ) {
        PendingIntent pending;
        if (foregroundService && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            pending = PendingIntent.getForegroundService(context, requestCode, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        } else {
            pending = PendingIntent.getService(context, requestCode, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        }
        views.setOnClickPendingIntent(viewId, pending);
    }

    private static void updateMoney(
        Context context,
        RemoteViews views,
        android.content.SharedPreferences data,
        int widgetId
    ) {
        String title = data.getString("goalsTitle", "");
        String category = data.getString("widget_money_category_" + widgetId, "");
        if (category.trim().isEmpty()) category = data.getString("goalsCategory", "Personal");
        String currency = data.getString("goalsCurrency", "USD");
        double quickAmount;
        try {
            quickAmount = Double.parseDouble(data.getString("widget_quick_amount_" + widgetId, "5"));
        } catch (NumberFormatException exception) {
            quickAmount = 5;
        }
        quickAmount = Math.max(0.01, Math.min(1_000_000, quickAmount));
        NumberFormat moneyFormat = NumberFormat.getCurrencyInstance();
        try {
            moneyFormat.setCurrency(Currency.getInstance(currency));
        } catch (IllegalArgumentException exception) {
            moneyFormat.setCurrency(Currency.getInstance("USD"));
        }
        String amountLabel = moneyFormat.format(quickAmount);
        views.setTextViewText(R.id.solis_widget_task,
            title == null || title.trim().isEmpty() ? "No savings goal yet" : title);
        views.setTextViewText(R.id.solis_widget_category, category);
        views.setTextViewText(R.id.solis_widget_progress,
            data.getString("goals", "No savings amount yet"));
        views.setTextViewText(R.id.solis_money_add, "+ " + amountLabel);
        views.setTextViewText(R.id.solis_money_spend, "− " + amountLabel);
        Intent add = moneyAction(context, widgetId, "money_saved", quickAmount, category);
        Intent spend = moneyAction(context, widgetId, "money_spent", quickAmount, category);
        PendingIntent addPending = PendingIntent.getActivity(context, 9600 + widgetId * 2, add,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        PendingIntent spendPending = PendingIntent.getActivity(context, 9601 + widgetId * 2, spend,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.solis_money_add, addPending);
        views.setOnClickPendingIntent(R.id.solis_money_spend, spendPending);
        views.setProgressBar(R.id.solis_widget_goal_progress, 100,
            data.getInt("goalsProgress", 0), false);
    }

    private static Intent moneyAction(
        Context context, int widgetId, String action, double amount, String category
    ) {
        Intent launch = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (launch == null) launch = new Intent(context, MainActivity.class);
        launch.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        launch.putExtra("solisWidgetAction", action);
        launch.putExtra("solisWidgetAmount", amount);
        launch.putExtra("solisWidgetCategory", category);
        launch.putExtra("solisWidgetId", widgetId);
        return launch;
    }

    private static void updateUsage(
        Context context,
        RemoteViews views,
        android.content.SharedPreferences data,
        int widgetId
    ) {
        JSONArray apps;
        try {
            apps = new JSONArray(data.getString("usageApps", "[]"));
        } catch (Exception exception) {
            apps = new JSONArray();
        }
        boolean showSystem = data.getBoolean("widget_usage_system_" + widgetId, false);
        List<JSONObject> visibleApps = new ArrayList<>();
        long totalForegroundMs = 0;
        for (int index = 0; index < apps.length(); index++) {
            JSONObject app = apps.optJSONObject(index);
            if (app == null || (!showSystem && app.optBoolean("isSystemApp", false))) continue;
            long time = Math.max(0, app.optLong("totalTimeInForegroundMs", 0));
            if (time == 0) continue;
            totalForegroundMs += time;
            visibleApps.add(app);
        }
        Collections.sort(visibleApps, Comparator.comparingLong(
            (JSONObject app) -> app.optLong("totalTimeInForegroundMs", 0)
        ).reversed());
        long screenOnMs = data.getLong("screenOnDurationMs", 0);
        views.setTextViewText(R.id.solis_widget_task,
            "App foreground · " + formatDuration(totalForegroundMs / 60000));
        views.setTextViewText(R.id.solis_widget_progress,
            "Screen-on · " + formatDuration(screenOnMs / 60000));

        int[] rowIds = { R.id.solis_usage_app_0, R.id.solis_usage_app_1, R.id.solis_usage_app_2 };
        int[] iconIds = { R.id.solis_usage_icon_0, R.id.solis_usage_icon_1, R.id.solis_usage_icon_2 };
        for (int index = 0; index < rowIds.length; index++) {
            if (index >= visibleApps.size()) {
                views.setTextViewText(rowIds[index], "");
                views.setImageViewBitmap(iconIds[index], null);
                continue;
            }
            JSONObject app = visibleApps.get(index);
            String label = app.optString("appName", "App");
            if (label.trim().isEmpty() || "Unknown app".equals(label)) {
                label = app.optString("packageName", "App");
            }
            long minutes = Math.round(Math.max(0,
                app.optLong("totalTimeInForegroundMs", 0)) / 60000.0);
            views.setTextViewText(rowIds[index], label + " · " + formatDuration(minutes));
            String iconDataUrl = app.optString("appIconDataUrl", "");
            int comma = iconDataUrl.indexOf(',');
            if (comma >= 0) {
                try {
                    byte[] bytes = Base64.decode(iconDataUrl.substring(comma + 1), Base64.DEFAULT);
                    Bitmap icon = BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
                    if (icon != null) views.setImageViewBitmap(iconIds[index], icon);
                    else views.setImageViewResource(iconIds[index], R.mipmap.ic_launcher);
                } catch (IllegalArgumentException exception) {
                    views.setImageViewResource(iconIds[index], R.mipmap.ic_launcher);
                }
            } else {
                views.setImageViewResource(iconIds[index], R.mipmap.ic_launcher);
            }
            views.setContentDescription(rowIds[index], label + ", " + formatDuration(minutes));
            PendingIntent appDetails = createAppDetailsIntent(context, widgetId, app, index);
            views.setOnClickPendingIntent(rowIds[index], appDetails);
            views.setOnClickPendingIntent(iconIds[index], appDetails);
        }
        long syncedAt = data.getLong("usageSyncedAt", 0);
        if (visibleApps.isEmpty()) {
            views.setTextViewText(R.id.solis_usage_app_0,
                syncedAt > 0 ? "No app intervals in this sync" : "No synced app data");
        }
        views.setTextViewText(R.id.solis_widget_action_label,
            syncedAt > 0
                ? "Updated " + java.text.DateFormat.getTimeInstance(java.text.DateFormat.SHORT, Locale.getDefault())
                    .format(new java.util.Date(syncedAt)) + " · Open details"
                : "Not synced · Open details in Awake");
        int palette = 0;
        String paletteName = data.getString("widget_palette_" + widgetId, "Lavender");
        for (int index = 0; index < PALETTE_NAMES.length; index++) {
            if (PALETTE_NAMES[index].equals(paletteName)) palette = index;
        }
        views.setImageViewBitmap(R.id.solis_usage_donut,
            createUsageDonut(visibleApps, totalForegroundMs, PALETTE_CHART_COLORS[palette]));
        views.setContentDescription(R.id.solis_usage_donut,
            visibleApps.isEmpty() ? "No app foreground intervals" : usageDescription(visibleApps));
        views.setContentDescription(R.id.solis_widget_action,
            visibleApps.isEmpty() ? "Daily usage. Tap to open Awake insights."
                : "Daily usage by app. " + usageDescription(visibleApps)
                    + ". Tap to open detailed app usage in Awake.");
    }

    private static String usageDescription(List<JSONObject> apps) {
        StringBuilder description = new StringBuilder();
        int count = Math.min(3, apps.size());
        for (int index = 0; index < count; index++) {
            JSONObject app = apps.get(index);
            if (description.length() > 0) description.append(", ");
            String name = app.optString("appName", "App");
            if (name.trim().isEmpty() || "Unknown app".equals(name)) {
                name = app.optString("packageName", "App");
            }
            description.append(name)
                .append(" ")
                .append(formatDuration(Math.round(Math.max(0,
                    app.optLong("totalTimeInForegroundMs", 0)) / 60000.0)));
        }
        return description.toString();
    }

    private static PendingIntent createAppDetailsIntent(
        Context context, int widgetId, JSONObject app, int index
    ) {
        Intent launch = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (launch == null) launch = new Intent(context, MainActivity.class);
        launch.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        launch.putExtra("solisWidgetAction", "today");
        launch.putExtra("solisWidgetAppPackage", app.optString("packageName", ""));
        launch.putExtra("solisWidgetAppName", app.optString("appName", ""));
        return PendingIntent.getActivity(context, 9700 + widgetId * 3 + index, launch,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static Bitmap createUsageDonut(List<JSONObject> apps, long totalMs, int[] colors) {
        int size = 192;
        Bitmap bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);
        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        RectF bounds = new RectF(12, 12, size - 12, size - 12);
        paint.setStyle(Paint.Style.STROKE);
        paint.setStrokeWidth(32);
        paint.setColor(Color.rgb(229, 231, 238));
        canvas.drawCircle(size / 2f, size / 2f, 68, paint);
        if (totalMs > 0) {
            long shownMs = 0;
            for (int index = 0; index < apps.size(); index++) {
                JSONObject app = apps.get(index);
                long ms = Math.max(0, app.optLong("totalTimeInForegroundMs", 0));
                float sweep = (float) (360.0 * ms / totalMs);
                paint.setColor(colors[index % colors.length]);
                canvas.drawArc(bounds, -90f + (float) (360.0 * shownMs / totalMs),
                    sweep, false, paint);
                shownMs += ms;
            }
        }
        return bitmap;
    }

    private static String formatDuration(long minutes) {
        long hours = minutes / 60;
        long remainder = minutes % 60;
        return hours == 0 ? remainder + "m"
            : remainder == 0 ? hours + "h" : hours + "h " + remainder + "m";
    }

    private static String formatClock(long seconds) {
        long hours = seconds / 3600;
        long minutes = (seconds % 3600) / 60;
        long remainder = seconds % 60;
        return hours > 0
            ? String.format(Locale.getDefault(), "%d:%02d:%02d", hours, minutes, remainder)
            : String.format(Locale.getDefault(), "%02d:%02d", minutes, remainder);
    }

    @Override
    public void onDeleted(Context context, int[] widgetIds) {
        super.onDeleted(context, widgetIds);
        android.content.SharedPreferences.Editor edit =
            context.getSharedPreferences("solis_home_widget", Context.MODE_PRIVATE).edit();
        for (int widgetId : widgetIds) {
            edit.remove("widget_palette_" + widgetId)
                .remove("widget_quick_amount_" + widgetId)
                .remove("widget_money_category_" + widgetId)
                .remove("widget_focus_minutes_" + widgetId)
                .remove("widget_usage_system_" + widgetId);
        }
        edit.apply();
    }
}
