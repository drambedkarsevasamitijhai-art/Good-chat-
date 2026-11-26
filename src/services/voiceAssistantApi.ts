import type { Chat, VoiceDraftResponse, VoiceInterpretResponse, VoiceLocale } from "../types";

const API_BASE = ((import.meta.env?.VITE_API_BASE_URL as string | undefined) || "")
  .trim()
  .replace(/\/+$/, "");

function apiUrl(endpoint: string): string {
  return API_BASE ? `${API_BASE}${endpoint}` : endpoint;
}

export const WAKE_WORD_PATTERNS = [
  "hey good chat",
  "hey god chat",
  "good chat",
  "he good chat",
  "hey goodchat",
  "goodchat",
];

export function detectWakeWord(transcript: string): {
  matched: boolean;
  matchedPhrase: string | null;
  commandAfterWakeWord: string;
} {
  const lower = transcript.trim().toLowerCase();
  for (const phrase of WAKE_WORD_PATTERNS) {
    const idx = lower.indexOf(phrase);
    if (idx !== -1) {
      const after = transcript
        .slice(idx + phrase.length)
        .replace(/^[\s,.:;-]+/, "")
        .trim();
      return { matched: true, matchedPhrase: phrase, commandAfterWakeWord: after };
    }
  }
  return { matched: false, matchedPhrase: null, commandAfterWakeWord: transcript.trim() };
}

export async function interpretVoiceCommand(params: {
  transcript: string;
  requireWakeWord: boolean;
  chats: Chat[];
}): Promise<VoiceInterpretResponse> {
  const contacts = params.chats.map((c) => ({
    id: c.id,
    name: c.name,
    isGroup: Boolean(c.isGroup),
    unread: c.unread,
    about: c.about,
  }));

  const unreadSummary = params.chats
    .filter((c) => c.unread > 0)
    .map((c) => ({
      chatId: c.id,
      name: c.name,
      unread: c.unread,
      messages: c.messages
        .filter((m) => !m.mine)
        .slice(-Math.max(1, Math.min(c.unread, 4)))
        .map((m) => (m.senderName ? `${m.senderName}: ${m.text}` : m.text)),
    }));

  const res = await fetch(apiUrl("/api/voice/interpret"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      transcript: params.transcript,
      requireWakeWord: params.requireWakeWord,
      contacts,
      unreadSummary,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof data?.error === "string"
        ? data.error
        : `Voice AI request failed (HTTP ${res.status})`
    );
  }
  return data as VoiceInterpretResponse;
}

export async function generateMessageDraft(params: {
  recipientName: string;
  instruction: string;
  language: "en" | "hi" | "hinglish";
  recentMessages: string[];
}): Promise<VoiceDraftResponse> {
  const res = await fetch(apiUrl("/api/voice/draft"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof data?.error === "string"
        ? data.error
        : `Draft generation failed (HTTP ${res.status})`
    );
  }
  return data as VoiceDraftResponse;
}

export function speakAssistantText(
  text: string,
  locale: VoiceLocale = "en-IN",
  onEnd?: () => void
): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return false;
  }
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = locale;
    utterance.rate = 1.02;
    if (onEnd) {
      utterance.onend = onEnd;
      utterance.onerror = onEnd;
    }
    window.speechSynthesis.speak(utterance);
    return true;
  } catch {
    return false;
  }
}

export function stopSpeaking(): void {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

/* Browser Web Speech API type declarations */
export interface SpeechRecognitionResultItem {
  transcript: string;
  confidence: number;
}

export interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechRecognitionResultItem;
}

export interface SpeechRecognitionEventLike {
  readonly resultIndex: number;
  readonly results: {
    readonly length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
}

export interface SpeechRecognitionErrorEventLike {
  readonly error: string;
  readonly message?: string;
}

export interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

export function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const win = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null;
}
