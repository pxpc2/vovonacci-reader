import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../state/store";
import type { SearchMatch } from "../state/store";
import { PdfPage } from "./PdfPage";

const PAD = 24;
const GAP = 16;
const SCROLLBAR = 14;
const EMPTY: SearchMatch[] = [];

export function PdfViewer() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const doc = useStore((s) => s.doc);
  const numPages = useStore((s) => s.numPages);
  const pageSizes = useStore((s) => s.pageSizes);
  const scale = useStore((s) => s.scale);
  const zoomMode = useStore((s) => s.zoomMode);
  const rotation = useStore((s) => s.rotation);
  const goto = useStore((s) => s.goto);
  const setCurrentPage = useStore((s) => s.setCurrentPage);
  const matches = useStore((s) => s.search.matches);
  const activeIdx = useStore((s) => s.search.active);

  const [range, setRange] = useState({ start: 0, end: 4 });

  const layout = useMemo(() => {
    const tops: number[] = [];
    const heights: number[] = [];
    const swap = rotation % 180 !== 0;
    let y = PAD;
    let maxW = 0;
    for (let i = 0; i < numPages; i++) {
      const bs = pageSizes[i] ?? pageSizes[0];
      const h = bs ? Math.floor((swap ? bs.width : bs.height) * scale) : 800;
      const w = bs ? Math.floor((swap ? bs.height : bs.width) * scale) : 600;
      if (w > maxW) maxW = w;
      tops.push(y);
      heights.push(h);
      y += h + GAP;
    }
    return { tops, heights, total: y - GAP + PAD, maxW };
  }, [pageSizes, scale, rotation, numPages]);

  const matchesByPage = useMemo(() => {
    const m = new Map<number, SearchMatch[]>();
    for (const match of matches) {
      const arr = m.get(match.page);
      if (arr) arr.push(match);
      else m.set(match.page, [match]);
    }
    return m;
  }, [matches]);
  const activeMatch = activeIdx >= 0 ? matches[activeIdx] ?? null : null;

  // --- visible range + current page, throttled to animation frames ---
  const rafRef = useRef(0);
  const updateRange = () => {
    const el = scrollRef.current;
    if (!el) return;
    const top = el.scrollTop;
    const bottom = top + el.clientHeight;
    const margin = el.clientHeight;
    let start = numPages;
    let end = -1;
    for (let i = 0; i < numPages; i++) {
      const t = layout.tops[i];
      const b = t + layout.heights[i];
      if (b >= top - margin && t <= bottom + margin) {
        if (i < start) start = i;
        if (i > end) end = i;
      }
    }
    if (start > end) {
      start = 0;
      end = Math.min(numPages - 1, 2);
    }
    setRange({ start, end });

    const center = top + el.clientHeight * 0.4;
    let cur = 1;
    for (let i = 0; i < numPages; i++) {
      if (layout.tops[i] <= center) cur = i + 1;
      else break;
    }
    setCurrentPage(cur);
  };

  const onScroll = () => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      updateRange();
    });
  };

  // recompute range whenever layout changes
  useEffect(() => {
    updateRange();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout]);

  // --- fit-to-width / fit-to-page ---
  const recomputeFit = () => {
    const el = scrollRef.current;
    const bs = pageSizes[0];
    if (!el || !bs || zoomMode === "custom") return;
    const swap = rotation % 180 !== 0;
    const refW = swap ? bs.height : bs.width;
    const refH = swap ? bs.width : bs.height;
    const availW = el.clientWidth - PAD * 2 - SCROLLBAR;
    const availH = el.clientHeight - PAD * 2;
    let s = availW / refW;
    if (zoomMode === "fit-page") s = Math.min(s, availH / refH);
    s = Math.max(0.2, Math.min(6, s));
    if (Math.abs(s - scale) > 0.001) useStore.setState({ scale: s });
  };

  useLayoutEffect(() => {
    recomputeFit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoomMode, rotation, pageSizes]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      recomputeFit();
      updateRange();
    });
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoomMode, rotation, pageSizes, layout]);

  // --- keep reading position anchored across zoom/rotation changes ---
  const prevScale = useRef(scale);
  useLayoutEffect(() => {
    if (prevScale.current !== scale) {
      const el = scrollRef.current;
      if (el) {
        const cur = useStore.getState().currentPage;
        el.scrollTop = Math.max(0, layout.tops[cur - 1] - PAD);
      }
      prevScale.current = scale;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale, layout]);

  // --- goto navigation ---
  useEffect(() => {
    if (!goto) return;
    const el = scrollRef.current;
    if (!el) return;
    const top = Math.max(0, (layout.tops[goto.page - 1] ?? 0) - PAD);
    el.scrollTo({ top, behavior: "smooth" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goto]);

  if (!doc) return null;

  return (
    <div className="pdf-viewport" ref={scrollRef} onScroll={onScroll}>
      <div
        className="pdf-scroll"
        style={{ height: layout.total, width: layout.maxW + PAD * 2 }}
      >
        {Array.from({ length: numPages }, (_, i) => {
          const bs = pageSizes[i] ?? pageSizes[0];
          if (!bs) return null;
          return (
            <div
              className="pdf-slot"
              style={{ top: layout.tops[i] }}
              key={i}
            >
              <PdfPage
                doc={doc}
                pageNumber={i + 1}
                baseSize={bs}
                scale={scale}
                rotation={rotation}
                render={i >= range.start && i <= range.end}
                matches={matchesByPage.get(i + 1) ?? EMPTY}
                activeMatch={activeMatch}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
