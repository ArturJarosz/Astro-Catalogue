# Astro Catalogue

A desktop app that scans an astrophotography directory tree and displays, per
object, the total number of frames and integration time for each frame type
(LP, IRCUT, etc.). Results are cached in a local SQLite database so the app
starts instantly without rescanning — click **Analyze** to refresh.

Built with Electron + React + TypeScript + Tailwind CSS, using
`better-sqlite3` for storage.

## Expected directory structure

```
{root}/
  M 31/
    LP/
      2026.08.09 LP 20s/       <- YYYY.MM.DD TYPE Ns, contains .fit/.fits files
    IRCUT/
      2026.08.09 IRCUT 20s/
  M 31_mosaic/                 <- mosaics are tracked as a separate object
    LP/
      2026.08.10 LP 30s/
```

Anything that doesn't match this structure (unexpected files, folder names
that don't follow the `YYYY.MM.DD TYPE Ns` pattern) is reported in the app's
warnings panel instead of failing the scan.

## Prerequisites

You need **Node.js 20+** and **npm**. `better-sqlite3` compiles a small
native addon during `npm install`, so a C/C++ toolchain and Python 3 are also
required.

### Ubuntu / Debian

```bash
# Node.js 20+ (skip if already installed — check with `node --version`)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Native build toolchain for better-sqlite3
sudo apt-get install -y build-essential python3
```

### Windows

1. Install **Node.js 20+ (LTS)** from [nodejs.org](https://nodejs.org/) (the
   installer includes npm).
2. Install the native build tools required by `better-sqlite3`:
   ```powershell
   npm install --global windows-build-tools
   ```
   or, if that fails on newer Windows, install **Visual Studio Build Tools**
   (with the "Desktop development with C++" workload) and **Python 3**
   manually, then set:
   ```powershell
   npm config set msvs_version 2022
   ```
3. Use PowerShell or the VS Developer Command Prompt for the commands below.

## Install

```bash
npm install
```

If npm reports packages "not yet covered by allowScripts" (this repo pins
`better-sqlite3`, `electron`, and `electron-winstaller` as approved — see the
`allowScripts` field in `package.json`), run:

```bash
npm approve-scripts better-sqlite3 electron electron-winstaller
npm rebuild
```

## Run in development

```bash
npm run dev
```

This starts Vite (renderer + main + preload build with HMR) and launches the
Electron window automatically.

## Build

```bash
npm run build
```

Type-checks and builds the renderer (`dist/`) and the Electron main/preload
bundles (`dist-electron/`).

## Package a native installer

```bash
npm run package
```

Runs the build and then `electron-builder`, producing:

- **Windows**: an NSIS installer (`.exe`) — run this step on Windows
- **Linux**: an `AppImage` and a `.deb` — run this step on Ubuntu

Electron-builder does not reliably cross-compile GUI installers between
Windows and Linux, so build each target on its own OS (or via a CI matrix).

## Data storage

The SQLite database lives in the OS-standard app-data directory and persists
between runs:

- Linux: `~/.config/astro-catalogue/catalogue.db`
- Windows: `%APPDATA%\astro-catalogue\catalogue.db`

## Troubleshooting

- **`better-sqlite3` fails to load / `__dirname is not defined`**: the native
  addon wasn't rebuilt for the current Node/Electron ABI. Run
  `npm rebuild better-sqlite3`.
- **Blank window on Linux in a VM**: GPU/vaapi warnings in the terminal are
  usually harmless; if the window stays blank, try launching with
  `ELECTRON_DISABLE_GPU=1 npm run dev`.
