export type PartnerId = "a" | "b";

export type Partner = {
  id: PartnerId;
  name: string;
  emoji: string;
  /** Tailwind colour key, drives header + bubbles */
  tone: "pink" | "tangerine";
};

export type Urgency = "now" | "soonish" | "whenever";

export type Reaction = "on_it" | "done" | "dream_on";

export type Want = {
  id: string;
  from: PartnerId;
  to: PartnerId;
  text: string;
  emoji: string;
  urgency: Urgency;
  createdAt: number;
  reaction: Reaction | null;
  reactedAt: number | null;
  /** partners who have opened the app and seen this want */
  seenBy: PartnerId[];
};

export type Category = "birthday" | "christmas" | "anniversary" | "just_because" | "unsorted";

export type Wish = {
  id: string;
  from: PartnerId;
  url: string;
  title: string;
  image: string | null;
  domain: string;
  price: string | null;
  note: string;
  category: Category;
  createdAt: number;
  sponsored?: boolean;
};

export type AppState = {
  version: 1;
  onboarded: boolean;
  viewer: PartnerId;
  soundOn: boolean;
  partners: Record<PartnerId, Partner>;
  wants: Want[];
  wishes: Wish[];
};
