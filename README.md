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
- **Tabbed multi-document** — open several PDFs at once, each tab keeping its own
  page, zoom, rotation, search and reading position. Opening an already-open file
  focuses its tab instead of duplicating it.
- **Dark mode** — per-document page inversion (hue-preserving) for comfortable
  night reading, toggled from the toolbar.
- **Auto-update** — on launch the app checks GitHub Releases and, when a newer
  version is signed and published, offers a one-click **Update & Relaunch** prompt.
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

## Releasing (auto-update)

The updater fetches a signed manifest from this repo's GitHub Releases:
`https://github.com/pxpc2/vovonacci-reader/releases/latest/download/latest.json`
(configured under `plugins.updater` in `src-tauri/tauri.conf.json`). Because the
running app fetches it unauthenticated, **the repo must be public** for updates to
reach installed clients.

Update artifacts are signed with a minisign keypair. The **public** key is committed
in `tauri.conf.json`; the **private** key lives outside the repo at
`~/.tauri/vovonacci.key` (generated with `pnpm tauri signer generate`) and must
never be committed — losing it means you can no longer ship updates.

To cut a release:

```bash
# 1. bump version in package.json, src-tauri/Cargo.toml and tauri.conf.json
# 2. build + sign the updater artifacts
$env:TAURI_SIGNING_PRIVATE_KEY      = (Get-Content $HOME\.tauri\vovonacci.key -Raw).Trim()
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = "<your key password>"
pnpm tauri build
# 3. publish the NSIS installer, its .sig, and latest.json to a GitHub Release
#    tagged with the new version (see src-tauri/target/release/bundle/).
```

`createUpdaterArtifacts` (in `tauri.conf.json`) makes the build emit the `.sig`
signature and the `latest.json` the client reads.

## Architecture

- `src-tauri/` — Rust shell. Single-instance + launch-file-argument handling and a binary
  `read_pdf` command live in `src/lib.rs`; `.pdf` file association is declared in
  `tauri.conf.json`.
- `src/pdf/` — PDF.js integration: worker setup, document/text caches (`document.ts`),
  the per-page canvas + text-layer + highlight renderer (`PdfPage.tsx`), and the
  virtualized scroll viewer (`PdfViewer.tsx`).
- `src/components/` — toolbar, search bar, sidebar (outline / thumbnails), empty state,
  password modal, and status bar.
- `src/state/store.ts` — Zustand store. Holds a list of `DocSession` tabs (each with
  its own doc, view, navigation, search and dark-invert state) plus app-level state
  (sidebar, recents). `activeTab(state)` selects the focused session. `src/lib/updater.ts`
  is a separate small store driving the launch update check + `UpdateModal`.
- `src/theme/tokens.css` + `src/styles.css` — the vovonacci terminal design system.
