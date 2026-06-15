import { create } from "zustand";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { getVersion } from "@tauri-apps/api/app";

export type UpdatePhase =
  | "idle" // nothing to show
  | "checking"
  | "uptodate" // checked, already current (only surfaced for manual checks)
  | "available" // update found, awaiting user decision
  | "downloading"
  | "ready" // installed, about to relaunch
  | "error";

// Connectivity errors are mundane (you're offline) — log them but don't nag on
// launch. Anything else (bad manifest, parse/BOM, signature/config, 404) is a
// real problem worth surfacing even on the silent launch check.
function isOffline(msg: string): boolean {
  return /network|connect|dns|timed?\s?out|sending request|unreachable|offline|tcp|tls|handshake|resolve|socket/i.test(
    msg
  );
}

interface UpdaterState {
  phase: UpdatePhase;
  interactive: boolean; // was the current check user-initiated?
  version: string | null; // the available update's version
  currentVersion: string | null; // this app's version (for display)
  notes: string | null;
  progress: number; // 0..1 during download (0 if total size unknown)
  error: string | null;
  _update: Update | null;

  /**
   * Check the configured endpoint for an update.
   * `silent` (the launch check) stays quiet for offline/up-to-date; a manual
   * check surfaces every outcome (checking / up-to-date / error).
   */
  check: (opts?: { silent?: boolean }) => Promise<void>;
  /** Download + install the pending update, then relaunch. */
  install: () => Promise<void>;
  /** Dismiss the prompt ("Later" / "Close"). */
  dismiss: () => void;
}

export const useUpdater = create<UpdaterState>((set, get) => ({
  phase: "idle",
  interactive: false,
  version: null,
  currentVersion: null,
  notes: null,
  progress: 0,
  error: null,
  _update: null,

  check: async ({ silent = false } = {}) => {
    if (get().phase === "checking" || get().phase === "downloading") return;
    // Best-effort current version for display (throws outside Tauri — ignore).
    if (!get().currentVersion) {
      try {
        set({ currentVersion: await getVersion() });
      } catch {
        /* not running in Tauri */
      }
    }
    set({ phase: "checking", interactive: !silent, error: null });
    try {
      const update = await check();
      if (update) {
        set({
          phase: "available",
          version: update.version,
          notes: update.body ?? null,
          _update: update,
        });
      } else {
        // Up to date: silent launch → stay hidden; manual → tell the user.
        set({ phase: silent ? "idle" : "uptodate" });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Always log the real reason so a failed check is never invisible.
      console.error("[updater] check failed:", msg, err);
      if (silent && isOffline(msg)) {
        set({ phase: "idle" }); // offline at launch — don't nag
      } else {
        set({ phase: "error", error: msg });
      }
    }
  },

  install: async () => {
    const update = get()._update;
    if (!update) return;
    set({ phase: "downloading", progress: 0, error: null });
    try {
      let total = 0;
      let downloaded = 0;
      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case "Started":
            total = event.data.contentLength ?? 0;
            break;
          case "Progress":
            downloaded += event.data.chunkLength;
            set({ progress: total > 0 ? downloaded / total : 0 });
            break;
          case "Finished":
            set({ progress: 1 });
            break;
        }
      });
      set({ phase: "ready" });
      await relaunch();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[updater] install failed:", msg, err);
      set({ phase: "error", error: msg });
    }
  },

  dismiss: () => set({ phase: "idle" }),
}));
