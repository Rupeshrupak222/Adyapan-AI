/**
 * Global Web AudioContext Manager
 * Resolves browser autoplay/suspension policies by eagerly unlocking the AudioContext
 * on any user gesture (pointerdown, click, touchstart, keydown) using capture listeners.
 */

let sharedContext: AudioContext | null = null;

export function getSharedAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;

  const AudioContextClass =
    window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!sharedContext || sharedContext.state === "closed") {
    try {
      sharedContext = new AudioContextClass();
    } catch {
      return null;
    }
  }

  if (sharedContext.state === "suspended") {
    sharedContext.resume().catch(() => {});
  }

  return sharedContext;
}

export async function ensureAudioContextRunning(): Promise<AudioContext | null> {
  const ctx = getSharedAudioContext();
  if (ctx && ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {}
  }
  return ctx;
}

// Global eager unlocker on any user interaction anywhere on the window
if (typeof window !== "undefined") {
  const unlock = () => {
    try {
      const ctx = getSharedAudioContext();
      if (ctx && ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }
    } catch {}
  };

  window.addEventListener("pointerdown", unlock, { capture: true, passive: true });
  window.addEventListener("click", unlock, { capture: true, passive: true });
  window.addEventListener("touchstart", unlock, { capture: true, passive: true });
  window.addEventListener("keydown", unlock, { capture: true, passive: true });
}
