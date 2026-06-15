import { useEffect } from "react";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { invoke } from "@tauri-apps/api/core";
import { useStore } from "./state/store";
import { openPath, openFile } from "./lib/source";
import { Toolbar } from "./components/Toolbar";
import { SearchBar } from "./components/SearchBar";
import { Sidebar } from "./components/Sidebar";
import { PdfViewer } from "./pdf/PdfViewer";
import { EmptyState } from "./components/EmptyState";
import { PasswordModal } from "./components/PasswordModal";
import { StatusBar } from "./components/StatusBar";

export default function App() {
  const ready = useStore((s) => s.status === "ready");
  const openSearch = useStore((s) => s.openSearch);
  const closeSearch = useStore((s) => s.closeSearch);
  const zoomIn = useStore((s) => s.zoomIn);
  const zoomOut = useStore((s) => s.zoomOut);
  const setZoomMode = useStore((s) => s.setZoomMode);
  const requestGoto = useStore((s) => s.requestGoto);

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
      if (mod && e.key.toLowerCase() === "f") {
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
      } else if (!mod && ready && (e.key === "Home" || e.key === "End")) {
        const tgt = e.target as HTMLElement;
        if (tgt.tagName !== "INPUT") {
          e.preventDefault();
          requestGoto(e.key === "Home" ? 1 : useStore.getState().numPages);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openSearch, closeSearch, zoomIn, zoomOut, setZoomMode, requestGoto, ready]);

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
      <SearchBar />
      <div className="workspace">
        <Sidebar />
        <main className="stage">{ready ? <PdfViewer /> : <EmptyState />}</main>
      </div>
      <StatusBar />
      <PasswordModal />
    </div>
  );
}
