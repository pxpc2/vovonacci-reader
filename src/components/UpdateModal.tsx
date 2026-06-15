import { useUpdater } from "../lib/updater";
import { IconDownload } from "./Icons";

export function UpdateModal() {
  const phase = useUpdater((s) => s.phase);
  const version = useUpdater((s) => s.version);
  const notes = useUpdater((s) => s.notes);
  const progress = useUpdater((s) => s.progress);
  const error = useUpdater((s) => s.error);
  const install = useUpdater((s) => s.install);
  const dismiss = useUpdater((s) => s.dismiss);

  // Only surfaces once there's something to act on.
  if (phase === "idle" || phase === "checking") return null;

  const downloading = phase === "downloading";
  const ready = phase === "ready";
  const pct = Math.round(progress * 100);

  return (
    <div className="modal-scrim" onMouseDown={downloading || ready ? undefined : dismiss}>
      <div className="modal update-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="update-head">
          <span className="update-ic">
            <IconDownload size={18} />
          </span>
          <div>
            <div className="modal-title label">UPDATE AVAILABLE</div>
            {version && (
              <div className="update-version mono-num">v{version}</div>
            )}
          </div>
        </div>

        {phase === "error" ? (
          <p className="modal-text update-error">{error}</p>
        ) : ready ? (
          <p className="modal-text">Installed — relaunching…</p>
        ) : downloading ? (
          <>
            <p className="modal-text">Downloading update…</p>
            <div className="update-bar">
              <div
                className={"update-bar-fill" + (progress > 0 ? "" : " indeterminate")}
                style={progress > 0 ? { width: `${pct}%` } : undefined}
              />
            </div>
            {progress > 0 && (
              <div className="update-pct mono-num">{pct}%</div>
            )}
          </>
        ) : (
          <>
            <p className="modal-text">
              A new version of Vovonacci Reader is ready to install.
            </p>
            {notes && <div className="update-notes">{notes}</div>}
          </>
        )}

        {!downloading && !ready && (
          <div className="modal-actions">
            <button className="modal-btn ghost" onClick={dismiss}>
              LATER
            </button>
            <button className="modal-btn primary" onClick={install}>
              {phase === "error" ? "RETRY" : "UPDATE & RELAUNCH"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
