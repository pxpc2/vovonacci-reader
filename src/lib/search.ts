import type { PDFDocumentProxy } from "pdfjs-dist/types/src/display/api";
import { getTextSnapshot } from "../pdf/document";
import type { SearchMatch } from "../state/store";

/**
 * Scan every page for `query` and return the matches in reading order. Each match
 * records the text-item indices it spans so the page renderer can draw highlight
 * boxes. `shouldCancel` lets a newer search supersede an in-flight one.
 */
export async function runSearch(
  doc: PDFDocumentProxy,
  numPages: number,
  query: string,
  shouldCancel: () => boolean
): Promise<SearchMatch[] | null> {
  const q = query.toLowerCase();
  if (!q) return [];
  const matches: SearchMatch[] = [];

  for (let page = 1; page <= numPages; page++) {
    if (shouldCancel()) return null;
    const snap = await getTextSnapshot(doc, page);
    let idx = snap.lower.indexOf(q);
    while (idx !== -1) {
      const end = idx + q.length;
      const items: number[] = [];
      for (let i = 0; i < snap.ranges.length; i++) {
        const [s, e] = snap.ranges[i];
        if (s < end && e > idx) items.push(i);
        else if (s >= end) break;
      }
      if (items.length) matches.push({ page, items });
      idx = snap.lower.indexOf(q, idx + Math.max(1, q.length));
    }
  }
  return matches;
}
