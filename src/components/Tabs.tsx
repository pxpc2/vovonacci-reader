import { useStore } from "../state/store";
import { openWithDialog } from "../lib/source";
import { IconClose, IconPlus } from "./Icons";

export function Tabs() {
  const tabs = useStore((s) => s.tabs);
  // No tab is "active" while the home screen is showing.
  const activeId = useStore((s) => (s.home ? null : s.activeId));
  const setActive = useStore((s) => s.setActive);
  const removeTab = useStore((s) => s.removeTab);

  if (tabs.length === 0) return null;

  return (
    <div className="tabs">
      <div className="tabs-strip">
        {tabs.map((t) => (
          <div
            key={t.id}
            className={"tab" + (t.id === activeId ? " active" : "")}
            onClick={() => setActive(t.id)}
            title={t.filePath ?? t.fileName}
          >
            {t.status === "loading" && <span className="tab-spin" />}
            {t.status === "error" && <span className="tab-err">!</span>}
            <span className="tab-name">{t.title || t.fileName}</span>
            <button
              className="tab-close"
              title="Close tab"
              onClick={(e) => {
                e.stopPropagation();
                removeTab(t.id);
              }}
            >
              <IconClose size={11} />
            </button>
          </div>
        ))}
      </div>
      <button
        className="tab-add"
        onClick={openWithDialog}
        title="Open another PDF (Ctrl+O)"
      >
        <IconPlus size={14} />
      </button>
    </div>
  );
}
