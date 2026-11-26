import React, { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Send, X } from "lucide-react";
import type { StatusUpdate } from "../types";
import { Avatar } from "./Avatar";

type StatusViewerModalProps = {
  statuses: StatusUpdate[];
  activeIndex: number;
  onClose: () => void;
  onSelectIndex: (index: number) => void;
  onMarkViewed: (id: string) => void;
  onReply: (status: StatusUpdate, replyText: string) => void;
};

export const StatusViewerModal: React.FC<StatusViewerModalProps> = ({
  statuses,
  activeIndex,
  onClose,
  onSelectIndex,
  onMarkViewed,
  onReply,
}) => {
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [imageFailed, setImageFailed] = useState(false);

  const current = statuses[activeIndex];

  useEffect(() => {
    if (!current) return;
    onMarkViewed(current.id);
    setProgress(0);
    setImageFailed(false);
  }, [current?.id]);

  useEffect(() => {
    if (!current || paused) return;
    const interval = window.setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          if (activeIndex < statuses.length - 1) {
            onSelectIndex(activeIndex + 1);
          } else {
            onClose();
          }
          return 0;
        }
        return prev + 2;
      });
    }, 100);
    return () => window.clearInterval(interval);
  }, [activeIndex, statuses.length, paused, current, onClose, onSelectIndex]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && activeIndex < statuses.length - 1) {
        onSelectIndex(activeIndex + 1);
      }
      if (e.key === "ArrowLeft" && activeIndex > 0) {
        onSelectIndex(activeIndex - 1);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, statuses.length, onClose, onSelectIndex]);

  if (!current) return null;

  function handleReplySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!replyText.trim() || !current) return;
    onReply(current, replyText.trim());
    setReplyText("");
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`${current.name} status update`}
    >
      <div className="relative flex h-full max-h-[720px] w-full max-w-[420px] flex-col overflow-hidden rounded-3xl bg-slate-900 shadow-2xl">
        {/* Background Media or Editorial Gradient */}
        {current.imageUrl && !imageFailed ? (
          <img
            src={current.imageUrl}
            alt={current.caption}
            referrerPolicy="no-referrer"
            onError={() => setImageFailed(true)}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div
            className={`absolute inset-0 bg-gradient-to-br ${
              current.bgGradient ?? "from-emerald-900 via-slate-900 to-slate-950"
            }`}
          />
        )}

        {/* Scrims for WCAG contrast */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/75 via-black/35 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-52 bg-gradient-to-t from-black/85 via-black/45 to-transparent" />

        {/* Top Progress Bars + Author Header */}
        <div className="relative z-10 px-4 pt-4">
          <div className="mb-3 flex gap-1.5">
            {statuses.map((st, idx) => (
              <button
                key={st.id}
                type="button"
                aria-label={`View ${st.name}'s status`}
                onClick={() => onSelectIndex(idx)}
                className="h-1 flex-1 overflow-hidden rounded-full bg-white/30"
              >
                <svg
                  className="block h-full w-full"
                  viewBox="0 0 100 4"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <rect
                    x="0"
                    y="0"
                    height="4"
                    rx="2"
                    fill="#ffffff"
                    width={idx < activeIndex ? 100 : idx > activeIndex ? 0 : progress}
                  />
                </svg>
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Avatar label={current.avatar} color={current.color} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{current.name}</p>
                <p className="text-xs text-white/75 tabular-nums">{current.time}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close status viewer"
              className="flex h-10 w-10 items-center justify-center rounded-full text-white/90 transition-colors hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Center Touch/Click Navigation & Text Status Body */}
        <div
          className="relative z-10 flex flex-1 items-center justify-center px-8 text-center"
          onMouseDown={() => setPaused(true)}
          onMouseUp={() => setPaused(false)}
          onMouseLeave={() => setPaused(false)}
        >
          {activeIndex > 0 && (
            <button
              type="button"
              onClick={() => onSelectIndex(activeIndex - 1)}
              aria-label="Previous status"
              className="absolute left-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/35 text-white transition-colors hover:bg-black/55"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}

          {(!current.imageUrl || imageFailed) && (
            <p className="text-balance text-2xl font-semibold leading-snug text-white">
              {current.caption}
            </p>
          )}

          {activeIndex < statuses.length - 1 && (
            <button
              type="button"
              onClick={() => onSelectIndex(activeIndex + 1)}
              aria-label="Next status"
              className="absolute right-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/35 text-white transition-colors hover:bg-black/55"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Bottom Caption + Direct Reply Input */}
        <div className="relative z-10 px-4 pb-5">
          {current.imageUrl && !imageFailed && (
            <p className="mb-4 text-center text-sm font-medium leading-relaxed text-white">
              {current.caption}
            </p>
          )}

          {!current.isMine && (
            <form onSubmit={handleReplySubmit} className="flex items-center gap-2">
              <input
                type="text"
                value={replyText}
                onFocus={() => setPaused(true)}
                onBlur={() => setPaused(false)}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={`Reply to ${current.shortName}...`}
                className="h-11 flex-1 rounded-full border border-white/25 bg-black/40 px-4 text-sm text-white placeholder:text-white/65 backdrop-blur-md focus:border-white/60 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!replyText.trim()}
                aria-label="Send reply"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#0D7A5F] text-white transition-colors hover:bg-[#0A624C] disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

type CreateStatusModalProps = {
  onClose: () => void;
  onPublish: (caption: string, themeClass: string) => void;
};

const STATUS_THEMES = [
  { id: "emerald", label: "Forest", className: "from-emerald-800 via-teal-900 to-slate-950" },
  { id: "slate", label: "Midnight", className: "from-slate-800 via-slate-900 to-zinc-950" },
  { id: "amber", label: "Dusk", className: "from-amber-800 via-orange-950 to-slate-950" },
  { id: "indigo", label: "Indigo", className: "from-indigo-800 via-slate-900 to-slate-950" },
];

export const CreateStatusModal: React.FC<CreateStatusModalProps> = ({ onClose, onPublish }) => {
  const [caption, setCaption] = useState("");
  const [themeIndex, setThemeIndex] = useState(0);

  const selectedTheme = STATUS_THEMES[themeIndex];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!caption.trim()) return;
    onPublish(caption.trim(), selectedTheme.className);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Create status update"
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#111821]">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            New Status Update
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div
            className={`flex min-h-[240px] items-center justify-center bg-gradient-to-br p-6 ${selectedTheme.className}`}
          >
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Share a quick moment or thought..."
              rows={4}
              maxLength={180}
              autoFocus
              className="w-full resize-none bg-transparent text-center text-xl font-semibold text-white placeholder:text-white/55 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between gap-4 px-5 py-4">
            <div className="flex items-center gap-2">
              {STATUS_THEMES.map((theme, idx) => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setThemeIndex(idx)}
                  aria-label={`Use ${theme.label} background`}
                  className={`h-7 w-7 rounded-full bg-gradient-to-br ${theme.className} transition-transform ${
                    idx === themeIndex
                      ? "scale-110 ring-2 ring-[#0D7A5F] ring-offset-2 dark:ring-offset-[#111821]"
                      : "opacity-75 hover:opacity-100"
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!caption.trim()}
                className="rounded-lg bg-[#0D7A5F] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0A624C] disabled:opacity-40 whitespace-nowrap shrink-0"
              >
                Post Status
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
