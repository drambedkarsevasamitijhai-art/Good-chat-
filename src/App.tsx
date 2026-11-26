import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  BellOff,
  Check,
  CheckCheck,
  CircleDot,
  CornerUpLeft,
  FileText,
  Image as ImageIcon,
  Info,
  MapPin,
  MessageSquare,
  MoreVertical,
  Phone,
  Pin,
  Plus,
  Search,
  Send,
  Settings,
  Smile,
  Trash2,
  Users,
  Video,
  X,
} from "lucide-react";
import {
  AppDownloadButton,
  AppDownloadModal,
  OfflineIndicator,
} from "./components/AppDownloadModal";
import { Avatar } from "./components/Avatar";
import { CallOverlay } from "./components/CallOverlay";
import { ContactInfoDrawer } from "./components/ContactInfoDrawer";
import { NewChatModal } from "./components/NewChatModal";
import {
  CallsPanel,
  CommunitiesPanel,
  SettingsPanel,
  UpdatesPanel,
} from "./components/SidebarPanels";
import { CreateStatusModal, StatusViewerModal } from "./components/StatusViewerModal";
import {
  VoiceAssistantOverlay,
  VoiceConsentModal,
  VoiceMicButton,
  type VoiceAssistantPhase,
} from "./components/VoiceAssistantOverlay";
import {
  defaultSettings,
  initialCalls,
  initialChats,
  initialCommunities,
  initialStatuses,
  PRIYA_CAFE_PHOTO,
} from "./data/initialData";
import {
  detectWakeWord,
  generateMessageDraft,
  getSpeechRecognitionConstructor,
  interpretVoiceCommand,
  speakAssistantText,
  stopSpeaking,
  type SpeechRecognitionInstance,
} from "./services/voiceAssistantApi";
import type {
  AppSettings,
  CallRecord,
  Chat,
  Community,
  Message,
  MessageAttachment,
  NavTab,
  StatusUpdate,
  VoiceInterpretResponse,
} from "./types";

const NAV_ITEMS: { name: NavTab; icon: React.ComponentType<{ className?: string }> }[] = [
  { name: "Chats", icon: MessageSquare },
  { name: "Calls", icon: Phone },
  { name: "Communities", icon: Users },
  { name: "Updates", icon: CircleDot },
  { name: "Settings", icon: Settings },
];

const QUICK_EMOJIS = [
  "😊", "😂", "❤️", "👍", "🙏", "🎉", "🔥", "✨",
  "👋", "😎", "☕", "🌞", "📷", "💼", "🚀", "🙌",
];

const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "🙏"];

