import "dotenv/config";
import express, { type Request, type Response } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const GEMINI_MODEL = "gemini-4-hydrogen";

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not configured. Please add your Gemini API key in Settings > Secrets."
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

type ContactSummary = {
  id: number;
  name: string;
  isGroup?: boolean;
  unread?: number;
  about?: string;
};

type UnreadItem = {
  chatId: number;
  name: string;
  unread: number;
  messages: string[];
};

function sanitizeContacts(raw: unknown): ContactSummary[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, 60)
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    .map((item) => ({
      id: typeof item.id === "number" ? item.id : -1,
      name: typeof item.name === "string" ? item.name.slice(0, 80) : "",
      isGroup: Boolean(item.isGroup),
      unread: typeof item.unread === "number" ? Math.max(0, item.unread) : 0,
      about: typeof item.about === "string" ? item.about.slice(0, 120) : "",
    }))
    .filter((c) => c.id >= 0 && c.name.length > 0);
}

function sanitizeUnread(raw: unknown): UnreadItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, 20)
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    .map((item) => ({
      chatId: typeof item.chatId === "number" ? item.chatId : -1,
      name: typeof item.name === "string" ? item.name.slice(0, 80) : "",
      unread: typeof item.unread === "number" ? Math.max(0, item.unread) : 0,
      messages: Array.isArray(item.messages)
        ? item.messages
            .filter((m): m is string => typeof m === "string")
            .slice(0, 5)
            .map((m) => m.slice(0, 240))
        : [],
    }))
    .filter((u) => u.chatId >= 0 && u.name.length > 0);
}

function mapGeminiError(err: unknown): { status: number; message: string } {
  const rawMessage = err instanceof Error ? err.message : "Unknown Gemini API error";
  if (rawMessage.includes("GEMINI_API_KEY is not configured")) {
    return { status: 503, message: rawMessage };
  }
  if (rawMessage.includes("API_KEY_INVALID") || rawMessage.includes("PERMISSION_DENIED")) {
    return {
      status: 403,
      message:
        "Gemini API key was rejected. Please check your key in the Settings > Secrets panel.",
    };
  }
  if (rawMessage.includes("RESOURCE_EXHAUSTED") || rawMessage.includes("429")) {
    return {
      status: 429,
      message:
        "Gemini API quota limit reached. Please wait a moment or check your billing quota in Settings > Secrets.",
    };
  }
  return {
    status: 502,
    message: `Voice AI service error: ${rawMessage}`,
  };
}

