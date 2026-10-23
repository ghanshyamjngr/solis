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
    @Override
    public void onReceive(Context context, Intent intent) {
        String id = intent.getData() == null ? null : intent.getData().getLastPathSegment();
        String title = intent.getStringExtra("title");
        String body = intent.getStringExtra("body");
        long at = intent.getLongExtra("at", 0);
        String repeat = intent.getStringExtra("repeat");
        if (id == null || title == null) {
            Log.w("SolisTaskReminder", "Received reminder without task id or title.");
            return;
        }

        try {
            showNotification(context, id, title, body == null ? "" : body);
            if ("daily".equals(repeat) || "weekly".equals(repeat)) {
                long next = advanceUntilFuture(at, repeat);
                TaskRemindersPlugin.scheduleAlarm(context, id, title, body == null ? "" : body, next, repeat);
            } else {
                context.getSharedPreferences("solis_task_reminders", Context.MODE_PRIVATE)
                    .edit().remove(id).apply();
            }
        } catch (Exception exception) {
            Log.e("SolisTaskReminder", "Could not deliver or reschedule a task reminder.", exception);
        }
    }

    private void showNotification(Context context, String id, String title, String body) {
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) throw new IllegalStateException("Android notification service is unavailable.");

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID, "Task reminders", NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Gentle reminders for tasks you planned in Solis.");
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
            .setSmallIcon(context.getApplicationInfo().icon)
            .setContentTitle("Did you complete “" + title + "”?")
            .setContentText(body.isEmpty() ? "Open Solis to check in." : body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
            .setSilent(true)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true);
        if (contentIntent != null) notification.setContentIntent(contentIntent);
        manager.notify(id.hashCode(), notification.build());
    }

    static void restoreAlarms(Context context) {
        for (Object value : context.getSharedPreferences("solis_task_reminders", Context.MODE_PRIVATE)
            .getAll().values()) {
            if (!(value instanceof String)) continue;
            try {
                String saved = (String) value;
                String[] parts = saved.split("\n", 5);
                if (parts.length != 5) continue;
                long at = Long.parseLong(parts[3]);
                if (at <= System.currentTimeMillis()) {
                    if (!"daily".equals(parts[4]) && !"weekly".equals(parts[4])) continue;
                    at = advanceUntilFuture(at, parts[4]);
                }
                TaskRemindersPlugin.scheduleAlarm(context, parts[0], parts[1], parts[2], at, parts[4]);
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
