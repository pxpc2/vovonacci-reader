import { pdfjs } from "./pdfSetup";
import type {
  PDFDocumentProxy,
  PDFPageProxy,
} from "pdfjs-dist/types/src/display/api";

export interface OutlineNode {
  title: string;
  dest: unknown;
  bold: boolean;
  italic: boolean;
  children: OutlineNode[];
  /** resolved 1-based page number (filled lazily) */
  page?: number;
}

export interface PageSize {
  /** width at scale 1, rotation 0 (in CSS px) */
  width: number;
  height: number;
}

export interface LoadedDoc {
  doc: PDFDocumentProxy;
  numPages: number;
  pageSizes: PageSize[];
  outline: OutlineNode[] | null;
  title: string | null;
  author: string | null;
}

// ---- Per-document caches ---------------------------------------------------
// Keyed by the PDFDocumentProxy itself so every open tab keeps its own page /
// text caches. Using a WeakMap means a document's caches are reclaimed by GC
// once its tab is closed and the proxy is dropped (we also call doc.destroy()).
interface DocCaches {
  pages: Map<number, Promise<PDFPageProxy>>;
  text: Map<number, Promise<TextSnapshot>>;
}
const docCaches = new WeakMap<PDFDocumentProxy, DocCaches>();

function cachesFor(doc: PDFDocumentProxy): DocCaches {
  let c = docCaches.get(doc);
  if (!c) {
    c = { pages: new Map(), text: new Map() };
    docCaches.set(doc, c);
  }
  return c;
}

export interface TextSnapshot {
  /** raw pdf.js text items (str + geometry), index-aligned */
  items: { str: string; width: number; height: number; transform: number[] }[];
  /** concatenated lowercase text for searching */
  lower: string;
  /** [start, end) offset of each item within `lower`/`text` */
  ranges: [number, number][];
}

export function getPageProxy(
  doc: PDFDocumentProxy,
  pageNumber: number
): Promise<PDFPageProxy> {
  const cache = cachesFor(doc).pages;
  let p = cache.get(pageNumber);
  if (!p) {
    p = doc.getPage(pageNumber);
    cache.set(pageNumber, p);
  }
  return p;
}

export function getTextSnapshot(
  doc: PDFDocumentProxy,
  pageNumber: number
): Promise<TextSnapshot> {
  const cache = cachesFor(doc).text;
  let p = cache.get(pageNumber);
  if (!p) {
    p = (async () => {
      const page = await getPageProxy(doc, pageNumber);
      const tc = await page.getTextContent();
      const items: TextSnapshot["items"] = [];
      const ranges: [number, number][] = [];
      let text = "";
      for (const raw of tc.items) {
        // marked-content items have no `str`
        if (!("str" in raw)) continue;
        const it = raw as {
          str: string;
          width: number;
          height: number;
          transform: number[];
          hasEOL?: boolean;
        };
        const start = text.length;
        text += it.str;
        const end = text.length;
        ranges.push([start, end]);
        items.push({
          str: it.str,
          width: it.width,
          height: it.height,
          transform: it.transform,
        });
        if (it.hasEOL) text += "\n";
      }
      return { items, lower: text.toLowerCase(), ranges };
    })();
    cache.set(pageNumber, p);
  }
  return p;
}

function normalizeOutline(raw: any[] | null): OutlineNode[] | null {
  if (!raw || raw.length === 0) return null;
  const walk = (nodes: any[]): OutlineNode[] =>
    nodes.map((n) => ({
      title: (n.title ?? "").trim() || "Untitled",
      dest: n.dest,
      bold: !!n.bold,
      italic: !!n.italic,
      children: n.items && n.items.length ? walk(n.items) : [],
    }));
  return walk(raw);
}

