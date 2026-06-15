import { useStore, activeTab } from "../state/store";
import type { SearchMatch } from "../state/store";
import { PDFJS_VERSION } from "../pdf/pdfSetup";

const EMPTY: SearchMatch[] = [];

export function StatusBar() {
  const ready = useStore((s) => activeTab(s)?.status === "ready");
  const currentPage = useStore((s) => activeTab(s)?.currentPage ?? 1);
  const numPages = useStore((s) => activeTab(s)?.numPages ?? 0);
  const scale = useStore((s) => activeTab(s)?.scale ?? 1);
  const author = useStore((s) => activeTab(s)?.author ?? null);
  const matches = useStore((s) => activeTab(s)?.search.matches ?? EMPTY);
  const searchOpen = useStore((s) => activeTab(s)?.search.open ?? false);

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
