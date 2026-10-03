/** Captures Chrome/Android's install prompt so Settings can offer an Install button later. */
export type InstallPromptEvent = Event & { prompt: () => Promise<void> };

let deferred: InstallPromptEvent | null = null;
let listening = false;

export function captureInstallPrompt() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as InstallPromptEvent;
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
  });
}

export function getInstallPrompt() {
  return deferred;
}
