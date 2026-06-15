import { create } from "zustand";
import type { PDFDocumentProxy } from "pdfjs-dist/types/src/display/api";
import type { LoadedDoc, OutlineNode, PageSize } from "../pdf/document";

export type Status = "idle" | "loading" | "ready" | "error";
export type ZoomMode = "custom" | "fit-width" | "fit-page";
export type SidebarTab = "outline" | "thumbnails";

export interface SearchMatch {
  page: number; // 1-based
  items: number[]; // text-item indices this match spans
}

export interface RecentItem {
  path: string;
  name: string;
  ts: number;
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

interface AppState {
  status: Status;
  error: string | null;

  doc: PDFDocumentProxy | null;
  fileName: string | null;
  filePath: string | null;
  title: string | null;
  author: string | null;
  numPages: number;
  pageSizes: PageSize[];
  outline: OutlineNode[] | null;

  sidebarOpen: boolean;
  sidebarTab: SidebarTab;

  currentPage: number;
  scale: number;
  zoomMode: ZoomMode;
  rotation: number; // 0 | 90 | 180 | 270

  goto: { page: number; nonce: number } | null;

  search: {
    open: boolean;
    query: string;
    matches: SearchMatch[];
    active: number; // index into matches, -1 if none
    building: boolean;
  };

  recents: RecentItem[];

  // actions
  beginLoad: () => void;
  setError: (msg: string) => void;
  setLoaded: (loaded: LoadedDoc, fileName: string, filePath: string | null) => void;
  reset: () => void;

  toggleSidebar: () => void;
  setSidebarTab: (tab: SidebarTab) => void;

  setCurrentPage: (page: number) => void;
  requestGoto: (page: number) => void;

  setScale: (scale: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  setZoomMode: (mode: ZoomMode) => void;
  rotateCW: () => void;
  rotateCCW: () => void;

  openSearch: () => void;
  closeSearch: () => void;
  setSearchQuery: (q: string) => void;
  setSearchResults: (matches: SearchMatch[]) => void;
  setSearchBuilding: (building: boolean) => void;
  nextMatch: () => void;
  prevMatch: () => void;

  addRecent: (item: RecentItem) => void;
}

const clampScale = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

export const useStore = create<AppState>((set, get) => ({
  status: "idle",
  error: null,

  doc: null,
  fileName: null,
  filePath: null,
  title: null,
  author: null,
  numPages: 0,
  pageSizes: [],
  outline: null,

  sidebarOpen: true,
  sidebarTab: "outline",

  currentPage: 1,
  scale: 1,
  zoomMode: "fit-width",
  rotation: 0,

  goto: null,

  search: { open: false, query: "", matches: [], active: -1, building: false },

  recents: loadRecents(),

  beginLoad: () =>
    set({ status: "loading", error: null }),

  setError: (msg) => set({ status: "error", error: msg }),

  setLoaded: (loaded, fileName, filePath) =>
    set({
      status: "ready",
      error: null,
      doc: loaded.doc,
      fileName,
      filePath,
      title: loaded.title,
      author: loaded.author,
      numPages: loaded.numPages,
      pageSizes: loaded.pageSizes,
      outline: loaded.outline,
      sidebarTab: loaded.outline ? "outline" : "thumbnails",
      sidebarOpen: true,
      currentPage: 1,
      rotation: 0,
      goto: null,
      search: { open: false, query: "", matches: [], active: -1, building: false },
    }),

  reset: () =>
    set({
      status: "idle",
      error: null,
      doc: null,
      fileName: null,
      filePath: null,
      title: null,
      author: null,
      numPages: 0,
      pageSizes: [],
      outline: null,
      currentPage: 1,
      search: { open: false, query: "", matches: [], active: -1, building: false },
    }),

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarTab: (tab) => set({ sidebarTab: tab }),

  setCurrentPage: (page) => {
    if (page !== get().currentPage) set({ currentPage: page });
  },

  requestGoto: (page) => {
    const p = Math.min(Math.max(1, page), get().numPages || 1);
    set({ goto: { page: p, nonce: (get().goto?.nonce ?? 0) + 1 } });
  },

  setScale: (scale) => set({ scale: clampScale(scale), zoomMode: "custom" }),
  zoomIn: () => set((s) => ({ scale: clampScale(s.scale * ZOOM_STEP), zoomMode: "custom" })),
  zoomOut: () => set((s) => ({ scale: clampScale(s.scale / ZOOM_STEP), zoomMode: "custom" })),
  setZoomMode: (mode) => set({ zoomMode: mode }),

  rotateCW: () => set((s) => ({ rotation: (s.rotation + 90) % 360 })),
  rotateCCW: () => set((s) => ({ rotation: (s.rotation + 270) % 360 })),

  openSearch: () => set((s) => ({ search: { ...s.search, open: true } })),
  closeSearch: () =>
    set((s) => ({
      search: { ...s.search, open: false, query: "", matches: [], active: -1 },
    })),
  setSearchQuery: (q) => set((s) => ({ search: { ...s.search, query: q } })),
  setSearchResults: (matches) =>
    set((s) => ({
      search: { ...s.search, matches, active: matches.length ? 0 : -1, building: false },
    })),
  setSearchBuilding: (building) =>
    set((s) => ({ search: { ...s.search, building } })),
  nextMatch: () => {
    const { search } = get();
    if (!search.matches.length) return;
    const active = (search.active + 1) % search.matches.length;
    set({ search: { ...search, active } });
    get().requestGoto(search.matches[active].page);
  },
  prevMatch: () => {
    const { search } = get();
    if (!search.matches.length) return;
    const active =
      (search.active - 1 + search.matches.length) % search.matches.length;
    set({ search: { ...search, active } });
    get().requestGoto(search.matches[active].page);
  },

  addRecent: (item) => {
    const next = [item, ...get().recents.filter((r) => r.path !== item.path)].slice(0, 12);
    persistRecents(next);
    set({ recents: next });
  },
}));
