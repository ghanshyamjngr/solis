package com.solis.app;

import android.app.AppOpsManager;
import android.app.usage.UsageEvents;
import android.app.usage.UsageStats;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.drawable.Drawable;
import android.os.Build;
import android.provider.Settings;
import android.util.Base64;
import android.util.Log;

import java.io.ByteArrayOutputStream;
import java.text.SimpleDateFormat;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Calendar;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@CapacitorPlugin(name = "DeviceUsage")
public class DeviceUsagePlugin extends Plugin {
    private static final long APP_LAUNCH_DEDUPLICATION_MS = 10_000L;

    private static class AppUsageAggregate {
        final String appName;
        final String appIconDataUrl;
        final boolean systemApp;
        long foregroundTimeMs;
        long lastUsedAt;
        int launchCount;

        AppUsageAggregate(String appName, String appIconDataUrl, boolean systemApp) {
            this.appName = appName;
            this.appIconDataUrl = appIconDataUrl;
            this.systemApp = systemApp;
        }
    }

    private static class TimedUsageEvent {
        final String packageName;
        final int type;
        final long timestamp;

        TimedUsageEvent(String packageName, int type, long timestamp) {
            this.packageName = packageName;
            this.type = type;
            this.timestamp = timestamp;
        }
    }

    private static class UsageInterval {
        final String packageName;
        final long start;
        final long end;

        UsageInterval(String packageName, long start, long end) {
            this.packageName = packageName;
            this.start = start;
            this.end = end;
        }
    }

    @PluginMethod
    public void checkAccess(PluginCall call) {
        JSObject result = new JSObject();
        result.put("permissionGranted", hasUsageAccess(getContext()));
        result.put("available", true);
        call.resolve(result);
    }

