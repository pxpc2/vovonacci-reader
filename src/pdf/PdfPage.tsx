import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist/types/src/display/api";
import { pdfjs } from "./pdfSetup";
import { getPageProxy, getTextSnapshot, type PageSize } from "./document";
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
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
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
