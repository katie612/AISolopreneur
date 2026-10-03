import type { Partner } from "./types";

/** Static class strings so Tailwind can see them. */
export const TONE: Record<
  Partner["tone"],
  { bg: string; bgSoft: string; text: string; border: string; ring: string; hex: string }
> = {
  pink: {
    bg: "bg-pink",
    bgSoft: "bg-pink-soft",
    text: "text-pink-deep",
    border: "border-pink",
    ring: "ring-pink",
    hex: "#ff2d87",
  },
  tangerine: {
    bg: "bg-tangerine",
    bgSoft: "bg-tangerine-soft",
    text: "text-tangerine-deep",
    border: "border-tangerine",
    ring: "ring-tangerine",
    hex: "#ff7a1a",
  },
};
