<p align="center">
  <img src="build/icon.png" width="120" alt="ImagePrep icon" />
</p>

# ImagePrep

A cross-platform desktop app for preparing images for web upload: import, resize,
auto-enhance, compress to an exact target file size, convert formats, preview
before/after, and batch-export optimized images. **Fully offline — no cloud
services.**

Built with Electron · React · TypeScript · electron-vite · Sharp · Tailwind CSS ·
Zustand · Zod · Electron Builder.

[![Release](https://github.com/gediminasurvila/image-prep-electron/actions/workflows/release.yml/badge.svg)](https://github.com/gediminasurvila/image-prep-electron/actions/workflows/release.yml)
[![CI](https://github.com/gediminasurvila/image-prep-electron/actions/workflows/ci.yml/badge.svg)](https://github.com/gediminasurvila/image-prep-electron/actions/workflows/ci.yml)

---

## Download

Grab the latest installer for your platform from the
**[Releases page](https://github.com/gediminasurvila/image-prep-electron/releases/latest)**:

| Platform | File |
|----------|------|
| Windows  | `ImagePrep-<version>-Setup-x64.exe` (NSIS installer) |
| macOS    | `ImagePrep-<version>-arm64.dmg` (Apple Silicon) · `ImagePrep-<version>-x64.dmg` (Intel) |
| Linux    | `ImagePrep-<version>-x86_64.AppImage` (`chmod +x`, then run) |

> Builds are **unsigned**, so the OS may warn on first launch:
> on macOS right-click → Open (or `xattr -dr com.apple.quarantine` the app);
> on Windows click *More info → Run anyway*.

---

## 1. Setup

Requirements: **Node.js 20.11+ (tested on 22)** and npm.

```bash
npm install
```

`npm install` also runs `electron-builder install-app-deps`, which compiles
Sharp's native binaries for your platform.

## 2. Development

```bash
npm run dev
```

Launches electron-vite in watch mode with hot reload for the renderer and
automatic restarts for the main/preload processes.

> On some Linux setups you may need `npm run dev -- --no-sandbox`.

## 3. Build & Package

```bash
npm run build        # type-aware production build into ./out
npm run typecheck    # tsc for both main and renderer projects

# Create installers (output in ./release)
npm run dist         # current platform
npm run dist:win     # Windows  (NSIS installer)
npm run dist:mac     # macOS    (dmg)
npm run dist:linux   # Linux    (AppImage)
npm run pack:dir     # unpacked app directory (fast, for smoke testing)
```

Packaging config lives in `electron-builder.yml`. Sharp's native modules are
unpacked from the asar archive so they load at runtime.

---

## 4. Implemented Features (MVP)

**Import**
- File picker (multi-select) and **drag-and-drop** anywhere on the window.
- **Import Folder** scans a directory for supported images.
- Supported inputs: jpg, jpeg, png, webp, tiff, bmp, gif, avif (when available).

**Queue (left column)**
- Thumbnail, filename, original dimensions, original size, live status, and
  output size after processing.
- Add / remove / clear / select. Status: `pending · processing · done · error · skipped`.

**Preview (center column)**
- Tabs: **Original**, **Processed**, **Side-by-side**.
- Shows original vs. output dimensions and original vs. **estimated output file
  size** plus the quality used.
- Debounced auto-preview on setting changes + a manual **Update preview** button.

**Settings (right column)**
- **Presets**: Blog Image, Product Image, Thumbnail, Hero Banner, Social Preview.
- **Resize**: none · fit · fill-crop · exact · width · height · percentage, with
  prevent-upscale and aspect-ratio options. Geometry follows the spec formulas
  (`src/shared/resize.ts`).
- **Enhancement**: **Auto** (default) analyzes each image independently and
  corrects its own flaws — white-balance cast (gray-world), low contrast
  (`normalize`), and under-exposure (adaptive `gamma`) — then lightly sharpens.
  **Manual** mode unlocks gamma, contrast (`linear`), saturation (`modulate`),
  and sharpen sliders. The Auto/Manual toggle locks the controls in Auto.
- **Export**: JPEG / PNG / WebP / AVIF, fixed-quality **or** target-file-size
  mode, strip/preserve metadata, sRGB conversion, output folder, filename
  prefix/suffix, and conflict handling (rename / overwrite / skip).

**Processing pipeline** (`src/main/imageProcessor.ts`)
1. Load → 2. `rotate()` (EXIF orientation) → 3. `toColorspace('srgb')` →
4. auto-enhance → 5. manual tone tweaks → 6. resize/crop → 7. sharpen →
8. encode → 9. target-size **binary search over quality** → 10. strip/preserve
metadata → 11. save → 12. return result.

**Target file size** — binary search per the spec, quality ranges JPEG/WebP
40–95, AVIF 30–90; returns the highest quality under the target, or a warning if
the target is unreachable. PNG is exported losslessly with a notice.

**Batch** — concurrency-limited async queue (default **2**), per-image progress
events, continues on individual failures, and a final `{ total, completed,
failed, skipped }` summary. Cancellable mid-run.

**Persistence** — last output folder and last-used settings are remembered via
`electron-store`, validated on load with Zod.

**Security** — `contextIsolation: true`, `nodeIntegration: false`,
`sandbox: true`, a strict CSP, a minimal `window.imageprep` contextBridge API,
and **every IPC payload validated with Zod**. The renderer never runs Sharp or
touches the filesystem directly.

---

## 5. Architecture

```
src/
  shared/    types, Zod schemas, IPC channel names, resize math, presets, defaults
  main/      Electron main: window, IPC handlers, Sharp pipeline, file utils, store
  preload/   contextBridge -> window.imageprep (typed, minimal)
  renderer/  React UI (components), Zustand stores, lib helpers
```

The pure processing logic (resize geometry, enhancement presets) lives in
`shared/` so it is testable and reusable on both sides of IPC.

**All Sharp work runs in a pool of forked child processes** (`sharpClient.ts` →
`workers/processImageWorker.ts`), not in the main process. This is both an
architecture choice (heavy CPU work off the UI/main thread, natural batch
concurrency) and a hard requirement on Linux: Sharp's prebuilt `libvips`
embeds its own glib, which collides with the system glib that Electron's main
process loads for its GUI. Running Sharp in `ELECTRON_RUN_AS_NODE` children with
a scoped `LD_PRELOAD` (set automatically — see `nativeFix.ts`) gives libvips a
consistent glib while the main process keeps the system glib. macOS/Windows have
no such conflict, and the `LD_PRELOAD` step is a no-op there. The main process
bundle contains **zero** Sharp imports by design.

---

## 6. Known Limitations

- **Sharp version**: pinned to `0.32.x`. Its libvips is bundled as a single
  `libvips-cpp.so` that the worker can `LD_PRELOAD`. (Sharp 0.33's `@img/*`
  packaging splits things differently; the worker-process isolation still
  applies but the preload path discovery in `nativeFix.ts` targets the 0.32
  `vendor/` layout.)
- **Metadata**: stripping (the default) always works. Preservation is
  best-effort — in target-file-size mode the image is decoded to raw pixels for
  fast re-encoding, which drops source EXIF/ICC. (Treated as non-critical.)
- **Target-size previews** encode at full resolution for accuracy, so previews
  of very large source images can take a moment.
- AVIF depends on the Sharp build; the UI disables it automatically when the
  encoder is unavailable.
- **Packaging on Linux**: the worker runs from inside `app.asar` via
  `ELECTRON_RUN_AS_NODE` (asar support is on by default) and loads Sharp from
  `app.asar.unpacked`; `nativeFix.ts` rewrites the libvips path accordingly.
  This path is wired but packaged Linux builds should be smoke-tested.
- No automated test suite yet (the pipeline and worker were validated with
  end-to-end scripts during development).

---

## 7. Suggested Next Improvements

- Make the worker pool size configurable and adaptive to CPU count.
- User-defined / editable presets persisted to disk.
- Watch-folders mode and a headless CLI sharing the `shared/` pipeline.
- Licensing + paid feature gating (architecture already isolates settings/IPC).
- Unit tests for `computeResizePlan`, naming/conflict logic, and the target-size
  search; CI for typecheck + build.
- Crop UI, rotation controls, and side-by-side zoom/pan.
- Per-image setting overrides (currently settings apply to the whole batch).
- Preserve EXIF/ICC through the target-size path by carrying metadata separately.
```
