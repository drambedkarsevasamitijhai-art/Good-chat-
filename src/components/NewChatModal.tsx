import React, { useState } from "react";
import { Search, UserPlus, X } from "lucide-react";
import { suggestedContacts } from "../data/initialData";
import { Avatar } from "./Avatar";

type NewChatModalProps = {
  existingNames: string[];
  onClose: () => void;
  onCreateChat: (contact: {
    name: string;
    avatar: string;
    color: string;
    darkColor: string;
    avatarText: string;
    about: string;
  }) => void;
};

const PALETTE = [
  { color: "#D8F3E8", darkColor: "#143D30", avatarText: "#0C5A44" },
  { color: "#DCEBFC", darkColor: "#1B314C", avatarText: "#1C4F82" },
  { color: "#F8DCE8", darkColor: "#421D30", avatarText: "#8C2253" },
  { color: "#E7E0FC", darkColor: "#2C234A", avatarText: "#4A2F96" },
  { color: "#FCE8D5", darkColor: "#422B18", avatarText: "#8A4B16" },
];

export const NewChatModal: React.FC<NewChatModalProps> = ({
  existingNames,
  onClose,
  onCreateChat,
}) => {
  const [query, setQuery] = useState("");
  const [customName, setCustomName] = useState("");

  const availableContacts = suggestedContacts.filter(
    (c) =>
      !existingNames.some((n) => n.toLowerCase() === c.name.toLowerCase()) &&
      c.name.toLowerCase().includes(query.toLowerCase())
  );

  function handleCustomSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = customName.trim();
    if (!trimmed) return;
    const tone = PALETTE[trimmed.length % PALETTE.length];
    onCreateChat({
      name: trimmed,
      avatar: trimmed[0].toUpperCase(),
      color: tone.color,
      darkColor: tone.darkColor,
      avatarText: tone.avatarText,
      about: "Available on Good Chat",
    });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Start a new chat"
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#111821]">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            New Conversation
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5">
          {/* Custom contact creation */}
          <form onSubmit={handleCustomSubmit} className="flex items-center gap-2">
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Enter contact or group name..."
              className="h-11 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0D7A5F] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-[#14B88A]"
            />
            <button
              type="submit"
              disabled={!customName.trim()}
              className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-[#0D7A5F] px-4 text-sm font-medium text-white transition-colors hover:bg-[#0A624C] disabled:opacity-40 whitespace-nowrap shrink-0"
            >
              <UserPlus className="h-4 w-4" />
              <span>Start</span>
            </button>
          </form>

          {/* Filter suggested */}
          <div className="mt-5">
            <div className="relative mb-3">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter suggested contacts..."
                className="h-10 w-full rounded-xl bg-slate-100 pr-3 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0D7A5F]/30 dark:bg-slate-800/80 dark:text-slate-100"
              />
            </div>

            <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              Suggested Contacts
            </p>

            {availableContacts.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {availableContacts.map((contact) => (
                  <button
                    key={contact.name}
                    type="button"
                    onClick={() => {
                      onCreateChat(contact);
                      onClose();
                    }}
                    className="flex w-full items-center gap-3 py-2.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl px-2"
                  >
                    <Avatar label={contact.avatar} color={contact.color} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {contact.name}
                      </p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {contact.about}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-slate-400">
                No matching suggestions left — enter any name above to start chatting.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
