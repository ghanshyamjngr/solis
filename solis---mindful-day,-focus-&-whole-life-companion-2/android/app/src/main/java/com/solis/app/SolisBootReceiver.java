package com.solis.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class SolisBootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) {
            TaskReminderReceiver.restoreAlarms(context);
            UsageEncouragementReceiver.schedule(context);
        }
    }
}
