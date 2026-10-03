"use client";

import { useState } from "react";
import { actions, otherOf } from "@/lib/store";
import type { AppState, Category, Wish } from "@/lib/types";
import { CATEGORIES, CATEGORY_ORDER } from "@/lib/copy";
import { TONE } from "@/lib/tone";
import { timeAgo } from "@/lib/format";
import { useToast } from "./Toasts";
import { ding, primeAudio } from "@/lib/ding";

type Filter = Category | "all";

const SPONSORED: Wish = {
  id: "sponsored-1",
  from: "a",
  url: "#",
  title: "The “I Was Listening” Bouquet",
  image: null,
  domain: "blossom.co (example)",
  price: "89",
  note: "Same-day delivery. Saves marriages, probably.",
  category: "just_because",
  createdAt: 0,
  sponsored: true,
};

export default function WishlistTab({ state }: { state: AppState }) {
  const me = state.partners[state.viewer];
  const them = state.partners[otherOf(state.viewer)];
  const toast = useToast();

  const [whose, setWhose] = useState<"theirs" | "mine">("theirs");
  const [filter, setFilter] = useState<Filter>("all");
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const owner = whose === "mine" ? state.viewer : otherOf(state.viewer);
  const ownerP = state.partners[owner];
  const list = state.wishes.filter((w) => w.from === owner);
  const shown = list.filter((w) => filter === "all" || w.category === filter);
  const counts = CATEGORY_ORDER.reduce<Record<Category, number>>(
    (acc, c) => ({ ...acc, [c]: list.filter((w) => w.category === c).length }),
    { unsorted: 0, birthday: 0, christmas: 0, anniversary: 0, just_because: 0 },
  );

  async function add() {
    const raw = url.trim();
    if (!raw || busy) return;
    primeAudio();
    setBusy(true);
    try {
      const res = await fetch(`/api/preview?url=${encodeURIComponent(raw)}`);
      const data = (await res.json()) as {
        error?: string;
        url: string;
        title: string;
        image: string | null;
        domain: string;
        price: string | null;
      };
      if (data.error) {
        toast(data.error, "🤔");
        return;
      }
      actions.addWish({ url: data.url, title: data.title, image: data.image, domain: data.domain, price: data.price, note: note.trim() });
      if (state.soundOn) ding("send");
      toast(`Added to your list. ${them.name} has been hinted.`, "🎁");
      setUrl("");
      setNote("");
      setWhose("mine");
      setFilter("all");
    } catch {
      toast("Couldn't reach that link. Try again?", "😬");
    } finally {
      setBusy(false);
    }
  }

  function file(w: Wish, c: Category) {
    actions.categorise(w.id, c);
    toast(`Filed under ${CATEGORIES[c].label}`, CATEGORIES[c].emoji);
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Add */}
      <section className="pop p-4">
        <h2 className="mb-1 font-display text-2xl font-bold">Hint, hint 👀</h2>
        <p className="mb-3 text-sm text-ink-soft">
          Paste a link. {them.name} files it. Nobody has to pretend to be surprised ever again.
        </p>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          placeholder="https://the-thing-i-want.com/…"
          className="w-full rounded-full border-[2.5px] border-ink bg-white px-4 py-2.5 outline-none focus:ring-4 focus:ring-sunshine"
        />
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          maxLength={100}
          placeholder="Size, colour, or a loving threat (optional)"
          className="mt-2 w-full rounded-full border-[2.5px] border-ink bg-white px-4 py-2.5 text-sm outline-none focus:ring-4 focus:ring-sunshine"
        />
        <button
          type="button"
          disabled={!url.trim() || busy}
          onClick={add}
          className={`pop-btn mt-3 w-full py-3 text-lg text-white ${TONE[me.tone].bg}`}
        >
          {busy ? "Peeking at the link… 👀" : "Add to my list 🎁"}
        </button>
      </section>

      {/* Whose list */}
      <div className="pop-sm flex overflow-hidden rounded-full p-1">
        {(["theirs", "mine"] as const).map((k) => {
          const p = k === "mine" ? me : them;
          const active = whose === k;
          return (
            <button
              key={k}
              type="button"
              onClick={() => {
                setWhose(k);
                setFilter("all");
              }}
              className={`flex-1 rounded-full py-2 font-display text-base font-semibold transition ${
                active ? `${TONE[p.tone].bg} text-white` : "text-ink-soft"
              }`}
            >
              {p.emoji} {k === "mine" ? "My list" : `${p.name}'s list`}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
          All · {list.length}
        </FilterChip>
        {CATEGORY_ORDER.map((c) => (
          <FilterChip key={c} active={filter === c} onClick={() => setFilter(c)}>
            {CATEGORIES[c].emoji} {CATEGORIES[c].label} · {counts[c]}
          </FilterChip>
        ))}
      </div>

      {/* Cards */}
      <section className="flex flex-col gap-3">
        {whose === "theirs" && counts.unsorted > 0 && filter === "all" && (
          <div className="rounded-xl border-2 border-dashed border-ink/40 bg-sunshine-soft px-3 py-2 font-display text-sm font-semibold">
            📥 {counts.unsorted} new hint{counts.unsorted === 1 ? "" : "s"} from {ownerP.name} to file.
          </div>
        )}
        {shown.length === 0 && (
          <div className="pop-sm bg-sunshine-soft p-4 text-center text-ink-soft">
            <div className="text-3xl">🫥</div>
            <div className="font-display font-semibold">
              {whose === "mine" ? "Your list is empty. Bold strategy." : `${ownerP.name} hasn't hinted at anything here. Yet.`}
            </div>
          </div>
        )}
        {shown.map((w, i) => (
          <div key={w.id} className="contents">
            <WishCard w={w} state={state} canFile={w.from !== state.viewer} onFile={file} />
            {i === 0 && (filter === "all" || filter === "just_because") && (
              <WishCard
                w={SPONSORED}
                state={state}
                canFile={false}
                onFile={() => {}}
                onSponsoredClick={() => {
                  if (whose === "mine") {
                    actions.addWish({ ...SPONSORED, sponsored: false, url: "https://example.com/bouquet" });
                    toast("Subtle. Added to your list.", "💐");
                  } else {
                    toast("In the real app this opens the shop.", "🛍️");
                  }
                }}
                sponsoredLabel={whose === "mine" ? "Hint hint → add to my list" : "Shop now"}
              />
            )}
          </div>
        ))}
        {shown.length === 0 && (filter === "all" || filter === "just_because") && (
          <WishCard
            w={SPONSORED}
            state={state}
            canFile={false}
            onFile={() => {}}
            onSponsoredClick={() => toast("In the real app this opens the shop.", "🛍️")}
            sponsoredLabel="Shop now"
          />
        )}
      </section>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`chip shrink-0 whitespace-nowrap px-3 py-1.5 text-sm ${active ? "bg-ink text-white" : "bg-white"}`}
    >
      {children}
    </button>
  );
}

function WishCard({
  w,
  state,
  canFile,
  onFile,
  onSponsoredClick,
  sponsoredLabel,
}: {
  w: Wish;
  state: AppState;
  canFile: boolean;
  onFile: (w: Wish, c: Category) => void;
  onSponsoredClick?: () => void;
  sponsoredLabel?: string;
}) {
  const [imgBroken, setImgBroken] = useState(false);
  const owner = state.partners[w.from];
  const cat = CATEGORIES[w.category];
  const isMine = w.from === state.viewer;

  return (
    <article className={`pop-sm overflow-hidden ${w.sponsored ? "bg-sunshine-soft" : "bg-white"}`}>
      <div className="flex gap-3 p-3">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 border-ink bg-gradient-to-br from-pink-soft via-sunshine-soft to-tangerine-soft">
          {w.image && !imgBroken ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={w.image}
              alt=""
              className="h-full w-full object-cover"
              onError={() => setImgBroken(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-4xl">
              {w.sponsored ? "💐" : cat.emoji}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          {w.sponsored ? (
            <div className="mb-1 inline-block rounded-md border-2 border-ink bg-sunshine px-1.5 py-0.5 font-display text-[10px] font-bold uppercase">
              Sponsored ✨
            </div>
          ) : (
            <div className="mb-1 flex items-center gap-1.5 text-xs text-ink-soft">
              <span className={`font-display font-semibold ${TONE[owner.tone].text}`}>
                {owner.emoji} {owner.name}
              </span>
              <span>· {timeAgo(w.createdAt)}</span>
            </div>
          )}
          <div className="line-clamp-2 font-display text-base font-semibold leading-tight">{w.title}</div>
          <div className="mt-0.5 truncate text-xs text-ink-soft">
            {w.domain}
            {w.price && <span className="ml-1 font-bold text-ink">· ${w.price}</span>}
          </div>
          {w.note && (
            <div className="mt-1.5 inline-block rounded-xl rounded-tl-none border-2 border-ink bg-white px-2 py-1 text-xs italic">
              “{w.note}”
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t-2 border-dashed border-ink/30 px-3 py-2">
        {canFile && !w.sponsored && (
          <div className="no-scrollbar -mx-3 flex gap-1.5 overflow-x-auto px-3">
            <span className="shrink-0 self-center font-display text-xs font-semibold text-ink-soft">File under</span>
            {CATEGORY_ORDER.filter((c) => c !== "unsorted").map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onFile(w, c)}
                className={`chip shrink-0 px-2 py-1 text-xs ${w.category === c ? "bg-sunshine" : "bg-white"}`}
              >
                {CATEGORIES[c].emoji} {CATEGORIES[c].label}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          {w.sponsored ? (
            <button type="button" onClick={onSponsoredClick} className="pop-btn bg-sunshine px-3 py-1.5 text-sm">
              {sponsoredLabel}
            </button>
          ) : canFile ? (
            <span className="text-xs text-ink-soft">
              {w.category === "unsorted" ? "Not filed yet" : `Filed under ${cat.label}`}
            </span>
          ) : (
            <span className="chip bg-white px-2 py-1 text-xs">
              {cat.emoji}{" "}
              {w.category === "unsorted" ? `Waiting for ${state.partners[w.from === "a" ? "b" : "a"].name} to file` : cat.label}
            </span>
          )}
          <div className="ml-auto flex shrink-0 items-center gap-1">
            {!w.sponsored && (
              <a href={w.url} target="_blank" rel="noreferrer" className="chip bg-white px-2 py-1 text-xs">
                Open ↗
              </a>
            )}
            {isMine && !w.sponsored && (
              <button
                type="button"
                onClick={() => actions.deleteWish(w.id)}
                className="chip bg-white px-2 py-1 text-xs"
                aria-label="Remove"
              >
                🗑️
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
