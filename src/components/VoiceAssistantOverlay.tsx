import React, { useState } from "react";
import {
  AlertTriangle,
  AudioLines,
  Check,
  CheckCheck,
  Loader2,
  MessageSquare,
  Mic,
  MicOff,
  Phone,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Square,
  Video,
  Volume2,
  X,
} from "lucide-react";
import type { Chat, VoiceInterpretResponse } from "../types";
import { Avatar } from "./Avatar";

export type VoiceAssistantPhase =
  | "idle"
  | "wake_listening"
  | "command_listening"
  | "processing"
  | "awaiting_confirmation"
  | "speaking";

export const SAMPLE_VOICE_COMMANDS = [
  "Hey Good Chat, Rahul ko call karo.",
  "Hey Good Chat, Rahul ko message bhejo.",
  "Hey Good Chat, Amit ko video call karo.",
  "Hey Good Chat, meri unread messages padho.",
  "Hey Good Chat, Rahul ka chat kholo.",
];

/* ── CONSENT MODAL ────────────────────────────────────────────────────── */

type VoiceConsentModalProps = {
  onApprove: () => void;
  onDecline: () => void;
};

export const VoiceConsentModal: React.FC<VoiceConsentModalProps> = ({
  onApprove,
  onDecline,
}) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Enable Good Chat AI Voice Assistant"
    >
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-indigo-500/25 bg-[#0F1526] text-slate-100 shadow-2xl">
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
              <ShieldCheck className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Microphone & Voice Consent</h3>
              <p className="text-xs text-blue-100">Explicit permission required before listening</p>
            </div>
          </div>
        </div>

        <div className="space-y-4 px-6 py-5 text-sm text-slate-300">
          <p className="leading-relaxed">
            Good Chat AI Voice Assistant only activates the microphone after you turn it on. It
            never records secretly.
          </p>

          <ul className="space-y-2.5 text-xs leading-relaxed text-slate-300">
            <li className="flex items-start gap-2.5">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
              <span>
                Responds to wake words:{" "}
                <strong className="text-white">"Hey Good Chat"</strong>,{" "}
                <strong className="text-white">"Hey God Chat"</strong>, or{" "}
                <strong className="text-white">"Good Chat"</strong>.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
              <span>
                Understands Hindi, English, and Hinglish commands using Gemini AI on the server.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
              <span>
                Always asks for your explicit confirmation before placing calls or sending messages.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
              <span>
                You can toggle Voice Assistant OFF anytime in Settings or the mic bar.
              </span>
            </li>
          </ul>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onDecline}
              className="rounded-xl px-4 py-2.5 text-xs font-medium text-slate-300 transition-colors hover:bg-white/10 whitespace-nowrap"
            >
              Not Now
            </button>
            <button
              type="button"
              onClick={onApprove}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-900/40 transition-opacity hover:opacity-95 whitespace-nowrap"
            >
              <Mic className="h-4 w-4" />
              <span>Allow & Enable Voice AI</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── ANIMATED FUTURISTIC MIC BUTTON ───────────────────────────────────── */

type VoiceMicButtonProps = {
  enabled: boolean;
  phase: VoiceAssistantPhase;
  onClick: () => void;
};

export const VoiceMicButton: React.FC<VoiceMicButtonProps> = ({ enabled, phase, onClick }) => {
  const isListening = phase === "wake_listening" || phase === "command_listening";
  const isProcessing = phase === "processing";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open Good Chat AI Voice Assistant"
      title={enabled ? "Good Chat AI Voice Assistant" : "Voice Assistant is OFF"}
      className={`group relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-indigo-500 ${
        enabled
          ? "bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/30"
          : "border border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500"
      }`}
    >
      {enabled && isListening && (
        <span
          aria-hidden="true"
          className="animate-voice-ripple pointer-events-none absolute inset-0 rounded-2xl bg-indigo-500/45"
        />
      )}
      {isProcessing ? (
        <Loader2 className="relative z-10 h-5 w-5 animate-spin" />
      ) : enabled ? (
        <Mic className="relative z-10 h-5 w-5" />
      ) : (
        <MicOff className="relative z-10 h-5 w-5" />
      )}
    </button>
  );
};

/* ── MAIN FUTURISTIC BLUE-PURPLE AI VOICE OVERLAY ─────────────────────── */

