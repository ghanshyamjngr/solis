package com.solis.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.SystemClock;
import android.util.Log;

import androidx.core.app.NotificationCompat;

public class FocusTimerService extends Service {
    static final String ACTION_START = "com.solis.app.FOCUS_START";
    static final String ACTION_PAUSE = "com.solis.app.FOCUS_PAUSE";
    static final String ACTION_RESUME = "com.solis.app.FOCUS_RESUME";
    static final String ACTION_FINISH = "com.solis.app.FOCUS_FINISH";
    static final String ACTION_WIDGET_ACTION = "com.solis.app.FOCUS_WIDGET_ACTION";
    private static final String ACTION_FINISH_COMPLETE = "com.solis.app.FOCUS_COMPLETE";
    private static final String PREFS = "solis_focus_timer";
    private static final String RUNNING_CHANNEL = "solis_focus_running";
    private static final String COMPLETE_CHANNEL_PREFIX = "solis_focus_complete";
    private static final int NOTIFICATION_ID = 8210;
    private final Handler handler = new Handler(Looper.getMainLooper());

    private final Runnable updateNotification = new Runnable() {
        @Override
        public void run() {
            if (!isActive()) return;
            long remaining = getRemainingSeconds();
            if (isRunning() && isPreset() && remaining <= 0) {
                completeSession();
                return;
            }
            showRunningNotification();
            long untilCompletion = isPreset() ? Math.max(1_000L, remaining * 1000L) : 30_000L;
            handler.postDelayed(this, Math.min(30_000L, untilCompletion));
        }
    };

    @Override
    public void onCreate() {
        super.onCreate();
        ensureChannels();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent == null ? null : intent.getAction();
        try {
            if (ACTION_START.equals(action)) {
                startSession(intent);
            } else if (ACTION_WIDGET_ACTION.equals(action)) {
                if (!isActive()) {
                    Intent quickFocus = new Intent();
                    quickFocus.putExtra("mode", "preset");
                    quickFocus.putExtra("durationSeconds", 25 * 60);
                    quickFocus.putExtra("intention", "Focus session");
                    quickFocus.putExtra("soundEnabled", true);
                    quickFocus.putExtra("vibrationEnabled", true);
                    startSession(quickFocus);
                } else if (!isRunning()) {
                    resumeSession();
                } else {
                    showRunningNotification();
                }
            } else if (!isActive()) {
                stopSelf();
            } else if (ACTION_PAUSE.equals(action)) {
                pauseSession();
            } else if (ACTION_RESUME.equals(action)) {
                resumeSession();
            } else if (ACTION_FINISH.equals(action)) {
                finishSession();
            } else if (ACTION_FINISH_COMPLETE.equals(action)) {
                completeSession();
            } else if (isActive()) {
                startForeground(NOTIFICATION_ID, buildRunningNotification());
                showRunningNotification();
                if (isRunning()) {
                    handler.removeCallbacks(updateNotification);
                    handler.postDelayed(updateNotification, 1000L);
                }
            } else {
                stopSelf();
            }
        } catch (Exception exception) {
            Log.e("SolisFocusTimer", "Could not process focus timer action.", exception);
            stopForeground(STOP_FOREGROUND_REMOVE);
            stopSelf();
        }
        return START_STICKY;
    }

    private void startSession(Intent intent) {
        long nowElapsed = SystemClock.elapsedRealtime();
        long nowWall = System.currentTimeMillis();
        getPrefs().edit()
            .putBoolean("active", true)
            .putBoolean("running", true)
            .putBoolean("preset", "preset".equals(intent.getStringExtra("mode")))
            .putInt("duration", intent.getIntExtra("durationSeconds", 1500))
            .putLong("elapsed", 0)
            .putLong("anchorElapsed", nowElapsed)
            .putLong("anchorWall", nowWall)
            .putString("intention", intent.getStringExtra("intention") == null ? "Focus session" : intent.getStringExtra("intention"))
            .putBoolean("soundEnabled", intent.getBooleanExtra("soundEnabled", true))
            .putBoolean("vibrationEnabled", intent.getBooleanExtra("vibrationEnabled", true))
            .putString("quietHoursStart", intent.getStringExtra("quietHoursStart") == null
                ? "22:00" : intent.getStringExtra("quietHoursStart"))
            .putString("quietHoursEnd", intent.getStringExtra("quietHoursEnd") == null
                ? "07:30" : intent.getStringExtra("quietHoursEnd"))
            .apply();
        updateFocusWidget("Running · " + getPrefs().getString("intention", "Focus session"), "Tap to pause or open Solis");
        handler.removeCallbacks(updateNotification);
        startForeground(NOTIFICATION_ID, buildRunningNotification());
        handler.postDelayed(updateNotification, 1000L);
    }

