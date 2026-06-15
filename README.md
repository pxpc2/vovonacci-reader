# Vovonacci · Reader

A native desktop PDF reader with the **vovonacci.com** terminal aesthetic — a focused,
branded alternative to Adobe Acrobat for everyday PDF viewing.

Built with **Tauri 2** (Rust shell) + **React + TypeScript + Vite**, rendering PDFs with
**Mozilla PDF.js**.

## Features

- **Native file opening** — open dialog, `.pdf` file-association handler, single-instance
  forwarding (double-click a PDF in Explorer → opens in the running window), drag-and-drop,
  and a recent-files list.
- **Faithful rendering** — fonts, embedded styling, vector graphics, and charts via PDF.js,
  with bundled CMaps + standard fonts for correct CJK/embedded glyphs.
- **Smart sidebar** — shows the document's **outline / table of contents** when present,
  otherwise falls back to a **thumbnail page list**.
- **Reading tools** — virtualized continuous scroll (handles large docs), zoom
  (fit-width / fit-page / custom), rotate, text selection + copy, and full-text search
  with highlighting and next/prev navigation.
- **Robustness** — encrypted-PDF password prompt, keyboard shortcuts, and print.

## Keyboard shortcuts

| Action            | Shortcut                |
| ----------------- | ----------------------- |
| Open file         | `Ctrl/Cmd + O`          |
| Find in document  | `Ctrl/Cmd + F`          |
| Next / prev match | `Enter` / `Shift+Enter` |
| Zoom in / out     | `Ctrl/Cmd + +` / `-`    |
| Fit width         | `Ctrl/Cmd + 0`          |
| First / last page | `Home` / `End`          |

## Development

```bash
pnpm install        # also copies PDF.js cmaps + fonts into public/
pnpm tauri dev      # run the desktop app (hot-reload)
pnpm tauri build    # produce a Windows installer (NSIS / MSI)
```

Requirements: Node + pnpm, Rust (stable ≥ 1.85, MSVC toolchain on Windows), and the
WebView2 runtime (preinstalled on Windows 11).

## Architecture

- `src-tauri/` — Rust shell. Single-instance + launch-file-argument handling and a binary
  `read_pdf` command live in `src/lib.rs`; `.pdf` file association is declared in
  `tauri.conf.json`.
- `src/pdf/` — PDF.js integration: worker setup, document/text caches (`document.ts`),
  the per-page canvas + text-layer + highlight renderer (`PdfPage.tsx`), and the
  virtualized scroll viewer (`PdfViewer.tsx`).
- `src/components/` — toolbar, search bar, sidebar (outline / thumbnails), empty state,
  password modal, and status bar.
- `src/state/store.ts` — Zustand store holding all document, view, navigation, and search
  state.
- `src/theme/tokens.css` + `src/styles.css` — the vovonacci terminal design system.
