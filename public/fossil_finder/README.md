# Fossil Finder (HTML/JavaScript)

A brush-based fossil excavation game. No Godot required—runs entirely in the browser.

## How to run

1. Serve the folder over HTTP (required for ES modules).
2. Open `fossil-finder-html/index.html` in your browser.

### Option 1: Python
```bash
cd export
python -m http.server 8000
```
Then open: http://localhost:8000/fossil-finder-html/

### Option 2: Node (npx serve)
```bash
cd export
npx serve
```
Then open the URL shown, plus `/fossil-finder-html/`.

## Structure

```
export/
├── fossil-finder-html/   ← Game (index.html, js, css)
├── assets/               ← Textures, fossils, fonts, audio
└── README.md
```

## Deploying to a website

Copy the contents of this `export` folder to your web server. Ensure:
- `fossil-finder-html/` and `assets/` are siblings (same parent folder)
- Your server serves `.js` files with correct MIME type for ES modules
