"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { actions, otherOf, useAppState } from "@/lib/store";
import type { PartnerId } from "@/lib/types";
import { TONE } from "@/lib/tone";
import { ding, primeAudio } from "@/lib/ding";
import { captureInstallPrompt } from "@/lib/install";
import { ToastProvider, useToast } from "./Toasts";
import WantsTab from "./WantsTab";
import WishlistTab from "./WishlistTab";
import SetupSheet from "./SetupSheet";
import SettingsSheet from "./SettingsSheet";

type Tab = "wants" | "wishlist";

export default function App() {
  return (
    <ToastProvider>
      <Shell />
    </ToastProvider>
  );
}

function Shell() {
  const state = useAppState();
  const toast = useToast();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [tab, setTab] = useState<Tab>("wants");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [namesOpen, setNamesOpen] = useState(false);
  const lastViewer = useRef<PartnerId>(state.viewer);

  useEffect(() => captureInstallPrompt(), []);

  // When you swap partners, the new viewer "arrives" and gets dinged for anything waiting.
  useEffect(() => {
    if (!mounted) return;
    if (lastViewer.current === state.viewer) return;
    lastViewer.current = state.viewer;
    const waiting = state.wants.filter((w) => w.to === state.viewer && !w.seenBy.includes(state.viewer));
    if (waiting.length > 0) {
      if (state.soundOn) ding("receive");
      const me = state.partners[state.viewer];
      toast(
        waiting.length === 1
          ? `${me.name}, ${state.partners[waiting[0].from].name} wants ${waiting[0].text}`
          : `${me.name}, you have ${waiting.length} wants waiting`,
        "🔔",
      );
      const t = window.setTimeout(() => actions.markSeen(state.viewer), 2500);
      return () => window.clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.viewer, mounted]);

  if (!mounted) return <Splash />;

  const me = state.partners[state.viewer];
  const them = state.partners[otherOf(state.viewer)];
  const unreadFor = (id: PartnerId) =>
    state.wants.filter((w) => w.to === id && !w.reaction && !w.seenBy.includes(id)).length;
  const openFor = (id: PartnerId) => state.wants.filter((w) => w.to === id && !w.reaction).length;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-cream/90 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl font-bold leading-none tracking-tight">
            <span className="text-pink">Wife</span>{" "}
            <span className="text-tangerine">Wants</span>
            <span className="ml-1 inline-block text-sunshine bounce-soft">✨</span>
          </h1>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="chip h-10 w-10 bg-white text-lg"
            aria-label="Settings"
          >
            ⚙️
          </button>
        </div>

        {/* Partner toggle */}
        <div className="pop mt-3 flex rounded-full p-1">
          {(["a", "b"] as PartnerId[]).map((id) => {
            const p = state.partners[id];
            const active = state.viewer === id;
            const unread = unreadFor(id);
            const open = openFor(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  primeAudio();
                  if (!active) {
                    actions.setViewer(id);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }}
                className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-full py-2.5 font-display text-lg font-semibold transition ${
                  active ? `${TONE[p.tone].bg} text-white` : "text-ink-soft"
                }`}
                aria-pressed={active}
              >
                <span className="text-xl">{p.emoji}</span>
                <span className="truncate">{p.name}</span>
                {!active && open > 0 && (
                  <span
                    className={`absolute -right-1 -top-2 min-w-6 rounded-full border-2 border-ink px-1.5 py-0.5 text-xs text-ink ${
                      unread > 0 ? "bg-sunshine wiggle" : "bg-white"
                    }`}
                  >
                    {open}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="mt-1.5 text-center font-display text-xs font-semibold text-ink-soft">
          You&apos;re <span className={TONE[me.tone].text}>{me.name}</span>. Tap {them.name} to swap sides.
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 pb-28 pt-1">
        {tab === "wants" ? <WantsTab state={state} /> : <WishlistTab state={state} />}
      </main>

      {/* Bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-md px-4 safe-bottom">
        <div className="pop flex rounded-full p-1">
          <NavButton active={tab === "wants"} onClick={() => setTab("wants")} badge={openFor(state.viewer)}>
            🔔 Wants
          </NavButton>
          <NavButton
            active={tab === "wishlist"}
            onClick={() => setTab("wishlist")}
            badge={state.wishes.filter((w) => w.from !== state.viewer && w.category === "unsorted").length}
          >
            🎁 Wishlist
          </NavButton>
        </div>
      </nav>

      <SetupSheet
        key={`${state.onboarded}-${namesOpen}`}
        open={!state.onboarded || namesOpen}
        firstTime={!state.onboarded}
        partners={state.partners}
        onClose={() => setNamesOpen(false)}
        onSave={(v) => {
          primeAudio();
          actions.finishSetup(v);
          setNamesOpen(false);
          toast(`Hi ${v.a.name || "Wife"} and ${v.b.name || "Husband"}`, "👋");
        }}
      />
      {settingsOpen && (
        <SettingsSheet
          open
          onClose={() => setSettingsOpen(false)}
          state={state}
          onEditNames={() => {
            setSettingsOpen(false);
            setNamesOpen(true);
          }}
        />
      )}
    </div>
  );
}

function NavButton({
  active,
  onClick,
  badge,
  children,
}: {
  active: boolean;
  onClick: () => void;
  badge?: number;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex-1 rounded-full py-2.5 font-display text-lg font-semibold transition ${
        active ? "bg-ink text-white" : "text-ink-soft"
      }`}
    >
      {children}
      {!!badge && badge > 0 && (
        <span className="absolute -right-0.5 -top-1.5 min-w-6 rounded-full border-2 border-ink bg-sunshine px-1.5 py-0.5 text-xs text-ink">
          {badge}
        </span>
      )}
    </button>
  );
}

function Splash() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3">
      <div className="pop flex h-24 w-24 items-center justify-center bg-pink text-5xl">💖</div>
      <div className="font-display text-3xl font-bold">
        <span className="text-pink">Wife</span> <span className="text-tangerine">Wants</span>
      </div>
      <div className="font-display text-sm font-semibold text-ink-soft">Loading your wants…</div>
    </div>
  );
}
