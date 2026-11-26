# Good Chat — GitHub Complete Android APK Build Guide

This repository includes a complete, zero-setup **GitHub Actions CI/CD pipeline** that automatically compiles a real installable Android `.apk` for **Good Chat** using Capacitor + Gradle.

## Automatic APK Build on GitHub (3 Steps)

1. **Push this project to GitHub** (use AI Studio's **Export / Save to GitHub** or `git push origin main`).
2. Open your GitHub repository and click the **Actions** tab → **Build Good Chat Android APK**.
   - It starts automatically on every push to `main`/`master`, or you can click **Run workflow** manually anytime.
3. Once the workflow finishes (~3–4 minutes), download **`GoodChat-latest.apk`** from:
   - **Releases** → **Good Chat Android APK** (direct one-click `.apk` download), OR
   - **Actions** → latest run → **Artifacts** → `GoodChat-Android-APK-*`.

## Optional: Signed Release APK for Play Store

By default, the workflow compiles `GoodChat-latest.apk` (installable directly on any Android phone without needing a keystore).

To also compile a **signed release APK** (`GoodChat-v*-release-signed.apk`), add these 4 repository secrets under **GitHub Repo → Settings → Secrets and variables → Actions**:

- `ANDROID_KEYSTORE_BASE64`: Base64-encoded `.jks` or `.keystore` file (`base64 -w 0 release.keystore`)
- `ANDROID_KEYSTORE_PASSWORD`: Your keystore password
- `ANDROID_KEY_ALIAS`: Your key alias
- `ANDROID_KEY_PASSWORD`: Your key password

## Optional: Custom Backend URL for AI Voice Assistant

To point the APK's AI Voice Assistant to a custom server URL, set a GitHub Repository Variable named `GOODCHAT_API_URL` (or pass `api_base_url` when triggering **Run workflow**).

## Local Android APK Build

If you have JDK 21 and Android SDK installed locally:

```bash
npm install
npm run build
npm run apk:prepare
cd android && ./gradlew assembleDebug
```

The compiled APK will be generated at `android/app/build/outputs/apk/debug/app-debug.apk`.
