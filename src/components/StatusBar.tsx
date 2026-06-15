import { useStore } from "../state/store";
import { PDFJS_VERSION } from "../pdf/pdfSetup";

export function StatusBar() {
  const ready = useStore((s) => s.status === "ready");
  const currentPage = useStore((s) => s.currentPage);
  const numPages = useStore((s) => s.numPages);
  const scale = useStore((s) => s.scale);
  const author = useStore((s) => s.author);
  const matches = useStore((s) => s.search.matches);
  const searchOpen = useStore((s) => s.search.open);

  return (
    <div className="statusbar">
      <span className="st-feed">
        <span className="st-dot" /> READER
      </span>
      {ready ? (
        <>
          <span className="st-sep">·</span>
          <span className="st-item mono-num">
            PAGE {currentPage}/{numPages}
          </span>
          <span className="st-sep">·</span>
          <span className="st-item mono-num">{Math.round(scale * 100)}%</span>
          {author && (
            <>
              <span className="st-sep">·</span>
              <span className="st-item st-author">{author}</span>
            </>
          )}
          {searchOpen && (
            <>
              <span className="st-sep">·</span>
              <span className="st-item">
                {matches.length} MATCH{matches.length === 1 ? "" : "ES"}
              </span>
            </>
          )}
        </>
      ) : (
        <>
          <span className="st-sep">·</span>
          <span className="st-item">IDLE</span>
        </>
      )}
      <span className="st-spacer" />
      <span className="st-item st-muted mono-num">PDF.JS {PDFJS_VERSION}</span>
    </div>
  );
}
