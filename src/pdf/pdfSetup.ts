// Central PDF.js entry point. Importing this module configures the worker once.
// The `?worker` suffix tells Vite to bundle pdf.worker as a dedicated web worker,
// which is the reliable way to run PDF.js inside a Tauri/Vite webview (no CDN,
// no cross-origin worker fetch).
import * as pdfjs from "pdfjs-dist";
import PdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?worker";

pdfjs.GlobalWorkerOptions.workerPort = new PdfWorker();

export { pdfjs };
export const PDFJS_VERSION = pdfjs.version;
