import React from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  Download,
  Moon,
  Phone,
  PhoneMissed,
  Plus,
  Smartphone,
  Sun,
  Users,
  Video,
} from "lucide-react";
import type { AppSettings, CallRecord, Community, StatusUpdate, WallpaperStyle } from "../types";
import { Avatar } from "./Avatar";

/* ── CALLS PANEL ──────────────────────────────────────────────────────── */

type CallsPanelProps = {
  calls: CallRecord[];
  search: string;
  onStartCall: (chatId: number, type: "voice" | "video") => void;
  onOpenChat: (chatId: number) => void;
};

export const CallsPanel: React.FC<CallsPanelProps> = ({
  calls,
  search,
  onStartCall,
  onOpenChat,
}) => {
  const filtered = calls.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  if (filtered.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <Phone className="h-8 w-8 text-slate-300 dark:text-slate-600" />
        <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-300">
          No recent calls
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Start a voice or video call from any conversation.
        </p>
      </div>
    );
  }

  return (
    <div className="thin-scrollbar flex-1 overflow-y-auto px-3 pb-4">
      <div className="space-y-1">
        {filtered.map((call) => (
          <div
            key={call.id}
            className="flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition-colors hover:bg-slate-100/80 dark:hover:bg-slate-800/60"
          >
            <button
              type="button"
              onClick={() => onOpenChat(call.chatId)}
              className="flex min-w-0 flex-1 items-center gap-3 text-left"
            >
              <Avatar label={call.avatar} color={call.color} size="md" />
              <div className="min-w-0 flex-1">
                <p
                  className={`truncate text-sm font-semibold ${
                    call.direction === "missed"
                      ? "text-rose-600 dark:text-rose-400"
                      : "text-slate-900 dark:text-slate-100"
                  }`}
                >
                  {call.name}
                </p>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  {call.direction === "missed" ? (
                    <PhoneMissed className="h-3.5 w-3.5 text-rose-500" />
                  ) : call.direction === "incoming" ? (
                    <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <ArrowUpRight className="h-3.5 w-3.5 text-slate-400" />
                  )}
                  <span className="truncate tabular-nums">
                    {call.time}
                    {call.duration ? ` · ${call.duration}` : " · Missed"}
                  </span>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onStartCall(call.chatId, call.type)}
              aria-label={`Call ${call.name}`}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#0D7A5F] transition-colors hover:bg-emerald-50 dark:text-[#14B88A] dark:hover:bg-emerald-950/50"
            >
              {call.type === "video" ? (
                <Video className="h-4 w-4" />
              ) : (
                <Phone className="h-4 w-4" />
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ── COMMUNITIES PANEL ────────────────────────────────────────────────── */

type CommunitiesPanelProps = {
  communities: Community[];
  search: string;
  onToggleJoin: (id: string) => void;
  onOpenCommunityChat: (community: Community) => void;
};

export const CommunitiesPanel: React.FC<CommunitiesPanelProps> = ({
  communities,
  search,
  onToggleJoin,
  onOpenCommunityChat,
}) => {
  const filtered = communities.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="thin-scrollbar flex-1 overflow-y-auto px-3 pb-4">
      <div className="space-y-2.5">
        {filtered.map((comm) => (
          <div
            key={comm.id}
            className="rounded-2xl border border-slate-200/80 bg-white p-3.5 transition-colors hover:border-slate-300 dark:border-slate-800 dark:bg-[#161F2B] dark:hover:border-slate-700"
          >
            <div className="flex items-start gap-3">
              <Avatar label={comm.avatar} color={comm.color} size="md" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {comm.name}
                  </p>
                  <button
                    type="button"
                    onClick={() => onToggleJoin(comm.id)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      comm.joined
                        ? "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                        : "bg-[#0D7A5F] text-white hover:bg-[#0A624C]"
                    }`}
                  >
                    {comm.joined ? "Joined" : "Join"}
                  </button>
                </div>
                <p className="mt-0.5 text-xs text-slate-500 tabular-nums dark:text-slate-400">
                  {comm.membersCount} members
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  {comm.description}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onOpenCommunityChat(comm)}
              className="mt-3 flex w-full items-center justify-between gap-2 border-t border-slate-100 pt-2.5 text-left text-xs transition-colors hover:text-[#0D7A5F] dark:border-slate-800 dark:hover:text-[#14B88A]"
            >
              <span className="truncate text-slate-600 dark:text-slate-300">
                <strong className="font-medium text-slate-900 dark:text-slate-100">
                  {comm.latestAnnouncement.sender}:
                </strong>{" "}
                {comm.latestAnnouncement.text}
              </span>
              <span className="shrink-0 text-[11px] text-slate-400 tabular-nums">
                {comm.latestAnnouncement.time}
              </span>
            </button>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="h-8 w-8 text-slate-300 dark:text-slate-600" />
            <p className="mt-3 text-sm text-slate-500">No communities match "{search}"</p>
          </div>
        )}
      </div>
    </div>
  );
};

/* ── UPDATES (STATUS) PANEL ───────────────────────────────────────────── */

type UpdatesPanelProps = {
  statuses: StatusUpdate[];
  myStatus?: StatusUpdate;
  search: string;
  onOpenStatus: (index: number) => void;
  onCreateStatus: () => void;
};

export const UpdatesPanel: React.FC<UpdatesPanelProps> = ({
  statuses,
  myStatus,
  search,
  onOpenStatus,
  onCreateStatus,
}) => {
  const contactStatuses = statuses
    .map((s, idx) => ({ status: s, index: idx }))
    .filter(({ status }) => !status.isMine && status.name.toLowerCase().includes(search.toLowerCase()));

  const recent = contactStatuses.filter(({ status }) => !status.viewed);
  const viewed = contactStatuses.filter(({ status }) => status.viewed);

  return (
    <div className="thin-scrollbar flex-1 overflow-y-auto px-3 pb-4">
      {/* My Status row */}
      <div className="flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition-colors hover:bg-slate-100/80 dark:hover:bg-slate-800/60">
        <button
          type="button"
          onClick={() => {
            if (myStatus) {
              const idx = statuses.findIndex((s) => s.id === myStatus.id);
              if (idx >= 0) onOpenStatus(idx);
            } else {
              onCreateStatus();
            }
          }}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <div className="relative">
            <Avatar
              label="Y"
              color="#D8F3E8"
              size="md"
              ring={myStatus ? "active" : "none"}
            />
            {!myStatus && (
              <span className="absolute -right-0.5 -bottom-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-[#0D7A5F] text-white dark:border-[#111821]">
                <Plus className="h-3 w-3" />
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
              My Status
            </p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
              {myStatus ? `${myStatus.time} · ${myStatus.caption}` : "Tap to share a quick update"}
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={onCreateStatus}
          aria-label="Add new status"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-200/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {recent.length > 0 && (
        <div className="mt-4">
          <p className="px-2.5 pb-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
            Recent updates
          </p>
          <div className="space-y-1">
            {recent.map(({ status, index }) => (
              <button
                key={status.id}
                type="button"
                onClick={() => onOpenStatus(index)}
                className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors hover:bg-slate-100/80 dark:hover:bg-slate-800/60"
              >
                <Avatar label={status.avatar} color={status.color} size="md" ring="active" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {status.name}
                  </p>
                  <p className="truncate text-xs text-slate-500 tabular-nums dark:text-slate-400">
                    {status.time} · {status.caption}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {viewed.length > 0 && (
        <div className="mt-4">
          <p className="px-2.5 pb-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
            Viewed updates
          </p>
          <div className="space-y-1">
            {viewed.map(({ status, index }) => (
              <button
                key={status.id}
                type="button"
                onClick={() => onOpenStatus(index)}
                className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors hover:bg-slate-100/80 dark:hover:bg-slate-800/60"
              >
                <Avatar label={status.avatar} color={status.color} size="md" ring="viewed" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                    {status.name}
                  </p>
                  <p className="truncate text-xs text-slate-500 tabular-nums dark:text-slate-400">
                    {status.time}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* ── SETTINGS PANEL ───────────────────────────────────────────────────── */

type SettingsPanelProps = {
  settings: AppSettings;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
  onUpdateVoiceSettings: (patch: Partial<AppSettings["voiceAssistant"]>) => void;
  onOpenVoiceAssistant: () => void;
  onOpenAppDownload: () => void;
};

const WALLPAPER_OPTIONS: { id: WallpaperStyle; label: string }[] = [
  { id: "clean", label: "Clean" },
  { id: "dots", label: "Dot Grid" },
  { id: "sage", label: "Soft Sage" },
];

const VOICE_LOCALE_OPTIONS: { id: AppSettings["voiceAssistant"]["locale"]; label: string }[] = [
  { id: "en-IN", label: "Hinglish / India" },
  { id: "hi-IN", label: "Hindi" },
  { id: "en-US", label: "English" },
];

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  onUpdateSettings,
  onUpdateVoiceSettings,
  onOpenVoiceAssistant,
  onOpenAppDownload,
}) => {
  const voice = settings.voiceAssistant;

  return (
    <div className="thin-scrollbar flex-1 overflow-y-auto px-4 pb-6">
      {/* Profile editor */}
      <div className="border-b border-slate-200/80 pb-5 dark:border-slate-800">
        <div className="flex items-center gap-3.5">
          <Avatar
            label={settings.profileName.trim()[0]?.toUpperCase() || "Y"}
            color="#D8F3E8"
            size="lg"
            online
          />
          <div className="min-w-0 flex-1">
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Display Name
            </label>
            <input
              type="text"
              value={settings.profileName}
              onChange={(e) => onUpdateSettings({ profileName: e.target.value })}
              className="mt-0.5 w-full rounded-lg border border-transparent bg-transparent px-1.5 py-1 text-sm font-semibold text-slate-900 transition-colors hover:border-slate-200 focus:border-[#0D7A5F] focus:bg-slate-50 focus:outline-none dark:text-slate-100 dark:hover:border-slate-700 dark:focus:bg-slate-800/60"
            />
          </div>
        </div>

        <div className="mt-3">
          <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
            About
          </label>
          <input
            type="text"
            value={settings.profileAbout}
            onChange={(e) => onUpdateSettings({ profileAbout: e.target.value })}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:border-[#0D7A5F] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          />
        </div>
      </div>

      {/* Android App & APK Download */}
      <div className="border-b border-slate-200/80 py-5 dark:border-slate-800">
        <p className="text-xs font-semibold text-[#0D7A5F] dark:text-[#14B88A]">
          Android App & APK Download
        </p>
        <div className="mt-3 rounded-2xl border border-emerald-200/80 bg-emerald-50/60 p-3.5 dark:border-emerald-900/60 dark:bg-emerald-950/30">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0D7A5F] text-white dark:bg-[#109675]">
              <Smartphone className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Get Good Chat on Android
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                Install directly as a fullscreen app with offline support, or package a signed
                Android .apk file.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenAppDownload}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0D7A5F] px-3.5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#0A624C] dark:bg-[#109675] dark:hover:bg-[#0D7A5F]"
          >
            <Download className="h-4 w-4" />
            <span>Install App / Download .APK</span>
          </button>
        </div>
      </div>

      {/* AI Voice Assistant Settings */}
      <div className="border-b border-slate-200/80 py-5 dark:border-slate-800">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            AI Voice Assistant
          </p>
          <button
            type="button"
            onClick={onOpenVoiceAssistant}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            Open Voice AI
          </button>
        </div>

        <div className="mt-3 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Voice Assistant
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {voice.enabled
                  ? "Enabled · Hindi, English & Hinglish"
                  : "Disabled · Microphone inactive"}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={voice.enabled}
              aria-label="Toggle Voice Assistant"
              onClick={() =>
                onUpdateVoiceSettings({
                  enabled: !voice.enabled,
                  wakeWordListening: voice.enabled ? false : voice.wakeWordListening,
                })
              }
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                voice.enabled
                  ? "bg-gradient-to-r from-blue-600 to-violet-600"
                  : "bg-slate-200 dark:bg-slate-700"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition-transform ${
                  voice.enabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Wake Word Listening
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                "Hey Good Chat", "Hey God Chat", "Good Chat"
              </p>
            </div>
            <button
              type="button"
              role="switch"
              disabled={!voice.enabled}
              aria-checked={voice.wakeWordListening}
              aria-label="Toggle Wake Word Listening"
              onClick={() =>
                onUpdateVoiceSettings({ wakeWordListening: !voice.wakeWordListening })
              }
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-40 ${
                voice.wakeWordListening
                  ? "bg-gradient-to-r from-blue-600 to-violet-600"
                  : "bg-slate-200 dark:bg-slate-700"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition-transform ${
                  voice.wakeWordListening ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Spoken AI Replies
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Read unread messages & confirmations aloud
              </p>
            </div>
            <button
              type="button"
              role="switch"
              disabled={!voice.enabled}
              aria-checked={voice.spokenReplies}
              aria-label="Toggle Spoken AI Replies"
              onClick={() => onUpdateVoiceSettings({ spokenReplies: !voice.spokenReplies })}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-40 ${
                voice.spokenReplies
                  ? "bg-gradient-to-r from-blue-600 to-violet-600"
                  : "bg-slate-200 dark:bg-slate-700"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition-transform ${
                  voice.spokenReplies ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              Speech Recognition Locale
            </p>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {VOICE_LOCALE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  disabled={!voice.enabled}
                  onClick={() => onUpdateVoiceSettings({ locale: opt.id })}
                  className={`rounded-xl border px-2 py-2 text-[11px] font-medium transition-colors whitespace-nowrap disabled:opacity-40 ${
                    voice.locale === opt.id
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-950/60 dark:text-indigo-300"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-3 text-[11px] leading-relaxed text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
            <p className="font-semibold text-slate-800 dark:text-slate-200">
              Mobile Background & Privacy Notes
            </p>
            <p className="mt-1">
              <strong className="text-slate-700 dark:text-slate-300">Android:</strong> Native
              Foreground Microphone Service displays a persistent notification with a one-tap Stop
              action and guides battery optimization exemption.
            </p>
            <p className="mt-1">
              <strong className="text-slate-700 dark:text-slate-300">iOS Limitation:</strong> Apple
              restricts always-on third-party background wake-word listening when locked; use
              foreground listening or Siri App Intents on iOS.
            </p>
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div className="border-b border-slate-200/80 py-5 dark:border-slate-800">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Appearance</p>

        <div className="mt-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Theme</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {settings.darkMode ? "Dark surface palette" : "Light surface palette"}
            </p>
          </div>

          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => onUpdateSettings({ darkMode: false })}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                !settings.darkMode
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              }`}
            >
              <Sun className="h-3.5 w-3.5" />
              <span>Light</span>
            </button>
            <button
              type="button"
              onClick={() => onUpdateSettings({ darkMode: true })}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                settings.darkMode
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              }`}
            >
              <Moon className="h-3.5 w-3.5" />
              <span>Dark</span>
            </button>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Chat Canvas</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {WALLPAPER_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onUpdateSettings({ wallpaper: opt.id })}
                className={`flex items-center justify-center gap-1.5 rounded-xl border px-2.5 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                  settings.wallpaper === opt.id
                    ? "border-[#0D7A5F] bg-emerald-50/70 text-[#0D7A5F] dark:border-[#14B88A] dark:bg-emerald-950/50 dark:text-[#14B88A]"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                {settings.wallpaper === opt.id && <Check className="h-3.5 w-3.5" />}
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Messaging Preferences */}
      <div className="space-y-4 py-5">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Chat Preferences
        </p>

        {[
          {
            key: "readReceipts" as const,
            title: "Read receipts",
            desc: "Show double checkmarks when messages are read",
          },
          {
            key: "enterToSend" as const,
            title: "Enter to send",
            desc: "Press Enter to deliver messages immediately",
          },
          {
            key: "soundEnabled" as const,
            title: "Message chimes",
            desc: "Subtle acoustic feedback on incoming replies",
          },
        ].map((item) => (
          <div key={item.key} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {item.title}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{item.desc}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings[item.key]}
              aria-label={item.title}
              onClick={() => onUpdateSettings({ [item.key]: !settings[item.key] })}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                settings[item.key]
                  ? "bg-[#0D7A5F] dark:bg-[#109675]"
                  : "bg-slate-200 dark:bg-slate-700"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition-transform ${
                  settings[item.key] ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