    private void pauseSession() {
        if (!isActive() || !isRunning()) return;
        getPrefs().edit()
            .putLong("elapsed", getElapsedSeconds())
            .putBoolean("running", false)
            .apply();
        updateFocusWidget("Paused · " + getPrefs().getString("intention", "Focus session"), "Tap to resume");
        handler.removeCallbacks(updateNotification);
        showRunningNotification();
    }

    private void resumeSession() {
        if (!isActive() || isRunning()) return;
        getPrefs().edit()
            .putBoolean("running", true)
            .putLong("anchorElapsed", SystemClock.elapsedRealtime())
            .putLong("anchorWall", System.currentTimeMillis())
            .apply();
        updateFocusWidget("Running · " + getPrefs().getString("intention", "Focus session"), "Tap to pause or open Solis");
        handler.removeCallbacks(updateNotification);
        showRunningNotification();
        handler.postDelayed(updateNotification, 1000L);
    }

    private void finishSession() {
        if (!isActive()) return;
        showCompletionNotification(false);
        clearSession(false);
    }

    private void completeSession() {
        if (!isActive()) return;
        showCompletionNotification(true);
        clearSession(true);
    }

    private void clearSession(boolean completed) {
        handler.removeCallbacks(updateNotification);
        getPrefs().edit().clear().putBoolean("completed", completed).apply();
        updateFocusWidget("No focus session running", "Tap to start a 25-minute focus");
        stopForeground(STOP_FOREGROUND_REMOVE);
        stopSelf();
    }

    private long getElapsedSeconds() {
        long accumulated = getPrefs().getLong("elapsed", 0);
        if (!isRunning()) return accumulated;
        long anchorElapsed = getPrefs().getLong("anchorElapsed", 0);
        long monotonicDelta = SystemClock.elapsedRealtime() - anchorElapsed;
        if (monotonicDelta >= 0) return accumulated + monotonicDelta / 1000;
        long wallDelta = System.currentTimeMillis() - getPrefs().getLong("anchorWall", 0);
        return accumulated + Math.max(0, wallDelta / 1000);
    }

    private long getRemainingSeconds() {
        return Math.max(0, getPrefs().getInt("duration", 1500) - getElapsedSeconds());
    }

    private boolean isActive() {
        return getPrefs().getBoolean("active", false);
    }

    private boolean isRunning() {
        return getPrefs().getBoolean("running", false);
    }

    private boolean isPreset() {
        return getPrefs().getBoolean("preset", true);
    }

