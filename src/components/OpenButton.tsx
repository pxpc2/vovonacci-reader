import { useEffect, useRef, useState } from "react";
import { useStore } from "../state/store";
import { openWithDialog, openPath } from "../lib/source";
import { IconOpen, IconChevronDown } from "./Icons";

export function OpenButton() {
  const recents = useStore((s) => s.recents);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const browse = () => {
    setOpen(false);
    openWithDialog();
  };
  const pick = (path: string) => {
    setOpen(false);
    openPath(path);
  };

  return (
    <div className="open-menu-wrap" ref={wrapRef}>
      <button
        className={"tb-btn" + (open ? " active" : "")}
        onClick={() => setOpen((o) => !o)}
        title="Open PDF"
      >
        <IconOpen />
        <span className="tb-btn-label">OPEN</span>
        <IconChevronDown size={12} />
      </button>

      {open && (
        <div className="open-menu" role="menu">
          <button className="open-menu-item" onClick={browse}>
            <IconOpen size={14} />
            <span>Open from file explorer…</span>
          </button>
          <div className="open-menu-sep" />
          <div className="open-menu-head label">RECENT</div>
          {recents.length === 0 ? (
            <div className="open-menu-empty label">No recent files</div>
          ) : (
            <div className="open-menu-recents">
              {recents.map((r) => (
                <button
                  key={r.path}
                  className="open-menu-recent"
                  onClick={() => pick(r.path)}
                  title={r.path}
                >
                  <span className="open-menu-name">{r.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
