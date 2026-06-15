import { useUpdater } from "../lib/updater";
import { IconDownload } from "./Icons";

export function UpdateModal() {
  const phase = useUpdater((s) => s.phase);
  const interactive = useUpdater((s) => s.interactive);
  const version = useUpdater((s) => s.version);
  const notes = useUpdater((s) => s.notes);
  const progress = useUpdater((s) => s.progress);
  const error = useUpdater((s) => s.error);
  const install = useUpdater((s) => s.install);
  const check = useUpdater((s) => s.check);
  const dismiss = useUpdater((s) => s.dismiss);

  if (phase === "idle") return null;
  // "checking" / "uptodate" only matter for a manual check — never flash them
  // on the silent launch check.
  if ((phase === "checking" || phase === "uptodate") && !interactive) return null;

  const downloading = phase === "downloading";
  const ready = phase === "ready";
  const busy = downloading || ready;
  const checking = phase === "checking";
  const upToDate = phase === "uptodate";
  const pct = Math.round(progress * 100);

  const heading = upToDate
    ? "UP TO DATE"
    : checking
    ? "CHECKING FOR UPDATES"
    : "UPDATE AVAILABLE";

  return (
    <div className="modal-scrim" onMouseDown={busy ? undefined : dismiss}>
      <div className="modal update-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="update-head">
          <span className="update-ic">
            <IconDownload size={18} />
          </span>
          <div>
            <div className="modal-title label">{heading}</div>
            {version && !upToDate && !checking && (
              <div className="update-version mono-num">v{version}</div>
            )}
          </div>
        </div>

        {phase === "error" ? (
          <p className="modal-text update-error">{error}</p>
        ) : ready ? (
          <p className="modal-text">Installed — relaunching…</p>
        ) : checking ? (
          <div className="update-bar">
            <div className="update-bar-fill indeterminate" />
          </div>
        ) : upToDate ? (
          <p className="modal-text">You're on the latest version.</p>
        ) : downloading ? (
          <>
            <p className="modal-text">Downloading update…</p>
            <div className="update-bar">
              <div
                className={"update-bar-fill" + (progress > 0 ? "" : " indeterminate")}
                style={progress > 0 ? { width: `${pct}%` } : undefined}
              />
            </div>
            {progress > 0 && <div className="update-pct mono-num">{pct}%</div>}
          </>
        ) : (
          <>
            <p className="modal-text">
              A new version of Vovonacci Reader is ready to install.
            </p>
            {notes && <div className="update-notes">{notes}</div>}
          </>
        )}

        {!busy && !checking && (
          <div className="modal-actions">
            {upToDate ? (
              <button className="modal-btn primary" onClick={dismiss}>
                CLOSE
              </button>
            ) : phase === "error" ? (
              <>
                <button className="modal-btn ghost" onClick={dismiss}>
                  CLOSE
                </button>
                <button
                  className="modal-btn primary"
                  onClick={() => check({ silent: false })}
                >
                  RETRY
                </button>
              </>
            ) : (
              <>
                <button className="modal-btn ghost" onClick={dismiss}>
                  LATER
                </button>
                <button className="modal-btn primary" onClick={install}>
                  UPDATE &amp; RELAUNCH
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
