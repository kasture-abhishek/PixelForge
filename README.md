# PixelForge

A browser-only image editor. Open a file, adjust it locally, and download the result. Nothing is uploaded.

## What works

- Open JPG, PNG, WEBP, GIF, AVIF, and BMP files (up to 50 MB)
- Brightness, contrast, saturation, hue, sharpness, blur, opacity
- Filters with intensity
- Crop, resize (optional locked aspect), rotate, flip
- Brush, eraser, and text stamps
- Histogram, pixel inspector, undo/redo, zoom
- Export as JPG, PNG, WEBP, or AVIF

All processing runs in the page with the Canvas API. Animated GIFs open as a still frame. AVIF export depends on the browser.

## Run it

Serve the folder with any static server, then open `index.html`.

```bash
npx serve .
```

The landing page handoff uses IndexedDB, so `file://` is unreliable. Use a local server.

## Project layout

- `index.html` — landing page
- `pages/editor.html` — editor
- `pages/about.html` — about
- `js/editor/editor.js` — editor shell
- `js/features/` — filters, histogram, resize, export estimates
- `js/utils/` — file, download, and canvas helpers
- `js/script.js` — landing upload and nav
