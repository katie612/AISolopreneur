"use client";

import { useState } from "react";
import Sheet from "./Sheet";
import { actions } from "@/lib/store";
import type { AppState } from "@/lib/types";
import { askForNotifications, ding, notificationState, notify, primeAudio } from "@/lib/ding";
import { getInstallPrompt } from "@/lib/install";
import { useToast } from "./Toasts";

export default function SettingsSheet({
  open,
  onClose,
  state,
  onEditNames,
}: {
  open: boolean;
  onClose: () => void;
  state: AppState;
  onEditNames: () => void;
}) {
  const toast = useToast();
  // This sheet is only mounted while open and only on the client, so reading
  // browser state in the initialisers is safe.
  const [perm, setPerm] = useState(() => notificationState());
  const [standalone] = useState(() => window.matchMedia("(display-mode: standalone)").matches);
  const [isIOS] = useState(() => /iphone|ipad|ipod/i.test(navigator.userAgent));
  const installEvt = getInstallPrompt();

  return (
    <Sheet open={open} onClose={onClose} title="Settings ⚙️">
      <div className="flex flex-col gap-4">
        <Row title="The ding" sub="Chime + buzz when a want goes out or gets answered.">
          <button
            type="button"
            onClick={() => {
              primeAudio();
              actions.setSound(!state.soundOn);
              if (!state.soundOn) ding("receive");
            }}
            className={`chip px-3 py-1.5 text-sm ${state.soundOn ? "bg-mint" : "bg-white"}`}
          >
            {state.soundOn ? "On 🔔" : "Off 🔕"}
          </button>
        </Row>

        <Row
          title="Phone notifications"
          sub={
            perm === "unsupported"
              ? isIOS && !standalone
                ? "On iPhone, add the app to your home screen first, then come back here."
                : "Not supported in this browser."
              : perm === "granted"
                ? "On. You'll get a banner when a want lands."
                : perm === "denied"
                  ? "Blocked in your browser settings."
                  : "Lets the ding reach you outside the app."
          }
        >
          {perm === "granted" ? (
            <button
              type="button"
              onClick={() => notify("Wife wants a coffee ☕", "🔥 Now. Drop everything.")}
              className="chip bg-sunshine px-3 py-1.5 text-sm"
            >
              Test 🔔
            </button>
          ) : perm === "default" ? (
            <button
              type="button"
              onClick={async () => {
                const ok = await askForNotifications();
                setPerm(notificationState());
                toast(ok ? "Notifications on" : "No worries, maybe later", ok ? "🔔" : "🙈");
                if (ok) notify("Wife Wants is on", "You will be dinged. Lovingly.");
              }}
              className="chip bg-sunshine px-3 py-1.5 text-sm"
            >
              Turn on
            </button>
          ) : null}
        </Row>

        <Row
          title="Add to home screen"
          sub={
            standalone
              ? "You're running as an app. Fancy."
              : isIOS
                ? "Tap Share (the box with the arrow), then “Add to Home Screen”."
                : installEvt
                  ? "Install it like a real app."
                  : "Use your browser menu → “Install app” or “Add to Home screen”."
          }
        >
          {!standalone && installEvt && (
            <button
              type="button"
              onClick={() => installEvt.prompt()}
              className="chip bg-sunshine px-3 py-1.5 text-sm"
            >
              Install
            </button>
          )}
        </Row>

        <Row title="Names & emoji" sub={`${state.partners.a.emoji} ${state.partners.a.name} and ${state.partners.b.emoji} ${state.partners.b.name}`}>
          <button type="button" onClick={onEditNames} className="chip bg-white px-3 py-1.5 text-sm">
            Edit
          </button>
        </Row>

        <Row title="Reset demo" sub="Back to the sample wants and wishes.">
          <button
            type="button"
            onClick={() => {
              actions.reset();
              toast("Fresh start", "🧼");
              onClose();
            }}
            className="chip bg-white px-3 py-1.5 text-sm"
          >
            Reset
          </button>
        </Row>

        <p className="pt-2 text-center text-xs text-ink-soft">
          Demo build. Everything lives on this device only. The real thing syncs between two phones.
        </p>
      </div>
    </Sheet>
  );
}

function Row({ title, sub, children }: { title: string; sub: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="font-display font-semibold">{title}</div>
        <div className="text-xs text-ink-soft">{sub}</div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