    @PluginMethod
    public void openAccessSettings(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            JSObject result = new JSObject();
            result.put("openedSettings", true);
            call.resolve(result);
        } catch (Exception exception) {
            call.reject("Could not open Android Usage Access settings.", exception);
        }
    }

    @PluginMethod
    public void queryDailyUsage(PluginCall call) {
        if (!hasUsageAccess(getContext())) {
            JSObject result = new JSObject();
            result.put("permissionGranted", false);
            result.put("date", call.getString("date", ""));
            call.resolve(result);
            return;
        }

        String date = call.getString("date");
        long[] range = getLocalDayRange(date);
        if (range == null) {
            call.reject("A valid local date in YYYY-MM-DD format is required.");
            return;
        }

        try {
            UsageStatsManager manager = (UsageStatsManager) getContext()
                .getSystemService(Context.USAGE_STATS_SERVICE);
            if (manager == null) {
                call.reject("Android UsageStatsManager is unavailable on this device.");
                return;
            }

            long queryStart = Math.max(0, range[0] - 24L * 60L * 60L * 1000L);
            long queryEnd = Math.min(range[1], System.currentTimeMillis());
            List<TimedUsageEvent> events = readEvents(manager, queryStart, queryEnd);
            List<UsageInterval> screenIntervals = readScreenIntervals(events, range[0], range[1]);
            Map<String, AppUsageAggregate> appUsage = readForegroundUsage(
                getContext(), events, range[0], range[1], screenIntervals
            );

            JSArray apps = new JSArray();
            for (Map.Entry<String, AppUsageAggregate> item : appUsage.entrySet()) {
                    JSObject app = new JSObject();
                    AppUsageAggregate aggregate = item.getValue();
                    app.put("packageName", item.getKey());
                    app.put("appName", aggregate.appName);
                    if (aggregate.appIconDataUrl != null) {
                        app.put("appIconDataUrl", aggregate.appIconDataUrl);
                    }
                    app.put("isSystemApp", aggregate.systemApp);
                    app.put("totalTimeInForegroundMs", aggregate.foregroundTimeMs);
                    app.put("lastUsedAt", aggregate.lastUsedAt);
                    app.put("launchCount", aggregate.launchCount);
                    apps.put(app);
            }

            JSObject screen = readScreenSummary(events, screenIntervals, range[0], range[1]);
            JSObject result = new JSObject();
            result.put("permissionGranted", true);
            result.put("date", date);
            result.put("syncedAt", System.currentTimeMillis());
            result.put("measurementVersion", 2);
            result.put("apps", apps);
            result.put("screen", screen);
            call.resolve(result);
        } catch (Exception exception) {
            call.reject("Could not read Android app usage for this date.", exception);
        }
    }

    private static boolean hasUsageAccess(Context context) {
        AppOpsManager appOps = (AppOpsManager) context.getSystemService(Context.APP_OPS_SERVICE);
        if (appOps == null) {
            return false;
        }
        int mode = appOps.checkOpNoThrow(
            AppOpsManager.OPSTR_GET_USAGE_STATS,
            android.os.Process.myUid(),
            context.getPackageName()
        );
        return mode == AppOpsManager.MODE_ALLOWED;
    }

    private static long[] getLocalDayRange(String date) {
        if (date == null || !date.matches("\\d{4}-\\d{2}-\\d{2}")) {
            return null;
        }
        try {
            String[] parts = date.split("-");
            Calendar start = Calendar.getInstance();
            start.clear();
            start.setLenient(false);
            start.set(Integer.parseInt(parts[0]), Integer.parseInt(parts[1]) - 1,
                Integer.parseInt(parts[2]), 0, 0, 0);
            long startMs = start.getTimeInMillis();
            start.add(Calendar.DAY_OF_MONTH, 1);
            return new long[] { startMs, start.getTimeInMillis() };
        } catch (Exception exception) {
            return null;
        }
    }

    private static AppUsageAggregate createAppUsageAggregate(Context context, String packageName) {
        PackageManager packageManager = context.getPackageManager();
        String label = "Unknown app";
        boolean systemApp = false;
        String dataUrl = null;
        try {
            ApplicationInfo info = packageManager.getApplicationInfo(packageName, 0);
            label = packageManager.getApplicationLabel(info).toString();
            systemApp = (info.flags & (ApplicationInfo.FLAG_SYSTEM
                | ApplicationInfo.FLAG_UPDATED_SYSTEM_APP)) != 0;
        } catch (Exception exception) {
            return new AppUsageAggregate(label, null, systemApp);
        }
        try {
            Drawable icon = packageManager.getApplicationIcon(packageName);
            Bitmap bitmap = Bitmap.createBitmap(48, 48, Bitmap.Config.ARGB_8888);
            Canvas canvas = new Canvas(bitmap);
            icon.setBounds(0, 0, canvas.getWidth(), canvas.getHeight());
            icon.draw(canvas);
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            bitmap.compress(Bitmap.CompressFormat.PNG, 100, output);
            bitmap.recycle();
            dataUrl = "data:image/png;base64,"
                + Base64.encodeToString(output.toByteArray(), Base64.NO_WRAP);
        } catch (Exception exception) {
            // Keep the readable label even if Android cannot supply an app icon.
        }
        return new AppUsageAggregate(label, dataUrl, systemApp);
    }

    private static List<TimedUsageEvent> readEvents(
        UsageStatsManager manager, long startMs, long endMs
    ) {
        List<TimedUsageEvent> result = new ArrayList<>();
        if (endMs <= startMs) return result;
        UsageEvents events = manager.queryEvents(startMs, endMs);
        UsageEvents.Event event = new UsageEvents.Event();
        while (events != null && events.hasNextEvent()) {
            events.getNextEvent(event);
            result.add(new TimedUsageEvent(
                event.getPackageName(), event.getEventType(), event.getTimeStamp()
            ));
        }
        Collections.sort(result, Comparator.comparingLong(item -> item.timestamp));
        return result;
    }

    private static List<UsageInterval> readScreenIntervals(
        List<TimedUsageEvent> events, long dayStart, long dayEnd
    ) {
        List<UsageInterval> intervals = new ArrayList<>();
        boolean interactive = false;
        long interactiveStart = -1;
        long now = System.currentTimeMillis();
        long boundedEnd = Math.min(dayEnd, now);
        for (TimedUsageEvent event : events) {
            if (event.type == UsageEvents.Event.SCREEN_INTERACTIVE && !interactive) {
                interactive = true;
                interactiveStart = Math.max(dayStart, event.timestamp);
            } else if (event.type == UsageEvents.Event.SCREEN_NON_INTERACTIVE && interactive) {
                addInterval(intervals, null, interactiveStart, Math.min(boundedEnd, event.timestamp));
                interactive = false;
                interactiveStart = -1;
            }
        }
        if (interactive && interactiveStart >= 0) {
            addInterval(intervals, null, interactiveStart, boundedEnd);
        }
        return intervals;
    }

    private static Map<String, AppUsageAggregate> readForegroundUsage(
        Context context,
        List<TimedUsageEvent> events,
        long dayStart,
        long dayEnd,
        List<UsageInterval> screenIntervals
    ) {
        Map<String, AppUsageAggregate> appUsage = new HashMap<>();
        Map<String, Integer> launchCounts = new HashMap<>();
        Map<String, Long> lastCountedAt = new HashMap<>();
        List<UsageInterval> foregroundIntervals = new ArrayList<>();
        String activePackage = null;
        long activeStart = -1;
        long activeLastUsed = 0;
        int foregroundEventType = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q
            ? UsageEvents.Event.ACTIVITY_RESUMED
            : UsageEvents.Event.MOVE_TO_FOREGROUND;
        int backgroundEventType = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q
            ? UsageEvents.Event.ACTIVITY_PAUSED
            : UsageEvents.Event.MOVE_TO_BACKGROUND;
        long now = System.currentTimeMillis();
        long boundedEnd = Math.min(dayEnd, now);
        boolean hasScreenEvents = false;
        for (TimedUsageEvent event : events) {
            if (event.type == UsageEvents.Event.SCREEN_INTERACTIVE
                || event.type == UsageEvents.Event.SCREEN_NON_INTERACTIVE) {
                hasScreenEvents = true;
            }
            if (event.type == foregroundEventType) {
                String packageName = event.packageName;
                if (packageName == null || packageName.isEmpty()
                    || context.getPackageName().equals(packageName)) continue;
                if (!packageName.equals(activePackage)) {
                    if (activePackage != null) {
                        addInterval(foregroundIntervals, activePackage, activeStart,
                            Math.min(boundedEnd, event.timestamp));
                        AppUsageAggregate previous = appUsage.computeIfAbsent(
                            activePackage, key -> createAppUsageAggregate(context, key)
                        );
                        previous.lastUsedAt = Math.max(previous.lastUsedAt, activeLastUsed);
                    }
                    activePackage = packageName;
                    activeStart = Math.max(dayStart, event.timestamp);
                    activeLastUsed = event.timestamp;
                } else {
                    activeLastUsed = Math.max(activeLastUsed, event.timestamp);
                }
                if (event.timestamp >= dayStart && event.timestamp < dayEnd) {
                    Long last = lastCountedAt.get(packageName);
                    if (last == null || event.timestamp - last >= APP_LAUNCH_DEDUPLICATION_MS) {
                        launchCounts.put(packageName, launchCounts.getOrDefault(packageName, 0) + 1);
                        lastCountedAt.put(packageName, event.timestamp);
                    }
                }
            } else if (event.type == backgroundEventType
                && event.packageName != null && event.packageName.equals(activePackage)) {
                addInterval(foregroundIntervals, activePackage, activeStart,
                    Math.min(boundedEnd, event.timestamp));
                AppUsageAggregate aggregate = appUsage.computeIfAbsent(
                    activePackage, key -> createAppUsageAggregate(context, key)
                );
                aggregate.lastUsedAt = Math.max(aggregate.lastUsedAt, event.timestamp);
                activePackage = null;
                activeStart = -1;
                activeLastUsed = 0;
            } else if (event.type == UsageEvents.Event.SCREEN_NON_INTERACTIVE
                && activePackage != null) {
                addInterval(foregroundIntervals, activePackage, activeStart,
                    Math.min(boundedEnd, event.timestamp));
                AppUsageAggregate aggregate = appUsage.computeIfAbsent(
                    activePackage, key -> createAppUsageAggregate(context, key)
                );
                aggregate.lastUsedAt = Math.max(aggregate.lastUsedAt, event.timestamp);
                activePackage = null;
                activeStart = -1;
                activeLastUsed = 0;
            }
        }
        if (activePackage != null) {
            addInterval(foregroundIntervals, activePackage, activeStart, boundedEnd);
            AppUsageAggregate aggregate = appUsage.computeIfAbsent(
                activePackage, key -> createAppUsageAggregate(context, key)
            );
            aggregate.lastUsedAt = Math.max(aggregate.lastUsedAt, activeLastUsed);
        }

        for (UsageInterval interval : foregroundIntervals) {
            if (hasScreenEvents) {
                for (UsageInterval screen : screenIntervals) {
                    long overlapStart = Math.max(interval.start, screen.start);
                    long overlapEnd = Math.min(interval.end, screen.end);
                    addForegroundDuration(context, appUsage, interval.packageName, overlapStart, overlapEnd);
                }
            } else {
                addForegroundDuration(context, appUsage, interval.packageName, interval.start, interval.end);
            }
        }
        for (Map.Entry<String, AppUsageAggregate> item : appUsage.entrySet()) {
            item.getValue().launchCount = launchCounts.getOrDefault(item.getKey(), 0);
        }
        return appUsage;
    }

    private static void addForegroundDuration(
        Context context, Map<String, AppUsageAggregate> appUsage,
        String packageName, long start, long end
    ) {
        if (packageName == null || end <= start) return;
        AppUsageAggregate aggregate = appUsage.computeIfAbsent(
            packageName, key -> createAppUsageAggregate(context, key)
        );
        aggregate.foregroundTimeMs += end - start;
    }

    private static void addInterval(
        List<UsageInterval> intervals, String packageName, long start, long end
    ) {
        if (start >= 0 && end > start) {
            intervals.add(new UsageInterval(packageName, start, end));
        }
    }

    static void refreshWidgetUsage(Context context) {
        android.content.SharedPreferences preferences =
            context.getSharedPreferences("solis_home_widget", Context.MODE_PRIVATE);
        if (!preferences.getBoolean("usageTrackingEnabled", false)
            || !hasUsageAccess(context)) return;
        try {
            UsageStatsManager manager = (UsageStatsManager)
                context.getSystemService(Context.USAGE_STATS_SERVICE);
            if (manager == null) {
                throw new IllegalStateException("Android UsageStatsManager is unavailable.");
            }
            String date = new SimpleDateFormat("yyyy-MM-dd", Locale.US)
                .format(new java.util.Date());
            long[] range = getLocalDayRange(date);
            if (range == null) {
                throw new IllegalStateException("Could not determine the current local day.");
            }
            long queryStart = Math.max(0, range[0] - 24L * 60L * 60L * 1000L);
            long now = System.currentTimeMillis();
            List<TimedUsageEvent> events = readEvents(manager, queryStart, Math.min(range[1], now));
            List<UsageInterval> screenIntervals = readScreenIntervals(events, range[0], range[1]);
            Map<String, AppUsageAggregate> appUsage = readForegroundUsage(
                context, events, range[0], range[1], screenIntervals
            );
            JSONArray apps = new JSONArray();
            for (Map.Entry<String, AppUsageAggregate> item : appUsage.entrySet()) {
                AppUsageAggregate aggregate = item.getValue();
                JSONObject app = new JSONObject();
                app.put("packageName", item.getKey());
                app.put("appName", aggregate.appName);
                if (aggregate.appIconDataUrl != null) {
                    app.put("appIconDataUrl", aggregate.appIconDataUrl);
                }
                app.put("isSystemApp", aggregate.systemApp);
                app.put("totalTimeInForegroundMs", aggregate.foregroundTimeMs);
                app.put("lastUsedAt", aggregate.lastUsedAt);
                app.put("launchCount", aggregate.launchCount);
                apps.put(app);
            }
            long screenOnMs = 0;
            for (UsageInterval interval : screenIntervals) {
                screenOnMs += interval.end - interval.start;
            }
            preferences.edit()
                .putString("usageApps", apps.toString())
                .putLong("screenOnDurationMs", screenOnMs)
                .putLong("usageSyncedAt", now)
                .putString("lastSync", "Last sync " + now)
                .apply();
            SolisWidgetProvider.updateAllWidgets(context);
        } catch (Exception exception) {
            Log.e("AwakeUsageWidget", "Could not refresh normalized usage data for the widget.", exception);
        }
    }

    private static JSObject readScreenSummary(
        List<TimedUsageEvent> events,
        List<UsageInterval> screenIntervals,
        long dayStart,
        long dayEnd
    ) {
        long interactiveMs = 0;
        for (UsageInterval interval : screenIntervals) {
            interactiveMs += interval.end - interval.start;
        }
        int interactiveSessions = 0;
        int unlockCount = 0;
        for (TimedUsageEvent event : events) {
            if (event.timestamp < dayStart || event.timestamp >= dayEnd) continue;
            if (event.type == UsageEvents.Event.SCREEN_INTERACTIVE) interactiveSessions++;
            else if (event.type == UsageEvents.Event.KEYGUARD_HIDDEN) unlockCount++;
        }
        JSObject screen = new JSObject();
        screen.put("screenOnDurationMs", interactiveMs);
        screen.put("screenOnSessionCount", interactiveSessions);
        screen.put("unlockCount", unlockCount);
        screen.put("measurement", "screen-on event intervals; separate from summed app foreground intervals");
        return screen;
    }
}
