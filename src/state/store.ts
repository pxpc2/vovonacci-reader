import { create } from "zustand";
import type { PDFDocumentProxy } from "pdfjs-dist/types/src/display/api";
import type { LoadedDoc, OutlineNode, PageSize } from "../pdf/document";

export type ZoomMode = "custom" | "fit-width" | "fit-page";
export type SidebarTab = "outline" | "thumbnails";
export type DocStatus = "loading" | "ready" | "error";

export interface SearchMatch {
  page: number; // 1-based
  items: number[]; // text-item indices this match spans
}

export interface RecentItem {
  path: string;
  name: string;
  ts: number;
}

export interface SearchState {
  open: boolean;
  query: string;
  matches: SearchMatch[];
  active: number; // index into matches, -1 if none
  building: boolean;
}

/**
 * One open document = one tab. Everything that is *about a document* (its proxy,
 * page geometry, view/zoom/rotation, search, dark-invert, etc.) lives here so
 * multiple documents can be open at once without clobbering each other.
 */
export interface DocSession {
  id: string;
  status: DocStatus;
  error: string | null;

  fileName: string;
  filePath: string | null;

  doc: PDFDocumentProxy | null;
  title: string | null;
  author: string | null;
  numPages: number;
  pageSizes: PageSize[];
  outline: OutlineNode[] | null;

  sidebarTab: SidebarTab;
  currentPage: number;
  scale: number;
  zoomMode: ZoomMode;
  rotation: number; // 0 | 90 | 180 | 270
  invert: boolean; // dark-mode page inversion

  goto: { page: number; nonce: number } | null;
  search: SearchState;
}

const MIN_SCALE = 0.2;
const MAX_SCALE = 6;
const ZOOM_STEP = 1.15;
const RECENTS_KEY = "vovonacci.recents";

function loadRecents(): RecentItem[] {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    return raw ? (JSON.parse(raw) as RecentItem[]) : [];
  } catch {
    return [];
  }
}

function persistRecents(items: RecentItem[]) {
  try {
    localStorage.setItem(RECENTS_KEY, JSON.stringify(items.slice(0, 12)));
  } catch {
    /* ignore quota errors */
  }
}

const emptySearch = (): SearchState => ({
  open: false,
  query: "",
  matches: [],
  active: -1,
  building: false,
});

let idSeq = 0;
const newId = () => `tab_${Date.now().toString(36)}_${idSeq++}`;

interface AppState {
  tabs: DocSession[];
  activeId: string | null;

  // global (app-level) state
  sidebarOpen: boolean;
  recents: RecentItem[];

  // tab lifecycle
  openTab: (fileName: string, filePath: string | null) => string;
  fillTab: (id: string, loaded: LoadedDoc) => void;
  failTab: (id: string, msg: string) => void;
  removeTab: (id: string) => void;
  setActive: (id: string) => void;
  /** If a (non-errored) tab for this path already exists, focus it and return its id. */
  focusExisting: (filePath: string) => string | null;