    private android.content.SharedPreferences getPrefs() {
        return getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private void updateFocusWidget(String status, String action) {
        getSharedPreferences("solis_home_widget", Context.MODE_PRIVATE)
            .edit().putString("focus", status).putString("focusAction", action).apply();
        SolisWidgetProvider.updateAllWidgets(this);
    }

    private void ensureChannels() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager == null) throw new IllegalStateException("Android notification service is unavailable.");
        NotificationChannel running = new NotificationChannel(
            RUNNING_CHANNEL, "Focus timer", NotificationManager.IMPORTANCE_LOW
        );
        running.setDescription("Ongoing Solis focus session controls.");
        running.setSound(null, null);
        manager.createNotificationChannel(running);
        for (boolean sound : new boolean[] { false, true }) {
            for (boolean vibration : new boolean[] { false, true }) {
                NotificationChannel complete = new NotificationChannel(
                    completionChannelId(sound, vibration),
                    "Focus complete (" + (sound ? "sound" : "silent") + ", "
                        + (vibration ? "vibration" : "no vibration") + ")",
                    NotificationManager.IMPORTANCE_HIGH
                );
                complete.setDescription("Alerts when a timed focus session is complete.");
                if (!sound) complete.setSound(null, null);
                complete.enableVibration(vibration);
                manager.createNotificationChannel(complete);
            }
        }
    }

    private String completionChannelId(boolean sound, boolean vibration) {
        return COMPLETE_CHANNEL_PREFIX + (sound ? "_sound" : "_silent")
            + (vibration ? "_vibrate" : "_no_vibrate");
    }

    private Notification buildRunningNotification() {
        long remaining = getRemainingSeconds();
        Intent launch = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent content = null;
        if (launch != null) {
            launch.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            launch.putExtra("solisOpenFocus", true);
            content = PendingIntent.getActivity(this, 8210, launch,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        }
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, RUNNING_CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_solis)
            .setContentTitle(getPrefs().getString("intention", "Focus session"))
            .setContentText(isRunning()
                ? (isPreset() ? "Focus session · remaining time" : "Focus session · elapsed time")
                : "Focus session paused")
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setPriority(NotificationCompat.PRIORITY_LOW);
        if (content != null) builder.setContentIntent(content);
        if (isRunning()) {
            long remainingMs = isPreset() ? remaining * 1000 : getElapsedSeconds() * 1000;
            long when = isPreset() ? System.currentTimeMillis() + remainingMs : System.currentTimeMillis() - remainingMs;
            builder.setWhen(when).setShowWhen(true).setUsesChronometer(true);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                builder.setChronometerCountDown(isPreset());
            }
            builder.addAction(action("Pause", ACTION_PAUSE, 8211));
        } else {
            builder.addAction(action("Resume", ACTION_RESUME, 8212));
        }
        builder.addAction(action("Finish", ACTION_FINISH, 8213));
        return builder.build();
    }

    private NotificationCompat.Action action(String label, String action, int requestCode) {
        Intent intent = new Intent(this, FocusTimerService.class);
        intent.setAction(action);
        PendingIntent pending = PendingIntent.getService(this, requestCode, intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        return new NotificationCompat.Action.Builder(0, label, pending).build();
    }

    private void showRunningNotification() {
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null) manager.notify(NOTIFICATION_ID, buildRunningNotification());
    }

    private void showCompletionNotification(boolean goalReached) {
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager == null) return;
        Intent intent = new Intent(this, FocusTimerService.class);
        intent.setAction(ACTION_START);
        intent.putExtra("mode", "preset");
        intent.putExtra("durationSeconds", getPrefs().getInt("duration", 1500));
        intent.putExtra("intention", getPrefs().getString("intention", "Focus session"));
        intent.putExtra("soundEnabled", getPrefs().getBoolean("soundEnabled", true));
        intent.putExtra("vibrationEnabled", getPrefs().getBoolean("vibrationEnabled", true));
        intent.putExtra("quietHoursStart", getPrefs().getString("quietHoursStart", "22:00"));
        intent.putExtra("quietHoursEnd", getPrefs().getString("quietHoursEnd", "07:30"));
        PendingIntent continueAction = PendingIntent.getService(this, 8214, intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        boolean soundEnabled = getPrefs().getBoolean("soundEnabled", true);
        boolean vibrationEnabled = getPrefs().getBoolean("vibrationEnabled", true);
        boolean quiet = TaskRemindersPlugin.isWithinQuietHours(
            getPrefs().getString("quietHoursStart", "22:00"),
            getPrefs().getString("quietHoursEnd", "07:30"));
        boolean alertSound = soundEnabled && !quiet;
        boolean alertVibration = vibrationEnabled && !quiet;
        NotificationCompat.Builder builder = new NotificationCompat.Builder(
            this, completionChannelId(alertSound, alertVibration))
            .setSmallIcon(R.drawable.ic_stat_solis)
            .setContentTitle(goalReached ? "Focus goal complete" : "Focus session finished")
            .setContentText("Your session is ready to review in Solis.")
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .addAction(0, "Continue", continueAction);
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            int defaults = 0;
            if (alertSound) defaults |= Notification.DEFAULT_SOUND;
            if (alertVibration) defaults |= Notification.DEFAULT_VIBRATE;
            builder.setDefaults(defaults);
        }
        manager.notify(NOTIFICATION_ID + 1, builder.build());
    }

    static JSObject readState(Context context) {
        android.content.SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        JSObject state = new JSObject();
        boolean active = prefs.getBoolean("active", false);
        boolean running = prefs.getBoolean("running", false);
        long elapsed = prefs.getLong("elapsed", 0);
        if (active && running) {
            long delta = SystemClock.elapsedRealtime() - prefs.getLong("anchorElapsed", 0);
            if (delta < 0) delta = Math.max(0, System.currentTimeMillis() - prefs.getLong("anchorWall", 0));
            elapsed += delta / 1000;
        }
        state.put("active", active);
        state.put("running", running);
        state.put("mode", prefs.getBoolean("preset", true) ? "preset" : "open");
        state.put("durationSeconds", prefs.getInt("duration", 1500));
        state.put("elapsedSeconds", elapsed);
        state.put("intention", prefs.getString("intention", ""));
        state.put("startedAt", prefs.getLong("anchorWall", 0));
        boolean completed = prefs.getBoolean("completed", false);
        state.put("completed", completed);
        if (completed) prefs.edit().remove("completed").apply();
        return state;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
