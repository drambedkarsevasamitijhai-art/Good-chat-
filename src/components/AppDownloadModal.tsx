import React, { useEffect, useState } from "react";
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  FileCode2,
  GitBranch,
  Package,
  Share,
  Smartphone,
  WifiOff,
  X,
} from "lucide-react";
import { useOnlineStatus, usePWAInstall } from "../hooks/usePWAInstall";

/* ── OFFLINE CONNECTIVITY INDICATOR ───────────────────────────────────── */

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-medium text-white shadow-lg"
    >
      <WifiOff className="h-3.5 w-3.5 shrink-0" />
      <span>Offline Mode — Cached app assets are active.</span>
    </div>
  );
};

/* ── HEADER INSTALL / DOWNLOAD APK TRIGGER BUTTON ─────────────────────── */

type AppDownloadButtonProps = {
  onClick: () => void;
};

export const AppDownloadButton: React.FC<AppDownloadButtonProps> = ({ onClick }) => {
  const { isInstalled } = usePWAInstall();

  // Hide header install button when already running in standalone installed mode
  if (isInstalled) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      title="Download Android App / APK"
      aria-label="Download Android App or APK"
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[#0D7A5F] transition-colors hover:bg-[#0D7A5F] hover:text-white focus-visible:outline-2 focus-visible:outline-[#0D7A5F] dark:bg-emerald-950/60 dark:text-[#14B88A] dark:hover:bg-[#109675] dark:hover:text-white"
    >
      <Download className="h-[18px] w-[18px]" />
    </button>
  );
};

/* ── ANDROID APP & APK DOWNLOAD MODAL ─────────────────────────────────── */

type AppDownloadModalProps = {
  open: boolean;
  onClose: () => void;
  onNotify: (msg: string) => void;
};

