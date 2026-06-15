import { useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist/types/src/display/api";
import { destToPage, type OutlineNode } from "../../pdf/document";
import { useStore } from "../../state/store";
import { IconChevronRight } from "../Icons";

function OutlineRow({
  node,
  depth,
  doc,
}: {
  node: OutlineNode;
  depth: number;
  doc: PDFDocumentProxy;
}) {
  const [expanded, setExpanded] = useState(depth < 1);
  const requestGoto = useStore((s) => s.requestGoto);
  const hasChildren = node.children.length > 0;

  const jump = async () => {
    if (node.page == null) node.page = (await destToPage(doc, node.dest)) ?? undefined;
    if (node.page) requestGoto(node.page);
  };

  return (
    <div className="ol-node">
      <div
        className="ol-row"
        style={{ paddingLeft: 8 + depth * 14 }}
        onClick={jump}
        title={node.title}
      >
        <button
          className={"ol-caret" + (hasChildren ? "" : " hidden")}
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
        >
          <span className={"ol-caret-ic" + (expanded ? " open" : "")}>
            <IconChevronRight size={12} />
          </span>
        </button>
        <span
          className="ol-title"
          style={{
            fontWeight: node.bold ? 600 : 400,
            fontStyle: node.italic ? "italic" : "normal",
          }}
        >
          {node.title}
        </span>
      </div>
      {hasChildren && expanded && (
        <div className="ol-children">
          {node.children.map((c, i) => (
            <OutlineRow key={i} node={c} depth={depth + 1} doc={doc} />
          ))}
        </div>
      )}
    </div>
  );
}

export function OutlineTree({
  outline,
  doc,
}: {
  outline: OutlineNode[];
  doc: PDFDocumentProxy;
}) {
  return (
    <div className="outline-tree">
      {outline.map((n, i) => (
        <OutlineRow key={i} node={n} depth={0} doc={doc} />
      ))}
    </div>
  );
}