type VoiceAssistantOverlayProps = {
  open: boolean;
  enabled: boolean;
  consentGranted: boolean;
  wakeWordListening: boolean;
  speechSupported: boolean;
  phase: VoiceAssistantPhase;
  liveTranscript: string;
  recognizedCommand: string;
  lastResult: VoiceInterpretResponse | null;
  matchedContacts: Chat[];
  selectedTargetChat: Chat | null;
  draftText: string;
  draftAlternatives: string[];
  isDrafting: boolean;
  isSpeaking: boolean;
  errorMessage: string | null;
  unreadChats: Chat[];
  onClose: () => void;
  onStartPushToTalk: () => void;
  onStopListening: () => void;
  onToggleWakeWord: () => void;
  onSubmitCommandText: (command: string) => void;
  onPickDisambiguatedContact: (chat: Chat) => void;
  onDraftTextChange: (text: string) => void;
  onRegenerateDraft: (instruction: string) => void;
  onConfirmSendMessage: () => void;
  onConfirmCall: (chat: Chat, type: "voice" | "video") => void;
  onOpenChat: (chatId: number) => void;
  onSpeakUnread: () => void;
  onStopSpeaking: () => void;
  onMarkAllRead: () => void;
  onCancelPendingAction: () => void;
  onRequestEnable: () => void;
};

