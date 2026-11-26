import React, { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Mic,
  MicOff,
  PhoneOff,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { Chat } from "../types";
import { Avatar } from "./Avatar";

type CallOverlayProps = {
  chat: Chat;
  callType: "voice" | "video";
  onEndCall: (durationSeconds: number) => void;
};

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export const CallOverlay: React.FC<CallOverlayProps> = ({ chat, callType, onEndCall }) => {
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speakerOff, setSpeakerOff] = useState(false);
  const [cameraOff, setCameraOff] = useState(callType === "voice");
  const [mediaState, setMediaState] = useState<"initializing" | "ready" | "unavailable">(
    "initializing"
  );
  const [mediaNote, setMediaNote] = useState<string>("");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function initLocalMedia() {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        if (!cancelled) {
          setMediaState("unavailable");
          setMediaNote("Browser media devices unavailable in this environment.");
        }
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: callType === "video",
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current && callType === "video") {
          videoRef.current.srcObject = stream;
        }
        setMediaState("ready");
      } catch {
        if (!cancelled) {
          setMediaState("unavailable");
          setMediaNote(
            callType === "video"
              ? "Camera or microphone permission was not granted."
              : "Microphone permission was not granted."
          );
        }
      }
    }

    initLocalMedia();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [callType]);

  // Toggle actual audio track mute state
  useEffect(() => {
    streamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !muted;
    });
  }, [muted]);

  // Toggle actual video track enabled state
  useEffect(() => {
    streamRef.current?.getVideoTracks().forEach((track) => {
      track.enabled = !cameraOff;
    });
  }, [cameraOff]);

  // Track active session preview duration only while call screen is open
  useEffect(() => {
    if (mediaState !== "ready") return;
    const ticker = window.setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(ticker);
  }, [mediaState]);

  function handleEnd() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    onEndCall(seconds);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label={`${callType === "video" ? "Video" : "Voice"} call screen for ${chat.name}`}
    >
      <div className="flex w-full max-w-sm flex-col items-center rounded-3xl border border-slate-800 bg-[#111821] px-7 py-8 text-center text-white shadow-2xl">
        <p className="text-xs font-medium tracking-wide text-emerald-400">
          {callType === "video" ? "Good Chat Video Call" : "Good Chat Voice Call"}
        </p>

        {/* Local video preview or avatar */}
        {callType === "video" && mediaState === "ready" && !cameraOff ? (
          <div className="mt-5 mb-4 h-44 w-full overflow-hidden rounded-2xl border border-slate-700 bg-slate-900">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full scale-x-[-1] object-cover"
            />
          </div>
        ) : (
          <div className="mt-6 mb-4">
            <Avatar label={chat.avatar} color={chat.color} size="xl" />
          </div>
        )}

        <h2 className="text-xl font-semibold text-white">{chat.name}</h2>
        <p className="mt-1 text-sm text-slate-400 tabular-nums">
          {mediaState === "initializing"
            ? "Preparing local audio/video…"
            : mediaState === "ready"
              ? `Local media ready · ${formatDuration(seconds)}`
              : "VoIP media not connected"}
        </p>

        {/* Transparent VoIP signaling notice — never pretends an external call was placed */}
        <div className="mt-4 flex w-full items-start gap-2.5 rounded-xl border border-slate-800 bg-slate-900/80 px-3.5 py-2.5 text-left text-xs leading-relaxed text-slate-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <div>
            <p className="font-medium text-slate-200">
              {mediaState === "ready"
                ? "Local VoIP preview active"
                : "Call screen opened (VoIP backend required)"}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              {mediaNote ||
                "Connect a WebRTC/SIP signaling backend (e.g., LiveKit, Agora, or Twilio) to ring remote devices."}
            </p>
          </div>
        </div>

        <div className="mt-7 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            aria-label={muted ? "Unmute microphone" : "Mute microphone"}
            className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
              muted
                ? "bg-white text-slate-900"
                : "bg-slate-800 text-slate-100 hover:bg-slate-700"
            }`}
          >
            {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>

          {callType === "video" ? (
            <button
              type="button"
              onClick={() => setCameraOff((c) => !c)}
              aria-label={cameraOff ? "Turn camera on" : "Turn camera off"}
              className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
                cameraOff
                  ? "bg-white text-slate-900"
                  : "bg-slate-800 text-slate-100 hover:bg-slate-700"
              }`}
            >
              {cameraOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setSpeakerOff((s) => !s)}
              aria-label={speakerOff ? "Turn speaker on" : "Mute speaker"}
              className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
                speakerOff
                  ? "bg-white text-slate-900"
                  : "bg-slate-800 text-slate-100 hover:bg-slate-700"
              }`}
            >
              {speakerOff ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
          )}

          <button
            type="button"
            onClick={handleEnd}
            aria-label="Close call screen"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-600 text-white transition-colors hover:bg-rose-500"
          >
            <PhoneOff className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
