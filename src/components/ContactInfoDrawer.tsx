import React from "react";
import { Bell, BellOff, Phone, Pin, PinOff, Trash2, Video, X } from "lucide-react";
import type { Chat } from "../types";
import { Avatar } from "./Avatar";

type ContactInfoDrawerProps = {
  chat: Chat;
  onClose: () => void;
  onStartCall: (type: "voice" | "video") => void;
  onToggleMute: () => void;
  onTogglePin: () => void;
  onClearMessages: () => void;
  onPreviewImage: (url: string, caption?: string) => void;
};

export const ContactInfoDrawer: React.FC<ContactInfoDrawerProps> = ({
  chat,
  onClose,
  onStartCall,
  onToggleMute,
  onTogglePin,
  onClearMessages,
  onPreviewImage,
}) => {
  const sharedPhotos = chat.messages.filter(
    (m): m is typeof m & { attachment: { type: "image"; url: string; caption?: string } } =>
      m.attachment?.type === "image"
  );

  return (
    <aside className="flex h-full w-full flex-col border-l border-slate-200 bg-white dark:border-slate-800 dark:bg-[#111821] lg:w-[320px] lg:shrink-0">
      <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5 dark:border-slate-800">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {chat.isGroup ? "Group Info" : "Contact Info"}
        </h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close info panel"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="thin-scrollbar flex-1 overflow-y-auto px-5 py-6">
        {/* Identity */}
        <div className="flex flex-col items-center text-center">
          <Avatar label={chat.avatar} color={chat.color} size="xl" online={chat.online} />
          <h4 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
            {chat.name}
          </h4>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {chat.isGroup
              ? `${chat.members?.length ?? 4} members`
              : chat.online
                ? "Online now"
                : chat.phone ?? "Available"}
          </p>

          <div className="mt-5 grid w-full grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => onStartCall("voice")}
              className="flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              <Phone className="h-4 w-4 text-[#0D7A5F] dark:text-[#14B88A]" />
              <span>Voice</span>
            </button>
            <button
              type="button"
              onClick={() => onStartCall("video")}
              className="flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              <Video className="h-4 w-4 text-[#0D7A5F] dark:text-[#14B88A]" />
              <span>Video</span>
            </button>
          </div>
        </div>

        {/* About */}
        <div className="mt-6 border-t border-slate-200/80 pt-5 dark:border-slate-800">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">About</p>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-800 dark:text-slate-200">
            {chat.about}
          </p>
          {chat.phone && (
            <p className="mt-2 text-xs text-slate-500 tabular-nums dark:text-slate-400">
              {chat.phone}
            </p>
          )}
        </div>

        {/* Group Members */}
        {chat.isGroup && chat.members && (
          <div className="mt-6 border-t border-slate-200/80 pt-5 dark:border-slate-800">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Members · {chat.members.length}
            </p>
            <ul className="mt-2.5 space-y-2">
              {chat.members.map((member) => (
                <li
                  key={member}
                  className="flex items-center justify-between text-sm text-slate-700 dark:text-slate-200"
                >
                  <span>{member}</span>
                  {member === "You" && (
                    <span className="text-xs text-slate-400">Admin</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Shared Media */}
        <div className="mt-6 border-t border-slate-200/80 pt-5 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Shared Media
            </p>
            <span className="text-xs text-slate-400 tabular-nums">{sharedPhotos.length}</span>
          </div>
          {sharedPhotos.length > 0 ? (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {sharedPhotos.map((msg) => (
                <button
                  key={msg.id}
                  type="button"
                  onClick={() => onPreviewImage(msg.attachment.url, msg.attachment.caption)}
                  className="aspect-square overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700"
                >
                  <img
                    src={msg.attachment.url}
                    alt={msg.attachment.caption ?? "Shared photo"}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover transition-transform duration-200 hover:scale-105"
                  />
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
              No photos shared in this chat yet.
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="mt-6 space-y-1 border-t border-slate-200/80 pt-5 dark:border-slate-800">
          <button
            type="button"
            onClick={onToggleMute}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {chat.muted ? (
              <Bell className="h-4 w-4 text-slate-500" />
            ) : (
              <BellOff className="h-4 w-4 text-slate-500" />
            )}
            <span>{chat.muted ? "Unmute notifications" : "Mute notifications"}</span>
          </button>

          <button
            type="button"
            onClick={onTogglePin}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {chat.pinned ? (
              <PinOff className="h-4 w-4 text-slate-500" />
            ) : (
              <Pin className="h-4 w-4 text-slate-500" />
            )}
            <span>{chat.pinned ? "Unpin conversation" : "Pin conversation"}</span>
          </button>

          <button
            type="button"
            onClick={onClearMessages}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
          >
            <Trash2 className="h-4 w-4" />
            <span>Clear messages</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
