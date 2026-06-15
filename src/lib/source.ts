import { invoke } from "@tauri-apps/api/core";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { loadDocument } from "../pdf/document";
import { useStore } from "../state/store";
import { requestPassword } from "./passwordPrompt";

function basename(path: string): string {
  const parts = path.split(/[\\/]/);
  return parts[parts.length - 1] || path;
}

/** Parse already-fetched bytes into the (already-created, loading) tab `id`. */
async function loadIntoTab(
  id: string,
  data: ArrayBuffer,
  fileName: string,
  filePath: string | null
): Promise<void> {
  const store = useStore.getState();
  try {
    const loaded = await loadDocument(data, requestPassword);
    store.fillTab(id, loaded);
    if (filePath) {
      store.addRecent({ path: filePath, name: fileName, ts: Date.now() });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/password/i.test(msg) || /cancel/i.test(msg)) {
      // user cancelled the password prompt — drop the placeholder tab
      store.removeTab(id);
      return;
    }
    store.failTab(id, `Could not open “${fileName}”. ${msg}`);
  }
}

/** Load a PDF from raw bytes already in the webview (drag-drop fallback). */
export async function openData(
  data: ArrayBuffer,
  fileName: string,
  filePath: string | null
): Promise<void> {
  const id = useStore.getState().openTab(fileName, filePath);
  await loadIntoTab(id, data, fileName, filePath);
}

/** Read a PDF from an absolute path via the Rust backend, then load it. */
export async function openPath(path: string): Promise<void> {
  const store = useStore.getState();
  // Already open? Just focus that tab instead of loading a duplicate.
  if (store.focusExisting(path)) return;

  const name = basename(path);
  // Create the tab up front so the user sees a loading tab while bytes are read.
  const id = store.openTab(name, path);
  try {
    const buf = await invoke<ArrayBuffer>("read_pdf", { path });
    // invoke may hand back ArrayBuffer or a number[] depending on transport
    const data =
      buf instanceof ArrayBuffer ? buf : new Uint8Array(buf as number[]).buffer;
    await loadIntoTab(id, data, name, path);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    useStore.getState().failTab(id, `Could not read “${name}”. ${msg}`);
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
