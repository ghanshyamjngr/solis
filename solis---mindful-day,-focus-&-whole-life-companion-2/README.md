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
