import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist/types/src/display/api";
import { getPageProxy, type PageSize } from "../../pdf/document";
import { useStore, activeTab } from "../../state/store";

const THUMB_W = 132;

function Thumb({
  doc,
  pageNumber,
  baseSize,
  active,
}: {
  doc: PDFDocumentProxy;
  pageNumber: number;
  baseSize: PageSize;
  active: boolean;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(false);
  const requestGoto = useStore((s) => s.requestGoto);

  const ratio = baseSize.height / baseSize.width;
  const thumbH = Math.round(THUMB_W * ratio);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => entries[0]?.isIntersecting && setVisible(true),
      { rootMargin: "300px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    let task: { cancel: () => void } | null = null;
    (async () => {
      try {
        const page = await getPageProxy(doc, pageNumber);
        if (cancelled) return;
        const scale = THUMB_W / baseSize.width;
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas) return;
        const os = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * os);
        canvas.height = Math.floor(viewport.height * os);
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        task = page.render({
          canvas: null,
          canvasContext: ctx,
          viewport,
          transform: os !== 1 ? [os, 0, 0, os, 0, 0] : undefined,
        });
        await (task as any).promise;
      } catch {
        /* cancelled */
      }
    })();
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [visible, doc, pageNumber, baseSize.width]);

  return (
    <button
      ref={ref}
      className={"thumb" + (active ? " active" : "")}
      onClick={() => requestGoto(pageNumber)}
    >
      <div className="thumb-canvas-wrap" style={{ width: THUMB_W, height: thumbH }}>
        <canvas ref={canvasRef} />
      </div>
      <span className="thumb-num mono-num">{pageNumber}</span>
    </button>
  );
}

export function ThumbnailList({
  doc,
  numPages,
  pageSizes,
}: {
  doc: PDFDocumentProxy;
  numPages: number;
  pageSizes: PageSize[];
}) {
  const currentPage = useStore((s) => activeTab(s)?.currentPage ?? 1);
  return (
    <div className="thumb-list">
      {Array.from({ length: numPages }, (_, i) => {
        const bs = pageSizes[i] ?? pageSizes[0];
        if (!bs) return null;
        return (
          <Thumb
            key={i}
            doc={doc}
            pageNumber={i + 1}
            baseSize={bs}
            active={currentPage === i + 1}
          />
        );
      })}
    </div>
  );
}
