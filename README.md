# QR Converter Pro

A fully client-side QR code generator and scanner. No backend, no build step,
no data ever leaves the browser.

## Files

- `index.html` — page structure
- `style.css` — visual design (light/dark theme, responsive layout)
- `script.js` — all app logic (generation, scanning, history, sharing)
- `favicon.svg` — tab icon

## How to run it locally

Camera access requires the page to be served over `http://localhost` or
`https://` (opening the file directly as `file://...` will block the camera
in most browsers, though the file-upload scanner still works that way).

**Option A — Python (already on most machines)**
```bash
cd qr-converter-pro
python3 -m http.server 8000
```
Then open `http://localhost:8000` in your browser.

**Option B — Node**
```bash
cd qr-converter-pro
npx serve .
```

**Option C — VS Code**
Install the "Live Server" extension, right-click `index.html`, and choose
"Open with Live Server".

## What it uses

- [`qrcode`](https://github.com/soldair/node-qrcode) (via CDN) for generating
  QR codes onto a `<canvas>`, with color and size options.
- [`html5-qrcode`](https://github.com/mebjas/html5-qrcode) (via CDN) for both
  live camera scanning and decoding uploaded image files — one library
  covers both, so there's no separate jsQR dependency.

Both are loaded from CDN in `index.html`, so an internet connection is
needed the first time (results are cached by the browser after that).

## Features

- Generate QR codes from text, URL, phone number, email, or WiFi credentials
- Foreground/background color pickers and a size slider (128–512px)
- Download the generated code as a PNG, or share/copy it as an image
- Scan QR codes live with the device camera
- Scan QR codes from an uploaded image (click to browse or drag-and-drop)
- Copy decoded text, or open it directly if it's a link
- History of the last 30 generated/scanned codes, stored in `localStorage`
- Light/dark theme toggle (remembers your choice)
- Inline error handling for invalid input, camera permission issues, and
  unreadable images

## Notes

- WiFi QR codes follow the standard `WIFI:T:<type>;S:<ssid>;P:<password>;;`
  format that Android and iOS camera apps recognize automatically.
- If the camera won't start, check that the browser has permission and that
  no other app or tab is currently using it.# QR_code_coverter
