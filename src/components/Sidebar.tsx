import { useStore } from "../state/store";
import { OutlineTree } from "./sidebar/OutlineTree";
import { ThumbnailList } from "./sidebar/ThumbnailList";

export function Sidebar() {
  const open = useStore((s) => s.sidebarOpen);
  const doc = useStore((s) => s.doc);
  const outline = useStore((s) => s.outline);
  const numPages = useStore((s) => s.numPages);
  const pageSizes = useStore((s) => s.pageSizes);
  const tab = useStore((s) => s.sidebarTab);
  const setTab = useStore((s) => s.setSidebarTab);

  if (!open || !doc) return null;

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
