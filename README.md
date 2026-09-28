# Record Player

A desktop record-player app for your local MP3 collection, built with Electron. Browse your music folder, spin the vinyl, scrub playback by dragging the record (complete with a scratch sound effect), and switch between a light or a clean black theme.

## Features

- Pick a music folder and automatically scan for `.mp3`, `.wav`, `.ogg`, `.m4a`, and `.flac` files
- Reads title/artist/duration tags from your files
- Play / pause / previous / next controls with a seek bar
- Spinning vinyl record with an animated tonearm that lowers when playing
- Drag the record to scratch/rewind/fast-forward through the track, with a scratch sound effect
- Settings window: choose your music folder, switch between Light and Black themes, and toggle the background glow effect
- Resizable window — shrink it down to a compact mini player showing just the record and a play/pause button
- Remembers your last folder, theme, and glow preference between launches

## Getting started

Requires [Node.js](https://nodejs.org/).

```bash
npm install
npm start
```

## Download

A portable Windows executable is available at [`dist/Record Player 1.0.0.exe`](dist/Record%20Player%201.0.0.exe) — no installation needed, just download and double-click to run.

## Building the .exe yourself

```bash
npm install
npm run dist
```

The portable executable will be generated at `dist/Record Player 1.0.0.exe`.

## Project structure

- `main.js` — Electron main process (window creation, folder picking, metadata reading, settings persistence)
- `preload.js` — secure bridge exposing IPC APIs to the renderer
- `index.html` / `styles.css` / `renderer.js` — the UI and app logic
- `assets/` — app icon
