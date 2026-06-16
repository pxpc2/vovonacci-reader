import { useEffect } from "react";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { invoke } from "@tauri-apps/api/core";
import { useStore, activeTab } from "./state/store";
import { useUpdater } from "./lib/updater";
import { openPath, openFile, openWithDialog } from "./lib/source";
import { Toolbar } from "./components/Toolbar";
import { Tabs } from "./components/Tabs";
import { SearchBar } from "./components/SearchBar";
import { Sidebar } from "./components/Sidebar";
import { PdfViewer } from "./pdf/PdfViewer";
import { EmptyState } from "./components/EmptyState";
import { StageStatus } from "./components/StageStatus";
import { PasswordModal } from "./components/PasswordModal";
import { UpdateModal } from "./components/UpdateModal";
import { StatusBar } from "./components/StatusBar";

export default function App() {
  const home = useStore((s) => s.home);
  const hasTabs = useStore((s) => s.tabs.length > 0);
  const activeId = useStore((s) => s.activeId);
  const activeStatus = useStore((s) => activeTab(s)?.status ?? null);
  // Home screen shows when explicitly requested OR when there are no tabs.
  const showHome = home || !hasTabs;
  // "viewing a document" gates doc-only keyboard shortcuts (page nav, etc.).
  const viewingDoc = !home && activeStatus === "ready";
  const openSearch = useStore((s) => s.openSearch);
  const closeSearch = useStore((s) => s.closeSearch);
  const zoomIn = useStore((s) => s.zoomIn);
  const zoomOut = useStore((s) => s.zoomOut);
  const setZoomMode = useStore((s) => s.setZoomMode);
  const requestGoto = useStore((s) => s.requestGoto);

  // Check for an app update once on launch. Silent: quiet when offline or up to
  // date, but a genuine failure (bad manifest, etc.) still surfaces an error.
  useEffect(() => {
    useUpdater.getState().check({ silent: true });
  }, []);

  // Open a file passed at launch (default-handler / single-instance) + drag-drop.
  useEffect(() => {
    invoke<string | null>("take_launch_file")
      .then((p) => {
        if (p) openPath(p);
      })
      .catch(() => {});

    const unlistenOpen = getCurrentWebview().listen<string>("open-file", (e) => {
      if (e.payload) openPath(e.payload);
    });

    const unlistenDrop = getCurrentWebview().onDragDropEvent((event) => {
      if (event.payload.type === "drop") {
        const path = event.payload.paths?.find((p) =>
          p.toLowerCase().endsWith(".pdf")
        );
        if (path) openPath(path);
      }
    });

    return () => {
      unlistenOpen.then((f) => f());
      unlistenDrop.then((f) => f());
    };
  }, []);

  // Global keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "o") {
        e.preventDefault();
        openWithDialog();
      } else if (mod && e.key.toLowerCase() === "f") {
        e.preventDefault();
        openSearch();
      } else if (mod && (e.key === "=" || e.key === "+")) {
        e.preventDefault();
        zoomIn();
      } else if (mod && e.key === "-") {
        e.preventDefault();
        zoomOut();
      } else if (mod && e.key === "0") {
        e.preventDefault();
        setZoomMode("fit-width");
      } else if (e.key === "Escape") {
        closeSearch();
      } else if (!mod && viewingDoc && (e.key === "Home" || e.key === "End")) {
        const tgt = e.target as HTMLElement;
        if (tgt.tagName !== "INPUT") {
          e.preventDefault();
          const n = activeTab(useStore.getState())?.numPages ?? 1;
          requestGoto(e.key === "Home" ? 1 : n);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openSearch, closeSearch, zoomIn, zoomOut, setZoomMode, requestGoto, viewingDoc]);

  // HTML drag-drop fallback (browser dev outside Tauri).
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = Array.from(e.dataTransfer.files).find((f) =>
      f.name.toLowerCase().endsWith(".pdf")
    );
    if (file) openFile(file);
  };

  return (
    <div className="app" onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
      <Toolbar />
      <Tabs />
      <SearchBar />
      <div className="workspace">
        <Sidebar />
        <main className="stage">
          {showHome ? (
            <EmptyState />
          ) : activeStatus === "ready" ? (
            // keyed by tab id: remounts (and restores scroll position) per tab
            <PdfViewer key={activeId} />
          ) : (
            <StageStatus />
          )}
        </main>
      </div>
      <StatusBar />
      <PasswordModal />
      <UpdateModal />
    </div>
  );
}
