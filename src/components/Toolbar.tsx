import { useEffect, useState } from "react";
import { useStore, activeTab } from "../state/store";
import { openWithDialog } from "../lib/source";
import {
  IconOpen,
  IconSidebar,
  IconChevronUp,
  IconChevronDown,
  IconZoomIn,
  IconZoomOut,
  IconFitWidth,
  IconFitPage,
  IconRotate,
  IconInvert,
  IconSpread,
  IconSearch,
  IconPrint,
} from "./Icons";

export function Toolbar() {
  const ready = useStore((s) => activeTab(s)?.status === "ready");
  const currentPage = useStore((s) => activeTab(s)?.currentPage ?? 1);
  const numPages = useStore((s) => activeTab(s)?.numPages ?? 0);
  const scale = useStore((s) => activeTab(s)?.scale ?? 1);
  const zoomMode = useStore((s) => activeTab(s)?.zoomMode ?? "fit-width");
  const invert = useStore((s) => activeTab(s)?.invert ?? false);
  const spread = useStore((s) => activeTab(s)?.spread ?? false);

  const toggleSidebar = useStore((s) => s.toggleSidebar);
  const requestGoto = useStore((s) => s.requestGoto);
  const zoomIn = useStore((s) => s.zoomIn);
  const zoomOut = useStore((s) => s.zoomOut);
  const setZoomMode = useStore((s) => s.setZoomMode);
  const rotateCW = useStore((s) => s.rotateCW);
  const toggleInvert = useStore((s) => s.toggleInvert);
  const toggleSpread = useStore((s) => s.toggleSpread);
  const openSearch = useStore((s) => s.openSearch);

  const [pageInput, setPageInput] = useState(String(currentPage));
  useEffect(() => setPageInput(String(currentPage)), [currentPage]);

  const commitPage = () => {
    const n = parseInt(pageInput, 10);
    if (!Number.isNaN(n)) requestGoto(n);
    else setPageInput(String(currentPage));
  };

  return (
    <div className="toolbar">
      <div className="tb-group">
        <button
          className="tb-btn"
          onClick={toggleSidebar}
          disabled={!ready}
          title="Toggle sidebar"
        >
          <IconSidebar />
        </button>
        <button className="tb-btn" onClick={openWithDialog} title="Open PDF (Ctrl+O)">
          <IconOpen />
          <span className="tb-btn-label">OPEN</span>
        </button>
      </div>

      {ready && (
        <>
          <div className="tb-divider" />

          <div className="tb-group">
            <button
              className="tb-btn"
              onClick={() => requestGoto(currentPage - 1)}
              disabled={currentPage <= 1}
              title="Previous page"
            >
              <IconChevronUp />
            </button>
            <div className="page-box">
              <input
                className="page-input mono-num"
                value={pageInput}
                onChange={(e) => setPageInput(e.target.value.replace(/[^0-9]/g, ""))}
                onBlur={commitPage}
                onKeyDown={(e) => e.key === "Enter" && commitPage()}
              />
              <span className="page-total mono-num">/ {numPages}</span>
            </div>
            <button
              className="tb-btn"
              onClick={() => requestGoto(currentPage + 1)}
              disabled={currentPage >= numPages}
              title="Next page"
            >
              <IconChevronDown />
            </button>
          </div>

          <div className="tb-divider" />

          <div className="tb-group">
            <button className="tb-btn" onClick={zoomOut} title="Zoom out (Ctrl -)">
              <IconZoomOut />
            </button>
            <span className="zoom-pct mono-num">{Math.round(scale * 100)}%</span>
            <button className="tb-btn" onClick={zoomIn} title="Zoom in (Ctrl +)">
              <IconZoomIn />
            </button>
            <button
              className={"tb-btn" + (zoomMode === "fit-width" ? " active" : "")}
              onClick={() => setZoomMode("fit-width")}
              title="Fit width"
            >
              <IconFitWidth />
            </button>
            <button
              className={"tb-btn" + (zoomMode === "fit-page" ? " active" : "")}
              onClick={() => setZoomMode("fit-page")}
              title="Fit page"
            >
              <IconFitPage />
            </button>
            <button className="tb-btn" onClick={rotateCW} title="Rotate clockwise">
              <IconRotate />
            </button>
            <button
              className={"tb-btn" + (invert ? " active" : "")}
              onClick={toggleInvert}
              title="Invert (dark mode)"
            >
              <IconInvert />
            </button>
            <button
              className={"tb-btn" + (spread ? " active" : "")}
              onClick={toggleSpread}
              title="Two-page view"
            >
              <IconSpread />
            </button>
          </div>

          <div className="tb-divider" />

          <div className="tb-group">
            <button className="tb-btn" onClick={openSearch} title="Find (Ctrl+F)">
              <IconSearch />
            </button>
            <button className="tb-btn" onClick={() => window.print()} title="Print">
              <IconPrint />
            </button>
          </div>
        </>
      )}

      <div className="tb-spacer" />
    </div>
  );
}
