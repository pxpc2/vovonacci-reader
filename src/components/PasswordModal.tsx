import { useEffect, useState } from "react";
import { usePasswordPrompt } from "../lib/passwordPrompt";

export function PasswordModal() {
  const pending = usePasswordPrompt((s) => s.pending);
  const submit = usePasswordPrompt((s) => s.submit);
  const cancel = usePasswordPrompt((s) => s.cancel);
  const [pw, setPw] = useState("");

  useEffect(() => {
    if (pending) setPw("");
  }, [pending]);

  if (!pending) return null;

  return (
    <div className="modal-scrim" onMouseDown={cancel}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-title label">ENCRYPTED DOCUMENT</div>
        <p className="modal-text">
          {pending.retry
            ? "Incorrect password. Try again."
            : "This PDF is password protected."}
        </p>
        <input
          className="search-input modal-input"
          type="password"
          autoFocus
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="Password"
          onKeyDown={(e) => {
            if (e.key === "Enter") submit(pw);
            else if (e.key === "Escape") cancel();
          }}
        />
        <div className="modal-actions">
          <button className="modal-btn ghost" onClick={cancel}>
            CANCEL
          </button>
          <button className="modal-btn primary" onClick={() => submit(pw)}>
            UNLOCK
          </button>
        </div>
      </div>
    </div>
  );
}