async function createServer() {
  const app = express();
  app.use(express.json({ limit: "64kb" }));

  // Allow Capacitor Android WebView origins (https://localhost, capacitor://localhost) to call /api/*
  app.use("/api", (req: Request, res: Response, next) => {
    const origin = req.headers.origin;
    if (
      origin &&
      (origin === "https://localhost" ||
        origin === "http://localhost" ||
        origin === "capacitor://localhost" ||
        origin.startsWith("http://localhost:") ||
        origin.startsWith("https://localhost:"))
    ) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      if (req.method === "OPTIONS") {
        res.status(204).end();
        return;
      }
    }
    next();
  });

  // Health endpoint
  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ ok: true, model: GEMINI_MODEL });
  });

  // Expose optional hosted Android APK URL, GitHub Repo URL, and public App URL
  app.get("/api/app/apk-info", (_req: Request, res: Response) => {
    const directApkUrl = (process.env.ANDROID_APK_URL || "").trim();
    const githubRepoUrl = (process.env.GITHUB_REPO_URL || "").trim().replace(/\/+$/, "");
    const appUrl = (process.env.APP_URL || "").trim();
    res.json({
      directApkUrl,
      githubRepoUrl,
      githubActionsReady: true,
      appUrl,
    });
  });

  // Interpret Hindi, English, or Hinglish voice commands against actual Good Chat contacts
  app.post("/api/voice/interpret", async (req: Request, res: Response) => {
    try {
      const transcript =
        typeof req.body?.transcript === "string" ? req.body.transcript.trim().slice(0, 500) : "";
      const requireWakeWord = Boolean(req.body?.requireWakeWord);
      const contacts = sanitizeContacts(req.body?.contacts);
      const unreadSummary = sanitizeUnread(req.body?.unreadSummary);

      if (!transcript) {
        res.status(400).json({ error: "Voice transcript is required." });
        return;
      }

      const ai = getGeminiClient();

      const systemInstruction = `You are the Good Chat AI Voice Assistant.
You understand Hindi (Devanagari or Romanized), English, and Hinglish commands accurately.

Wake words (case-insensitive, tolerate minor speech-to-text typos like "hey god chat", "he good chat", "goodchat"):
- "Hey Good Chat"
- "Hey God Chat"
- "Good Chat"

Supported intents:
1. "voice_call": User wants to start a voice call (e.g., "Rahul ko call karo", "Call Rahul", "Rahul ko phone lagao").
2. "video_call": User wants to start a video call (e.g., "Amit ko video call karo", "Video call Priya").
3. "send_message": User wants to send a message (e.g., "Rahul ko message bhejo", "Message Priya saying I am on my way", "Rahul ko bol do main 5 minute mein aa raha hoon").
4. "read_unread": User wants to hear/read unread messages (e.g., "meri unread messages padho", "read my unread messages", "koi naya message aaya hai kya").
5. "open_chat": User wants to open an existing chat (e.g., "Rahul ka chat kholo", "Open Amit's chat", "Family group dikhao").
6. "unknown": Command is unclear or unsupported.

Strict Rules:
- Match target contacts ONLY against the provided Good Chat contacts list.
- If the spoken name matches multiple contacts (for example, "Rahul" when both "Rahul Sharma" and "Rahul Verma" exist, or "Group" when multiple groups exist), return ALL matching contact IDs in matchedContactIds and set needsDisambiguation=true.
- If the spoken name matches no contact in the list, set matchedContactIds=[] and explain politely in assistantReply.
- For "voice_call", "video_call", and "send_message", ALWAYS set requiresConfirmation=true because sensitive actions require explicit user confirmation.
- For "send_message", if the user included message content or topic, write a clean, natural draft in messageDraft matching the user's language (Hindi/Hinglish/English). If they only said "Rahul ko message bhejo" without specific text, draft a polite, brief opener like "Hey Rahul, hope you're doing well!" (or Hinglish equivalent matching their tone) so they can review or edit before sending.
- For "read_unread", summarize the provided unread messages clearly in assistantReply in the same language as the user's command.
- Keep assistantReply concise (1-2 natural sentences) in the user's language (Hindi, Hinglish, or English).`;

      const promptPayload = JSON.stringify({
        transcript,
        requireWakeWord,
        contacts,
        unreadSummary,
      });

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: `Interpret this voice command payload:\n${promptPayload}`,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              wakeWordDetected: {
                type: Type.BOOLEAN,
                description: "Whether one of the Good Chat wake words appeared in the transcript.",
              },
              cleanedCommand: {
                type: Type.STRING,
                description: "The command portion after stripping the wake word.",
              },
              intent: {
                type: Type.STRING,
                description:
                  "One of: voice_call, video_call, send_message, read_unread, open_chat, unknown",
              },
              spokenTargetName: {
                type: Type.STRING,
                description: "The contact or group name spoken by the user, if any.",
              },
              matchedContactIds: {
                type: Type.ARRAY,
                items: { type: Type.INTEGER },
                description: "IDs from the provided contacts list that match spokenTargetName.",
              },
              needsDisambiguation: {
                type: Type.BOOLEAN,
                description: "True when multiple contacts match similarly and user must pick one.",
              },
              requiresConfirmation: {
                type: Type.BOOLEAN,
                description: "True for calls, video calls, and sending messages.",
              },
              language: {
                type: Type.STRING,
                description: "Detected language: en, hi, or hinglish.",
              },
              messageDraft: {
                type: Type.STRING,
                description: "Suggested draft message when intent is send_message.",
              },
              assistantReply: {
                type: Type.STRING,
                description: "Short natural spoken/display response for the user.",
              },
            },
            required: [
              "wakeWordDetected",
              "cleanedCommand",
              "intent",
              "matchedContactIds",
              "needsDisambiguation",
              "requiresConfirmation",
              "language",
              "assistantReply",
            ],
          },
        },
      });

      const text = (response.text ?? "").trim();
      if (!text) {
        res.status(502).json({ error: "Empty response received from Gemini." });
        return;
      }

      const parsed = JSON.parse(text);
      res.json(parsed);
    } catch (err) {
      const mapped = mapGeminiError(err);
      res.status(mapped.status).json({ error: mapped.message });
    }
  });

  // Generate or refine a message draft for a specific contact using Gemini
  app.post("/api/voice/draft", async (req: Request, res: Response) => {
    try {
      const recipientName =
        typeof req.body?.recipientName === "string"
          ? req.body.recipientName.trim().slice(0, 80)
          : "";
      const instruction =
        typeof req.body?.instruction === "string"
          ? req.body.instruction.trim().slice(0, 400)
          : "";
      const language =
        typeof req.body?.language === "string" ? req.body.language.slice(0, 20) : "hinglish";
      const recentMessages = Array.isArray(req.body?.recentMessages)
        ? req.body.recentMessages
            .filter((m: unknown): m is string => typeof m === "string")
            .slice(-6)
            .map((m: string) => m.slice(0, 200))
        : [];

      if (!recipientName) {
        res.status(400).json({ error: "recipientName is required." });
        return;
      }

      const ai = getGeminiClient();

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: JSON.stringify({
          recipientName,
          instruction: instruction || "Write a friendly, natural check-in message",
          language,
          recentMessages,
        }),
        config: {
          systemInstruction: `You draft concise, natural chat messages for Good Chat.
Match the requested language ("hi" = Hindi, "hinglish" = natural Hinglish, "en" = English) and the conversational tone of recentMessages.
Return JSON with a single natural "draft" message (1-2 short sentences, no quotes around it) and 2 brief "alternatives".`,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              draft: { type: Type.STRING },
              alternatives: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ["draft", "alternatives"],
          },
        },
      });

      const text = (response.text ?? "").trim();
      if (!text) {
        res.status(502).json({ error: "Empty draft response from Gemini." });
        return;
      }

      res.json(JSON.parse(text));
    } catch (err) {
      const mapped = mapGeminiError(err);
      res.status(mapped.status).json({ error: mapped.message });
    }
  });

  // Mount Vite middleware in development, or serve static dist in production
  const isProd = process.env.NODE_ENV === "production";
  if (!isProd) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
        hmr: process.env.DISABLE_HMR !== "true",
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, "dist");
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get("*", (_req: Request, res: Response) => {
        res.sendFile(path.join(distDir, "index.html"));
      });
    }
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Good Chat server running at http://localhost:${PORT}`);
  });
}

createServer().catch((err) => {
  console.error("Failed to start Good Chat server:", err);
  process.exit(1);
});
