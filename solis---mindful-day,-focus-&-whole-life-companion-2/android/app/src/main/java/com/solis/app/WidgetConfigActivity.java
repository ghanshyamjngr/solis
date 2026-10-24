package com.solis.app;

import android.app.Activity;
import android.appwidget.AppWidgetManager;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.text.InputType;
import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.Spinner;
import android.widget.ArrayAdapter;
import android.widget.TextView;

public class WidgetConfigActivity extends Activity {
    private int widgetId = AppWidgetManager.INVALID_APPWIDGET_ID;
    private String type;
    private Spinner palette;
    private EditText amount;
    private EditText category;
    private EditText focusDuration;
    private CheckBox showSystemApps;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        setResult(RESULT_CANCELED);
        widgetId = getIntent().getIntExtra(
            AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID
        );
        if (widgetId == AppWidgetManager.INVALID_APPWIDGET_ID) {
            finish();
            return;
        }
        AppWidgetManager manager = AppWidgetManager.getInstance(this);
        android.appwidget.AppWidgetProviderInfo info = manager.getAppWidgetInfo(widgetId);
        if (info == null) {
            finish();
            return;
        }
        String provider = info.provider.getClassName();
        type = provider.endsWith("FocusWidgetProvider") ? "focus"
            : provider.endsWith("GoalsWidgetProvider") ? "goals"
            : provider.endsWith("UsageWidgetProvider") ? "usage" : "today";
        buildForm();
    }

    private void buildForm() {
        SharedPreferences prefs = getSharedPreferences("solis_home_widget", MODE_PRIVATE);
        LinearLayout form = new LinearLayout(this);
        form.setOrientation(LinearLayout.VERTICAL);
        form.setPadding(dp(24), dp(24), dp(24), dp(24));
        form.setGravity(Gravity.CENTER_VERTICAL);

        TextView heading = new TextView(this);
        heading.setText("Customize Awake widget");
        heading.setTextSize(22);
        heading.setPadding(0, 0, 0, dp(14));
        form.addView(heading);

        TextView paletteLabel = new TextView(this);
        paletteLabel.setText("Widget palette");
        form.addView(paletteLabel);
        palette = new Spinner(this);
        String[] palettes = { "Lavender", "Amber", "Sage", "Ocean" };
        palette.setAdapter(new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item, palettes));
        String savedPalette = prefs.getString("widget_palette_" + widgetId, "Lavender");
        int selected = savedPalette.equals("Amber") ? 1 : savedPalette.equals("Sage") ? 2
            : savedPalette.equals("Ocean") ? 3 : 0;
        palette.setSelection(selected);
        form.addView(palette, new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT
        ));

        if ("goals".equals(type)) {
            TextView amountLabel = new TextView(this);
            amountLabel.setText("Quick action amount");
            amountLabel.setPadding(0, dp(14), 0, 0);
            form.addView(amountLabel);
            amount = new EditText(this);
            amount.setInputType(InputType.TYPE_CLASS_NUMBER | InputType.TYPE_NUMBER_FLAG_DECIMAL);
            amount.setHint("e.g. 5");
            amount.setText(prefs.getString("widget_quick_amount_" + widgetId, "5"));
            form.addView(amount);

            TextView categoryLabel = new TextView(this);
            categoryLabel.setText("Savings category");
            categoryLabel.setPadding(0, dp(10), 0, 0);
            form.addView(categoryLabel);
            category = new EditText(this);
            category.setSingleLine(true);
            category.setHint(prefs.getString("goalsCategory", "Personal"));
            category.setText(prefs.getString("widget_money_category_" + widgetId, ""));
            form.addView(category);
            TextView note = new TextView(this);
            note.setText("Quick actions only add a local Awake entry. They never make a payment or contact a bank.");
            note.setTextSize(12);
            note.setPadding(0, dp(8), 0, 0);
            form.addView(note);
        } else if ("focus".equals(type)) {
            TextView durationLabel = new TextView(this);
            durationLabel.setText("Quick-start focus length (minutes)");
            durationLabel.setPadding(0, dp(14), 0, 0);
            form.addView(durationLabel);
            focusDuration = new EditText(this);
            focusDuration.setInputType(InputType.TYPE_CLASS_NUMBER);
            focusDuration.setText(Integer.toString(prefs.getInt("widget_focus_minutes_" + widgetId, 25)));
            form.addView(focusDuration);
        } else if ("usage".equals(type)) {
            showSystemApps = new CheckBox(this);
            showSystemApps.setText("Reveal system apps");
            showSystemApps.setChecked(prefs.getBoolean("widget_usage_system_" + widgetId, false));
            showSystemApps.setPadding(0, dp(14), 0, 0);
            form.addView(showSystemApps);
        }

        Button save = new Button(this);
        save.setText("Save widget");
        save.setOnClickListener(view -> saveConfiguration());
        form.addView(save, new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT
        ));
        setContentView(form);
    }

    private void saveConfiguration() {
        SharedPreferences.Editor edit = getSharedPreferences("solis_home_widget", MODE_PRIVATE)
            .edit()
            .putString("widget_palette_" + widgetId, palette.getSelectedItem().toString());
        if ("goals".equals(type)) {
            double quickAmount;
            try {
                quickAmount = Double.parseDouble(amount.getText().toString().trim());
            } catch (NumberFormatException exception) {
                amount.setError("Enter an amount greater than zero.");
                return;
            }
            if (Double.isNaN(quickAmount) || Double.isInfinite(quickAmount)
                || quickAmount <= 0 || quickAmount > 1_000_000) {
                amount.setError("Enter an amount above zero and no more than 1,000,000.");
                return;
            }
            edit.putString("widget_quick_amount_" + widgetId, Double.toString(quickAmount));
            edit.putString("widget_money_category_" + widgetId, category.getText().toString().trim());
        } else if ("focus".equals(type)) {
            int minutes;
            try {
                minutes = Integer.parseInt(focusDuration.getText().toString().trim());
            } catch (NumberFormatException exception) {
                focusDuration.setError("Enter a duration from 1 to 1440 minutes.");
                return;
            }
            if (minutes < 1 || minutes > 1440) {
                focusDuration.setError("Enter a duration from 1 to 1440 minutes.");
                return;
            }
            edit.putInt("widget_focus_minutes_" + widgetId, minutes);
        } else if ("usage".equals(type)) {
            edit.putBoolean("widget_usage_system_" + widgetId, showSystemApps.isChecked());
        }
        edit.apply();

        SolisWidgetProvider.updateWidgetById(this, widgetId);
        Intent result = new Intent();
        result.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId);
        setResult(RESULT_OK, result);
        finish();
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }
}
