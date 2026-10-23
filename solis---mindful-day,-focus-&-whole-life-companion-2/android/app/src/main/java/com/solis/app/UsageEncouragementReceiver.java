package com.solis.app;

import android.app.AppOpsManager;
import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.usage.UsageStats;
import android.app.usage.UsageStatsManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import java.util.Calendar;
import java.util.List;

public class UsageEncouragementReceiver extends BroadcastReceiver {
    static final String ACTION_CHECK = "com.solis.app.USAGE_ENCOURAGEMENT_CHECK";
    private static final String PREFS = "solis_usage_encouragement";
    private static final String CHANNEL_PREFIX = "solis_usage_encouragement";
    private static final int ALARM_ID = 7441;
    private static final int NOTIFICATION_ID = 7442;
    private static final long INTERVAL_MILLIS = 3L * 60L * 60L * 1000L;

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || !ACTION_CHECK.equals(intent.getAction())) return;
        schedule(context);
        checkAndNotify(context);
    }

    static void schedule(Context context) {
        android.content.SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        if (!prefs.getBoolean("enabled", false)) {
            cancel(context);
            return;
        }
        AlarmManager alarms = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarms == null) {
            Log.e("SolisUsageNudge", "Android alarm service is unavailable.");
            return;
        }
        Intent intent = new Intent(context, UsageEncouragementReceiver.class);
        intent.setAction(ACTION_CHECK);
        PendingIntent pending = PendingIntent.getBroadcast(context, ALARM_ID, intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        alarms.setInexactRepeating(AlarmManager.RTC_WAKEUP,
            System.currentTimeMillis() + INTERVAL_MILLIS,
            INTERVAL_MILLIS, pending);
    }

    static void cancel(Context context) {
        AlarmManager alarms = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarms == null) return;
        Intent intent = new Intent(context, UsageEncouragementReceiver.class);
        intent.setAction(ACTION_CHECK);
        PendingIntent pending = PendingIntent.getBroadcast(context, ALARM_ID, intent,
            PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE);
        if (pending != null) {
            alarms.cancel(pending);
            pending.cancel();
        }
    }

    private void checkAndNotify(Context context) {
        android.content.SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        if (!prefs.getBoolean("enabled", false)
            || !"granted".equals(prefs.getString("usage_access", "unknown"))) return;

        String date = todayKey();
        String lastNotificationDate = prefs.getString("last_notification_date", "");
        if (!lastNotificationDate.isEmpty()
            && daysSince(lastNotificationDate) < prefs.getInt("frequency_days", 1)) return;
        boolean quiet = TaskRemindersPlugin.isWithinQuietHours(
            prefs.getString("quiet_hours_start", "22:00"),
            prefs.getString("quiet_hours_end", "07:30"));
        if (quiet || !NotificationManagerCompat.from(context).areNotificationsEnabled()) return;

        int foregroundMinutes;
        try {
            foregroundMinutes = readTodayForegroundMinutes(context);
        } catch (Exception exception) {
            Log.e("SolisUsageNudge", "Could not read local Android usage totals.", exception);
            return;
        }
        if (foregroundMinutes < prefs.getInt("threshold_minutes", 120)) return;

        String tone = prefs.getString("tone", "gentle");
        if ("off".equals(tone)) return;
        int completed = prefs.getInt("completed_checkins", 0);
        int planned = prefs.getInt("planned_checkins", 0);
        String title = "A gentle Awake check-in";
        String message = messageFor(tone, foregroundMinutes, completed, planned);

        String channelId = channelId(
            prefs.getBoolean("sound_enabled", true),
            prefs.getBoolean("vibration_enabled", true));
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager == null) return;
            NotificationChannel channel = new NotificationChannel(
                channelId, "Usage check-ins", NotificationManager.IMPORTANCE_DEFAULT);
            channel.setDescription("Optional local reminders based on app-usage totals.");
            if (!prefs.getBoolean("sound_enabled", true)) channel.setSound(null, null);
            channel.enableVibration(prefs.getBoolean("vibration_enabled", true));
            manager.createNotificationChannel(channel);
        }

        Intent launch = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        PendingIntent contentIntent = null;
        if (launch != null) {
            launch.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            launch.putExtra("solisWidgetAction", completed > 0 ? "plan" : "today");
            contentIntent = PendingIntent.getActivity(context, NOTIFICATION_ID, launch,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        }
        NotificationCompat.Builder notification = new NotificationCompat.Builder(context, channelId)
            .setSmallIcon(R.drawable.ic_stat_solis)
            .setContentTitle(title)
            .setContentText(message)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(message))
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT);
        if (contentIntent != null) notification.setContentIntent(contentIntent);
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            int defaults = 0;
            if (prefs.getBoolean("sound_enabled", true)) defaults |= Notification.DEFAULT_SOUND;
            if (prefs.getBoolean("vibration_enabled", true)) defaults |= Notification.DEFAULT_VIBRATE;
            notification.setDefaults(defaults);
        }
        try {
            NotificationManagerCompat.from(context).notify(NOTIFICATION_ID, notification.build());
            prefs.edit().putString("last_notification_date", date).apply();
        } catch (SecurityException exception) {
            Log.w("SolisUsageNudge", "Notification permission was unavailable.", exception);
        }
    }

    private int readTodayForegroundMinutes(Context context) {
        AppOpsManager appOps = (AppOpsManager) context.getSystemService(Context.APP_OPS_SERVICE);
        if (appOps == null || appOps.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS,
            android.os.Process.myUid(), context.getPackageName()) != AppOpsManager.MODE_ALLOWED) {
            return 0;
        }
        UsageStatsManager manager = (UsageStatsManager) context.getSystemService(Context.USAGE_STATS_SERVICE);
        if (manager == null) throw new IllegalStateException("Android UsageStatsManager is unavailable.");
        Calendar start = Calendar.getInstance();
        start.set(Calendar.HOUR_OF_DAY, 0);
        start.set(Calendar.MINUTE, 0);
        start.set(Calendar.SECOND, 0);
        start.set(Calendar.MILLISECOND, 0);
        List<UsageStats> stats = manager.queryUsageStats(
            UsageStatsManager.INTERVAL_DAILY, start.getTimeInMillis(), System.currentTimeMillis());
        long total = 0;
        if (stats != null) {
            for (UsageStats usage : stats) {
                if (!context.getPackageName().equals(usage.getPackageName())) {
                    total += Math.max(0, usage.getTotalTimeInForeground());
                }
            }
        }
        return (int) Math.min(Integer.MAX_VALUE, total / 60_000L);
    }

    private String messageFor(String tone, int minutes, int completed, int planned) {
        String taskNote = planned > 0
            ? " You checked in on " + completed + " of " + planned + " planned tasks recently."
            : "";
        if ("practical".equals(tone)) {
            return "Android recorded about " + minutes + " minutes of foreground app time today."
                + taskNote + " Consider a short pause or choose one small next step.";
        }
        if ("poetic".equals(tone)) {
            return "Your apps have held about " + minutes + " minutes of your day so far."
                + taskNote + " A little breathing room can make space for what matters next.";
        }
        return "About " + minutes + " minutes of app use has been recorded today."
            + taskNote + " If it feels right, take a gentle pause before your next step.";
    }

    private String channelId(boolean sound, boolean vibration) {
        return CHANNEL_PREFIX + (sound ? "_sound" : "_silent")
            + (vibration ? "_vibrate" : "_no_vibrate");
    }

    private String todayKey() {
        Calendar today = Calendar.getInstance();
        return String.format(java.util.Locale.US, "%04d-%02d-%02d",
            today.get(Calendar.YEAR), today.get(Calendar.MONTH) + 1,
            today.get(Calendar.DAY_OF_MONTH));
    }

    private int daysSince(String date) {
        try {
            String[] parts = date.split("-", -1);
            if (parts.length != 3) return Integer.MAX_VALUE;
            Calendar last = Calendar.getInstance();
            last.clear();
            last.set(Integer.parseInt(parts[0]), Integer.parseInt(parts[1]) - 1,
                Integer.parseInt(parts[2]), 12, 0, 0);
            Calendar today = Calendar.getInstance();
            today.set(Calendar.HOUR_OF_DAY, 12);
            today.set(Calendar.MINUTE, 0);
            today.set(Calendar.SECOND, 0);
            today.set(Calendar.MILLISECOND, 0);
            if (!last.before(today)) return 0;
            int days = 0;
            while (last.before(today) && days <= 7) {
                last.add(Calendar.DAY_OF_MONTH, 1);
                days++;
            }
            return days;
        } catch (NumberFormatException exception) {
            Log.w("SolisUsageNudge", "Ignoring invalid prior notification date.", exception);
            return Integer.MAX_VALUE;
        }
    }
}
