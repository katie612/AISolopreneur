/**
 * The ding. A quick three-note chime synthesised in the browser so there's
 * no audio file to load, plus a buzz on phones that support it.
 */
let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    ctx ??= new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** Call from a user gesture once so iOS lets us make noise later. */
export function primeAudio() {
  audio();
}

export function ding(kind: "send" | "receive" | "reaction" = "send") {
  const ac = audio();
  if (ac) {
    const notes =
      kind === "send"
        ? [659.25, 783.99, 1046.5] // E5 G5 C6
        : kind === "receive"
          ? [1046.5, 783.99, 1318.5] // C6 G5 E6
          : [523.25, 659.25]; // C5 E5
    const t0 = ac.currentTime;
    notes.forEach((f, i) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = "sine";
      osc.frequency.value = f;
      const start = t0 + i * 0.09;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.25, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);
      osc.connect(gain).connect(ac.destination);
      osc.start(start);
      osc.stop(start + 0.4);
    });
  }
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(kind === "send" ? [40] : [60, 40, 60]);
    } catch {
      /* ignore */
    }
  }
}

export function notificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notificationState(): "granted" | "denied" | "default" | "unsupported" {
  if (!notificationsSupported()) return "unsupported";
  return Notification.permission;
}

export async function askForNotifications(): Promise<boolean> {
  if (!notificationsSupported()) return false;
  try {
    const result = await Notification.requestPermission();
    return result === "granted";
  } catch {
    return false;
  }
}

export function notify(title: string, body: string) {
  if (notificationState() !== "granted") return;
  try {
    new Notification(title, { body, icon: "/icon-192.png", badge: "/icon-192.png", tag: "wife-wants" });
  } catch {
    /* ignore (iOS needs a service worker for this) */
  }
}
