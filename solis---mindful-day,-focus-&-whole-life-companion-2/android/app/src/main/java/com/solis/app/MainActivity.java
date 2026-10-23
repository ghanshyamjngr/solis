package com.solis.app;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(DeviceUsagePlugin.class);
        registerPlugin(TaskRemindersPlugin.class);
        super.onCreate(savedInstanceState);
        recordReminderIntent(getIntent());
    }

    @Override
    protected void onNewIntent(android.content.Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        recordReminderIntent(intent);
    }

    private void recordReminderIntent(android.content.Intent intent) {
        if (intent == null) return;
        String taskId = intent.getStringExtra("solisTaskReminderId");
        android.content.SharedPreferences.Editor editor =
            getSharedPreferences("solis_task_reminders", MODE_PRIVATE).edit();
        if (taskId != null && !taskId.isEmpty()) editor.putString("pending_checkin", taskId);
        if (intent.getBooleanExtra("solisOpenTasks", false)) editor.putBoolean("pending_open_tasks", true);
        editor.apply();
    }
}
