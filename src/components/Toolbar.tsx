import { useEffect, useState } from "react";
import { useStore } from "../state/store";
import { openWithDialog } from "../lib/source";
import { Brand } from "./Brand";
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
  IconSearch,
  IconPrint,
} from "./Icons";

export function Toolbar() {
  const ready = useStore((s) => s.status === "ready");
  const currentPage = useStore((s) => s.currentPage);
  const numPages = useStore((s) => s.numPages);
  const scale = useStore((s) => s.scale);
  const zoomMode = useStore((s) => s.zoomMode);
  const fileName = useStore((s) => s.fileName);
  const title = useStore((s) => s.title);

  const toggleSidebar = useStore((s) => s.toggleSidebar);
  const requestGoto = useStore((s) => s.requestGoto);
  const zoomIn = useStore((s) => s.zoomIn);
  const zoomOut = useStore((s) => s.zoomOut);
  const setZoomMode = useStore((s) => s.setZoomMode);
  const rotateCW = useStore((s) => s.rotateCW);
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
      <div className="tb-group brand-group">
        <Brand />
        <button
          className="tb-btn"
          onClick={toggleSidebar}
          disabled={!ready}
          title="Toggle sidebar"
        >
          <IconSidebar />
        </button>
      </div>

      <div className="tb-divider" />

      <div className="tb-group">
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

      {ready && (
        <div className="tb-doc" title={fileName ?? ""}>
          {title || fileName}
        </div>
      )}
    </div>
  );
}