export async function loadDocument(
  data: ArrayBuffer,
  onPassword?: (retry: boolean) => Promise<string>
): Promise<LoadedDoc> {
  const task = pdfjs.getDocument({
    data: new Uint8Array(data),
    // bundled cmaps/fonts for proper glyph rendering of CJK/embedded fonts
    cMapUrl: "/cmaps/",
    cMapPacked: true,
    standardFontDataUrl: "/standard_fonts/",
  });

  if (onPassword) {
    task.onPassword = (
      updateCallback: (pw: string) => void,
      reason: number
    ) => {
      const retry = reason === pdfjs.PasswordResponses.INCORRECT_PASSWORD;
      onPassword(retry).then(
        (pw) => updateCallback(pw),
        () => task.destroy()
      );
    };
  }

  const doc = await task.promise;
  const numPages = doc.numPages;

  // Page sizes at scale 1 / rotation 0 — needed to lay out the scroll area.
  const pageSizes: PageSize[] = await Promise.all(
    Array.from({ length: numPages }, async (_, i) => {
      const page = await getPageProxy(doc, i + 1);
      const vp = page.getViewport({ scale: 1, rotation: 0 });
      return { width: vp.width, height: vp.height };
    })
  );

  const rawOutline = await doc.getOutline().catch(() => null);
  const outline = normalizeOutline(rawOutline);

  let title: string | null = null;
  let author: string | null = null;
  try {
    const meta = await doc.getMetadata();
    const info = meta.info as { Title?: string; Author?: string } | undefined;
    title = info?.Title?.trim() || null;
    author = info?.Author?.trim() || null;
  } catch {
    /* metadata is optional */
  }

  return { doc, numPages, pageSizes, outline, title, author };
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Bounding boxes (in CSS device px for `viewport`) of the raster images painted
 * on a page. Dark mode uses these to repaint photos in their true colors over
 * the inverted page so people/photographs don't look ghoulish.
 *
 * Walks the operator list maintaining the transform stack; every image is drawn
 * into the unit square under the current matrix, so its box is that square
 * mapped through (viewport.transform ∘ CTM). Form XObjects push their own matrix.
 */
export async function imageRects(
  doc: PDFDocumentProxy,
  pageNumber: number,
  viewport: { transform: number[] }
): Promise<Rect[]> {
  const page = await getPageProxy(doc, pageNumber);
  const ops = await page.getOperatorList();
  const OPS = (pdfjs as any).OPS;
  const Util = (pdfjs as any).Util;
  const imageOps = new Set<number>([
    OPS.paintImageXObject,
    OPS.paintInlineImageXObject,
    OPS.paintImageXObjectRepeat,
  ]);
  const IDENT = [1, 0, 0, 1, 0, 0];
  let ctm = IDENT;
  const stack: number[][] = [];
  const rects: Rect[] = [];
  const { fnArray, argsArray } = ops;
  for (let i = 0; i < fnArray.length; i++) {
    const fn = fnArray[i];
    if (fn === OPS.save) {
      stack.push(ctm);
    } else if (fn === OPS.restore) {
      ctm = stack.pop() || IDENT;
    } else if (fn === OPS.transform) {
      ctm = Util.transform(ctm, argsArray[i]);
    } else if (fn === OPS.paintFormXObjectBegin) {
      stack.push(ctm);
      const matrix = argsArray[i] && argsArray[i][0];
      if (matrix) ctm = Util.transform(ctm, matrix);
    } else if (fn === OPS.paintFormXObjectEnd) {
      ctm = stack.pop() || IDENT;
    } else if (imageOps.has(fn)) {
      const m = Util.transform(viewport.transform, ctm);
      const corners = [
        Util.applyTransform([0, 0], m),
        Util.applyTransform([1, 0], m),
        Util.applyTransform([1, 1], m),
        Util.applyTransform([0, 1], m),
      ];
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const [x, y] of corners) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
      rects.push({ x: minX, y: minY, w: maxX - minX, h: maxY - minY });
    }
  }
  return rects;
}

/** Resolve an outline/destination reference to a 1-based page number. */
export async function destToPage(
  doc: PDFDocumentProxy,
  dest: unknown
): Promise<number | null> {
  try {
    let explicit = dest;
    if (typeof dest === "string") {
      explicit = await doc.getDestination(dest);
    }
    if (!Array.isArray(explicit) || explicit.length === 0) return null;
    const ref = explicit[0];
    const index = await doc.getPageIndex(ref as any);
    return index + 1;
  } catch {
    return null;
  }
}
