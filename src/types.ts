export type NavTab = "Chats" | "Calls" | "Communities" | "Updates" | "Settings";

export type WallpaperStyle = "clean" | "dots" | "sage";

export type VoiceLocale = "en-IN" | "hi-IN" | "en-US";

export type VoiceIntent =
  | "voice_call"
  | "video_call"
  | "send_message"
  | "read_unread"
  | "open_chat"
  | "unknown";

export type VoiceInterpretResponse = {
  wakeWordDetected: boolean;
  cleanedCommand: string;
  intent: VoiceIntent;
  spokenTargetName?: string;
  matchedContactIds: number[];
  needsDisambiguation: boolean;
  requiresConfirmation: boolean;
  language: "en" | "hi" | "hinglish";
  messageDraft?: string;
  assistantReply: string;
};

export type VoiceDraftResponse = {
  draft: string;
  alternatives: string[];
};

export type MessageAttachment =
  | { type: "image"; url: string; caption?: string }
  | { type: "file"; name: string; size: string }
  | { type: "location"; label: string; address: string };

export type Message = {
  id: string;
  text: string;
  mine: boolean;
  time: string;
  senderName?: string;
  status?: "sent" | "delivered" | "read";
  reaction?: string;
  replyTo?: {
    sender: string;
    text: string;
  };
  attachment?: MessageAttachment;
};

export type Chat = {
  id: number;
  name: string;
  avatar: string;
  color: string;
  darkColor: string;
  avatarText: string;
  message: string;
  time: string;
  unread: number;
  online: boolean;
  isGroup?: boolean;
  pinned?: boolean;
  muted?: boolean;
  about: string;
  phone?: string;
  members?: string[];
  messages: Message[];
};

export type StatusUpdate = {
  id: string;
  chatId?: number;
  name: string;
  shortName: string;
  avatar: string;
  color: string;
  darkColor: string;
  ringColor: string;
  time: string;
  caption: string;
  imageUrl?: string;
  bgGradient?: string;
  viewed: boolean;
  isMine?: boolean;
};

export type CallRecord = {
  id: string;
  chatId: number;
  name: string;
  avatar: string;
  color: string;
  darkColor: string;
  type: "voice" | "video";
  direction: "incoming" | "outgoing" | "missed";
  time: string;
  duration?: string;
};

export type Community = {
  id: string;
  name: string;
  avatar: string;
  color: string;
  darkColor: string;
  description: string;
  membersCount: number;
  joined: boolean;
  chatId?: number;
  latestAnnouncement: {
    sender: string;
    text: string;
    time: string;
  };
};

export type VoiceAssistantSettings = {
  enabled: boolean;
  consentGranted: boolean;
  wakeWordListening: boolean;
  spokenReplies: boolean;
  locale: VoiceLocale;
};

export type AppSettings = {
  profileName: string;
  profileAbout: string;
  darkMode: boolean;
  readReceipts: boolean;
  enterToSend: boolean;
  soundEnabled: boolean;
  wallpaper: WallpaperStyle;
  voiceAssistant: VoiceAssistantSettings;
};