  // active-tab actions
  toggleSidebar: () => void;
  setSidebarTab: (tab: SidebarTab) => void;
  setCurrentPage: (page: number) => void;
  requestGoto: (page: number) => void;
  setScale: (scale: number) => void;
  /** Set scale from a fit calculation without switching zoomMode to "custom". */
  applyFitScale: (scale: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  setZoomMode: (mode: ZoomMode) => void;
  rotateCW: () => void;
  rotateCCW: () => void;
  toggleInvert: () => void;

  openSearch: () => void;
  closeSearch: () => void;
  setSearchQuery: (q: string) => void;
  setSearchResults: (matches: SearchMatch[]) => void;
  setSearchBuilding: (building: boolean) => void;
  nextMatch: () => void;
  prevMatch: () => void;

  addRecent: (item: RecentItem) => void;
}

/** Selector: the currently focused document session (or null when no tabs). */
export function activeTab(s: AppState): DocSession | null {
  return s.tabs.find((t) => t.id === s.activeId) ?? null;
}

const clampScale = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

export const useStore = create<AppState>((set, get) => {
  /** Apply a partial update to the active tab (immutably). No-op if no active tab. */
  const patchActive = (updater: (t: DocSession) => Partial<DocSession>) => {
    const { tabs, activeId } = get();
    if (!activeId) return;
    set({
      tabs: tabs.map((t) => (t.id === activeId ? { ...t, ...updater(t) } : t)),
    });
  };

  const patchTab = (id: string, updater: (t: DocSession) => Partial<DocSession>) => {
    set({
      tabs: get().tabs.map((t) => (t.id === id ? { ...t, ...updater(t) } : t)),
    });
  };

  return {
    tabs: [],
    activeId: null,
    sidebarOpen: true,
    recents: loadRecents(),

    openTab: (fileName, filePath) => {
      const id = newId();
      const tab: DocSession = {
        id,
        status: "loading",
        error: null,
        fileName,
        filePath,
        doc: null,
        title: null,
        author: null,
        numPages: 0,
        pageSizes: [],
        outline: null,
        sidebarTab: "outline",
        currentPage: 1,
        scale: 1,
        zoomMode: "fit-width",
        rotation: 0,
        invert: false,
        goto: null,
        search: emptySearch(),
      };
      set({ tabs: [...get().tabs, tab], activeId: id });
      return id;
    },

    fillTab: (id, loaded) =>
      patchTab(id, () => ({
        status: "ready",
        error: null,
        doc: loaded.doc,
        title: loaded.title,
        author: loaded.author,
        numPages: loaded.numPages,
        pageSizes: loaded.pageSizes,
        outline: loaded.outline,
        sidebarTab: loaded.outline ? "outline" : "thumbnails",
        currentPage: 1,
        rotation: 0,
        goto: null,
        search: emptySearch(),
      })),

    failTab: (id, msg) =>
      patchTab(id, () => ({ status: "error", error: msg, doc: null })),

    removeTab: (id) => {
      const { tabs, activeId } = get();
      const idx = tabs.findIndex((t) => t.id === id);
      if (idx === -1) return;
      // Free the PDF.js document + its worker-side memory for this tab.
      try {
        (tabs[idx].doc as { destroy?: () => void } | null)?.destroy?.();
      } catch {
        /* already gone */
      }
      const next = tabs.filter((t) => t.id !== id);
      let nextActive = activeId;
      if (activeId === id) {
        nextActive = next.length
          ? next[Math.min(idx, next.length - 1)].id
          : null;
      }
      set({ tabs: next, activeId: nextActive });
    },

    setActive: (id) => set({ activeId: id }),

    focusExisting: (filePath) => {
      const t = get().tabs.find(
        (t) => t.filePath === filePath && t.status !== "error"
      );
      if (t) {
        set({ activeId: t.id });
        return t.id;
      }
      return null;
    },

    toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
    setSidebarTab: (tab) => patchActive(() => ({ sidebarTab: tab })),

    setCurrentPage: (page) => {
      const t = activeTab(get());
      if (t && page !== t.currentPage) patchActive(() => ({ currentPage: page }));
    },

    requestGoto: (page) =>
      patchActive((t) => {
        const p = Math.min(Math.max(1, page), t.numPages || 1);
        return { goto: { page: p, nonce: (t.goto?.nonce ?? 0) + 1 } };
      }),

    setScale: (scale) =>
      patchActive(() => ({ scale: clampScale(scale), zoomMode: "custom" })),
    applyFitScale: (scale) => patchActive(() => ({ scale })),
    zoomIn: () =>
      patchActive((t) => ({ scale: clampScale(t.scale * ZOOM_STEP), zoomMode: "custom" })),
    zoomOut: () =>
      patchActive((t) => ({ scale: clampScale(t.scale / ZOOM_STEP), zoomMode: "custom" })),
    setZoomMode: (mode) => patchActive(() => ({ zoomMode: mode })),

    rotateCW: () => patchActive((t) => ({ rotation: (t.rotation + 90) % 360 })),
    rotateCCW: () => patchActive((t) => ({ rotation: (t.rotation + 270) % 360 })),
    toggleInvert: () => patchActive((t) => ({ invert: !t.invert })),

    openSearch: () => patchActive((t) => ({ search: { ...t.search, open: true } })),
    closeSearch: () =>
      patchActive((t) => ({
        search: { ...t.search, open: false, query: "", matches: [], active: -1 },
      })),
    setSearchQuery: (q) => patchActive((t) => ({ search: { ...t.search, query: q } })),
    setSearchResults: (matches) =>
      patchActive((t) => ({
        search: { ...t.search, matches, active: matches.length ? 0 : -1, building: false },
      })),
    setSearchBuilding: (building) =>
      patchActive((t) => ({ search: { ...t.search, building } })),
    nextMatch: () => {
      const t = activeTab(get());
      if (!t || !t.search.matches.length) return;
      const active = (t.search.active + 1) % t.search.matches.length;
      patchActive(() => ({ search: { ...t.search, active } }));
      get().requestGoto(t.search.matches[active].page);
    },
    prevMatch: () => {
      const t = activeTab(get());
      if (!t || !t.search.matches.length) return;
      const active =
        (t.search.active - 1 + t.search.matches.length) % t.search.matches.length;
      patchActive(() => ({ search: { ...t.search, active } }));
      get().requestGoto(t.search.matches[active].page);
    },

    addRecent: (item) => {
      const next = [item, ...get().recents.filter((r) => r.path !== item.path)].slice(0, 12);
      persistRecents(next);
      set({ recents: next });
    },
  };
});