function normalizeGithubRepo(input: string): string {
  const trimmed = input.trim().replace(/\/+$/, "").replace(/\.git$/, "");
  if (!trimmed) return "";
  if (trimmed.startsWith("https://github.com/") || trimmed.startsWith("http://github.com/")) {
    return trimmed.replace(/^http:\/\//, "https://");
  }
  if (/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(trimmed)) {
    return `https://github.com/${trimmed}`;
  }
  return "";
}

export const AppDownloadModal: React.FC<AppDownloadModalProps> = ({
  open,
  onClose,
  onNotify,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [directApkUrl, setDirectApkUrl] = useState("");
  const [serverAppUrl, setServerAppUrl] = useState("");
  const [githubRepoInput, setGithubRepoInput] = useState(() => {
    try {
      return localStorage.getItem("goodchat_github_repo") || "";
    } catch {
      return "";
    }
  });
  const [copiedField, setCopiedField] = useState<"url" | "cmd" | "git" | null>(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch("/api/app/apk-info")
      .then((res) => (res.ok ? res.json() : null))
      .then(
        (
          data: {
            directApkUrl?: string;
            githubRepoUrl?: string;
            appUrl?: string;
          } | null
        ) => {
          if (!cancelled && data) {
            setDirectApkUrl(data.directApkUrl || "");
            setServerAppUrl(data.appUrl || "");
            if (data.githubRepoUrl && !githubRepoInput) {
              setGithubRepoInput(data.githubRepoUrl);
            }
          }
        }
      )
      .catch(() => {
        // Fallback to window.location.origin
      });
    return () => {
      cancelled = true;
    };
  }, [open, githubRepoInput]);

  if (!open) return null;

  const liveAppUrl =
    serverAppUrl || (typeof window !== "undefined" ? window.location.origin : "");
  const normalizedGithubUrl = normalizeGithubRepo(githubRepoInput);
  const githubReleaseApkUrl = normalizedGithubUrl
    ? `${normalizedGithubUrl}/releases/download/latest-apk/GoodChat-latest.apk`
    : "";
  const githubActionsUrl = normalizedGithubUrl
    ? `${normalizedGithubUrl}/actions/workflows/build-android-apk.yml`
    : "";
  const pwaBuilderUrl = `https://www.pwabuilder.com/reportcard?site=${encodeURIComponent(
    liveAppUrl
  )}`;
  const gitPushCommands = `git init\ngit add .\ngit commit -m "Build Good Chat Android APK"\ngit branch -M main\ngit remote add origin ${
    normalizedGithubUrl ? `${normalizedGithubUrl}.git` : "https://github.com/YOUR_USERNAME/good-chat.git"
  }\ngit push -u origin main`;
  const capacitorCommands = `npm install\nnpm run apk:debug`;

  function handleGithubRepoChange(value: string) {
    setGithubRepoInput(value);
    try {
      localStorage.setItem("goodchat_github_repo", value);
    } catch {
      // Ignore storage quota errors
    }
  }

  async function handleCopy(text: string, field: "url" | "cmd" | "git") {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      onNotify(
        field === "url"
          ? "App URL copied"
          : field === "git"
            ? "Git push commands copied"
            : "Local APK build commands copied"
      );
      window.setTimeout(() => setCopiedField(null), 2000);
    } catch {
      onNotify("Copy not permitted in this browser");
    }
  }

  async function handleInstantInstall() {
    setInstalling(true);
    try {
      const accepted = await install();
      if (accepted) {
        onNotify("Good Chat installed on your device!");
        onClose();
      }
    } finally {
      setInstalling(false);
    }
  }

  function handleDownloadCapacitorConfig() {
    const config = {
      appId: "com.goodchat.app",
      appName: "Good Chat",
      webDir: "dist",
      bundledWebRuntime: false,
      android: {
        allowMixedContent: false,
        captureInput: true,
        backgroundColor: "#0D7A5F",
      },
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "capacitor.config.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    onNotify("Downloaded capacitor.config.json");
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Download Good Chat Android App and APK"
    >
      <div className="flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#111821]">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0D7A5F] text-white shadow-xs dark:bg-[#109675]">
              <Smartphone className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-base font-bold text-slate-900 dark:text-white">
                Good Chat Android APK &amp; App
              </h2>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                GitHub Actions auto APK build, instant PWA install &amp; PWABuilder
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close download modal"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="thin-scrollbar flex-1 space-y-4 overflow-y-auto p-5">
          {/* Direct Signed APK Download (shown automatically when ANDROID_APK_URL is set) */}
          {directApkUrl && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/35">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    Direct Android APK Available
                  </p>
                  <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                    Download the hosted signed Good Chat .apk installer directly.
                  </p>
                </div>
                <a
                  href={directApkUrl}
                  download="GoodChat.apk"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#0D7A5F] px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#0A624C] whitespace-nowrap"
                >
                  <Download className="h-4 w-4" />
                  <span>Download .APK</span>
                </a>
              </div>
            </div>
          )}

          {/* Option 1: Complete GitHub Actions Automatic APK Build */}
          <div className="rounded-2xl border border-emerald-200/90 bg-emerald-50/50 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/25">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-[#0D7A5F] dark:text-[#14B88A]">
                <GitBranch className="h-3.5 w-3.5" />
                <span>1 · GitHub Complete APK Build (Ready)</span>
              </p>
              <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200">
                CI/CD Configured
              </span>
            </div>

            <h3 className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
              Auto-Compile Installable GoodChat.apk on GitHub
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              Complete Capacitor + Gradle pipeline (
              <code>.github/workflows/build-android-apk.yml</code>) is set up. Export or push this
              project to GitHub and Actions will automatically build and publish{" "}
              <strong>GoodChat-latest.apk</strong> under Releases.
            </p>

            {/* Optional GitHub Repo Link for 1-click APK release download */}
            <div className="mt-3">
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300">
                Your GitHub Repo (e.g. username/good-chat)
              </label>
              <input
                type="text"
                value={githubRepoInput}
                onChange={(e) => handleGithubRepoChange(e.target.value)}
                placeholder="username/good-chat"
                className="mt-1 h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#0D7A5F] focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>

            {normalizedGithubUrl && (
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <a
                  href={githubReleaseApkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#0D7A5F] px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#0A624C]"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download GoodChat-latest.apk</span>
                </a>
                <a
                  href={githubActionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Open Actions Build</span>
                </a>
              </div>
            )}

            <pre className="mt-3 overflow-x-auto rounded-xl bg-slate-950 p-3 text-[11px] leading-relaxed text-emerald-300">
              <code>{gitPushCommands}</code>
            </pre>

            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void handleCopy(gitPushCommands, "git")}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                {copiedField === "git" ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                <span>{copiedField === "git" ? "Copied" : "Copy Git Push Commands"}</span>
              </button>
            </div>
          </div>

          {/* Option 2: Instant Android / Mobile App Install (PWA) */}
          <div className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/50">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-[#0D7A5F] dark:text-[#14B88A]">
                  2 · Instant App Install (No Build Needed)
                </p>
                <h3 className="mt-0.5 text-sm font-bold text-slate-900 dark:text-white">
                  Install Good Chat on Android / Phone
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  Installs Good Chat onto your home screen and app drawer with full-screen
                  standalone mode, offline support, and no browser address bar.
                </p>
              </div>
            </div>

            {isInstalled ? (
              <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-100 px-3 py-2 text-xs font-semibold text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-200">
                <Check className="h-4 w-4" />
                <span>Good Chat is already installed on this device</span>
              </div>
            ) : isInstallable ? (
              <button
                type="button"
                disabled={installing}
                onClick={() => void handleInstantInstall()}
                className="mt-3.5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0D7A5F] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0A624C] disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                <span>{installing ? "Opening Installer…" : "Install Good Chat App Now"}</span>
              </button>
            ) : isIOS ? (
              <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                <p className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white">
                  <Share className="h-3.5 w-3.5 text-[#0D7A5F]" />
                  <span>Install on iPhone / iPad (Safari):</span>
                </p>
                <p className="mt-1">
                  1. Open this link in Safari and tap the <strong>Share</strong> icon.
                  <br />
                  2. Scroll down and tap <strong>Add to Home Screen</strong>.
                </p>
              </div>
            ) : (
              <div className="mt-3 space-y-2.5 rounded-xl border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                <p>
                  To install directly on Android Chrome: open the standalone Good Chat URL below in
                  Chrome, tap <strong>Menu (⋮)</strong>, and choose <strong>Install app</strong>.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={liveAppUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#0D7A5F] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0A624C]"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>Open Standalone App</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => void handleCopy(liveAppUrl, "url")}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    {copiedField === "url" ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    <span>{copiedField === "url" ? "Copied URL" : "Copy App URL"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Option 3: Quick Signed .APK Generator via PWABuilder */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 dark:border-slate-800 dark:bg-[#161F2B]">
            <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
              3 · Instant Cloud .APK via PWABuilder (TWA)
            </p>
            <h3 className="mt-0.5 text-sm font-bold text-slate-900 dark:text-white">
              Package Good Chat as an Android .APK in 60 Seconds
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Prefer not to use GitHub? Good Chat ships a verified Web App Manifest, Service Worker,
              and adaptive PNG icons ready for <strong>PWABuilder</strong> to generate a signed{" "}
              <code>.apk</code> directly in the browser.
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <a
                href={pwaBuilderUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-500"
              >
                <Package className="h-3.5 w-3.5" />
                <span>Generate Android .APK</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <button
                type="button"
                onClick={() => void handleCopy(liveAppUrl, "url")}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                {copiedField === "url" ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                <span>Copy App URL</span>
              </button>
            </div>
          </div>

          {/* Option 4: Local Android Studio / Capacitor Native APK Build */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 dark:border-slate-800 dark:bg-[#161F2B]">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              4 · Local Android Studio APK Build
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Capacitor packages and <code>capacitor.config.json</code> are already installed in
              this project. On any machine with JDK 21 + Android SDK, run:
            </p>

            <pre className="mt-2.5 overflow-x-auto rounded-xl bg-slate-950 p-3 text-[11px] leading-relaxed text-emerald-300">
              <code>{capacitorCommands}</code>
            </pre>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadCapacitorConfig}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
              >
                <FileCode2 className="h-3.5 w-3.5 text-[#0D7A5F] dark:text-[#14B88A]" />
                <span>Download capacitor.config.json</span>
              </button>
              <button
                type="button"
                onClick={() => void handleCopy(capacitorCommands, "cmd")}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                {copiedField === "cmd" ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                <span>{copiedField === "cmd" ? "Copied" : "Copy Commands"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

