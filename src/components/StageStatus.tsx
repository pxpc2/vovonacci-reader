import { useStore, activeTab } from "../state/store";

/** Loading / error view for the active tab, shown in the stage in place of the viewer. */
export function StageStatus() {
  const status = useStore((s) => activeTab(s)?.status ?? null);
  const error = useStore((s) => activeTab(s)?.error ?? null);
  const fileName = useStore((s) => activeTab(s)?.fileName ?? null);
  const activeId = useStore((s) => s.activeId);
  const removeTab = useStore((s) => s.removeTab);

  if (status === "loading") {
    return (
      <div className="empty">
        <div className="empty-mark pulse">v</div>
        <div className="label">PARSING DOCUMENT…</div>
        {fileName && <div className="empty-hint">{fileName}</div>}
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="empty">
        <div className="empty-mark err">!</div>
        <div className="empty-tag label">COULD NOT OPEN</div>
        {error && <div className="empty-error">{error}</div>}
        <button
          className="empty-open"
          onClick={() => activeId && removeTab(activeId)}
        >
          CLOSE TAB
        </button>
      </div>
    );
  }

  return null;
}