export const VoiceAssistantOverlay: React.FC<VoiceAssistantOverlayProps> = ({
  open,
  enabled,
  consentGranted,
  wakeWordListening,
  speechSupported,
  phase,
  liveTranscript,
  recognizedCommand,
  lastResult,
  matchedContacts,
  selectedTargetChat,
  draftText,
  draftAlternatives,
  isDrafting,
  isSpeaking,
  errorMessage,
  unreadChats,
  onClose,
  onStartPushToTalk,
  onStopListening,
  onToggleWakeWord,
  onSubmitCommandText,
  onPickDisambiguatedContact,
  onDraftTextChange,
  onRegenerateDraft,
  onConfirmSendMessage,
  onConfirmCall,
  onOpenChat,
  onSpeakUnread,
  onStopSpeaking,
  onMarkAllRead,
  onCancelPendingAction,
  onRequestEnable,
}) => {
  const [typedCommand, setTypedCommand] = useState("");
  const [refinePrompt, setRefinePrompt] = useState("");

  if (!open) return null;

  const isListening = phase === "wake_listening" || phase === "command_listening";
  const isProcessing = phase === "processing";

  const statusText = !enabled
    ? "Voice Assistant is OFF"
    : phase === "command_listening"
      ? "Listening to your command…"
      : phase === "wake_listening"
        ? 'Listening for "Hey Good Chat"…'
        : phase === "processing"
          ? "Understanding command with Gemini…"
          : phase === "speaking"
            ? "Reading response aloud…"
            : phase === "awaiting_confirmation"
              ? "Waiting for your confirmation"
              : "Tap mic or speak a command";

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!typedCommand.trim()) return;
    onSubmitCommandText(typedCommand.trim());
    setTypedCommand("");
  }

  function handleRefineSubmit(e: React.FormEvent) {
    e.preventDefault();
    onRegenerateDraft(refinePrompt.trim() || "Make it concise and friendly");
    setRefinePrompt("");
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 p-3 backdrop-blur-sm sm:items-center sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label="Good Chat AI Voice Assistant"
    >
      <div className="flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-indigo-500/30 bg-[#0D1324] text-slate-100 shadow-2xl shadow-indigo-950/60">
        {/* Futuristic Blue-Purple Header */}
        <div className="relative overflow-hidden border-b border-indigo-500/20 bg-gradient-to-r from-blue-700/90 via-indigo-700/90 to-violet-700/90 px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-md">
                <AudioLines className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold tracking-tight text-white">
                  Good Chat AI Voice
                </h2>
                <p className="text-xs text-blue-100/90">{statusText}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {enabled && consentGranted && speechSupported && (
                <button
                  type="button"
                  onClick={onToggleWakeWord}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                    wakeWordListening
                      ? "bg-white text-indigo-700"
                      : "bg-white/15 text-white hover:bg-white/25"
                  }`}
                >
                  {wakeWordListening ? "Wake Word ON" : "Wake Word OFF"}
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                aria-label="Close AI Voice Assistant"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white transition-colors hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="thin-scrollbar flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {!enabled ? (
            <div className="rounded-2xl border border-indigo-500/20 bg-slate-900/70 p-6 text-center">
              <MicOff className="mx-auto h-9 w-9 text-slate-400" />
              <h3 className="mt-3 text-base font-semibold text-white">
                Voice Assistant is Turned Off
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                Enable Good Chat AI Voice to use Hindi, English, and Hinglish voice commands with
                explicit microphone consent.
              </p>
              <button
                type="button"
                onClick={onRequestEnable}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-5 py-2.5 text-xs font-semibold text-white"
              >
                <Mic className="h-4 w-4" />
                <span>Turn ON Voice Assistant</span>
              </button>
            </div>
          ) : (
            <>
              {/* Animated Orb & Visualizer */}
              <div className="flex flex-col items-center rounded-2xl border border-indigo-500/20 bg-gradient-to-b from-indigo-950/60 to-slate-950/60 px-5 py-6 text-center">
                <div className="relative flex items-center justify-center">
                  {isListening && (
                    <>
                      <span
                        aria-hidden="true"
                        className="animate-voice-ripple pointer-events-none absolute h-20 w-20 rounded-full bg-blue-500/35"
                      />
                      <span
                        aria-hidden="true"
                        className="animate-voice-ripple pointer-events-none absolute h-24 w-24 rounded-full bg-violet-500/25"
                      />
                    </>
                  )}
                  <button
                    type="button"
                    onClick={isListening ? onStopListening : onStartPushToTalk}
                    disabled={isProcessing}
                    aria-label={isListening ? "Stop listening" : "Tap to speak command"}
                    className={`relative z-10 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 via-indigo-600 to-violet-600 text-white shadow-xl shadow-indigo-600/40 transition-transform active:scale-95 disabled:opacity-60`}
                  >
                    {isProcessing ? (
                      <Loader2 className="h-8 w-8 animate-spin" />
                    ) : isListening ? (
                      <Square className="h-6 w-6 fill-current" />
                    ) : (
                      <Mic className="h-8 w-8" />
                    )}
                  </button>
                </div>

                {/* Equalizer Bars */}
                <div className="mt-4 flex h-6 items-center justify-center gap-1.5" aria-hidden="true">
                  <span
                    className={`h-5 w-1 rounded-full bg-blue-400 transition-opacity ${
                      isListening ? "animate-voice-bar-1 opacity-100" : "opacity-25"
                    }`}
                  />
                  <span
                    className={`h-6 w-1 rounded-full bg-indigo-400 transition-opacity ${
                      isListening ? "animate-voice-bar-2 opacity-100" : "opacity-25"
                    }`}
                  />
                  <span
                    className={`h-5 w-1 rounded-full bg-violet-400 transition-opacity ${
                      isListening ? "animate-voice-bar-3 opacity-100" : "opacity-25"
                    }`}
                  />
                  <span
                    className={`h-4 w-1 rounded-full bg-blue-300 transition-opacity ${
                      isListening ? "animate-voice-bar-4 opacity-100" : "opacity-25"
                    }`}
                  />
                </div>

                {/* Live Transcript / Recognized Command */}
                <div className="mt-3 min-h-[44px] w-full max-w-md">
                  {liveTranscript ? (
                    <p className="text-sm font-medium text-blue-100">“{liveTranscript}”</p>
                  ) : recognizedCommand ? (
                    <div>
                      <p className="text-[11px] font-medium text-indigo-300">Recognized Command</p>
                      <p className="mt-0.5 text-sm font-semibold text-white">
                        “{recognizedCommand}”
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">
                      Say <strong className="text-indigo-200">"Hey Good Chat"</strong>,{" "}
                      <strong className="text-indigo-200">"Hey God Chat"</strong>, or tap the mic
                      and speak in Hindi, English, or Hinglish.
                    </p>
                  )}
                </div>

                {!speechSupported && (
                  <p className="mt-2 text-[11px] text-amber-300/90">
                    Browser Speech Recognition is unavailable here — use the quick voice command
                    buttons or command bar below.
                  </p>
                )}
              </div>

              {/* Error Banner */}
              {errorMessage && (
                <div className="flex items-start gap-2.5 rounded-2xl border border-rose-500/35 bg-rose-950/40 px-4 py-3 text-xs text-rose-200">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                  <p className="leading-relaxed">{errorMessage}</p>
                </div>
              )}

              {/* Gemini Assistant Reply */}
              {lastResult && (
                <div className="rounded-2xl border border-indigo-500/25 bg-indigo-950/35 px-4 py-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-300">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Gemini Assistant</span>
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {lastResult.language === "hi"
                        ? "Hindi"
                        : lastResult.language === "hinglish"
                          ? "Hinglish"
                          : "English"}
                      {" · "}
                      {lastResult.intent.replace("_", " ")}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-white">
                    {lastResult.assistantReply}
                  </p>
                </div>
              )}

              {/* ── DISAMBIGUATION CARD ──────────────────────────────────── */}
              {lastResult &&
                lastResult.needsDisambiguation &&
                matchedContacts.length > 1 &&
                !selectedTargetChat && (
                  <div className="rounded-2xl border border-blue-500/30 bg-slate-900/90 p-4">
                    <p className="text-xs font-semibold text-blue-300">
                      Multiple contacts matched — choose who you meant:
                    </p>
                    <div className="mt-3 space-y-2">
                      {matchedContacts.map((contact) => (
                        <button
                          key={contact.id}
                          type="button"
                          onClick={() => onPickDisambiguatedContact(contact)}
                          className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-700/80 bg-slate-800/70 px-3.5 py-2.5 text-left transition-colors hover:border-indigo-400 hover:bg-indigo-950/60"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <Avatar label={contact.avatar} color={contact.color} size="sm" />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-white">
                                {contact.name}
                              </p>
                              <p className="truncate text-xs text-slate-400">{contact.about}</p>
                            </div>
                          </div>
                          <span className="text-xs font-semibold text-indigo-300 whitespace-nowrap">
                            Select
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

              {/* ── CALL CONFIRMATION CARD ───────────────────────────────── */}
              {lastResult &&
                (lastResult.intent === "voice_call" || lastResult.intent === "video_call") &&
                selectedTargetChat && (
                  <div className="rounded-2xl border border-indigo-500/35 bg-slate-900/90 p-4">
                    <div className="flex items-center gap-3.5">
                      <Avatar
                        label={selectedTargetChat.avatar}
                        color={selectedTargetChat.color}
                        size="md"
                        online={selectedTargetChat.online}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-indigo-300">
                          Confirm {lastResult.intent === "video_call" ? "Video" : "Voice"} Call
                        </p>
                        <p className="truncate text-base font-semibold text-white">
                          {selectedTargetChat.name}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-end gap-2.5">
                      <button
                        type="button"
                        onClick={onCancelPendingAction}
                        className="rounded-xl px-4 py-2 text-xs font-medium text-slate-300 hover:bg-white/10"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onConfirmCall(
                            selectedTargetChat,
                            lastResult.intent === "video_call" ? "video" : "voice"
                          )
                        }
                        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:opacity-95"
                      >
                        {lastResult.intent === "video_call" ? (
                          <Video className="h-4 w-4" />
                        ) : (
                          <Phone className="h-4 w-4" />
                        )}
                        <span>
                          Open {lastResult.intent === "video_call" ? "Video" : "Voice"} Call
                        </span>
                      </button>
                    </div>
                  </div>
                )}

              {/* ── MESSAGE DRAFT CONFIRMATION CARD ──────────────────────── */}
              {lastResult && lastResult.intent === "send_message" && selectedTargetChat && (
                <div className="rounded-2xl border border-indigo-500/35 bg-slate-900/90 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Avatar
                        label={selectedTargetChat.avatar}
                        color={selectedTargetChat.color}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium text-indigo-300">
                          Gemini Message Draft · Confirm before sending
                        </p>
                        <p className="truncate text-sm font-semibold text-white">
                          To: {selectedTargetChat.name}
                        </p>
                      </div>
                    </div>
                  </div>

                  <textarea
                    value={draftText}
                    onChange={(e) => onDraftTextChange(e.target.value)}
                    rows={3}
                    placeholder="Edit your message before sending..."
                    className="mt-3 w-full resize-none rounded-xl border border-indigo-500/25 bg-slate-950/80 p-3 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
                  />

                  {draftAlternatives.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {draftAlternatives.map((alt) => (
                        <button
                          key={alt}
                          type="button"
                          onClick={() => onDraftTextChange(alt)}
                          className="rounded-lg border border-slate-700 bg-slate-800/70 px-2.5 py-1 text-left text-[11px] text-slate-300 transition-colors hover:border-indigo-400 hover:text-white"
                        >
                          {alt}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Refine with Gemini */}
                  <form onSubmit={handleRefineSubmit} className="mt-3 flex items-center gap-2">
                    <input
                      type="text"
                      value={refinePrompt}
                      onChange={(e) => setRefinePrompt(e.target.value)}
                      placeholder="Ask Gemini to adjust tone (e.g. 'casual Hinglish' or 'ask about 5 PM')..."
                      className="h-9 flex-1 rounded-xl border border-slate-700/80 bg-slate-950/60 px-3 text-xs text-slate-100 placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={isDrafting}
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-indigo-500/40 bg-indigo-950/60 px-3 text-xs font-medium text-indigo-200 transition-colors hover:bg-indigo-900/60 disabled:opacity-50 whitespace-nowrap"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isDrafting ? "animate-spin" : ""}`} />
                      <span>Draft</span>
                    </button>
                  </form>

                  <div className="mt-4 flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={onCancelPendingAction}
                      className="rounded-xl px-4 py-2 text-xs font-medium text-slate-300 hover:bg-white/10"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={!draftText.trim()}
                      onClick={onConfirmSendMessage}
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:opacity-95 disabled:opacity-40"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>Confirm & Send</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ── UNREAD MESSAGES READER CARD ──────────────────────────── */}
              {lastResult && lastResult.intent === "read_unread" && (
                <div className="rounded-2xl border border-indigo-500/35 bg-slate-900/90 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-indigo-300">
                      Unread Messages ({unreadChats.reduce((s, c) => s + c.unread, 0)})
                    </p>
                    <div className="flex items-center gap-2">
                      {isSpeaking ? (
                        <button
                          type="button"
                          onClick={onStopSpeaking}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600/80 px-2.5 py-1 text-xs font-medium text-white hover:bg-rose-600"
                        >
                          <Square className="h-3 w-3 fill-current" />
                          <span>Stop</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={onSpeakUnread}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-500"
                        >
                          <Volume2 className="h-3.5 w-3.5" />
                          <span>Read Aloud</span>
                        </button>
                      )}
                      {unreadChats.length > 0 && (
                        <button
                          type="button"
                          onClick={onMarkAllRead}
                          className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-200 hover:bg-slate-700"
                        >
                          <CheckCheck className="h-3.5 w-3.5" />
                          <span>Mark Read</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {unreadChats.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {unreadChats.map((chat) => (
                        <button
                          key={chat.id}
                          type="button"
                          onClick={() => {
                            onOpenChat(chat.id);
                            onClose();
                          }}
                          className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2.5 text-left transition-colors hover:border-indigo-400"
                        >
                          <div className="flex min-w-0 items-center gap-2.5">
                            <Avatar label={chat.avatar} color={chat.color} size="sm" />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-white">
                                {chat.name}
                              </p>
                              <p className="truncate text-xs text-slate-400">{chat.message}</p>
                            </div>
                          </div>
                          <span className="shrink-0 text-xs font-semibold text-indigo-300 tabular-nums">
                            {chat.unread} new
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-slate-400">
                      No unread messages right now. You are all caught up.
                    </p>
                  )}
                </div>
              )}

              {/* Quick Command Bar (Type or Tap Sample Hindi/Hinglish/English Commands) */}
              <div className="space-y-3 border-t border-slate-800 pt-4">
                <form onSubmit={handleManualSubmit} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={typedCommand}
                    onChange={(e) => setTypedCommand(e.target.value)}
                    placeholder='Type a voice command (e.g. "Hey Good Chat, Rahul ko message bhejo")'
                    className="h-10 flex-1 rounded-xl border border-slate-700/80 bg-slate-900 px-3.5 text-xs text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isProcessing || !typedCommand.trim()}
                    aria-label="Run voice command"
                    className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-3.5 text-xs font-semibold text-white disabled:opacity-40 whitespace-nowrap"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>Run</span>
                  </button>
                </form>

                <div>
                  <p className="mb-2 text-[11px] font-medium text-slate-400">
                    Try a supported voice command
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {SAMPLE_VOICE_COMMANDS.map((cmd) => (
                      <button
                        key={cmd}
                        type="button"
                        disabled={isProcessing}
                        onClick={() => onSubmitCommandText(cmd)}
                        className="rounded-lg border border-indigo-500/25 bg-indigo-950/40 px-2.5 py-1.5 text-left text-[11px] font-medium text-indigo-200 transition-colors hover:border-indigo-400 hover:bg-indigo-900/50 disabled:opacity-50"
                      >
                        {cmd}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
