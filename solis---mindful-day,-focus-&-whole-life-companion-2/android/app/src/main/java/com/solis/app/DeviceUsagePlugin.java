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

import java.io.ByteArrayOutputStream;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.Calendar;
import java.util.HashMap;
import java.util.List;
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

    @PluginMethod
    public void checkAccess(PluginCall call) {
        JSObject result = new JSObject();
        result.put("permissionGranted", hasUsageAccess());
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
        if (!hasUsageAccess()) {
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

            Map<String, AppUsageAggregate> appUsage = new HashMap<>();
            List<UsageStats> stats = manager.queryUsageStats(
                UsageStatsManager.INTERVAL_DAILY, range[0], range[1]
            );
            if (stats != null) {
                for (UsageStats usage : stats) {
                    String packageName = usage.getPackageName();
                    long foregroundTime = usage.getTotalTimeInForeground();
                    if (foregroundTime <= 0 || getContext().getPackageName().equals(packageName)) {
                        continue;
                    }

                    AppUsageAggregate aggregate = appUsage.computeIfAbsent(
                        packageName, key -> createAppUsageAggregate(key)
                    );
                    aggregate.foregroundTimeMs += foregroundTime;
                    aggregate.lastUsedAt = Math.max(aggregate.lastUsedAt, usage.getLastTimeUsed());
                }
            }

            Map<String, Integer> launchCounts = readAppLaunchCounts(manager, range[0], range[1]);
            for (Map.Entry<String, AppUsageAggregate> item : appUsage.entrySet()) {
                Integer launchCount = launchCounts.get(item.getKey());
                if (launchCount != null) {
                    item.getValue().launchCount = launchCount;
                }
            }

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

            JSObject screen = readScreenEvents(manager, range[0], range[1]);
            JSObject result = new JSObject();
            result.put("permissionGranted", true);
            result.put("date", date);
            result.put("syncedAt", System.currentTimeMillis());
            result.put("apps", apps);
            result.put("screen", screen);
            call.resolve(result);
        } catch (Exception exception) {
            call.reject("Could not read Android app usage for this date.", exception);
        }
    }

    private boolean hasUsageAccess() {
        AppOpsManager appOps = (AppOpsManager) getContext().getSystemService(Context.APP_OPS_SERVICE);
        if (appOps == null) {
            return false;
        }
        int mode = appOps.checkOpNoThrow(
            AppOpsManager.OPSTR_GET_USAGE_STATS,
            android.os.Process.myUid(),
            getContext().getPackageName()
        );
        return mode == AppOpsManager.MODE_ALLOWED;
    }

    private long[] getLocalDayRange(String date) {
        if (date == null || !date.matches("\\d{4}-\\d{2}-\\d{2}")) {
            return null;
        }
        try {
            String[] parts = date.split("-");
            Calendar start = Calendar.getInstance();
            start.clear();
            start.set(Integer.parseInt(parts[0]), Integer.parseInt(parts[1]) - 1,
                Integer.parseInt(parts[2]), 0, 0, 0);
            long startMs = start.getTimeInMillis();
            start.add(Calendar.DAY_OF_MONTH, 1);
            return new long[] { startMs, start.getTimeInMillis() };
        } catch (Exception exception) {
            return null;
        }
    }

    private AppUsageAggregate createAppUsageAggregate(String packageName) {
        PackageManager packageManager = getContext().getPackageManager();
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

    private Map<String, Integer> readAppLaunchCounts(
        UsageStatsManager manager, long startMs, long endMs
    ) {
        Map<String, Integer> launchCounts = new HashMap<>();
        Map<String, Long> lastCountedAt = new HashMap<>();
        UsageEvents events = manager.queryEvents(startMs, endMs);
        UsageEvents.Event event = new UsageEvents.Event();
        int foregroundEventType = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q
            ? UsageEvents.Event.ACTIVITY_RESUMED
            : UsageEvents.Event.MOVE_TO_FOREGROUND;

        while (events != null && events.hasNextEvent()) {
            events.getNextEvent(event);
            if (event.getEventType() != foregroundEventType) {
                continue;
            }

            String packageName = event.getPackageName();
            long timestamp = event.getTimeStamp();
            Long previousTimestamp = lastCountedAt.get(packageName);
            if (previousTimestamp == null
                || timestamp - previousTimestamp >= APP_LAUNCH_DEDUPLICATION_MS) {
                Integer count = launchCounts.get(packageName);
                launchCounts.put(packageName, count == null ? 1 : count + 1);
                lastCountedAt.put(packageName, timestamp);
            }
        }
        return launchCounts;
    }

    private JSObject readScreenEvents(UsageStatsManager manager, long startMs, long endMs) {
        JSObject screen = new JSObject();
        long interactiveMs = 0;
        int interactiveSessions = 0;
        int unlockCount = 0;
        boolean interactive = false;
        long interactiveStart = 0;

        UsageEvents events = manager.queryEvents(startMs, endMs);
        UsageEvents.Event event = new UsageEvents.Event();
        while (events != null && events.hasNextEvent()) {
            events.getNextEvent(event);
            int type = event.getEventType();
            long timestamp = event.getTimeStamp();

            if (type == UsageEvents.Event.SCREEN_INTERACTIVE && !interactive) {
                interactive = true;
                interactiveStart = timestamp;
                interactiveSessions++;
            } else if (type == UsageEvents.Event.SCREEN_NON_INTERACTIVE && interactive) {
                interactiveMs += Math.max(0, timestamp - interactiveStart);
                interactive = false;
            } else if (type == UsageEvents.Event.KEYGUARD_HIDDEN) {
                unlockCount++;
            }
        }
        if (interactive) {
            interactiveMs += Math.max(0, Math.min(System.currentTimeMillis(), endMs) - interactiveStart);
        }

        screen.put("screenOnDurationMs", interactiveMs);
        screen.put("screenOnSessionCount", interactiveSessions);
        screen.put("unlockCount", unlockCount);
        screen.put("measurement", "screen-on time derived from Android UsageEvents; not touch or website tracking");
        return screen;
    }
}
