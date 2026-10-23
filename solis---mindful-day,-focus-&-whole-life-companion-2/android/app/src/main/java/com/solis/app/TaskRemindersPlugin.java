package com.solis.app;

import android.Manifest;
import android.app.AlarmManager;
import android.app.PendingIntent;
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
            call.reject("Notifications are disabled for Solis in Android settings.");
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
            getContext().getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)
                .edit().remove(id).apply();
            android.app.NotificationManager notifications =
                (android.app.NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
            if (notifications != null) notifications.cancel(id.hashCode());
            JSObject result = new JSObject();
            result.put("cancelled", true);
            call.resolve(result);
        } catch (Exception exception) {
            call.reject("Could not cancel Android task reminder.", exception);
        }
    }

    @PluginMethod
    public void updateWidget(PluginCall call) {
        String nextTask = call.getString("nextTask", "No tasks planned yet");
        String progress = call.getString("progress", "Plan a small step today");
        getContext().getSharedPreferences("solis_home_widget", Context.MODE_PRIVATE)
            .edit().putString("nextTask", nextTask).putString("progress", progress).apply();
        SolisWidgetProvider.updateAllWidgets(getContext());
        JSObject result = new JSObject();
        result.put("updated", true);
        call.resolve(result);
    }

    @PluginMethod
    public void consumePendingReminder(PluginCall call) {
        android.content.SharedPreferences preferences =
            getContext().getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE);
        String taskId = preferences.getString("pending_checkin", null);
        boolean openTasks = preferences.getBoolean("pending_open_tasks", false);
        JSObject result = new JSObject();
        if (taskId != null) result.put("taskId", taskId);
        result.put("openTasks", openTasks);
        preferences.edit().remove("pending_checkin").remove("pending_open_tasks").apply();
        call.resolve(result);
    }

    static void scheduleAlarm(Context context, String id, String title, String body, long at, String repeat) {
        AlarmManager alarms = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarms == null) throw new IllegalStateException("Android alarm service is unavailable.");
        Intent intent = reminderIntent(context, id);
        intent.putExtra("title", title);
        intent.putExtra("body", body);
        intent.putExtra("at", at);
        intent.putExtra("repeat", repeat);
        PendingIntent pendingIntent = PendingIntent.getBroadcast(
            context, id.hashCode(), intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pendingIntent);

        String saved = id + "\n" + title + "\n" + body + "\n" + at + "\n" + repeat;
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
