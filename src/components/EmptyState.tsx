import { useStore } from "../state/store";
import { openWithDialog, openPath } from "../lib/source";
import { IconOpen } from "./Icons";

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function EmptyState() {
  const status = useStore((s) => s.status);
  const error = useStore((s) => s.error);
  const recents = useStore((s) => s.recents);

  if (status === "loading") {
    return (
      <div className="empty">
        <div className="empty-mark pulse">v</div>
        <div className="label">PARSING DOCUMENT…</div>
      </div>
    );
  }

  return (
    <div className="empty">
      <div className="empty-mark">v</div>
      <div className="empty-word">
        vovonacci<span className="brand-dot">·</span>
        <span className="brand-sub">READER</span>
      </div>
      <div className="empty-tag label">A NATIVE PDF TERMINAL</div>

      <button className="empty-open" onClick={openWithDialog}>
        <IconOpen size={18} />
        <span>OPEN PDF</span>
      </button>
      <div className="empty-hint label">or drop a file anywhere</div>

      {error && <div className="empty-error">{error}</div>}

      {recents.length > 0 && (
        <div className="recents">
          <div className="recents-head label">RECENT</div>
          {recents.map((r) => (
            <button
              key={r.path}
              className="recent-row"
              onClick={() => openPath(r.path)}
              title={r.path}
            >
              <span className="recent-name">{r.name}</span>
              <span className="recent-time label">{timeAgo(r.ts)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
