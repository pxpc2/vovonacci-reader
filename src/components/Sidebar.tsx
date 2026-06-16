import { useStore, activeTab } from "../state/store";
import type { PageSize } from "../pdf/document";
import { OutlineTree } from "./sidebar/OutlineTree";
import { ThumbnailList } from "./sidebar/ThumbnailList";

const EMPTY_SIZES: PageSize[] = [];

export function Sidebar() {
  const open = useStore((s) => s.sidebarOpen);
  const home = useStore((s) => s.home);
  const doc = useStore((s) => activeTab(s)?.doc ?? null);
  const outline = useStore((s) => activeTab(s)?.outline ?? null);
  const numPages = useStore((s) => activeTab(s)?.numPages ?? 0);
  const pageSizes = useStore((s) => activeTab(s)?.pageSizes ?? EMPTY_SIZES);
  const tab = useStore((s) => activeTab(s)?.sidebarTab ?? "outline");
  const setTab = useStore((s) => s.setSidebarTab);

  if (!open || !doc || home) return null;

  return (
    <aside className="sidebar">
      <div className="sidebar-tabs">
        {outline && (
          <button
            className={"sb-tab" + (tab === "outline" ? " active" : "")}
            onClick={() => setTab("outline")}
          >
            CONTENTS
          </button>
        )}
        <button
          className={"sb-tab" + (tab === "thumbnails" ? " active" : "")}
          onClick={() => setTab("thumbnails")}
        >
          PAGES
        </button>
      </div>
      <div className="sidebar-body">
        {tab === "outline" && outline ? (
          <OutlineTree outline={outline} doc={doc} />
        ) : (
          <ThumbnailList doc={doc} numPages={numPages} pageSizes={pageSizes} />
        )}
      </div>
    </aside>
  );
}
