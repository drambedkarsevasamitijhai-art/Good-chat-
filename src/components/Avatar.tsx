import React from "react";

const TONE_MAP: Record<string, string> = {
  "#D8F3E8": "bg-[#D8F3E8] text-[#0C5A44] dark:bg-[#143D30] dark:text-[#8EE7C9]",
  "#FCE8D5": "bg-[#FCE8D5] text-[#8A4B16] dark:bg-[#422B18] dark:text-[#F8C494]",
  "#FDE6D2": "bg-[#FDE6D2] text-[#8C4A15] dark:bg-[#472C17] dark:text-[#F8C494]",
  "#F8DCE8": "bg-[#F8DCE8] text-[#8C2253] dark:bg-[#421D30] dark:text-[#F5A8CC]",
  "#E7E0FC": "bg-[#E7E0FC] text-[#4A2F96] dark:bg-[#2C234A] dark:text-[#C5B3FA]",
  "#DCEBFC": "bg-[#DCEBFC] text-[#1C4F82] dark:bg-[#1B314C] dark:text-[#9DC7F5]",
};

type AvatarProps = {
  label: string;
  color: string;
  size?: "sm" | "md" | "lg" | "xl";
  online?: boolean;
  ring?: "active" | "viewed" | "none";
};

const SIZE_CLASSES: Record<NonNullable<AvatarProps["size"]>, string> = {
  sm: "h-9 w-9 text-sm",
  md: "h-11 w-11 text-[15px]",
  lg: "h-12 w-12 text-base",
  xl: "h-20 w-20 text-2xl",
};

export const Avatar: React.FC<AvatarProps> = ({
  label,
  color,
  size = "md",
  online = false,
  ring = "none",
}) => {
  const toneClasses =
    TONE_MAP[color] ?? "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-100";

  const ringClasses =
    ring === "active"
      ? "ring-2 ring-[#0D7A5F] ring-offset-2 ring-offset-white dark:ring-[#14B88A] dark:ring-offset-[#111821]"
      : ring === "viewed"
        ? "ring-2 ring-slate-300 ring-offset-2 ring-offset-white dark:ring-slate-600 dark:ring-offset-[#111821]"
        : "";

  return (
    <div
      className={`relative inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold ${SIZE_CLASSES[size]} ${toneClasses} ${ringClasses}`}
    >
      <span className="leading-none">{label}</span>
      {online && (
        <span
          aria-label="Online"
          className="absolute right-0 bottom-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 dark:border-[#111821]"
        />
      )}
    </div>
  );
};
