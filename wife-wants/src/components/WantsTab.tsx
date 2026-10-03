"use client";

import { useEffect, useState } from "react";
import { actions, otherOf } from "@/lib/store";
import type { AppState, Reaction, Urgency, Want } from "@/lib/types";
import { QUICK_WANTS, REACTIONS, SEND_LINES, URGENCY, emojiFor, pickLine, EMPTY_INBOX_LINES } from "@/lib/copy";
import { TONE } from "@/lib/tone";
import { ding, notify, primeAudio } from "@/lib/ding";
import { timeAgo } from "@/lib/format";
import { useToast } from "./Toasts";

export default function WantsTab({ state }: { state: AppState }) {
  const me = state.partners[state.viewer];
  const them = state.partners[otherOf(state.viewer)];
  const toast = useToast();

  const [custom, setCustom] = useState("");
  const [picked, setPicked] = useState<{ emoji: string; text: string } | null>(null);
  const [urgency, setUrgency] = useState<Urgency>("now");
  const [bellWiggle, setBellWiggle] = useState(0);
  const [emptyLine] = useState(() => pickLine(EMPTY_INBOX_LINES));

  // keep "x min ago" fresh
  const [, tick] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => tick((n) => n + 1), 30_000);
    return () => window.clearInterval(t);
  }, []);

  const text = custom.trim() ? custom.trim() : picked?.text ?? "";
  const emoji = custom.trim() ? emojiFor(custom) : picked?.emoji ?? "✨";
  const canSend = text.length > 0;

  function send() {
    if (!canSend) return;
    primeAudio();
    actions.sendWant({ text, emoji, urgency });
    if (state.soundOn) ding("send");
    setBellWiggle((n) => n + 1);
    toast(pickLine(SEND_LINES), "🔔");
    notify(`${me.name} wants ${text}`, `${URGENCY[urgency].emoji} ${URGENCY[urgency].label}. ${URGENCY[urgency].hint}`);
    setCustom("");
    setPicked(null);
    setUrgency("now");
  }

  function react(w: Want, r: Reaction) {
    primeAudio();
    actions.react(w.id, r);
    if (state.soundOn) ding("reaction");
    toast(`Told ${state.partners[w.from].name}: ${REACTIONS[r].label}`, REACTIONS[r].emoji);
  }

  const incoming = state.wants.filter((w) => w.to === state.viewer && !w.reaction);
  const rest = state.wants.filter((w) => !(w.to === state.viewer && !w.reaction));

  // Shown above the composer when something is waiting, below it when the inbox is clear.
  const incomingSection = (
    <section>
      <h3 className="mb-2 flex items-center gap-2 font-display text-xl font-bold">
        For you
        {incoming.length > 0 && (
          <span className="rounded-full bg-pink px-2 py-0.5 font-display text-xs font-bold text-white">
            {incoming.length}
          </span>
        )}
      </h3>
      {incoming.length === 0 ? (
        <div className="pop-sm bg-sunshine-soft p-4 text-center text-ink-soft">
          <div className="text-3xl">😌</div>
          <div className="font-display font-semibold">{emptyLine}</div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {incoming.map((w) => (
            <WantCard key={w.id} w={w} state={state} onReact={react} />
          ))}
        </div>
      )}
    </section>
  );

  return (
    <div className="flex flex-col gap-5">
      {incoming.length > 0 && incomingSection}

      {/* Compose */}
      <section className="pop p-4">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-2xl font-bold">
            <span className={TONE[me.tone].text}>{me.name}</span> wants…
          </h2>
          <span key={bellWiggle} className={`text-2xl ${bellWiggle ? "wiggle" : ""}`}>🔔</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {QUICK_WANTS.map((q) => {
            const active = !custom.trim() && picked?.text === q.text;
            return (
              <button
                key={q.text}
                type="button"
                onClick={() => {
                  setPicked(q);
                  setCustom("");
                }}
                className={`chip flex flex-col items-center gap-0.5 px-1 py-2 text-xs leading-tight ${
                  active ? `${TONE[me.tone].bg} text-white` : "bg-white"
                }`}
              >
                <span className="text-2xl">{q.emoji}</span>
                <span>{q.text}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex items-center gap-2">
          <span className="text-2xl">{custom.trim() ? emojiFor(custom) : "✍️"}</span>
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            maxLength={80}
            placeholder="Something else… (e.g. you to call your mother)"
            className="w-full rounded-full border-[2.5px] border-ink bg-white px-4 py-2.5 outline-none focus:ring-4 focus:ring-sunshine"
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {(Object.keys(URGENCY) as Urgency[]).map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => setUrgency(u)}
              className={`chip px-3 py-1.5 text-sm ${urgency === u ? "bg-sunshine" : "bg-white"}`}
              title={URGENCY[u].hint}
            >
              {URGENCY[u].emoji} {URGENCY[u].label}
            </button>
          ))}
        </div>

        <button
          type="button"
          disabled={!canSend}
          onClick={send}
          className={`pop-btn mt-4 w-full py-3.5 text-lg text-white ${TONE[me.tone].bg}`}
        >
          {canSend ? `Ding ${them.name}! 🔔` : "Pick a want first"}
        </button>
      </section>

      {incoming.length === 0 && incomingSection}

      {/* History */}
      {rest.length > 0 && (
        <section>
          <h3 className="mb-2 font-display text-xl font-bold">The record</h3>
          <div className="flex flex-col gap-3">
            {rest.map((w) => (
              <WantCard key={w.id} w={w} state={state} onReact={react} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function WantCard({
  w,
  state,
  onReact,
}: {
  w: Want;
  state: AppState;
  onReact: (w: Want, r: Reaction) => void;
}) {
  const from = state.partners[w.from];
  const to = state.partners[w.to];
  const mineToAnswer = w.to === state.viewer && !w.reaction;
  const unseen = w.to === state.viewer && !w.seenBy.includes(state.viewer);
  const done = w.reaction === "done" || w.reaction === "dream_on";

  return (
    <article
      className={`pop-sm relative p-3 ${mineToAnswer ? TONE[from.tone].bgSoft : "bg-white"} ${
        done ? "opacity-80" : ""
      } ${unseen ? "pop-in" : ""}`}
    >
      {unseen && (
        <span className="absolute -right-2 -top-2 rotate-6 rounded-md border-2 border-ink bg-sunshine px-1.5 py-0.5 font-display text-[10px] font-bold uppercase">
          New
        </span>
      )}
      <div className="flex items-start gap-3">
        <div className="text-4xl leading-none">{w.emoji}</div>
        <div className="min-w-0 flex-1">
          <div className="font-display text-lg font-semibold leading-tight">
            <span className={TONE[from.tone].text}>
              {from.emoji} {from.name}
            </span>{" "}
            wants <span className={done && w.reaction === "done" ? "line-through" : ""}>{w.text}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-soft">
            <span className="rounded-full border-2 border-ink bg-white px-2 py-0.5 font-display font-semibold text-ink">
              {URGENCY[w.urgency].emoji} {URGENCY[w.urgency].label}
            </span>
            <span>{timeAgo(w.createdAt)}</span>
            <span>· for {to.name}</span>
          </div>

          {mineToAnswer ? (
            <div className="mt-3 flex gap-2">
              {(Object.keys(REACTIONS) as Reaction[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => onReact(w, r)}
                  className={`pop-btn flex-1 px-2 py-2 text-sm ${
                    r === "done" ? "bg-mint" : r === "on_it" ? "bg-sky" : "bg-white"
                  }`}
                >
                  {REACTIONS[r].emoji} {REACTIONS[r].label}
                </button>
              ))}
            </div>
          ) : w.reaction ? (
            <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-ink px-2.5 py-1 font-display text-xs font-semibold text-white">
              {REACTIONS[w.reaction].emoji} {to.name} {REACTIONS[w.reaction].reply}
              {w.reactedAt && <span className="opacity-70"> · {timeAgo(w.reactedAt)}</span>}
            </div>
          ) : (
            <div className="mt-2 inline-flex items-center gap-1 rounded-full border-2 border-dashed border-ink/40 px-2.5 py-1 font-display text-xs font-semibold text-ink-soft">
              ⏳ Waiting on {to.name}…
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
