<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/8b722520-b512-447d-b207-158761989252

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set `GEMINI_API_KEY` in a local `.env` file for the server. Never commit it
   or include it in client-side `VITE_*` variables.
3. Run the app:
   `npm run dev`

## Android

The Android app packages the existing Vite web app in a Capacitor WebView. Gemini
requests continue to go to the existing server-side `/api/ai-insights` endpoint;
the Gemini API key must remain configured on that server and must never be
included in the Android app or its build settings.
Android builds require JDK 21 and Android SDK platform 36 with build-tools 36.0.0.
The repository's APK workflow provisions these tools automatically.

Deploy the existing server with the `https://localhost` origin allowed for its
`/api` endpoints, then install dependencies and build/sync the Android assets
(use `--legacy-peer-deps` with npm because of the existing Vite/esbuild peer
version mismatch):

```sh
npm install --legacy-peer-deps
VITE_API_BASE_URL=https://your-api-host.example npm run android:sync
```

`VITE_API_BASE_URL` is a public server origin, not a secret. It is embedded in
the web bundle at build time. Do not set `GEMINI_API_KEY` in the Android build
environment. Open the generated Android project in Android Studio with
`npm run android:open`, or build a debug APK from the app folder with:

```sh
cd android
./gradlew assembleDebug
```

The debug APK is written to
`android/app/build/outputs/apk/debug/app-debug.apk`. For local device testing,
the API origin must be reachable over HTTPS from the device. Without the
configured API origin, the app still opens and uses its existing local
reflection fallback, but Gemini insights will not be reachable.

### Optional Android app-usage tracking

In Awake Settings, choose **Enable tracking and open Usage Access**, then grant
Awake access in Android's Usage Access settings. Awake calculates foreground
time from bounded Android activity foreground/background events, clips it to
the selected local day, and intersects it with screen-on intervals when those
events are available. Screen-on duration and summed per-app foreground
duration are distinct measurements. Android records usage while Awake is
closed or another app is in front; Awake syncs when opened or returned to the
foreground. Normalized reports are stored locally and kept separate from
manually logged activities and Gemini requests. Turning tracking off stops
future reads without deleting saved snapshots; use the existing data wipe
control to remove local records.

This is app-level usage, not touch-by-touch interaction or website history.
Browser usage only identifies the browser app. Exact site tracking would need a
separate browser-specific extension/integration, which is not included.
Usage Access is an Android system setting, not a runtime permission prompt.

### Tasks, reminders, and the home-screen widget

Use **Focus → Tasks** to create one-time, daily, or weekly intentions, choose a
preferred time, and optionally enable a reminder. **Plan** contains Today’s
Flow and the activity log. Android task reminders use
local system notifications and are restored after device restart. Tapping a
reminder opens a check-in so you can mark the task done; repeat reminders move
to the next occurrence after a check-in. Android's idle/battery and notification
settings may delay or suppress delivery; these alarms are not guaranteed to the
exact minute. In a web browser,
reminders use the Notifications API and can only fire while Solis remains open.

Add the **Awake** widgets from Android's home-screen widget picker. Focus Stats
shows seven days of focus totals; Active Focus reads the Android timer service
and offers start, pause/resume, and stop controls; Money logs local saved/spent
entries against the configured goal; Daily Usage shows foreground intervals
with a screen-on comparison and app legend. Configure palette and widget-
specific options after adding each widget. Money quick actions only create an
Awake entry; they never make a payment or contact a bank. Widgets refresh when
Awake data changes and on return to the app, with Android-allowed periodic
updates. Android launcher and background limits apply, so widget refreshes
aren't guaranteed to be immediate.

### Savings currency and lending records

Savings goals support selectable currencies and format amounts using the
device's locale. A goal's currency cannot be changed while it has a balance;
Solis does not silently convert funds. The Money tab also stores explicitly
confirmed lending and borrowing records, due dates, and manual settlement
status. These are private local notes, not bank integrations, payment
instructions, or legal verification.

### Personalized suggestions and privacy

Gemini sharing remains off by default. If enabled, Solis can send up to four
recent days of manually logged activity and planned-task completion check-ins
to its existing server for suggestions. Android device-usage snapshots are
excluded. This is short-term context, not model training. The Gemini key stays
on the server and is never embedded in the APK.