function formatNowTime(): string {
  const now = new Date();
  return now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

function formatCallDuration(totalSeconds: number): string | undefined {
  if (totalSeconds <= 0) return undefined;
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export default function App() {
  const [chats, setChats] = useState<Chat[]>(initialChats);
  const [statuses, setStatuses] = useState<StatusUpdate[]>(initialStatuses);
  const [calls, setCalls] = useState<CallRecord[]>(initialCalls);
  const [communities, setCommunities] = useState<Community[]>(initialCommunities);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);

  const [activeTab, setActiveTab] = useState<NavTab>("Chats");
  const [chatFilter, setChatFilter] = useState<"all" | "unread">("all");
  const [selectedId, setSelectedId] = useState<number | null>(1);
  const [search, setSearch] = useState("");
  const [messageText, setMessageText] = useState("");
  const [mobileChatOpen, setMobileChatOpen] = useState(false);

  // Interactive panels & overlays
  const [showInfoDrawer, setShowInfoDrawer] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showAppDownloadModal, setShowAppDownloadModal] = useState(false);
  const [showCreateStatusModal, setShowCreateStatusModal] = useState(false);
  const [activeStatusIndex, setActiveStatusIndex] = useState<number | null>(null);
  const [activeCall, setActiveCall] = useState<{ chat: Chat; type: "voice" | "video" } | null>(
    null
  );
  const [lightboxImage, setLightboxImage] = useState<{ url: string; caption?: string } | null>(
    null
  );

  // Composer & Header popovers
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [inChatSearchOpen, setInChatSearchOpen] = useState(false);
  const [inChatQuery, setInChatQuery] = useState("");
  const [replyingTo, setReplyingTo] = useState<{ sender: string; text: string } | null>(null);
  const [toastNotice, setToastNotice] = useState<string | null>(null);

  // ── AI VOICE ASSISTANT STATE ───────────────────────────────────────────
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [showVoiceConsentModal, setShowVoiceConsentModal] = useState(false);
  const [voicePhase, setVoicePhase] = useState<VoiceAssistantPhase>("idle");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [recognizedCommand, setRecognizedCommand] = useState("");
  const [voiceResult, setVoiceResult] = useState<VoiceInterpretResponse | null>(null);
  const [matchedContacts, setMatchedContacts] = useState<Chat[]>([]);
  const [selectedTargetChat, setSelectedTargetChat] = useState<Chat | null>(null);
  const [draftText, setDraftText] = useState("");
  const [draftAlternatives, setDraftAlternatives] = useState<string[]>([]);
  const [isDrafting, setIsDrafting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Refs for voice recognition
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const recognitionModeRef = useRef<"idle" | "wake" | "command">("idle");
  const chatsRef = useRef<Chat[]>(chats);
  const voiceSettingsRef = useRef(settings.voiceAssistant);

  useEffect(() => {
    chatsRef.current = chats;
  }, [chats]);

  useEffect(() => {
    voiceSettingsRef.current = settings.voiceAssistant;
  }, [settings.voiceAssistant]);

  const speechSupported = useMemo(() => Boolean(getSpeechRecognitionConstructor()), []);

  // Sync dark mode class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (settings.darkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [settings.darkMode]);

  // Auto-dismiss toast notifications
  useEffect(() => {
    if (!toastNotice) return;
    const t = window.setTimeout(() => setToastNotice(null), 3000);
    return () => window.clearTimeout(t);
  }, [toastNotice]);

  // Clean up speech synthesis on unmount
  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  const selectedChat = useMemo(
    () => (selectedId !== null ? chats.find((c) => c.id === selectedId) ?? null : null),
    [chats, selectedId]
  );

  // Scroll to bottom when messages change or chat changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedChat?.id, selectedChat?.messages.length]);

  const totalUnread = useMemo(() => chats.reduce((acc, c) => acc + c.unread, 0), [chats]);

  const unreadChats = useMemo(() => chats.filter((c) => c.unread > 0), [chats]);

  const myStatus = useMemo(() => statuses.find((s) => s.isMine), [statuses]);

  const filteredChats = useMemo(() => {
    const query = search.trim().toLowerCase();
    return [...chats]
      .filter((c) => {
        if (chatFilter === "unread" && c.unread === 0) return false;
        if (!query) return true;
        return (
          c.name.toLowerCase().includes(query) || c.message.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)));
  }, [chats, search, chatFilter]);

  const displayedMessages = useMemo(() => {
    if (!selectedChat) return [];
    const q = inChatQuery.trim().toLowerCase();
    if (!inChatSearchOpen || !q) return selectedChat.messages;
    return selectedChat.messages.filter(
      (m) =>
        m.text.toLowerCase().includes(q) ||
        m.senderName?.toLowerCase().includes(q) ||
        (m.attachment?.type === "file" && m.attachment.name.toLowerCase().includes(q))
    );
  }, [selectedChat, inChatSearchOpen, inChatQuery]);

  const openChat = useCallback((id: number) => {
    setSelectedId(id);
    setMobileChatOpen(true);
    setShowMoreMenu(false);
    setShowEmojiPicker(false);
    setShowAttachMenu(false);
    setInChatSearchOpen(false);
    setInChatQuery("");
    setReplyingTo(null);
    setChats((prev) =>
      prev.map((c) => (c.id === id && c.unread > 0 ? { ...c, unread: 0 } : c))
    );
  }, []);

  const deliverMessage = useCallback(
    (text: string, attachment?: MessageAttachment, targetChatId?: number) => {
      const destinationId = targetChatId ?? selectedId;
      if (destinationId === null) return;

      const cleanText = text.trim();
      if (!cleanText && !attachment) return;

      const nowTime = formatNowTime();
      const previewLabel =
        cleanText ||
        (attachment?.type === "image"
          ? "Sent a photo 📷"
          : attachment?.type === "file"
            ? `Shared ${attachment.name}`
            : attachment?.type === "location"
              ? `Shared location: ${attachment.label}`
              : "");

      const newMsg: Message = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        text: cleanText,
        mine: true,
        time: nowTime,
        status: settings.readReceipts ? "read" : "delivered",
        replyTo: targetChatId ? undefined : replyingTo ?? undefined,
        attachment,
      };

      setChats((prev) =>
        prev.map((chat) =>
          chat.id === destinationId
            ? {
                ...chat,
                message: previewLabel,
                time: nowTime,
                unread: 0,
                messages: [...chat.messages, newMsg],
              }
            : chat
        )
      );
      if (!targetChatId || targetChatId === selectedId) {
        setMessageText("");
        setReplyingTo(null);
      }
      setShowEmojiPicker(false);
      setShowAttachMenu(false);
    },
    [selectedId, settings.readReceipts, replyingTo]
  );

  function handleSendSubmit(e: React.FormEvent) {
    e.preventDefault();
    deliverMessage(messageText);
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith("image/")) {
      const objectUrl = URL.createObjectURL(file);
      deliverMessage("", { type: "image", url: objectUrl, caption: file.name });
    } else {
      const kb = Math.max(1, Math.round(file.size / 1024));
      const sizeStr = kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
      deliverMessage("", { type: "file", name: file.name, size: sizeStr });
    }
    e.target.value = "";
  }

  function handleToggleReaction(messageId: string, emoji: string) {
    if (selectedId === null) return;
    setChats((prev) =>
      prev.map((chat) =>
        chat.id === selectedId
          ? {
              ...chat,
              messages: chat.messages.map((m) =>
                m.id === messageId
                  ? { ...m, reaction: m.reaction === emoji ? undefined : emoji }
                  : m
              ),
            }
          : chat
      )
    );
  }

  function handleCreateChat(contact: {
    name: string;
    avatar: string;
    color: string;
    darkColor: string;
    avatarText: string;
    about: string;
  }) {
    const existing = chats.find((c) => c.name.toLowerCase() === contact.name.toLowerCase());
    if (existing) {
      setActiveTab("Chats");
      openChat(existing.id);
      return;
    }
    const nextId = Math.max(0, ...chats.map((c) => c.id)) + 1;
    const newChat: Chat = {
      id: nextId,
      name: contact.name,
      avatar: contact.avatar,
      color: contact.color,
      darkColor: contact.darkColor,
      avatarText: contact.avatarText,
      message: "Start of your conversation",
      time: formatNowTime(),
      unread: 0,
      online: true,
      about: contact.about,
      messages: [],
    };
    setChats((prev) => [newChat, ...prev]);
    setActiveTab("Chats");
    openChat(nextId);
  }

  const handleStartCall = useCallback((chatId: number, type: "voice" | "video") => {
    const target = chatsRef.current.find((c) => c.id === chatId);
    if (!target) return;
    setActiveCall({ chat: target, type });
  }, []);

  function handleEndCall(durationSeconds: number) {
    if (!activeCall) return;
    const record: CallRecord = {
      id: `call-${Date.now()}`,
      chatId: activeCall.chat.id,
      name: activeCall.chat.name,
      avatar: activeCall.chat.avatar,
      color: activeCall.chat.color,
      darkColor: activeCall.chat.darkColor,
      type: activeCall.type,
      direction: "outgoing",
      time: `Today, ${formatNowTime()}`,
      duration: formatCallDuration(durationSeconds),
    };
    setCalls((prev) => [record, ...prev]);
    setActiveCall(null);
    setToastNotice(
      durationSeconds > 0
        ? `Call ended · ${formatCallDuration(durationSeconds)}`
        : "Call screen closed"
    );
  }

  function handlePublishStatus(caption: string, themeClass: string) {
    const newStatus: StatusUpdate = {
      id: `st-mine-${Date.now()}`,
      name: settings.profileName || "You",
      shortName: "My Status",
      avatar: (settings.profileName || "Y")[0].toUpperCase(),
      color: "#D8F3E8",
      darkColor: "#143D30",
      ringColor: "#0D7A5F",
      time: "Just now",
      caption,
      bgGradient: themeClass,
      viewed: false,
      isMine: true,
    };
    setStatuses((prev) => [newStatus, ...prev.filter((s) => !s.isMine)]);
    setToastNotice("Status update published");
  }

  function handleReplyToStatus(status: StatusUpdate, replyText: string) {
    const matchingChat = status.chatId
      ? chats.find((c) => c.id === status.chatId)
      : chats.find((c) => c.name.toLowerCase() === status.name.toLowerCase());

    if (matchingChat) {
      const nowTime = formatNowTime();
      const newMsg: Message = {
        id: `msg-st-${Date.now()}`,
        text: replyText,
        mine: true,
        time: nowTime,
        status: settings.readReceipts ? "read" : "delivered",
        replyTo: {
          sender: `${status.shortName}'s Status`,
          text: status.caption,
        },
      };
      setChats((prev) =>
        prev.map((c) =>
          c.id === matchingChat.id
            ? {
                ...c,
                message: replyText,
                time: nowTime,
                unread: 0,
                messages: [...c.messages, newMsg],
              }
            : c
        )
      );
      setActiveTab("Chats");
      setSelectedId(matchingChat.id);
      setMobileChatOpen(true);
      setToastNotice(`Replied to ${status.shortName}'s status`);
    }
  }

  function handleOpenCommunityChat(community: Community) {
    const existing = chats.find((c) => c.name === community.name);
    if (existing) {
      setActiveTab("Chats");
      openChat(existing.id);
      return;
    }
    const nextId = Math.max(0, ...chats.map((c) => c.id)) + 1;
    const communityChat: Chat = {
      id: nextId,
      name: community.name,
      avatar: community.avatar,
      color: community.color,
      darkColor: community.darkColor,
      avatarText: "#0C5A44",
      message: community.latestAnnouncement.text,
      time: community.latestAnnouncement.time,
      unread: 0,
      online: false,
      isGroup: true,
      about: community.description,
      members: [community.latestAnnouncement.sender, "Rahul Sharma", "Priya Mehta", "You"],
      messages: [
        {
          id: `comm-msg-${Date.now()}`,
          text: community.latestAnnouncement.text,
          mine: false,
          senderName: community.latestAnnouncement.sender,
          time: community.latestAnnouncement.time,
        },
      ],
    };
    setChats((prev) => [communityChat, ...prev]);
    setCommunities((prev) =>
      prev.map((c) => (c.id === community.id ? { ...c, joined: true } : c))
    );
    setActiveTab("Chats");
    openChat(nextId);
  }

  function handleToggleMute(chatId: number) {
    setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, muted: !c.muted } : c)));
  }

  function handleTogglePin(chatId: number) {
    setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, pinned: !c.pinned } : c)));
  }

  function handleClearMessages(chatId: number) {
    setChats((prev) =>
      prev.map((c) =>
        c.id === chatId ? { ...c, message: "No messages yet", messages: [] } : c
      )
    );
    setShowMoreMenu(false);
    setToastNotice("Conversation cleared");
  }

  // ── AI VOICE ASSISTANT LOGIC ───────────────────────────────────────────

  const stopVoiceRecognition = useCallback(() => {
    recognitionModeRef.current = "idle";
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.abort();
      } catch {
        // Ignore browser abort race
      }
      recognitionRef.current = null;
    }
    setVoicePhase((prev) =>
      prev === "wake_listening" || prev === "command_listening" ? "idle" : prev
    );
  }, []);

  const triggerDraftGeneration = useCallback(
    async (chat: Chat, instruction: string, lang: "en" | "hi" | "hinglish") => {
      setIsDrafting(true);
      setVoiceError(null);
      try {
        const recentMessages = chat.messages
          .slice(-4)
          .map((m) => `${m.mine ? "Me" : m.senderName || chat.name}: ${m.text}`)
          .filter(Boolean);
        const draftRes = await generateMessageDraft({
          recipientName: chat.name,
          instruction,
          language: lang,
          recentMessages,
        });
        setDraftText(draftRes.draft);
        setDraftAlternatives(draftRes.alternatives);
      } catch (err) {
        setVoiceError(
          err instanceof Error ? err.message : "Could not generate message draft."
        );
      } finally {
        setIsDrafting(false);
      }
    },
    []
  );

  const speakUnreadSummary = useCallback(() => {
    const unread = chatsRef.current.filter((c) => c.unread > 0);
    const locale = voiceSettingsRef.current.locale;
    if (unread.length === 0) {
      const msg =
        locale === "hi-IN"
          ? "Aapke paas koi unread message nahi hai."
          : "You have no unread messages right now.";
      setIsSpeaking(true);
      setVoicePhase("speaking");
      const started = speakAssistantText(msg, locale, () => {
        setIsSpeaking(false);
        setVoicePhase("idle");
      });
      if (!started) {
        setIsSpeaking(false);
        setVoicePhase("idle");
      }
      return;
    }

    const total = unread.reduce((acc, c) => acc + c.unread, 0);
    const summaryParts = unread.map(
      (c) => `${c.name} sent ${c.unread} unread: ${c.message}`
    );
    const fullSpeech = `You have ${total} unread messages. ${summaryParts.join(". ")}`;
    setIsSpeaking(true);
    setVoicePhase("speaking");
    const started = speakAssistantText(fullSpeech, locale, () => {
      setIsSpeaking(false);
      setVoicePhase("idle");
    });
    if (!started) {
      setIsSpeaking(false);
      setVoicePhase("idle");
    }
  }, []);

  const processVoiceCommand = useCallback(
    async (rawTranscript: string, requireWakeWord: boolean) => {
      const cleaned = rawTranscript.trim();
      if (!cleaned) return;

      stopVoiceRecognition();
      stopSpeaking();
      setIsSpeaking(false);
      setVoiceModalOpen(true);
      setVoicePhase("processing");
      setLiveTranscript("");
      setRecognizedCommand(cleaned);
      setVoiceError(null);
      setVoiceResult(null);
      setMatchedContacts([]);
      setSelectedTargetChat(null);
      setDraftText("");
      setDraftAlternatives([]);

      try {
        const result = await interpretVoiceCommand({
          transcript: cleaned,
          requireWakeWord,
          chats: chatsRef.current,
        });

        setVoiceResult(result);

        const resolved = result.matchedContactIds
          .map((id) => chatsRef.current.find((c) => c.id === id))
          .filter((c): c is Chat => Boolean(c));
        setMatchedContacts(resolved);

        if (result.needsDisambiguation && resolved.length > 1) {
          setVoicePhase("awaiting_confirmation");
          if (voiceSettingsRef.current.spokenReplies && result.assistantReply) {
            speakAssistantText(result.assistantReply, voiceSettingsRef.current.locale);
          }
          return;
        }

        const primaryTarget = resolved.length === 1 ? resolved[0] : null;

        if (result.intent === "open_chat" && primaryTarget) {
          setActiveTab("Chats");
          openChat(primaryTarget.id);
          setSelectedTargetChat(primaryTarget);
          setVoicePhase("idle");
          setToastNotice(`Opened chat with ${primaryTarget.name}`);
          if (voiceSettingsRef.current.spokenReplies && result.assistantReply) {
            speakAssistantText(result.assistantReply, voiceSettingsRef.current.locale);
          }
          return;
        }

        if (
          (result.intent === "voice_call" || result.intent === "video_call") &&
          primaryTarget
        ) {
          setSelectedTargetChat(primaryTarget);
          setVoicePhase("awaiting_confirmation");
          if (voiceSettingsRef.current.spokenReplies && result.assistantReply) {
            speakAssistantText(result.assistantReply, voiceSettingsRef.current.locale);
          }
          return;
        }

        if (result.intent === "send_message" && primaryTarget) {
          setActiveTab("Chats");
          openChat(primaryTarget.id);
          setSelectedTargetChat(primaryTarget);
          setVoicePhase("awaiting_confirmation");
          if (result.messageDraft?.trim()) {
            setDraftText(result.messageDraft.trim());
          } else {
            void triggerDraftGeneration(
              primaryTarget,
              result.cleanedCommand || cleaned,
              result.language
            );
          }
          if (voiceSettingsRef.current.spokenReplies && result.assistantReply) {
            speakAssistantText(result.assistantReply, voiceSettingsRef.current.locale);
          }
          return;
        }

        if (result.intent === "read_unread") {
          setVoicePhase("idle");
          if (voiceSettingsRef.current.spokenReplies) {
            speakUnreadSummary();
          }
          return;
        }

        setVoicePhase("idle");
        if (voiceSettingsRef.current.spokenReplies && result.assistantReply) {
          speakAssistantText(result.assistantReply, voiceSettingsRef.current.locale);
        }
      } catch (err) {
        setVoicePhase("idle");
        setVoiceError(
          err instanceof Error ? err.message : "Failed to process voice command."
        );
      }
    },
    [openChat, speakUnreadSummary, stopVoiceRecognition, triggerDraftGeneration]
  );

  const startPushToTalk = useCallback(() => {
    const voice = voiceSettingsRef.current;
    if (!voice.enabled || !voice.consentGranted) {
      setShowVoiceConsentModal(true);
      return;
    }

    const SpeechCtor = getSpeechRecognitionConstructor();
    if (!SpeechCtor) {
      setVoiceError(
        "Browser Speech Recognition is unavailable here. Use the command input or quick buttons below."
      );
      return;
    }

    stopVoiceRecognition();
    stopSpeaking();
    setIsSpeaking(false);
    setVoiceError(null);
    setLiveTranscript("");

    const recognition = new SpeechCtor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = voice.locale;
    recognitionRef.current = recognition;
    recognitionModeRef.current = "command";

    let capturedTranscript = "";

    recognition.onstart = () => {
      setVoicePhase("command_listening");
    };

    recognition.onresult = (event) => {
      let interim = "";
      let finalChunk = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const chunk = event.results[i][0]?.transcript ?? "";
        if (event.results[i].isFinal) {
          finalChunk += chunk;
        } else {
          interim += chunk;
        }
      }
      const combined = (finalChunk || interim).trim();
      if (combined) {
        capturedTranscript = combined;
        setLiveTranscript(combined);
      }
      if (finalChunk.trim()) {
        recognitionModeRef.current = "idle";
        recognition.stop();
        void processVoiceCommand(finalChunk.trim(), false);
      }
    };

    recognition.onerror = (event) => {
      recognitionModeRef.current = "idle";
      setVoicePhase("idle");
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setVoiceError(
          "Microphone permission was denied by the browser. Please allow microphone access."
        );
      } else if (event.error !== "aborted" && event.error !== "no-speech") {
        setVoiceError(`Voice recognition error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      if (recognitionModeRef.current === "command") {
        recognitionModeRef.current = "idle";
        if (capturedTranscript) {
          void processVoiceCommand(capturedTranscript, false);
        } else {
          setVoicePhase("idle");
        }
      }
    };

    try {
      recognition.start();
    } catch {
      recognitionModeRef.current = "idle";
      setVoicePhase("idle");
    }
  }, [processVoiceCommand, stopVoiceRecognition]);

  // Continuous wake-word listening (ONLY after explicit user consent + toggle ON)
  useEffect(() => {
    const voice = settings.voiceAssistant;
    if (
      !voice.enabled ||
      !voice.consentGranted ||
      !voice.wakeWordListening ||
      !speechSupported ||
      activeCall !== null
    ) {
      if (recognitionModeRef.current === "wake") {
        stopVoiceRecognition();
      }
      return;
    }

    if (voicePhase === "command_listening" || voicePhase === "processing") {
      return;
    }

    const SpeechCtor = getSpeechRecognitionConstructor();
    if (!SpeechCtor) return;

    let stopped = false;
    let restartTimer: number | null = null;

    const launchWakeListener = () => {
      if (stopped) return;
      stopVoiceRecognition();

      const recognition = new SpeechCtor();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = voice.locale;
      recognitionRef.current = recognition;
      recognitionModeRef.current = "wake";

      recognition.onstart = () => {
        if (!stopped) setVoicePhase("wake_listening");
      };

      recognition.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i];
          const text = result[0]?.transcript?.trim() ?? "";
          if (!text) continue;

          const detection = detectWakeWord(text);
          if (detection.matched) {
            if (detection.commandAfterWakeWord.length >= 2 && result.isFinal) {
              stopped = true;
              void processVoiceCommand(text, false);
              return;
            }
            if (result.isFinal && !detection.commandAfterWakeWord) {
              stopped = true;
              setVoiceModalOpen(true);
              setToastNotice('Wake word detected: "Hey Good Chat"');
              startPushToTalk();
              return;
            }
          }
        }
      };

      recognition.onerror = (event) => {
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          stopped = true;
          setSettings((prev) => ({
            ...prev,
            voiceAssistant: { ...prev.voiceAssistant, wakeWordListening: false },
          }));
          setToastNotice("Microphone permission denied — wake word turned off");
        }
      };

      recognition.onend = () => {
        if (!stopped && recognitionModeRef.current === "wake") {
          restartTimer = window.setTimeout(launchWakeListener, 600);
        }
      };

      try {
        recognition.start();
      } catch {
        // Browser may throttle rapid restarts
      }
    };

    launchWakeListener();

    return () => {
      stopped = true;
      if (restartTimer !== null) window.clearTimeout(restartTimer);
      if (recognitionModeRef.current === "wake") {
        stopVoiceRecognition();
      }
    };
  }, [
    settings.voiceAssistant.enabled,
    settings.voiceAssistant.consentGranted,
    settings.voiceAssistant.wakeWordListening,
    settings.voiceAssistant.locale,
    speechSupported,
    activeCall,
    voicePhase,
    processVoiceCommand,
    startPushToTalk,
    stopVoiceRecognition,
  ]);

  function handleUpdateVoiceSettings(patch: Partial<AppSettings["voiceAssistant"]>) {
    if (patch.enabled === true && !settings.voiceAssistant.consentGranted) {
      setShowVoiceConsentModal(true);
      return;
    }
    if (patch.wakeWordListening === true && !settings.voiceAssistant.consentGranted) {
      setShowVoiceConsentModal(true);
      return;
    }
    if (patch.enabled === false) {
      stopVoiceRecognition();
      stopSpeaking();
      setIsSpeaking(false);
    }
    setSettings((prev) => ({
      ...prev,
      voiceAssistant: { ...prev.voiceAssistant, ...patch },
    }));
  }

  function handleVoiceButtonClick() {
    if (!settings.voiceAssistant.consentGranted || !settings.voiceAssistant.enabled) {
      setShowVoiceConsentModal(true);
      return;
    }
    setVoiceModalOpen(true);
  }

  function handleApproveVoiceConsent() {
    setSettings((prev) => ({
      ...prev,
      voiceAssistant: {
        ...prev.voiceAssistant,
        enabled: true,
        consentGranted: true,
      },
    }));
    setShowVoiceConsentModal(false);
    setVoiceModalOpen(true);
    setToastNotice("Good Chat AI Voice Assistant enabled");
  }

  function handlePickDisambiguatedContact(contact: Chat) {
    setSelectedTargetChat(contact);
    if (!voiceResult) return;

    if (voiceResult.intent === "open_chat") {
      setActiveTab("Chats");
      openChat(contact.id);
      setVoiceModalOpen(false);
      setToastNotice(`Opened chat with ${contact.name}`);
      return;
    }

    if (voiceResult.intent === "send_message") {
      setActiveTab("Chats");
      openChat(contact.id);
      if (!draftText.trim()) {
        void triggerDraftGeneration(
          contact,
          voiceResult.cleanedCommand || recognizedCommand,
          voiceResult.language
        );
      }
    }
  }

  function handleConfirmVoiceSendMessage() {
    if (!selectedTargetChat || !draftText.trim()) return;
    deliverMessage(draftText.trim(), undefined, selectedTargetChat.id);
    setActiveTab("Chats");
    setSelectedId(selectedTargetChat.id);
    setMobileChatOpen(true);
    setToastNotice(`Message sent to ${selectedTargetChat.name}`);
    setVoiceResult(null);
    setSelectedTargetChat(null);
    setDraftText("");
    setDraftAlternatives([]);
    setVoicePhase("idle");
    setVoiceModalOpen(false);
  }

  function handleConfirmVoiceCall(chat: Chat, type: "voice" | "video") {
    stopVoiceRecognition();
    stopSpeaking();
    setVoiceModalOpen(false);
    setVoiceResult(null);
    setSelectedTargetChat(null);
    setVoicePhase("idle");
    handleStartCall(chat.id, type);
  }

  function handleMarkAllUnreadRead() {
    setChats((prev) => prev.map((c) => (c.unread > 0 ? { ...c, unread: 0 } : c)));
    stopSpeaking();
    setIsSpeaking(false);
    setToastNotice("All messages marked as read");
  }

  const wallpaperClass =
    settings.wallpaper === "dots"
      ? "bg-[#F7F8FA] dark:bg-[#0B1117] chat-wallpaper-dots"
      : settings.wallpaper === "sage"
        ? "chat-wallpaper-sage"
        : "bg-[#F7F8FA] dark:bg-[#0B1117]";

  const storyContacts = statuses.filter((s) => !s.isMine);

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-[#F7F8FA] text-slate-900 dark:bg-[#0B1117] dark:text-slate-100">
      <main className="flex min-h-0 flex-1 w-full overflow-hidden">
        {/* ── LEFT SIDEBAR ───────────────────────────────────────────────── */}
        <aside
          className={`${
            mobileChatOpen ? "hidden md:flex" : "flex"
          } h-full w-full flex-col border-r border-slate-200/90 bg-white dark:border-slate-800 dark:bg-[#111821] md:w-[360px] lg:w-[392px] md:shrink-0`}
        >
          {/* Brand Header */}
          <header className="flex h-16 shrink-0 items-center justify-between gap-2.5 px-4 pt-1">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0D7A5F] font-semibold text-white shadow-xs dark:bg-[#109675]">
                <span className="font-[var(--font-display)] text-lg font-bold tracking-tight">
                  G
                </span>
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-[17px] font-bold tracking-tight text-slate-900 dark:text-white">
                  Good Chat
                </h1>
                <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                  Connect · Chat · Share
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <AppDownloadButton onClick={() => setShowAppDownloadModal(true)} />
              <VoiceMicButton
                enabled={
                  settings.voiceAssistant.enabled && settings.voiceAssistant.consentGranted
                }
                phase={voicePhase}
                onClick={handleVoiceButtonClick}
              />
              <button
                type="button"
                onClick={() => setShowNewChatModal(true)}
                title="New chat"
                aria-label="Start a new chat"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition-colors hover:bg-[#0D7A5F] hover:text-white focus-visible:outline-2 focus-visible:outline-[#0D7A5F] dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-[#109675]"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
          </header>

          {/* Compact AI Voice Listening Status Strip (visible when listening or recognized) */}
          {settings.voiceAssistant.enabled &&
            settings.voiceAssistant.consentGranted &&
            (voicePhase === "wake_listening" ||
              voicePhase === "command_listening" ||
              recognizedCommand) && (
              <div className="mx-4 mt-1 flex items-center justify-between gap-2 rounded-xl border border-indigo-200/80 bg-gradient-to-r from-blue-50 via-indigo-50 to-violet-50 px-3 py-1.5 text-[11px] dark:border-indigo-500/30 dark:from-blue-950/40 dark:via-indigo-950/40 dark:to-violet-950/40">
                <button
                  type="button"
                  onClick={() => setVoiceModalOpen(true)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      voicePhase === "wake_listening" || voicePhase === "command_listening"
                        ? "animate-pulse bg-indigo-600 dark:bg-indigo-400"
                        : "bg-blue-500"
                    }`}
                  />
                  <span className="truncate font-medium text-indigo-900 dark:text-indigo-200">
                    {voicePhase === "command_listening"
                      ? "Listening to your command…"
                      : voicePhase === "wake_listening"
                        ? 'Listening for "Hey Good Chat"…'
                        : `Last voice: "${recognizedCommand}"`}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setVoiceModalOpen(true)}
                  className="shrink-0 font-semibold text-indigo-600 hover:underline dark:text-indigo-300"
                >
                  Open
                </button>
              </div>
            )}

          {/* Search Box (shown on searchable tabs) */}
          {activeTab !== "Settings" && (
            <div className="shrink-0 px-4 pt-2 pb-2.5">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder={`Search ${activeTab.toLowerCase()}...`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-10 w-full rounded-xl bg-[#F1F4F8] pr-9 pl-10 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D7A5F]/25 dark:bg-[#18222F] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-[#1D2838] dark:focus:ring-[#14B88A]/30"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    aria-label="Clear search"
                    className="absolute top-1/2 right-2.5 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Section Heading & Contextual Filter */}
          <div className="flex shrink-0 items-center justify-between gap-2 px-4 pt-1 pb-2.5">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {activeTab}
            </h2>

            {activeTab === "Chats" && (
              <div className="flex items-center gap-1 rounded-lg bg-[#F1F4F8] p-0.5 dark:bg-[#18222F]">
                <button
                  type="button"
                  onClick={() => setChatFilter("all")}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                    chatFilter === "all"
                      ? "bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white"
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setChatFilter("unread")}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap tabular-nums ${
                    chatFilter === "unread"
                      ? "bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white"
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                  }`}
                >
                  Unread{totalUnread > 0 ? ` (${totalUnread})` : ""}
                </button>
              </div>
            )}

            {activeTab === "Updates" && (
              <button
                type="button"
                onClick={() => setShowCreateStatusModal(true)}
                className="text-xs font-medium text-[#0D7A5F] transition-colors hover:text-[#0A624C] dark:text-[#14B88A] whitespace-nowrap"
              >
                Add status
              </button>
            )}

            {activeTab === "Calls" && (
              <span className="text-xs text-slate-400 tabular-nums">{calls.length} recent</span>
            )}

            {activeTab === "Communities" && (
              <span className="text-xs text-slate-400 tabular-nums">
                {communities.filter((c) => c.joined).length} joined
              </span>
            )}
          </div>

          {/* ── TAB BODY ─────────────────────────────────────────────────── */}
          {activeTab === "Chats" && (
            <>
              {/* Stories / Status Row */}
              <div className="no-scrollbar flex shrink-0 items-start gap-3.5 overflow-x-auto border-b border-slate-100 px-4 pt-1 pb-3.5 dark:border-slate-800/80">
                {/* My Status */}
                <button
                  type="button"
                  onClick={() => {
                    if (myStatus) {
                      const idx = statuses.findIndex((s) => s.id === myStatus.id);
                      if (idx >= 0) setActiveStatusIndex(idx);
                    } else {
                      setShowCreateStatusModal(true);
                    }
                  }}
                  className="group flex w-14 shrink-0 flex-col items-center gap-1.5 text-center"
                >
                  <div className="relative flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-slate-300 bg-slate-50 text-slate-600 transition-colors group-hover:border-[#0D7A5F] group-hover:text-[#0D7A5F] dark:border-slate-600 dark:bg-slate-800/70 dark:text-slate-300">
                    {myStatus ? (
                      <Avatar
                        label={myStatus.avatar}
                        color={myStatus.color}
                        size="lg"
                        ring="active"
                      />
                    ) : (
                      <Plus className="h-5 w-5" />
                    )}
                  </div>
                  <span className="w-full truncate text-[11px] font-medium text-slate-600 dark:text-slate-400">
                    My Status
                  </span>
                </button>

                {storyContacts.map((st) => {
                  const statusIndex = statuses.findIndex((item) => item.id === st.id);
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setActiveStatusIndex(statusIndex)}
                      className="group flex w-14 shrink-0 flex-col items-center gap-1.5 text-center"
                    >
                      <Avatar
                        label={st.avatar}
                        color={st.color}
                        size="lg"
                        ring={st.viewed ? "viewed" : "active"}
                      />
                      <span className="w-full truncate text-[11px] font-medium text-slate-700 transition-colors group-hover:text-slate-950 dark:text-slate-300 dark:group-hover:text-white">
                        {st.shortName}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Chat List */}
              <div className="thin-scrollbar flex-1 overflow-y-auto px-2.5 py-2">
                {filteredChats.length > 0 ? (
                  <div className="space-y-0.5">
                    {filteredChats.map((chat) => {
                      const isActive = selectedId === chat.id;
                      return (
                        <button
                          key={chat.id}
                          type="button"
                          onClick={() => openChat(chat.id)}
                          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                            isActive
                              ? "bg-[#E6F4EF] dark:bg-[#14362D]/80"
                              : "hover:bg-slate-100/80 dark:hover:bg-slate-800/60"
                          }`}
                        >
                          <Avatar
                            label={chat.avatar}
                            color={chat.color}
                            size="lg"
                            online={chat.online}
                          />

                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline justify-between gap-2">
                              <div className="flex min-w-0 items-center gap-1.5">
                                <strong
                                  className={`truncate text-[14.5px] font-semibold ${
                                    isActive
                                      ? "text-[#084C3B] dark:text-[#A5F3D8]"
                                      : "text-slate-900 dark:text-slate-100"
                                  }`}
                                >
                                  {chat.name}
                                </strong>
                                {chat.pinned && (
                                  <Pin className="h-3 w-3 shrink-0 text-slate-400" />
                                )}
                                {chat.muted && (
                                  <BellOff className="h-3 w-3 shrink-0 text-slate-400" />
                                )}
                              </div>
                              <time
                                className={`shrink-0 text-[11px] tabular-nums ${
                                  chat.unread > 0
                                    ? "font-semibold text-[#0D7A5F] dark:text-[#14B88A]"
                                    : "text-slate-400 dark:text-slate-500"
                                }`}
                              >
                                {chat.time}
                              </time>
                            </div>

                            <div className="mt-0.5 flex items-center justify-between gap-2">
                              <span
                                className={`truncate text-[13px] ${
                                  chat.unread > 0
                                    ? "font-medium text-slate-800 dark:text-slate-200"
                                    : "text-slate-500 dark:text-slate-400"
                                }`}
                              >
                                {chat.message}
                              </span>

                              {chat.unread > 0 && (
                                <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#0D7A5F] px-1.5 text-[11px] font-semibold text-white tabular-nums dark:bg-[#109675]">
                                  {chat.unread}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
                    <MessageSquare className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                    <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                      No chats found
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {chatFilter === "unread"
                        ? "You're all caught up on unread messages."
                        : "Try a different name or start a new conversation."}
                    </p>
                    {chatFilter === "unread" && (
                      <button
                        type="button"
                        onClick={() => setChatFilter("all")}
                        className="mt-3 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
                      >
                        Show all chats
                      </button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === "Calls" && (
            <CallsPanel
              calls={calls}
              search={search}
              onStartCall={handleStartCall}
              onOpenChat={(id) => {
                setActiveTab("Chats");
                openChat(id);
              }}
            />
          )}

          {activeTab === "Communities" && (
            <CommunitiesPanel
              communities={communities}
              search={search}
              onToggleJoin={(id) => {
                setCommunities((prev) =>
                  prev.map((c) =>
                    c.id === id
                      ? {
                          ...c,
                          joined: !c.joined,
                          membersCount: c.joined ? c.membersCount - 1 : c.membersCount + 1,
                        }
                      : c
                  )
                );
              }}
              onOpenCommunityChat={handleOpenCommunityChat}
            />
          )}

          {activeTab === "Updates" && (
            <UpdatesPanel
              statuses={statuses}
              myStatus={myStatus}
              search={search}
              onOpenStatus={(idx) => setActiveStatusIndex(idx)}
              onCreateStatus={() => setShowCreateStatusModal(true)}
            />
          )}

          {activeTab === "Settings" && (
            <SettingsPanel
              settings={settings}
              onUpdateSettings={(patch) => setSettings((prev) => ({ ...prev, ...patch }))}
              onUpdateVoiceSettings={handleUpdateVoiceSettings}
              onOpenVoiceAssistant={handleVoiceButtonClick}
              onOpenAppDownload={() => setShowAppDownloadModal(true)}
            />
          )}

          {/* Bottom Navigation Bar */}
          <nav
            aria-label="Primary sections"
            className="grid h-16 shrink-0 grid-cols-5 border-t border-slate-200/90 bg-white/95 backdrop-blur-md dark:border-slate-800 dark:bg-[#111821]/95"
          >
            {NAV_ITEMS.map(({ name, icon: Icon }) => {
              const active = activeTab === name;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => {
                    setActiveTab(name);
                    setSearch("");
                    setMobileChatOpen(false);
                  }}
                  className={`relative flex min-h-[44px] flex-col items-center justify-center gap-1 transition-colors ${
                    active
                      ? "text-[#0D7A5F] dark:text-[#14B88A]"
                      : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  <span className="relative">
                    <Icon className="h-[20px] w-[20px]" />
                    {name === "Chats" && totalUnread > 0 && (
                      <span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#0D7A5F] px-1 text-[10px] font-bold text-white tabular-nums dark:bg-[#109675]">
                        {totalUnread}
                      </span>
                    )}
                  </span>
                  <span className="text-[10.5px] font-medium tracking-tight whitespace-nowrap">
                    {name}
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* ── MAIN CONVERSATION PANE ─────────────────────────────────────── */}
        <section
          className={`${
            mobileChatOpen ? "flex" : "hidden md:flex"
          } relative min-w-0 flex-1 flex-col`}
        >
          {selectedChat ? (
            <div className="flex h-full min-w-0 flex-1">
              {/* Chat Column */}
              <div className="flex min-w-0 flex-1 flex-col">
                {/* Conversation Header */}
                <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-slate-200/90 bg-white px-3 dark:border-slate-800 dark:bg-[#111821] md:px-5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setMobileChatOpen(false)}
                      aria-label="Back to chats"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 md:hidden"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowInfoDrawer((v) => !v)}
                      className="flex min-w-0 items-center gap-3 rounded-xl py-1 pr-2 text-left transition-colors hover:bg-slate-100/70 dark:hover:bg-slate-800/60"
                    >
                      <Avatar
                        label={selectedChat.avatar}
                        color={selectedChat.color}
                        size="md"
                        online={selectedChat.online}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-semibold text-slate-900 dark:text-white">
                          {selectedChat.name}
                        </p>
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                          {selectedChat.isGroup
                            ? `${selectedChat.members?.join(", ") ?? "Group chat"}`
                            : selectedChat.online
                              ? "Online"
                              : "Tap for contact info"}
                        </p>
                      </div>
                    </button>
                  </div>

                  {/* Header Actions */}
                  <div className="relative flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleStartCall(selectedChat.id, "voice")}
                      title="Voice call"
                      aria-label="Start voice call"
                      className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100 hover:text-[#0D7A5F] dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-[#14B88A]"
                    >
                      <Phone className="h-[18px] w-[18px]" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStartCall(selectedChat.id, "video")}
                      title="Video call"
                      aria-label="Start video call"
                      className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100 hover:text-[#0D7A5F] dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-[#14B88A]"
                    >
                      <Video className="h-[18px] w-[18px]" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setInChatSearchOpen((v) => !v);
                        setInChatQuery("");
                      }}
                      title="Search messages"
                      aria-label="Search in conversation"
                      className={`hidden h-10 w-10 items-center justify-center rounded-xl transition-colors sm:flex ${
                        inChatSearchOpen
                          ? "bg-emerald-50 text-[#0D7A5F] dark:bg-emerald-950/60 dark:text-[#14B88A]"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                      }`}
                    >
                      <Search className="h-[18px] w-[18px]" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowMoreMenu((v) => !v)}
                      title="More options"
                      aria-label="More options"
                      className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <MoreVertical className="h-[18px] w-[18px]" />
                    </button>

                    {/* More Options Dropdown */}
                    {showMoreMenu && (
                      <div className="absolute top-12 right-0 z-30 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg dark:border-slate-700 dark:bg-[#161F2B]">
                        <button
                          type="button"
                          onClick={() => {
                            setShowInfoDrawer(true);
                            setShowMoreMenu(false);
                          }}
                          className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          <Info className="h-4 w-4 text-slate-400" />
                          <span>{selectedChat.isGroup ? "Group info" : "Contact info"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setInChatSearchOpen(true);
                            setShowMoreMenu(false);
                          }}
                          className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          <Search className="h-4 w-4 text-slate-400" />
                          <span>Search messages</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleTogglePin(selectedChat.id);
                            setShowMoreMenu(false);
                          }}
                          className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          <Pin className="h-4 w-4 text-slate-400" />
                          <span>{selectedChat.pinned ? "Unpin chat" : "Pin chat"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleToggleMute(selectedChat.id);
                            setShowMoreMenu(false);
                          }}
                          className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          <BellOff className="h-4 w-4 text-slate-400" />
                          <span>{selectedChat.muted ? "Unmute" : "Mute notifications"}</span>
                        </button>
                        <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                        <button
                          type="button"
                          onClick={() => handleClearMessages(selectedChat.id)}
                          className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span>Clear messages</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedId(null);
                            setMobileChatOpen(false);
                            setShowInfoDrawer(false);
                            setShowMoreMenu(false);
                          }}
                          className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                        >
                          <X className="h-4 w-4" />
                          <span>Close chat</span>
                        </button>
                      </div>
                    )}
                  </div>
                </header>

                {/* In-Chat Search Strip */}
                {inChatSearchOpen && (
                  <div className="flex items-center gap-2 border-b border-slate-200/80 bg-white/90 px-4 py-2 dark:border-slate-800 dark:bg-[#111821]/90">
                    <Search className="h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={inChatQuery}
                      onChange={(e) => setInChatQuery(e.target.value)}
                      placeholder="Find in this conversation..."
                      autoFocus
                      className="h-8 flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-slate-100"
                    />
                    <span className="text-xs text-slate-400 tabular-nums">
                      {displayedMessages.length} found
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setInChatSearchOpen(false);
                        setInChatQuery("");
                      }}
                      aria-label="Close search"
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {/* Messages Viewport */}
                <div
                  onClick={() => {
                    setShowMoreMenu(false);
                    setShowEmojiPicker(false);
                    setShowAttachMenu(false);
                  }}
                  className={`thin-scrollbar flex-1 overflow-y-auto px-4 py-5 md:px-8 ${wallpaperClass}`}
                >
                  <div className="mx-auto flex max-w-3xl flex-col gap-3">
                    {/* Date Divider */}
                    <div className="my-2 flex items-center justify-center gap-3">
                      <span className="h-px flex-1 bg-slate-200/80 dark:bg-slate-800" />
                      <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                        Today
                      </span>
                      <span className="h-px flex-1 bg-slate-200/80 dark:bg-slate-800" />
                    </div>

                    {displayedMessages.length === 0 ? (
                      <div className="my-12 text-center">
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                          {inChatQuery
                            ? `No messages match "${inChatQuery}"`
                            : `Say hello to ${selectedChat.name}`}
                        </p>
                      </div>
                    ) : (
                      displayedMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`group flex items-end gap-2 ${
                            msg.mine ? "justify-end" : "justify-start"
                          }`}
                        >
                          {/* Left-side hover actions for outgoing messages */}
                          {msg.mine && (
                            <div className="mb-1 hidden items-center gap-0.5 rounded-lg border border-slate-200/80 bg-white px-1 py-0.5 opacity-0 shadow-xs transition-opacity group-hover:opacity-100 dark:border-slate-700 dark:bg-[#161F2B] sm:flex">
                              {REACTION_EMOJIS.slice(0, 3).map((em) => (
                                <button
                                  key={em}
                                  type="button"
                                  onClick={() => handleToggleReaction(msg.id, em)}
                                  className="flex h-6 w-6 items-center justify-center rounded text-xs transition-transform hover:scale-115 hover:bg-slate-100 dark:hover:bg-slate-800"
                                >
                                  {em}
                                </button>
                              ))}
                              <button
                                type="button"
                                onClick={() => {
                                  setReplyingTo({
                                    sender: "You",
                                    text: msg.text || "Attachment",
                                  });
                                  inputRef.current?.focus();
                                }}
                                aria-label="Reply to message"
                                className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                              >
                                <CornerUpLeft className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}

                          {/* Message Bubble */}
                          <div className="relative max-w-[82%] sm:max-w-[70%]">
                            <div
                              className={`rounded-2xl px-3.5 py-2.5 text-[14.5px] leading-relaxed ${
                                msg.mine
                                  ? "rounded-br-md bg-[#0D7A5F] text-white dark:bg-[#109675]"
                                  : "rounded-bl-md border border-slate-200/80 bg-white text-slate-900 dark:border-slate-800 dark:bg-[#18222F] dark:text-slate-100"
                              }`}
                            >
                              {/* Group sender name */}
                              {!msg.mine && msg.senderName && (
                                <p className="mb-1 text-xs font-semibold text-[#0D7A5F] dark:text-[#14B88A]">
                                  {msg.senderName}
                                </p>
                              )}

                              {/* Quoted Reply */}
                              {msg.replyTo && (
                                <div
                                  className={`mb-2 rounded-lg px-2.5 py-1.5 text-xs ${
                                    msg.mine
                                      ? "bg-black/15 text-white/90"
                                      : "bg-slate-100 text-slate-600 dark:bg-slate-800/90 dark:text-slate-300"
                                  }`}
                                >
                                  <p className="font-semibold">{msg.replyTo.sender}</p>
                                  <p className="truncate opacity-85">{msg.replyTo.text}</p>
                                </div>
                              )}

                              {/* Attachment: Image */}
                              {msg.attachment?.type === "image" && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setLightboxImage({
                                      url:
                                        msg.attachment!.type === "image"
                                          ? msg.attachment!.url
                                          : "",
                                      caption:
                                        msg.attachment!.type === "image"
                                          ? msg.attachment!.caption
                                          : undefined,
                                    })
                                  }
                                  className="mb-2 block w-full overflow-hidden rounded-xl"
                                >
                                  <img
                                    src={msg.attachment.url}
                                    alt={msg.attachment.caption ?? "Shared photo"}
                                    referrerPolicy="no-referrer"
                                    className="max-h-64 w-full object-cover transition-transform duration-200 hover:scale-[1.02]"
                                  />
                                </button>
                              )}

                              {/* Attachment: File */}
                              {msg.attachment?.type === "file" && (
                                <div
                                  className={`mb-2 flex items-center gap-3 rounded-xl px-3 py-2.5 ${
                                    msg.mine
                                      ? "bg-black/15 text-white"
                                      : "bg-slate-100 text-slate-800 dark:bg-slate-800/80 dark:text-slate-100"
                                  }`}
                                >
                                  <div
                                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                                      msg.mine
                                        ? "bg-white/20 text-white"
                                        : "bg-white text-[#0D7A5F] dark:bg-slate-700 dark:text-[#14B88A]"
                                    }`}
                                  >
                                    <FileText className="h-4 w-4" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs font-semibold">
                                      {msg.attachment.name}
                                    </p>
                                    <p className="text-[11px] opacity-75 tabular-nums">
                                      {msg.attachment.size}
                                    </p>
                                  </div>
                                </div>
                              )}

                              {/* Attachment: Static Location */}
                              {msg.attachment?.type === "location" && (
                                <div
                                  className={`mb-2 flex items-center gap-3 rounded-xl px-3 py-2.5 ${
                                    msg.mine
                                      ? "bg-black/15 text-white"
                                      : "bg-slate-100 text-slate-800 dark:bg-slate-800/80 dark:text-slate-100"
                                  }`}
                                >
                                  <div
                                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                                      msg.mine
                                        ? "bg-white/20 text-white"
                                        : "bg-white text-[#0D7A5F] dark:bg-slate-700 dark:text-[#14B88A]"
                                    }`}
                                  >
                                    <MapPin className="h-4 w-4" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs font-semibold">
                                      {msg.attachment.label}
                                    </p>
                                    <p className="truncate text-[11px] opacity-80">
                                      {msg.attachment.address}
                                    </p>
                                  </div>
                                </div>
                              )}

                              {/* Message Text + Inline Timestamp */}
                              <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
                                {msg.text && (
                                  <span className="break-words whitespace-pre-wrap">
                                    {msg.text}
                                  </span>
                                )}
                                <span
                                  className={`ml-auto inline-flex items-center gap-1 text-[11px] tabular-nums ${
                                    msg.mine
                                      ? "text-white/75"
                                      : "text-slate-400 dark:text-slate-500"
                                  }`}
                                >
                                  <span>{msg.time}</span>
                                  {msg.mine &&
                                    (settings.readReceipts && msg.status === "read" ? (
                                      <CheckCheck className="h-3.5 w-3.5 text-emerald-200" />
                                    ) : (
                                      <Check className="h-3.5 w-3.5" />
                                    ))}
                                </span>
                              </div>
                            </div>

                            {/* Reaction chip */}
                            {msg.reaction && (
                              <button
                                type="button"
                                onClick={() => handleToggleReaction(msg.id, msg.reaction!)}
                                aria-label="Remove reaction"
                                className={`absolute -bottom-2.5 ${
                                  msg.mine ? "left-2" : "right-2"
                                } flex h-6 items-center justify-center rounded-full border border-slate-200 bg-white px-1.5 text-xs shadow-xs dark:border-slate-700 dark:bg-[#161F2B]`}
                              >
                                {msg.reaction}
                              </button>
                            )}
                          </div>

                          {/* Right-side hover actions for incoming messages */}
                          {!msg.mine && (
                            <div className="mb-1 hidden items-center gap-0.5 rounded-lg border border-slate-200/80 bg-white px-1 py-0.5 opacity-0 shadow-xs transition-opacity group-hover:opacity-100 dark:border-slate-700 dark:bg-[#161F2B] sm:flex">
                              {REACTION_EMOJIS.slice(0, 3).map((em) => (
                                <button
                                  key={em}
                                  type="button"
                                  onClick={() => handleToggleReaction(msg.id, em)}
                                  className="flex h-6 w-6 items-center justify-center rounded text-xs transition-transform hover:scale-115 hover:bg-slate-100 dark:hover:bg-slate-800"
                                >
                                  {em}
                                </button>
                              ))}
                              <button
                                type="button"
                                onClick={() => {
                                  setReplyingTo({
                                    sender: msg.senderName ?? selectedChat.name,
                                    text: msg.text || "Attachment",
                                  });
                                  inputRef.current?.focus();
                                }}
                                aria-label="Reply to message"
                                className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                              >
                                <CornerUpLeft className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </div>

                {/* Reply Preview Bar */}
                {replyingTo && (
                  <div className="flex items-center justify-between gap-3 border-t border-slate-200/90 bg-slate-50 px-4 py-2 dark:border-slate-800 dark:bg-[#141D28] md:px-6">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-[#0D7A5F] dark:text-[#14B88A]">
                        Replying to {replyingTo.sender}
                      </p>
                      <p className="truncate text-xs text-slate-600 dark:text-slate-400">
                        {replyingTo.text}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReplyingTo(null)}
                      aria-label="Cancel reply"
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {/* Message Composer */}
                <div className="relative shrink-0 border-t border-slate-200/90 bg-white px-3 py-3 dark:border-slate-800 dark:bg-[#111821] md:px-5">
                  {/* Attachment Popover */}
                  {showAttachMenu && (
                    <div className="absolute bottom-18 left-3 z-30 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-[#161F2B] md:left-5">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        <ImageIcon className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                        <span>Upload Photo or File</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          deliverMessage("Check out this café spot!", {
                            type: "image",
                            url: PRIYA_CAFE_PHOTO,
                            caption: "Coffee & sketchbook table",
                          })
                        }
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        <ImageIcon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        <span>Send Quick Photo</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          deliverMessage("", {
                            type: "file",
                            name: "Weekend_Itinerary.pdf",
                            size: "840 KB",
                          })
                        }
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        <FileText className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        <span>Share Document</span>
                      </button>
                    </div>
                  )}

                  {/* Emoji Popover */}
                  {showEmojiPicker && (
                    <div className="absolute right-14 bottom-18 z-30 w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-[#161F2B]">
                      <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                        Quick Emojis
                      </p>
                      <div className="grid grid-cols-8 gap-1">
                        {QUICK_EMOJIS.map((em) => (
                          <button
                            key={em}
                            type="button"
                            onClick={() => {
                              setMessageText((prev) => prev + em);
                              inputRef.current?.focus();
                            }}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-base transition-transform hover:scale-115 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            {em}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileSelected}
                  />

                  <form
                    onSubmit={handleSendSubmit}
                    className="mx-auto flex max-w-3xl items-center gap-2"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setShowAttachMenu((v) => !v);
                        setShowEmojiPicker(false);
                      }}
                      title="Attach file or photo"
                      aria-label="Attach"
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors ${
                        showAttachMenu
                          ? "bg-emerald-50 text-[#0D7A5F] dark:bg-emerald-950/60 dark:text-[#14B88A]"
                          : "text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                      }`}
                    >
                      <Plus className="h-5 w-5" />
                    </button>

                    <input
                      ref={inputRef}
                      type="text"
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !settings.enterToSend) {
                          e.preventDefault();
                        }
                      }}
                      placeholder="Type a message..."
                      className="h-11 flex-1 rounded-xl bg-[#F1F4F8] px-4 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D7A5F]/25 dark:bg-[#18222F] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-[#1D2838] dark:focus:ring-[#14B88A]/30"
                    />

                    <button
                      type="button"
                      onClick={() => {
                        setShowEmojiPicker((v) => !v);
                        setShowAttachMenu(false);
                      }}
                      title="Insert emoji"
                      aria-label="Emoji picker"
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors ${
                        showEmojiPicker
                          ? "bg-emerald-50 text-[#0D7A5F] dark:bg-emerald-950/60 dark:text-[#14B88A]"
                          : "text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                      }`}
                    >
                      <Smile className="h-5 w-5" />
                    </button>

                    <button
                      type="submit"
                      disabled={!messageText.trim()}
                      aria-label="Send message"
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0D7A5F] text-white transition-colors hover:bg-[#0A624C] disabled:opacity-40 dark:bg-[#109675] dark:hover:bg-[#0D7A5F]"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </form>
                </div>
              </div>

              {/* Contact Info Right Drawer */}
              {showInfoDrawer && (
                <div className="fixed inset-0 z-40 flex justify-end bg-slate-950/40 backdrop-blur-xs lg:static lg:z-auto lg:bg-transparent lg:backdrop-blur-none">
                  <div className="h-full w-full max-w-sm lg:w-auto lg:max-w-none">
                    <ContactInfoDrawer
                      chat={selectedChat}
                      onClose={() => setShowInfoDrawer(false)}
                      onStartCall={(type) => handleStartCall(selectedChat.id, type)}
                      onToggleMute={() => handleToggleMute(selectedChat.id)}
                      onTogglePin={() => handleTogglePin(selectedChat.id)}
                      onClearMessages={() => handleClearMessages(selectedChat.id)}
                      onPreviewImage={(url, caption) => setLightboxImage({ url, caption })}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Welcome Empty State */
            <div
              className={`flex flex-1 flex-col items-center justify-center px-6 text-center ${wallpaperClass}`}
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0D7A5F] text-2xl font-bold text-white shadow-sm dark:bg-[#109675]">
                G
              </div>
              <h2 className="mt-5 text-balance text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Welcome to Good Chat
              </h2>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                Select a conversation from the sidebar, start a new chat, or use the AI Voice
                Assistant to connect with your contacts.
              </p>
              <button
                type="button"
                onClick={() => setShowNewChatModal(true)}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#0D7A5F] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#0A624C] dark:bg-[#109675]"
              >
                <Plus className="h-4 w-4" />
                <span>Start New Chat</span>
              </button>
            </div>
          )}
        </section>
      </main>

      {/* ── MODALS & OVERLAYS ────────────────────────────────────────────── */}

      {/* AI Voice Consent Modal */}
      {showVoiceConsentModal && (
        <VoiceConsentModal
          onApprove={handleApproveVoiceConsent}
          onDecline={() => setShowVoiceConsentModal(false)}
        />
      )}

      {/* Futuristic Blue-Purple AI Voice Assistant Overlay */}
      <VoiceAssistantOverlay
        open={voiceModalOpen}
        enabled={settings.voiceAssistant.enabled}
        consentGranted={settings.voiceAssistant.consentGranted}
        wakeWordListening={settings.voiceAssistant.wakeWordListening}
        speechSupported={speechSupported}
        phase={voicePhase}
        liveTranscript={liveTranscript}
        recognizedCommand={recognizedCommand}
        lastResult={voiceResult}
        matchedContacts={matchedContacts}
        selectedTargetChat={selectedTargetChat}
        draftText={draftText}
        draftAlternatives={draftAlternatives}
        isDrafting={isDrafting}
        isSpeaking={isSpeaking}
        errorMessage={voiceError}
        unreadChats={unreadChats}
        onClose={() => {
          setVoiceModalOpen(false);
          stopSpeaking();
          setIsSpeaking(false);
          if (recognitionModeRef.current === "command") {
            stopVoiceRecognition();
          }
        }}
        onStartPushToTalk={startPushToTalk}
        onStopListening={stopVoiceRecognition}
        onToggleWakeWord={() =>
          handleUpdateVoiceSettings({
            wakeWordListening: !settings.voiceAssistant.wakeWordListening,
          })
        }
        onSubmitCommandText={(cmd) => void processVoiceCommand(cmd, false)}
        onPickDisambiguatedContact={handlePickDisambiguatedContact}
        onDraftTextChange={setDraftText}
        onRegenerateDraft={(instruction) => {
          if (!selectedTargetChat) return;
          void triggerDraftGeneration(
            selectedTargetChat,
            instruction,
            voiceResult?.language ?? "hinglish"
          );
        }}
        onConfirmSendMessage={handleConfirmVoiceSendMessage}
        onConfirmCall={handleConfirmVoiceCall}
        onOpenChat={(id) => {
          setActiveTab("Chats");
          openChat(id);
        }}
        onSpeakUnread={speakUnreadSummary}
        onStopSpeaking={() => {
          stopSpeaking();
          setIsSpeaking(false);
          setVoicePhase("idle");
        }}
        onMarkAllRead={handleMarkAllUnreadRead}
        onCancelPendingAction={() => {
          setVoiceResult(null);
          setSelectedTargetChat(null);
          setMatchedContacts([]);
          setDraftText("");
          setDraftAlternatives([]);
          setVoicePhase("idle");
        }}
        onRequestEnable={() => setShowVoiceConsentModal(true)}
      />

      {showNewChatModal && (
        <NewChatModal
          existingNames={chats.map((c) => c.name)}
          onClose={() => setShowNewChatModal(false)}
          onCreateChat={handleCreateChat}
        />
      )}

      {showCreateStatusModal && (
        <CreateStatusModal
          onClose={() => setShowCreateStatusModal(false)}
          onPublish={handlePublishStatus}
        />
      )}

      {activeStatusIndex !== null && (
        <StatusViewerModal
          statuses={statuses}
          activeIndex={activeStatusIndex}
          onClose={() => setActiveStatusIndex(null)}
          onSelectIndex={setActiveStatusIndex}
          onMarkViewed={(id) =>
            setStatuses((prev) => prev.map((s) => (s.id === id ? { ...s, viewed: true } : s)))
          }
          onReply={handleReplyToStatus}
        />
      )}

      {activeCall && (
        <CallOverlay
          chat={activeCall.chat}
          callType={activeCall.type}
          onEndCall={handleEndCall}
        />
      )}

      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
        >
          <button
            type="button"
            onClick={() => setLightboxImage(null)}
            aria-label="Close preview"
            className="absolute top-5 right-5 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-full max-w-3xl flex-col items-center"
          >
            <img
              src={lightboxImage.url}
              alt={lightboxImage.caption ?? "Shared photo"}
              referrerPolicy="no-referrer"
              className="max-h-[78vh] w-auto rounded-2xl object-contain shadow-2xl"
            />
            {lightboxImage.caption && (
              <p className="mt-4 text-sm font-medium text-white/90">{lightboxImage.caption}</p>
            )}
          </div>
        </div>
      )}

      {/* Android App & APK Download Modal */}
      <AppDownloadModal
        open={showAppDownloadModal}
        onClose={() => setShowAppDownloadModal(false)}
        onNotify={setToastNotice}
      />

      {/* Offline Status Indicator */}
      <OfflineIndicator />

      {/* Subtle Transient Toast */}
      {toastNotice && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-medium text-white shadow-lg dark:bg-slate-100 dark:text-slate-900"
        >
          {toastNotice}
        </div>
      )}
    </div>
  );
}
