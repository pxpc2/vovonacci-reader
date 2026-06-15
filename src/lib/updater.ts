import { create } from "zustand";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

export type UpdatePhase =
  | "idle" // nothing to show
  | "checking"
  | "available" // update found, awaiting user decision
  | "downloading"
  | "ready" // installed, about to relaunch
  | "error";

interface UpdaterState {
  phase: UpdatePhase;
  version: string | null; // the new version
  notes: string | null;
  progress: number; // 0..1 during download (0 if total size unknown)
  error: string | null;
  _update: Update | null;

  /** Check the configured endpoint for an update. Safe to call outside Tauri. */
  check: () => Promise<void>;
  /** Download + install the pending update, then relaunch. */
  install: () => Promise<void>;
  /** Dismiss the prompt ("Later"). */
  dismiss: () => void;
}

export const useUpdater = create<UpdaterState>((set, get) => ({
  phase: "idle",
  version: null,
  notes: null,
  progress: 0,
  error: null,
  _update: null,

  check: async () => {
    // `check()` throws when not running inside Tauri (e.g. `pnpm dev` in a
    // browser) or when the network/endpoint is unreachable — stay silent then.
    if (get().phase === "checking") return;
    set({ phase: "checking", error: null });
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
        set({ phase: "idle" });
      }
    } catch {
      // No updater available / offline / dev — silently ignore.
      set({ phase: "idle" });
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
      set({ phase: "error", error: msg });
    }
  },

  dismiss: () => set({ phase: "idle" }),
}));
