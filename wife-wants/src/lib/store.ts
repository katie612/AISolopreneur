"use client";

import { useSyncExternalStore } from "react";
import type { AppState, Category, PartnerId, Reaction, Urgency, Want, Wish } from "./types";
import { uid } from "./format";

const KEY = "wife-wants:v1";

const MIN = 60_000;

function seed(): AppState {
  const now = Date.now();
  return {
    version: 1,
    onboarded: false,
    viewer: "a",
    soundOn: true,
    partners: {
      a: { id: "a", name: "Wife", emoji: "👑", tone: "pink" },
      b: { id: "b", name: "Husband", emoji: "🧢", tone: "tangerine" },
    },
    wants: [
      {
        id: uid(),
        from: "a",
        to: "b",
        text: "a coffee",
        emoji: "☕",
        urgency: "now",
        createdAt: now - 6 * MIN,
        reaction: "on_it",
        reactedAt: now - 4 * MIN,
        seenBy: ["a", "b"],
      },
      {
        id: uid(),
        from: "b",
        to: "a",
        text: "to know where the good scissors are",
        emoji: "✂️",
        urgency: "soonish",
        createdAt: now - 48 * MIN,
        reaction: "dream_on",
        reactedAt: now - 40 * MIN,
        seenBy: ["a", "b"],
      },
      {
        id: uid(),
        from: "a",
        to: "b",
        text: "the good blanket",
        emoji: "🧸",
        urgency: "whenever",
        createdAt: now - 26 * 60 * MIN,
        reaction: "done",
        reactedAt: now - 25 * 60 * MIN,
        seenBy: ["a", "b"],
      },
    ],
    wishes: [
      {
        id: uid(),
        from: "a",
        url: "https://www.lecreuset.com.au/",
        title: "Le Creuset Signature Round Casserole, 24cm, Shell Pink",
        image: null,
        domain: "lecreuset.com.au",
        price: "599",
        note: "The pink one. Not the other pink one.",
        category: "christmas",
        createdAt: now - 3 * 24 * 60 * MIN,
      },
      {
        id: uid(),
        from: "a",
        url: "https://www.dyson.com.au/",
        title: "Dyson Airwrap Multi-Styler",
        image: null,
        domain: "dyson.com.au",
        price: "849",
        note: "I have been very good this year.",
        category: "birthday",
        createdAt: now - 9 * 24 * 60 * MIN,
      },
      {
        id: uid(),
        from: "b",
        url: "https://www.weber.com/AU/en/home/",
        title: "Weber Q Premium Barbecue",
        image: null,
        domain: "weber.com",
        price: null,
        note: "",
        category: "unsorted",
        createdAt: now - 20 * MIN,
      },
    ],
  };
}

function load(): AppState {
  if (typeof window === "undefined") return seed();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return seed();
    const parsed = JSON.parse(raw) as AppState;
    if (parsed?.version !== 1) return seed();
    return parsed;
  } catch {
    return seed();
  }
}

let state: AppState | null = null;
const serverSnapshot = seed();
const listeners = new Set<() => void>();

function get(): AppState {
  state ??= load();
  return state;
}

function set(next: AppState) {
  state = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage full or blocked; keep going in memory */
  }
  listeners.forEach((l) => l());
}

function update(fn: (s: AppState) => AppState) {
  set(fn(get()));
}

function subscribe(l: () => void) {
  listeners.add(l);
  if (listeners.size === 1 && typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }
  return () => {
    listeners.delete(l);
    if (listeners.size === 0 && typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}

function onStorage(e: StorageEvent) {
  if (e.key === KEY) {
    state = load();
    listeners.forEach((l) => l());
  }
}

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, get, () => serverSnapshot);
}

export const actions = {
  setViewer(viewer: PartnerId) {
    update((s) => ({ ...s, viewer }));
  },
  toggleViewer() {
    update((s) => ({ ...s, viewer: s.viewer === "a" ? "b" : "a" }));
  },
  setSound(soundOn: boolean) {
    update((s) => ({ ...s, soundOn }));
  },
  finishSetup(names: { a: { name: string; emoji: string }; b: { name: string; emoji: string } }) {
    update((s) => ({
      ...s,
      onboarded: true,
      partners: {
        a: { ...s.partners.a, name: names.a.name.trim() || "Wife", emoji: names.a.emoji },
        b: { ...s.partners.b, name: names.b.name.trim() || "Husband", emoji: names.b.emoji },
      },
    }));
  },
  sendWant(input: { text: string; emoji: string; urgency: Urgency }): Want {
    const s = get();
    const want: Want = {
      id: uid(),
      from: s.viewer,
      to: s.viewer === "a" ? "b" : "a",
      text: input.text.trim(),
      emoji: input.emoji,
      urgency: input.urgency,
      createdAt: Date.now(),
      reaction: null,
      reactedAt: null,
      seenBy: [s.viewer],
    };
    set({ ...s, wants: [want, ...s.wants] });
    return want;
  },
  react(id: string, reaction: Reaction) {
    update((s) => ({
      ...s,
      wants: s.wants.map((w) =>
        w.id === id ? { ...w, reaction, reactedAt: Date.now() } : w,
      ),
    }));
  },
  markSeen(viewer: PartnerId) {
    const s = get();
    const dirty = s.wants.some((w) => w.to === viewer && !w.seenBy.includes(viewer));
    if (!dirty) return;
    set({
      ...s,
      wants: s.wants.map((w) =>
        w.to === viewer && !w.seenBy.includes(viewer) ? { ...w, seenBy: [...w.seenBy, viewer] } : w,
      ),
    });
  },
  deleteWant(id: string) {
    update((s) => ({ ...s, wants: s.wants.filter((w) => w.id !== id) }));
  },
  addWish(input: Omit<Wish, "id" | "from" | "createdAt" | "category"> & { category?: Category }): Wish {
    const s = get();
    const wish: Wish = {
      id: uid(),
      from: s.viewer,
      createdAt: Date.now(),
      category: input.category ?? "unsorted",
      ...input,
    };
    set({ ...s, wishes: [wish, ...s.wishes] });
    return wish;
  },
  categorise(id: string, category: Category) {
    update((s) => ({
      ...s,
      wishes: s.wishes.map((w) => (w.id === id ? { ...w, category } : w)),
    }));
  },
  deleteWish(id: string) {
    update((s) => ({ ...s, wishes: s.wishes.filter((w) => w.id !== id) }));
  },
  reset() {
    set({ ...seed(), onboarded: true });
  },
};

export function otherOf(id: PartnerId): PartnerId {
  return id === "a" ? "b" : "a";
}
