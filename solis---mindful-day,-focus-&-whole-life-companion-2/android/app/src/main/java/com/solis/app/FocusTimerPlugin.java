package com.solis.app;

import android.Manifest;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

@CapacitorPlugin(
    name = "FocusTimer",
    permissions = {
        @Permission(alias = "notifications", strings = { Manifest.permission.POST_NOTIFICATIONS })
    }
)
public class FocusTimerPlugin extends Plugin {
    @PluginMethod
    public void start(PluginCall call) {
        String mode = call.getString("mode");
        String intention = call.getString("intention", "Focus session");
        Integer durationSeconds = call.getInt("durationSeconds");
        if (!"preset".equals(mode) && !"open".equals(mode)) {
            call.reject("Focus timer mode must be preset or open.");
            return;
        }
        if (durationSeconds == null || durationSeconds < 60 || durationSeconds > 86400) {
            call.reject("Focus timer duration must be between 1 minute and 24 hours.");
            return;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
            && getPermissionState("notifications") != PermissionState.GRANTED) {
            call.reject("Notification permission is required for the ongoing focus notification.");
            return;
        }
        try {
            Intent intent = new Intent(getContext(), FocusTimerService.class);
            intent.setAction(FocusTimerService.ACTION_START);
            intent.putExtra("mode", mode);
            intent.putExtra("durationSeconds", durationSeconds);
            intent.putExtra("intention", intention);
            intent.putExtra("soundEnabled", call.getBoolean("soundEnabled", true));
            intent.putExtra("vibrationEnabled", call.getBoolean("vibrationEnabled", true));
            intent.putExtra("quietHoursStart", call.getString("quietHoursStart", "22:00"));
            intent.putExtra("quietHoursEnd", call.getString("quietHoursEnd", "07:30"));
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                getContext().startForegroundService(intent);
            } else {
                getContext().startService(intent);
            }
            call.resolve();
        } catch (Exception exception) {
            call.reject("Could not start the Android focus notification.", exception);
        }
    }

    @PluginMethod
    public void pause(PluginCall call) {
        sendAction(FocusTimerService.ACTION_PAUSE, call);
    }

    @PluginMethod
    public void resume(PluginCall call) {
        sendAction(FocusTimerService.ACTION_RESUME, call);
    }

    @PluginMethod
    public void finish(PluginCall call) {
        sendAction(FocusTimerService.ACTION_FINISH, call);
    }

    @PluginMethod
    public void getState(PluginCall call) {
        Bundle state = FocusTimerService.readState(getContext());
        JSObject result = new JSObject();
        result.put("active", state.getBoolean("active"));
        result.put("running", state.getBoolean("running"));
        result.put("mode", state.getString("mode"));
        result.put("durationSeconds", state.getInt("durationSeconds"));
        result.put("elapsedSeconds", state.getLong("elapsedSeconds"));
        result.put("intention", state.getString("intention"));
        result.put("startedAt", state.getLong("startedAt"));
        result.put("completed", state.getBoolean("completed"));
        call.resolve(result);
    }

    private void sendAction(String action, PluginCall call) {
        try {
            Intent intent = new Intent(getContext(), FocusTimerService.class);
            intent.setAction(action);
            getContext().startService(intent);
            call.resolve();
        } catch (Exception exception) {
            call.reject("Could not update the Android focus timer.", exception);
        }
    }
}
