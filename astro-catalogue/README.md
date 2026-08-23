# Astro Catalogue

A desktop app that scans an astrophotography directory tree and displays, per
object, the total number of frames and integration time for each frame type
(LP, IRCUT, etc.). Results are cached in a local SQLite database so the app
starts instantly without rescanning — click **Analyze** to refresh.

Built with Electron + React + TypeScript + Tailwind CSS, using Node's
built-in `node:sqlite` module for storage. There are no native dependencies
in this project, so it needs nothing beyond Node.js/npm to install, build,
or package — no C/C++ toolchain, no Visual Studio, on either OS. That also
means a packaged Windows installer (`npm run package`) runs on a machine
with no dev tools at all.

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

Just **Node.js 22.5+** (for the `node:sqlite` types to match) and npm — the
app itself runs fine on any Node/Electron combination, since `node:sqlite`
has shipped in Node since 22.5 and is stable in the Node 24 that Electron
currently bundles.

### Ubuntu / Debian

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Windows

Install **Node.js 22+ (LTS)** from [nodejs.org](https://nodejs.org/) (the
installer includes npm). Nothing else is required.

## Install

```bash
npm install
```

If npm reports packages "not yet covered by allowScripts" (this repo pins
`electron` and `electron-winstaller` as approved — see the `allowScripts`
field in `package.json`), run:

```bash
npm approve-scripts electron electron-winstaller
```

## Run in development

```bash
npm run dev
```

This starts Vite (renderer + main + preload build with HMR) and launches the
Electron window automatically.

## Try it with sample data

Don't have a photo directory handy? Generate one:

```bash
npm run sample-data
```

This creates `./sample-data` with a few objects (including a mosaic and
multiple sessions per frame type) plus a couple of intentionally malformed
entries so the warnings panel has something to show. In the app, click
**Select Root Directory**, pick the generated `sample-data` folder, then
click **Analyze**.

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
Since there are no native dependencies to compile, the resulting installer
just needs Node/npm on the *build* machine — the machine that later *runs*
the installed app needs nothing at all.

## Data storage

The SQLite database lives in the OS-standard app-data directory and persists
between runs:

- Linux: `~/.config/astro-catalogue/catalogue.db`
- Windows: `%APPDATA%\astro-catalogue\catalogue.db`

## Troubleshooting

- **Blank window on Linux in a VM**: GPU/vaapi warnings in the terminal are
  usually harmless; if the window stays blank, try launching with
  `ELECTRON_DISABLE_GPU=1 npm run dev`.
