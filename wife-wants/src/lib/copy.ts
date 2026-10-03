import type { Category, Reaction, Urgency } from "./types";

export const QUICK_WANTS: { emoji: string; text: string }[] = [
  { emoji: "☕", text: "a coffee" },
  { emoji: "🍵", text: "a cup of tea" },
  { emoji: "🍫", text: "chocolate" },
  { emoji: "🍪", text: "a snack" },
  { emoji: "🍷", text: "a glass of wine" },
  { emoji: "💧", text: "a glass of water" },
  { emoji: "🤗", text: "a cuddle" },
  { emoji: "🦶", text: "a foot rub" },
  { emoji: "🧸", text: "the good blanket" },
  { emoji: "🤫", text: "ten minutes of silence" },
  { emoji: "🥡", text: "takeaway tonight" },
  { emoji: "👀", text: "your attention" },
];

export const URGENCY: Record<Urgency, { label: string; emoji: string; hint: string }> = {
  now: { label: "Now", emoji: "🔥", hint: "Drop everything" },
  soonish: { label: "Soonish", emoji: "⏳", hint: "Finish your thing first" },
  whenever: { label: "Whenever", emoji: "🐢", hint: "No pressure. Some pressure." },
};

export const REACTIONS: Record<Reaction, { label: string; emoji: string; reply: string }> = {
  on_it: { label: "On it", emoji: "🫡", reply: "is on it" },
  done: { label: "Done", emoji: "✅", reply: "delivered" },
  dream_on: { label: "Dream on", emoji: "😏", reply: "said dream on" },
};

export const CATEGORIES: Record<Category, { label: string; emoji: string }> = {
  unsorted: { label: "Unsorted", emoji: "📥" },
  birthday: { label: "Birthday", emoji: "🎂" },
  christmas: { label: "Christmas", emoji: "🎄" },
  anniversary: { label: "Anniversary", emoji: "💍" },
  just_because: { label: "Just because", emoji: "🎁" },
};

export const CATEGORY_ORDER: Category[] = [
  "unsorted",
  "birthday",
  "christmas",
  "anniversary",
  "just_because",
];

export const SEND_LINES = [
  "Dinged!",
  "Message delivered. Clock's ticking.",
  "Sent. No excuses now.",
  "Off it goes. 🔔",
  "They've been summoned.",
  "Ding ding ding!",
];

export const EMPTY_INBOX_LINES = [
  "Nothing wanted. Suspicious.",
  "All quiet. Enjoy it while it lasts.",
  "Inbox empty. You're either perfect or they're asleep.",
];

export function emojiFor(text: string): string {
  const t = text.toLowerCase();
  const table: [RegExp, string][] = [
    [/coffee|latte|flat white|espresso/, "☕"],
    [/tea\b|chai/, "🍵"],
    [/choc/, "🍫"],
    [/wine|drink|cocktail|gin|beer/, "🍷"],
    [/water/, "💧"],
    [/snack|chips|biscuit|cookie|cake/, "🍪"],
    [/cuddle|hug/, "🤗"],
    [/massage|rub|back/, "💆"],
    [/sleep|nap|bed/, "😴"],
    [/dinner|lunch|food|eat|takeaway|pizza/, "🍕"],
    [/blanket|cosy|cozy/, "🧸"],
    [/quiet|silence|alone/, "🤫"],
    [/kids|children|baby/, "👶"],
    [/dog|walk/, "🐕"],
    [/car|rego|drive|petrol/, "🚗"],
    [/clean|dishes|wash|laundry|bins?/, "🧽"],
    [/flowers?/, "💐"],
    [/money|pay|bill/, "💸"],
  ];
  for (const [re, e] of table) if (re.test(t)) return e;
  return "✨";
}

export function pickLine(lines: string[]) {
  return lines[Math.floor(Math.random() * lines.length)];
}
