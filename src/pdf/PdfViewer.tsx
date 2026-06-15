import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useStore, activeTab } from "../state/store";
import type { PageSize } from "./document";
import type { SearchMatch } from "../state/store";
import { PdfPage } from "./PdfPage";

const PAD = 24;
const GAP = 16;
const SCROLLBAR = 14;
const EMPTY: SearchMatch[] = [];
const EMPTY_SIZES: PageSize[] = [];

export function PdfViewer() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const doc = useStore((s) => activeTab(s)?.doc ?? null);
  const numPages = useStore((s) => activeTab(s)?.numPages ?? 0);
  const pageSizes = useStore((s) => activeTab(s)?.pageSizes ?? EMPTY_SIZES);
  const scale = useStore((s) => activeTab(s)?.scale ?? 1);
  const zoomMode = useStore((s) => activeTab(s)?.zoomMode ?? "fit-width");
  const rotation = useStore((s) => activeTab(s)?.rotation ?? 0);
  const invert = useStore((s) => activeTab(s)?.invert ?? false);
  const goto = useStore((s) => activeTab(s)?.goto ?? null);
  const setCurrentPage = useStore((s) => s.setCurrentPage);
  const matches = useStore((s) => activeTab(s)?.search.matches ?? EMPTY);
  const activeIdx = useStore((s) => activeTab(s)?.search.active ?? -1);

  const [range, setRange] = useState({ start: 0, end: 4 });
  const [viewportW, setViewportW] = useState(0);

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

  // Latest layout, readable from rAF callbacks without re-binding effects.
  const layoutRef = useRef(layout);
  layoutRef.current = layout;

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

  // On mount (this viewer is keyed by tab id, so it remounts per tab), restore
  // the tab's last reading position. We wait two frames so the fit-to-width
  // layout effect has settled the scale before computing the offset.
  useEffect(() => {
    const page = activeTab(useStore.getState())?.currentPage ?? 1;
    if (page <= 1) return; // fresh doc / first page — already at top
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        const el = scrollRef.current;
        if (el) el.scrollTop = Math.max(0, layoutRef.current.tops[page - 1] - PAD);
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- fit-to-width / fit-to-page ---
  const recomputeFit = () => {
    const el = scrollRef.current;
    if (!el || !pageSizes.length || zoomMode === "custom") return;
    const swap = rotation % 180 !== 0;
    // Fit against the document's widest/tallest page so no page overflows and a
    // small first page (half-title/cover) doesn't over-zoom the whole document.
    let refW = 0;
    let refH = 0;
    for (const s of pageSizes) {
      const w = swap ? s.height : s.width;
      const h = swap ? s.width : s.height;
      if (w > refW) refW = w;
      if (h > refH) refH = h;
    }
    const availW = el.clientWidth - PAD * 2 - SCROLLBAR;
    const availH = el.clientHeight - PAD * 2;
    let s = availW / refW;
    if (zoomMode === "fit-page") s = Math.min(s, availH / refH);
    s = Math.max(0.2, Math.min(6, s));
    if (Math.abs(s - scale) > 0.001) useStore.getState().applyFitScale(s);
  };

  useLayoutEffect(() => {
    recomputeFit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoomMode, rotation, pageSizes]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setViewportW(el.clientWidth);
      recomputeFit();
      updateRange();
    });
    ro.observe(el);
    setViewportW(el.clientWidth);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoomMode, rotation, pageSizes, layout]);

  // --- keep reading position anchored across zoom/rotation changes ---
  const prevScale = useRef(scale);
  useLayoutEffect(() => {
    if (prevScale.current !== scale) {
      const el = scrollRef.current;
      if (el) {
        const cur = activeTab(useStore.getState())?.currentPage ?? 1;
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

  // Pixel-snapped horizontal centering: an integer-width scroll area, with each
  // page placed at a rounded `left`. This avoids the half-pixel offset that
  // `translateX(-50%)` produces on odd page widths (which resamples the canvas
  // and looks blurry at dpr=1 until a zoom change happens to land on an even px).
  const swapWH = rotation % 180 !== 0;
  const scrollW = Math.max(viewportW, layout.maxW + PAD * 2);

  return (
    <div className="pdf-viewport" ref={scrollRef} onScroll={onScroll}>
      <div
        className="pdf-scroll"
        style={{ height: layout.total, width: scrollW }}
      >
        {Array.from({ length: numPages }, (_, i) => {
          const bs = pageSizes[i] ?? pageSizes[0];
          if (!bs) return null;
          const pageW = Math.floor((swapWH ? bs.height : bs.width) * scale);
          const left = Math.max(0, Math.round((scrollW - pageW) / 2));
          return (
            <div
              className="pdf-slot"
              style={{ top: layout.tops[i], left }}
              key={i}
            >
              <PdfPage
                doc={doc}
                pageNumber={i + 1}
                baseSize={bs}
                scale={scale}
                rotation={rotation}
                render={i >= range.start && i <= range.end}
                invert={invert}
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
