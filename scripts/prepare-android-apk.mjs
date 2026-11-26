import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const ANDROID_DIR = path.join(ROOT, "android");
const APP_DIR = path.join(ANDROID_DIR, "app");
const MANIFEST_PATH = path.join(APP_DIR, "src", "main", "AndroidManifest.xml");
const BUILD_GRADLE_PATH = path.join(APP_DIR, "build.gradle");
const RES_DIR = path.join(APP_DIR, "src", "main", "res");

function run(cmd) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { cwd: ROOT, stdio: "inherit" });
}

function ensureAndroidPlatform() {
  if (!fs.existsSync(ANDROID_DIR)) {
    console.log("Initializing Capacitor Android project...");
    run("npx cap add android");
  }
  console.log("Syncing web build (dist/) into Android project...");
  run("npx cap sync android");
}

function patchAndroidManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    console.warn("AndroidManifest.xml not found, skipping manifest patch.");
    return;
  }

  let manifest = fs.readFileSync(MANIFEST_PATH, "utf8");
  const requiredPermissions = [
    "android.permission.INTERNET",
    "android.permission.RECORD_AUDIO",
    "android.permission.MODIFY_AUDIO_SETTINGS",
    "android.permission.CAMERA",
    "android.permission.POST_NOTIFICATIONS",
    "android.permission.FOREGROUND_SERVICE",
    "android.permission.FOREGROUND_SERVICE_MICROPHONE",
  ];

  const missingTags = requiredPermissions
    .filter((perm) => !manifest.includes(perm))
    .map((perm) => `    <uses-permission android:name="${perm}" />`);

  if (missingTags.length > 0) {
    manifest = manifest.replace(
      /<manifest([^>]*)>/,
      `<manifest$1>\n${missingTags.join("\n")}`
    );
    fs.writeFileSync(MANIFEST_PATH, manifest, "utf8");
    console.log(`Added ${missingTags.length} Android permissions to AndroidManifest.xml`);
  }
}

function copyAppIcons() {
  const icon512 = path.join(ROOT, "public", "pwa-512x512.png");
  const icon192 = path.join(ROOT, "public", "pwa-192x192.png");
  const maskable512 = path.join(ROOT, "public", "pwa-maskable-512x512.png");

  if (!fs.existsSync(icon512) || !fs.existsSync(icon192)) {
    console.warn("PWA PNG icons not found in public/, skipping Android icon copy.");
    return;
  }

  const mipmapTargets = [
    { dir: "mipmap-mdpi", src: icon192 },
    { dir: "mipmap-hdpi", src: icon192 },
    { dir: "mipmap-xhdpi", src: icon192 },
    { dir: "mipmap-xxhdpi", src: icon512 },
    { dir: "mipmap-xxxhdpi", src: icon512 },
  ];

  for (const target of mipmapTargets) {
    const targetDir = path.join(RES_DIR, target.dir);
    if (!fs.existsSync(targetDir)) continue;

    fs.copyFileSync(target.src, path.join(targetDir, "ic_launcher.png"));
    fs.copyFileSync(target.src, path.join(targetDir, "ic_launcher_round.png"));
    fs.copyFileSync(
      fs.existsSync(maskable512) ? maskable512 : target.src,
      path.join(targetDir, "ic_launcher_foreground.png")
    );
  }

  // Set emerald adaptive icon background color
  const valuesDir = path.join(RES_DIR, "values");
  if (fs.existsSync(valuesDir)) {
    const icBgPath = path.join(valuesDir, "ic_launcher_background.xml");
    fs.writeFileSync(
      icBgPath,
      `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#0D7A5F</color>\n</resources>\n`,
      "utf8"
    );
  }

  console.log("Updated Android launcher icons with Good Chat branding.");
}

function patchGradleVersionAndSigning() {
  if (!fs.existsSync(BUILD_GRADLE_PATH)) {
    console.warn("android/app/build.gradle not found, skipping version patch.");
    return;
  }

  let gradle = fs.readFileSync(BUILD_GRADLE_PATH, "utf8");
  const versionCode = Number(process.env.GITHUB_RUN_NUMBER || process.env.ANDROID_VERSION_CODE || 1);
  const versionName = (process.env.ANDROID_VERSION_NAME || `1.0.${versionCode}`).trim();

  gradle = gradle.replace(/versionCode\s+\d+/, `versionCode ${versionCode}`);
  gradle = gradle.replace(/versionName\s+"[^"]*"/, `versionName "${versionName}"`);

  // Add release signing config via environment variables when keystore is supplied in CI
  if (!gradle.includes("GOODCHAT_KEYSTORE_PATH") && gradle.includes("buildTypes {")) {
    gradle = gradle.replace(
      /buildTypes\s*\{\s*release\s*\{/,
      `signingConfigs {
        release {
            if (System.getenv("GOODCHAT_KEYSTORE_PATH")) {
                storeFile file(System.getenv("GOODCHAT_KEYSTORE_PATH"))
                storePassword System.getenv("ANDROID_KEYSTORE_PASSWORD")
                keyAlias System.getenv("ANDROID_KEY_ALIAS")
                keyPassword System.getenv("ANDROID_KEY_PASSWORD")
            }
        }
    }
    buildTypes {
        release {
            if (System.getenv("GOODCHAT_KEYSTORE_PATH")) {
                signingConfig signingConfigs.release
            }`
    );
  }

  fs.writeFileSync(BUILD_GRADLE_PATH, gradle, "utf8");
  console.log(`Configured Android versionCode=${versionCode}, versionName=${versionName}`);
}

function main() {
  if (!fs.existsSync(path.join(ROOT, "dist", "index.html"))) {
    console.error("dist/index.html not found. Run `npm run build` before prepare-android-apk.mjs.");
    process.exit(1);
  }

  ensureAndroidPlatform();
  patchAndroidManifest();
  copyAppIcons();
  patchGradleVersionAndSigning();
  console.log("\nAndroid project is ready for Gradle APK compilation!");
}

main();
