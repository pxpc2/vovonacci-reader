import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist/types/src/display/api";
import { pdfjs } from "./pdfSetup";
import { getPageProxy, getTextSnapshot, imageRects, type PageSize } from "./document";
import type { SearchMatch } from "../state/store";

const { TextLayer, Util, RenderingCancelledException } = pdfjs as any;

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
  active: boolean;
}

interface Props {
  doc: PDFDocumentProxy;
  pageNumber: number;
  baseSize: PageSize;
  scale: number;
  rotation: number;
  /** when false the page is virtualized away — slot keeps its size but no canvas */
  render: boolean;
  /** dark-mode: invert the rendered canvas (hue-preserving) */
  invert: boolean;
  matches: SearchMatch[];
  activeMatch: SearchMatch | null;
}

export function PdfPage({
  doc,
  pageNumber,
  baseSize,
  scale,
  rotation,
  render: shouldRender,
  invert,
  matches,
  activeMatch,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgCanvasRef = useRef<HTMLCanvasElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [painted, setPainted] = useState(false);
  const [boxes, setBoxes] = useState<Box[]>([]);

  const swap = rotation % 180 !== 0;
  const dispW = Math.floor((swap ? baseSize.height : baseSize.width) * scale);
  const dispH = Math.floor((swap ? baseSize.width : baseSize.height) * scale);

  // ---- Canvas + text layer ----
  useEffect(() => {
    if (!shouldRender) {
      setPainted(false);
      return;
    }
    let cancelled = false;
    let renderTask: { cancel: () => void } | null = null;

    (async () => {
      try {
        const page = await getPageProxy(doc, pageNumber);
        if (cancelled) return;
        const viewport = page.getViewport({ scale, rotation });
        const canvas = canvasRef.current;
        if (!canvas) return;
        const outputScale = window.devicePixelRatio || 1;
        // Backing store = the integer CSS size × dpr (rounded to whole device
        // pixels). Deriving both from the same integer CSS size keeps the buffer
        // an exact dpr multiple, so the canvas isn't resampled (stays crisp).
        const cssW = Math.floor(viewport.width);
        const cssH = Math.floor(viewport.height);
        canvas.width = Math.round(cssW * outputScale);
        canvas.height = Math.round(cssH * outputScale);
        canvas.style.width = `${cssW}px`;
        canvas.style.height = `${cssH}px`;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const transform =
          outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined;

        renderTask = page.render({
          canvas: null,
          canvasContext: ctx,
          viewport,
          transform,
        });
        await (renderTask as any).promise;
        if (cancelled) return;
        setPainted(true);

        // Text layer (selection + copy)
        const textDiv = textRef.current;
        if (textDiv) {
          textDiv.replaceChildren();
          textDiv.style.setProperty("--total-scale-factor", String(scale));
          textDiv.style.setProperty("--scale-round-x", "1px");
          textDiv.style.setProperty("--scale-round-y", "1px");
          textDiv.style.width = `${Math.floor(viewport.width)}px`;
          textDiv.style.height = `${Math.floor(viewport.height)}px`;
          const tl = new TextLayer({
            textContentSource: page.streamTextContent(),
            container: textDiv,
            viewport,
          });
          await tl.render();
        }
      } catch (err) {
        if (!(err instanceof RenderingCancelledException)) {
          // a stale render that lost its canvas etc. — safe to ignore
          if (!cancelled) console.error(`page ${pageNumber} render failed`, err);
        }
      }
    })();

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [doc, pageNumber, scale, rotation, shouldRender]);

  // ---- Search highlight boxes ----
  useEffect(() => {
    if (!shouldRender || matches.length === 0) {
      setBoxes([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const page = await getPageProxy(doc, pageNumber);
      const snap = await getTextSnapshot(doc, pageNumber);
      if (cancelled) return;
      const viewport = page.getViewport({ scale, rotation });
      const next: Box[] = [];
      for (const m of matches) {
        const isActive = m === activeMatch;
        for (const i of m.items) {
          const it = snap.items[i];
          if (!it) continue;
          const tx = Util.transform(viewport.transform, it.transform);
          const fontHeight = Math.hypot(tx[2], tx[3]);
          const width = it.width * viewport.scale;
          next.push({
            left: tx[4],
            top: tx[5] - fontHeight,
            width,
            height: fontHeight,
            active: isActive,
          });
        }
      }
      if (!cancelled) setBoxes(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [doc, pageNumber, scale, rotation, shouldRender, matches, activeMatch]);

  // ---- Dark-mode image preservation ----
  // The whole page canvas is CSS-inverted; here we repaint just the raster image
  // regions in their ORIGINAL colors onto a non-inverted overlay above it, so
  // photographs/people don't get inverted (vector charts/text still invert).
  useEffect(() => {
    const overlay = imgCanvasRef.current;
    if (overlay) {
      const octx = overlay.getContext("2d");
      octx?.clearRect(0, 0, overlay.width, overlay.height);
    }
    if (!invert || !shouldRender || !painted) return;
    let cancelled = false;
    (async () => {
      try {
        const page = await getPageProxy(doc, pageNumber);
        if (cancelled) return;
        const viewport = page.getViewport({ scale, rotation });
        const rects = await imageRects(doc, pageNumber, viewport);
        if (cancelled || rects.length === 0) return;
        const main = canvasRef.current;
        const ov = imgCanvasRef.current;
        if (!main || !ov) return;
        const os = window.devicePixelRatio || 1;
        ov.width = main.width;
        ov.height = main.height;
        ov.style.width = main.style.width;
        ov.style.height = main.style.height;
        const ctx = ov.getContext("2d");
        if (!ctx) return;
        ctx.clearRect(0, 0, ov.width, ov.height);
        for (const r of rects) {
          let sx = Math.floor(r.x * os);
          let sy = Math.floor(r.y * os);
          let sw = Math.ceil(r.w * os);
          let sh = Math.ceil(r.h * os);
          // clamp to the canvas (images can extend slightly past the crop box)
          sx = Math.max(0, Math.min(sx, main.width));
          sy = Math.max(0, Math.min(sy, main.height));
          sw = Math.min(sw, main.width - sx);
          sh = Math.min(sh, main.height - sy);
          if (sw <= 0 || sh <= 0) continue;
          // copy ORIGINAL pixels from the page canvas (CSS filter is display-only)
          ctx.drawImage(main, sx, sy, sw, sh, sx, sy, sw, sh);
        }
      } catch {
        /* operator list unavailable — leave the page fully inverted */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [invert, shouldRender, painted, scale, rotation, doc, pageNumber]);

  return (
    <div
      className={"pdf-page" + (invert ? " invert" : "")}
      data-page={pageNumber}
      style={{ width: dispW, height: dispH }}
    >
      {!painted && <div className="pdf-page-skeleton" />}
      {shouldRender && (
        <>
          <canvas ref={canvasRef} className="pdf-page-canvas" />
          <canvas ref={imgCanvasRef} className="pdf-page-imglayer" aria-hidden />
          <div className="pdf-page-highlights" aria-hidden>
            {boxes.map((b, idx) => (
              <div
                key={idx}
                className={"pdf-hl" + (b.active ? " active" : "")}
                style={{
                  left: b.left,
                  top: b.top,
                  width: b.width,
                  height: b.height,
                }}
              />
            ))}
          </div>
          <div ref={textRef} className="textLayer" />
        </>
      )}
      <div className="pdf-page-num label">{pageNumber}</div>
    </div>
  );
}
