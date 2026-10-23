package com.solis.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import java.util.Calendar;
import android.os.Build;
import android.util.Log;

import androidx.core.app.NotificationCompat;

public class TaskReminderReceiver extends BroadcastReceiver {
    private static final String CHANNEL_ID = "solis_task_reminders";
    private static final String ACTION_RESPONSE = "com.solis.app.TASK_RESPONSE";
    @Override
    public void onReceive(Context context, Intent intent) {
        if (ACTION_RESPONSE.equals(intent.getAction())) {
            handleResponse(context, intent);
            return;
        }
        String alarmId = intent.getData() == null ? null : intent.getData().getLastPathSegment();
        String id = intent.getStringExtra("taskId");
        if (id == null) id = alarmId;
        if (alarmId == null) alarmId = id;
        String title = intent.getStringExtra("title");
        String body = intent.getStringExtra("body");
        long at = intent.getLongExtra("at", 0);
        String repeat = intent.getStringExtra("repeat");
        if (id == null || title == null) {
            Log.w("SolisTaskReminder", "Received reminder without task id or title.");
            return;
        }

        try {
            showNotification(context, id, title, body == null ? "" : body, at, repeat);
            if ("daily".equals(repeat) || "weekly".equals(repeat)) {
                long next = advanceUntilFuture(at, repeat);
                TaskRemindersPlugin.scheduleAlarm(context, id, title, body == null ? "" : body, next, repeat);
            } else {
                context.getSharedPreferences("solis_task_reminders", Context.MODE_PRIVATE)
                    .edit().remove(alarmId).apply();
                TaskRemindersPlugin.cancelAlarm(context, alarmId);
            }
        } catch (Exception exception) {
            Log.e("SolisTaskReminder", "Could not deliver or reschedule a task reminder.", exception);
        }
    }

    private void handleResponse(Context context, Intent intent) {
        String taskId = intent.getStringExtra("taskId");
        String response = intent.getStringExtra("response");
        String title = intent.getStringExtra("title");
        String body = intent.getStringExtra("body");
        String repeat = intent.getStringExtra("repeat");
        long at = intent.getLongExtra("at", System.currentTimeMillis());
        if (taskId == null || title == null
            || !("completed".equals(response) || "postponed".equals(response) || "skipped".equals(response))) {
            Log.w("SolisTaskReminder", "Received invalid reminder response.");
            return;
        }

        Calendar occurrence = Calendar.getInstance();
        occurrence.setTimeInMillis(at);
        String date = String.format(java.util.Locale.US, "%04d-%02d-%02d",
            occurrence.get(Calendar.YEAR), occurrence.get(Calendar.MONTH) + 1,
            occurrence.get(Calendar.DAY_OF_MONTH));
        android.content.SharedPreferences.Editor editor =
            context.getSharedPreferences("solis_task_reminders", Context.MODE_PRIVATE).edit();
        editor.putString("pending_answer_id", taskId);
        editor.putString("pending_answer_date", date);
        editor.putString("pending_answer", response);
        editor.apply();

        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) manager.cancel(taskId.hashCode());
        if ("postponed".equals(response)) {
            TaskRemindersPlugin.scheduleSnoozeAlarm(context, taskId, title,
                body == null ? "" : body, System.currentTimeMillis() + 15 * 60 * 1000L);
            return;
        }

        Intent open = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (open != null) {
            open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            open.putExtra("solisTaskReminderId", taskId);
            open.putExtra("solisTaskReminderAnswer", response);
            context.startActivity(open);
        }
    }

    private void showNotification(Context context, String id, String title, String body, long at, String repeat) {
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) throw new IllegalStateException("Android notification service is unavailable.");

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID, "Task reminders", NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Gentle reminders for tasks you planned in Awake.");
            channel.setSound(null, null);
            manager.createNotificationChannel(channel);
        }

        Intent openApp = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        PendingIntent contentIntent = null;
        if (openApp != null) {
            openApp.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            openApp.putExtra("solisTaskReminderId", id);
            contentIntent = PendingIntent.getActivity(
                context, id.hashCode(), openApp,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
        }

        NotificationCompat.Builder notification = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_solis)
            .setContentTitle("Did you complete “" + title + "”?")
            .setContentText(body.isEmpty() ? "Open Awake to check in." : body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
            .setSilent(true)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true);
        if (contentIntent != null) notification.setContentIntent(contentIntent);
        notification.addAction(0, "Completed", responseIntent(context, id, title, body, at, repeat, "completed", 1));
        notification.addAction(0, "Postpone 15 min", responseIntent(context, id, title, body, at, repeat, "postponed", 2));
        notification.addAction(0, "Skip", responseIntent(context, id, title, body, at, repeat, "skipped", 3));
        manager.notify(id.hashCode(), notification.build());
    }

    private PendingIntent responseIntent(Context context, String id, String title, String body,
        long at, String repeat, String response, int actionIndex) {
        Intent intent = new Intent(context, TaskReminderReceiver.class);
        intent.setAction(ACTION_RESPONSE);
        intent.setData(android.net.Uri.parse("solis://task-response/" + android.net.Uri.encode(id) + "/" + actionIndex));
        intent.putExtra("taskId", id);
        intent.putExtra("title", title);
        intent.putExtra("body", body);
        intent.putExtra("at", at);
        intent.putExtra("repeat", repeat);
        intent.putExtra("response", response);
        return PendingIntent.getBroadcast(context, id.hashCode() + actionIndex, intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static void restoreAlarms(Context context) {
        for (Object value : context.getSharedPreferences("solis_task_reminders", Context.MODE_PRIVATE)
            .getAll().values()) {
            if (!(value instanceof String)) continue;
            try {
                String saved = (String) value;
                String[] parts = saved.split("\n", 6);
                if (parts.length < 5) continue;
                long at = Long.parseLong(parts[3]);
                if (at <= System.currentTimeMillis()) {
                    if (!"daily".equals(parts[4]) && !"weekly".equals(parts[4])) continue;
                    at = advanceUntilFuture(at, parts[4]);
                }
                String taskId = parts.length > 5 ? parts[5] : parts[0];
                TaskRemindersPlugin.scheduleAlarm(context, parts[0], taskId, parts[1], parts[2], at, parts[4]);
            } catch (Exception exception) {
                Log.e("SolisTaskReminder", "Could not restore a scheduled reminder after restart.", exception);
            }
        }
    }

    private static long advanceUntilFuture(long at, String repeat) {
        Calendar next = Calendar.getInstance();
        next.setTimeInMillis(at);
        int days = "daily".equals(repeat) ? 1 : 7;
        do {
            next.add(Calendar.DAY_OF_MONTH, days);
        } while (next.getTimeInMillis() <= System.currentTimeMillis());
        return next.getTimeInMillis();
    }
}
