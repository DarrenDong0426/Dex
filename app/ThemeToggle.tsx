// app/ThemeToggle.tsx — sun/moon sliding toggle (knob sized to fit).
// Shared between the frontend profile and the admin panel; relies on the
// --line/--panel-2/--accent CSS vars being set by whichever theme is active.
"use client";

import type { Mode } from "@/app/games";

export default function ThemeToggle({
  mode,
  onToggle,
}: {
  mode: Mode;
  onToggle: () => void;
}) {
  const dark = mode === "dark";
  // track h-6 (24px); knob h-5 (20px) with top/left 2px → fits with 2px inset
  return (
    <button
      onClick={onToggle}
      aria-label="toggle theme"
      className="relative h-6 w-12 rounded-full border border-[var(--line)] bg-[var(--panel-2)]"
    >
      <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[10px] leading-none">
        ☀
      </span>
      <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px] leading-none">
        🌙
      </span>
      <span
        className="absolute left-0.5 top-0.5 h-[18px] w-[18px] rounded-full bg-[var(--accent)] shadow transition-transform duration-300"
        style={{ transform: dark ? "translateX(24px)" : "translateX(0px)" }}
      />
    </button>
  );
}
