import { invoke } from "@tauri-apps/api/core";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { loadDocument } from "../pdf/document";
import { useStore } from "../state/store";
import { requestPassword } from "./passwordPrompt";

function basename(path: string): string {
  const parts = path.split(/[\\/]/);
  return parts[parts.length - 1] || path;
}

/** Load a PDF from raw bytes already in the webview. */
export async function openData(
  data: ArrayBuffer,
  fileName: string,
  filePath: string | null
): Promise<void> {
  const store = useStore.getState();
  store.beginLoad();
  try {
    const loaded = await loadDocument(data, requestPassword);
    store.setLoaded(loaded, fileName, filePath);
    if (filePath) {
      store.addRecent({ path: filePath, name: fileName, ts: Date.now() });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/password/i.test(msg) || /cancel/i.test(msg)) {
      // user cancelled the password prompt — return to idle rather than error
      store.reset();
      return;
    }
    store.setError(`Could not open “${fileName}”. ${msg}`);
  }
}

/** Read a PDF from an absolute path via the Rust backend, then load it. */
export async function openPath(path: string): Promise<void> {
  const name = basename(path);
  try {
    const buf = await invoke<ArrayBuffer>("read_pdf", { path });
    // invoke may hand back ArrayBuffer or a number[] depending on transport
    const data =
      buf instanceof ArrayBuffer ? buf : new Uint8Array(buf as number[]).buffer;
    await openData(data, name, path);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    useStore.getState().setError(`Could not read “${name}”. ${msg}`);
  }
}

/** Show the native open dialog and load the chosen PDF. */
export async function openWithDialog(): Promise<void> {
  const selected = await openDialog({
    multiple: false,
    directory: false,
    filters: [{ name: "PDF Document", extensions: ["pdf"] }],
  });
  if (typeof selected === "string") {
    await openPath(selected);
  }
}

/** Load a PDF from a browser File (drag-drop fallback when not running in Tauri). */
export async function openFile(file: File): Promise<void> {
  const data = await file.arrayBuffer();
  await openData(data, file.name, null);
}
