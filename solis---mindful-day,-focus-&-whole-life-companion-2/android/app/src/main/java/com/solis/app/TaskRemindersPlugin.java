package com.solis.app;

import android.Manifest;
import android.app.AlarmManager;
import android.app.PendingIntent;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Notification;
import android.app.WallpaperManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import androidx.core.app.NotificationManagerCompat;
import androidx.core.app.NotificationCompat;

@CapacitorPlugin(
    name = "TaskReminders",
    permissions = {
        @Permission(alias = "notifications", strings = { Manifest.permission.POST_NOTIFICATIONS })
    }
)
public class TaskRemindersPlugin extends Plugin {
    private static final String PREFERENCES = "solis_task_reminders";

    @PluginMethod
    public void requestPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            resolvePermission(call, notificationsEnabled());
            return;
        }
        if (getPermissionState("notifications") == PermissionState.GRANTED) {
            resolvePermission(call, notificationsEnabled());
            return;
        }
        requestPermissionForAlias("notifications", call, "notificationPermissionResult");
    }

    @PermissionCallback
    private void notificationPermissionResult(PluginCall call) {
        resolvePermission(call, getPermissionState("notifications") == PermissionState.GRANTED && notificationsEnabled());
    }

    private boolean notificationsEnabled() {
        return NotificationManagerCompat.from(getContext()).areNotificationsEnabled();
    }

    private boolean hasUsageAccess() {
        android.app.AppOpsManager appOps = (android.app.AppOpsManager)
            getContext().getSystemService(Context.APP_OPS_SERVICE);
        return appOps != null && appOps.checkOpNoThrow(
            android.app.AppOpsManager.OPSTR_GET_USAGE_STATS,
            android.os.Process.myUid(),
            getContext().getPackageName()
        ) == android.app.AppOpsManager.MODE_ALLOWED;
    }

    static boolean isWithinQuietHours(String start, String end) {
        try {
            int startMinute = parseMinutes(start);
            int endMinute = parseMinutes(end);
            if (startMinute == endMinute) return false;
            java.util.Calendar now = java.util.Calendar.getInstance();
            int currentMinute = now.get(java.util.Calendar.HOUR_OF_DAY) * 60
                + now.get(java.util.Calendar.MINUTE);
            return startMinute < endMinute
                ? currentMinute >= startMinute && currentMinute < endMinute
                : currentMinute >= startMinute || currentMinute < endMinute;
        } catch (IllegalArgumentException exception) {
            android.util.Log.w("SolisNotifications", "Ignoring invalid quiet-hours setting.", exception);
            return false;
        }
    }

    private static int parseMinutes(String value) {
        if (value == null) throw new IllegalArgumentException("Quiet-hours time is missing.");
        String[] parts = value.split(":", -1);
        if (parts.length != 2) throw new IllegalArgumentException("Quiet-hours time must use HH:mm.");
        int hour = Integer.parseInt(parts[0]);
        int minute = Integer.parseInt(parts[1]);
        if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
            throw new IllegalArgumentException("Quiet-hours time is outside the valid range.");
        }
        return hour * 60 + minute;
    }

    private void resolvePermission(PluginCall call, boolean granted) {
        JSObject result = new JSObject();
        result.put("granted", granted);
        call.resolve(result);
    }

    @PluginMethod
    public void schedule(PluginCall call) {
        String id = call.getString("id");
        String title = call.getString("title");
        String body = call.getString("body");
        String repeat = call.getString("repeat", "never");
        Long at = call.getLong("at");
        if (id == null || id.isEmpty() || title == null || title.trim().isEmpty() || at == null || at <= System.currentTimeMillis()) {
            call.reject("A task id, title, and future reminder time are required.");
            return;
        }
        if (!"never".equals(repeat) && !"daily".equals(repeat) && !"weekly".equals(repeat)) {
            call.reject("Task reminder repeat must be never, daily, or weekly.");
            return;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
            && getPermissionState("notifications") != PermissionState.GRANTED) {
            call.reject("Notification permission is not granted.");
            return;
        }
        if (!notificationsEnabled()) {
            call.reject("Notifications are disabled for Awake in Android settings.");
            return;
        }

        try {
            scheduleAlarm(getContext(), id, title, body == null ? "" : body, at, repeat);
            JSObject result = new JSObject();
            result.put("scheduled", true);
            call.resolve(result);
        } catch (Exception exception) {
            call.reject("Could not schedule Android task reminder.", exception);
        }
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        String id = call.getString("id");
        if (id == null || id.isEmpty()) {
            call.reject("A task id is required.");
            return;
        }
        try {
            cancelAlarm(getContext(), id);
            cancelAlarm(getContext(), id + "-postpone");
            getContext().getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)
                .edit().remove(id).remove(id + "-postpone").apply();
            android.app.NotificationManager notifications =
                (android.app.NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
            if (notifications != null) notifications.cancel(id.hashCode());
            if (notifications != null) notifications.cancel((id + "-postpone").hashCode());
            JSObject result = new JSObject();
            result.put("cancelled", true);
            call.resolve(result);
        } catch (Exception exception) {
            call.reject("Could not cancel Android task reminder.", exception);
        }
    }

    @PluginMethod
    public void updateWidget(PluginCall call) {
        android.content.SharedPreferences.Editor editor =
            getContext().getSharedPreferences("solis_home_widget", Context.MODE_PRIVATE).edit();
        String[] keys = { "stats", "nextTask", "progress", "focus", "focusAction", "goals", "streak", "usage", "lastSync" };
        for (String key : keys) {
            String value = call.getString(key);
            if (value != null) editor.putString(key, value);
        }
        Integer goalsProgress = call.getInt("goalsProgress");
        if (goalsProgress != null) editor.putInt("goalsProgress", Math.max(0, Math.min(100, goalsProgress)));
        editor.apply();
        SolisWidgetProvider.updateAllWidgets(getContext());
        JSObject result = new JSObject();
        result.put("updated", true);
        call.resolve(result);
    }

    @PluginMethod
    public void configureUsageEncouragement(PluginCall call) {
        boolean enabled = call.getBoolean("enabled", false);
        int threshold = call.getInt("thresholdMinutes", 120);
        int frequencyDays = call.getInt("frequencyDays", 1);
        String start = call.getString("quietHoursStart", "22:00");
        String end = call.getString("quietHoursEnd", "07:30");
        String tone = call.getString("tone", "gentle");
        if (threshold < 30 || threshold > 480) {
            call.reject("Usage encouragement threshold must be between 30 and 480 minutes.");
            return;
        }
        if (frequencyDays != 1 && frequencyDays != 2 && frequencyDays != 7) {
            call.reject("Usage encouragement frequency must be daily, every other day, or weekly.");
            return;
        }
        if (!("gentle".equals(tone) || "poetic".equals(tone)
            || "practical".equals(tone) || "off".equals(tone))) {
            call.reject("Usage encouragement style is invalid.");
            return;
        }
        if (enabled && !hasUsageAccess()) {
            call.reject("Enable Android Usage Access before turning on app-usage check-ins.");
            return;
        }
        if (enabled && !notificationsEnabled()) {
            call.reject("Enable notifications for Awake before turning on app-usage check-ins.");
            return;
        }
        android.content.SharedPreferences prefs =
            getContext().getSharedPreferences("solis_usage_encouragement", Context.MODE_PRIVATE);
        prefs.edit()
            .putBoolean("enabled", enabled)
            .putInt("threshold_minutes", threshold)
            .putInt("frequency_days", frequencyDays)
            .putString("quiet_hours_start", start)
            .putString("quiet_hours_end", end)
            .putString("tone", tone)
            .putBoolean("sound_enabled", call.getBoolean("soundEnabled", true))
            .putBoolean("vibration_enabled", call.getBoolean("vibrationEnabled", true))
            .putInt("completed_checkins", Math.max(0, call.getInt("completedCheckins", 0)))
            .putInt("planned_checkins", Math.max(0, call.getInt("plannedCheckins", 0)))
            .putString("usage_access", hasUsageAccess() ? "granted" : "not_granted")
            .apply();
        if (enabled) UsageEncouragementReceiver.schedule(getContext());
        else UsageEncouragementReceiver.cancel(getContext());
        JSObject result = new JSObject();
        result.put("scheduled", enabled);
        call.resolve(result);
    }

    @PluginMethod
    public void getWallpaperAccent(PluginCall call) {
        JSObject result = new JSObject();
        String color = null;
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
                android.app.WallpaperColors colors = WallpaperManager.getInstance(getContext())
                    .getWallpaperColors(WallpaperManager.FLAG_SYSTEM);
                if (colors != null && colors.getPrimaryColor() != null) {
                    color = String.format(java.util.Locale.US, "#%06X",
                        0xFFFFFF & colors.getPrimaryColor().toArgb());
                }
            }
        } catch (Exception exception) {
            call.reject("Could not read the Android wallpaper color.", exception);
            return;
        }
        if (color != null) result.put("color", color);
        call.resolve(result);
    }

    @PluginMethod
    public void notifyGoalComplete(PluginCall call) {
        String notificationTitle = call.getString("notificationTitle");
        String message = call.getString("message");
        if (notificationTitle == null || notificationTitle.trim().isEmpty()
            || message == null || message.trim().isEmpty()) {
            call.reject("A notification title and message are required.");
            return;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
            && getPermissionState("notifications") != PermissionState.GRANTED) {
            call.reject("Notification permission is not granted.");
            return;
        }
        if (!notificationsEnabled()) {
            call.reject("Notifications are disabled for Awake in Android settings.");
            return;
        }
        try {
            boolean quiet = isWithinQuietHours(
                call.getString("quietHoursStart", "22:00"),
                call.getString("quietHoursEnd", "07:30"));
            boolean soundEnabled = call.getBoolean("soundEnabled", true) && !quiet;
            boolean vibrationEnabled = call.getBoolean("vibrationEnabled", true) && !quiet;
            String channelId = "solis_goal_complete"
                + (soundEnabled ? "_sound" : "_silent")
                + (vibrationEnabled ? "_vibrate" : "_no_vibrate");
            NotificationManager manager = (NotificationManager) getContext()
                .getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager == null) throw new IllegalStateException("Android notification service is unavailable.");
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                NotificationChannel channel = new NotificationChannel(
                    channelId, "Goal completion ("
                        + (soundEnabled ? "sound" : "silent") + ", "
                        + (vibrationEnabled ? "vibration" : "no vibration") + ")",
                    NotificationManager.IMPORTANCE_DEFAULT
                );
                channel.setDescription("A notification when you reach a saved Awake goal.");
                if (!soundEnabled) channel.setSound(null, null);
                channel.enableVibration(vibrationEnabled);
                manager.createNotificationChannel(channel);
            }
            Intent launch = getContext().getPackageManager()
                .getLaunchIntentForPackage(getContext().getPackageName());
            PendingIntent contentIntent = null;
            if (launch != null) {
                contentIntent = PendingIntent.getActivity(getContext(), 8391, launch,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            }
            NotificationCompat.Builder notification = new NotificationCompat.Builder(getContext(), channelId)
                .setSmallIcon(R.drawable.ic_stat_solis)
                .setContentTitle(notificationTitle)
                .setContentText(message)
                .setAutoCancel(true)
                .setPriority(NotificationCompat.PRIORITY_DEFAULT);
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
                int defaults = 0;
                if (soundEnabled) defaults |= Notification.DEFAULT_SOUND;
                if (vibrationEnabled) defaults |= Notification.DEFAULT_VIBRATE;
                notification.setDefaults(defaults);
            }
            if (contentIntent != null) notification.setContentIntent(contentIntent);
            manager.notify(8391, notification.build());
            call.resolve();
        } catch (Exception exception) {
            call.reject("Could not show the goal completion notification.", exception);
        }
    }

    @PluginMethod
    public void consumePendingReminder(PluginCall call) {
        android.content.SharedPreferences preferences =
            getContext().getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE);
        String taskId = preferences.getString("pending_checkin", null);
        boolean openTasks = preferences.getBoolean("pending_open_tasks", false);
        String widgetAction = preferences.getString("pending_widget_action", null);
        String answer = preferences.getString("pending_answer", null);
        String answerId = preferences.getString("pending_answer_id", null);
        String answerDate = preferences.getString("pending_answer_date", null);
        JSObject result = new JSObject();
        if (taskId != null) result.put("taskId", taskId);
        result.put("openTasks", openTasks);
        if (widgetAction != null) result.put("widgetAction", widgetAction);
        if (answer != null) result.put("answer", answer);
        if (answerId != null) result.put("answerTaskId", answerId);
        if (answerDate != null) result.put("answerDate", answerDate);
        preferences.edit().remove("pending_checkin").remove("pending_open_tasks").remove("pending_widget_action")
            .remove("pending_answer").remove("pending_answer_id").remove("pending_answer_date").apply();
        call.resolve(result);
    }

    static void scheduleAlarm(Context context, String id, String title, String body, long at, String repeat) {
        scheduleAlarm(context, id, id, title, body, at, repeat);
    }

    static void scheduleSnoozeAlarm(Context context, String taskId, String title, String body, long at) {
        scheduleAlarm(context, taskId + "-postpone", taskId, title, body, at, "never");
    }

    static void scheduleAlarm(Context context, String id, String taskId,
        String title, String body, long at, String repeat) {
        AlarmManager alarms = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarms == null) throw new IllegalStateException("Android alarm service is unavailable.");
        Intent intent = reminderIntent(context, id);
        intent.putExtra("taskId", taskId);
        intent.putExtra("title", title);
        intent.putExtra("body", body);
        intent.putExtra("at", at);
        intent.putExtra("repeat", repeat);
        PendingIntent pendingIntent = PendingIntent.getBroadcast(
            context, id.hashCode(), intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pendingIntent);

        String saved = id + "\n" + title + "\n" + body + "\n" + at + "\n" + repeat + "\n" + taskId;
        context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE).edit().putString(id, saved).apply();
    }

    static void cancelAlarm(Context context, String id) {
        AlarmManager alarms = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarms == null) return;
        PendingIntent pendingIntent = PendingIntent.getBroadcast(
            context, id.hashCode(), reminderIntent(context, id),
            PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE
        );
        if (pendingIntent != null) {
            alarms.cancel(pendingIntent);
            pendingIntent.cancel();
        }
    }

    private static Intent reminderIntent(Context context, String id) {
        Intent intent = new Intent(context, TaskReminderReceiver.class);
        intent.setAction("com.solis.app.TASK_REMINDER");
        intent.setData(Uri.parse("solis://task-reminder/" + Uri.encode(id)));
        return intent;
    }
}
