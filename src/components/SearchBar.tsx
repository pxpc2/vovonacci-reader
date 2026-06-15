import { useEffect, useRef } from "react";
import { useStore } from "../state/store";
import { runSearch } from "../lib/search";
import { IconChevronUp, IconChevronDown, IconClose } from "./Icons";

export function SearchBar() {
  const open = useStore((s) => s.search.open);
  const query = useStore((s) => s.search.query);
  const matches = useStore((s) => s.search.matches);
  const active = useStore((s) => s.search.active);
  const building = useStore((s) => s.search.building);
  const doc = useStore((s) => s.doc);
  const numPages = useStore((s) => s.numPages);

  const setSearchQuery = useStore((s) => s.setSearchQuery);
  const setSearchResults = useStore((s) => s.setSearchResults);
  const setSearchBuilding = useStore((s) => s.setSearchBuilding);
  const nextMatch = useStore((s) => s.nextMatch);
  const prevMatch = useStore((s) => s.prevMatch);
  const closeSearch = useStore((s) => s.closeSearch);
  const requestGoto = useStore((s) => s.requestGoto);

  const inputRef = useRef<HTMLInputElement>(null);
  const genRef = useRef(0);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Debounced search whenever the query changes.
  useEffect(() => {
    if (!doc) return;
    const gen = ++genRef.current;
    const q = query.trim();
    if (!q) {
      setSearchResults([]);
      return;
    }
    setSearchBuilding(true);
    const t = setTimeout(async () => {
      const result = await runSearch(doc, numPages, q, () => gen !== genRef.current);
      if (result === null || gen !== genRef.current) return;
      setSearchResults(result);
      if (result.length) requestGoto(result[0].page);
    }, 220);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, doc, numPages]);

  if (!open) return null;

  const count = matches.length;
  const status = building
    ? "…"
    : count
    ? `${active + 1} / ${count}`
    : query.trim()
    ? "0 / 0"
    : "";

  return (
    <div className="searchbar">
      <input
        ref={inputRef}
        className="search-input"
        placeholder="Find in document"
        value={query}
        onChange={(e) => setSearchQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.shiftKey ? prevMatch : nextMatch)();
          else if (e.key === "Escape") closeSearch();
        }}
      />
      <span className={"search-count mono-num" + (count ? "" : " empty")}>{status}</span>
      <button
        className="tb-btn"
        onClick={prevMatch}
        disabled={!count}
        title="Previous match (Shift+Enter)"
      >
        <IconChevronUp size={14} />
      </button>
      <button
        className="tb-btn"
        onClick={nextMatch}
        disabled={!count}
        title="Next match (Enter)"
      >
        <IconChevronDown size={14} />
      </button>
      <button className="tb-btn" onClick={closeSearch} title="Close (Esc)">
        <IconClose size={14} />
      </button>
    </div>
  );
}
