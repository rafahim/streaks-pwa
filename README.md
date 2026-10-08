# Streaks

Streaks is an offline-first, privacy-first habit tracker PWA by RA Fahim. It uses IndexedDB for local data, a Service Worker for app-shell caching, and browser notifications when permission is granted.

## Features

Habit CRUD supports name, emoji, color, daily, weekly X, selected weekdays, every N days, tags, archive, drag reorder, quantity targets and negative habits.

Daily actions support one-tap completion, backfilling past dates, notes and quantities.

Visualization includes a GitHub-style yearly heatmap, current and longest streaks, completion percentage, monthly and weekly calendar views, and line/bar charts.

Notifications include browser reminders, custom times and chain-break warnings. Browser notification behavior depends on platform permissions and whether the PWA is allowed to run.

Data tools include JSON export/import and CSV export. Optional encrypted WebDAV backup is fully user initiated. The backup payload is encrypted client-side using PBKDF2-SHA-256 plus AES-GCM before upload.

The app has dark default and light themes, English/Bengali UI switching, keyboard-friendly controls, haptics where supported, and install prompts on browsers that expose them.

## Privacy

Habit data is stored on the device in IndexedDB. Streaks does not require an account or analytics service. The app does not send habit data to a remote service by default.

The optional WebDAV feature is different: when you choose to use it, the browser sends the encrypted backup payload to the WebDAV endpoint you provide. Your WebDAV server, account, URL and network path are outside the control of this app.

## Install

### iOS

Open the deployed HTTPS URL in Safari, choose Share, choose Add to Home Screen, then open Streaks from the Home Screen.

### Android

Open the deployed HTTPS URL in Chrome or another Chromium-based browser, then use Install app or Add to Home screen. Accept the install prompt when available.

### Desktop

Open the deployed HTTPS URL in Chrome, Edge or another PWA-capable browser. Use the install button or the browser's install icon in the address bar.

## Local development

A Service Worker generally requires `https://` or a secure local origin. Use a simple local HTTP server instead of double-clicking the HTML file when testing install and caching.

Python:
`python -m http.server 8080`

Then open:
`http://localhost:8080/`

## Demo mode

Settings includes Load demo data and Open demo mode. Demo data is generated locally and never requires a network connection.

## Author

RA Fahim  
Web Developer & Creator  
Full-stack · 1 year  
Dhaka, Bangladesh

Website: https://rafahim.com  
GitHub: https://github.com/rafahim  
Twitter: https://twitter.com/rafahimn  
LinkedIn: https://linkedin.com/in/rafahimn  
Email: dev@rafahim.com

## SEO checklist

- Canonical URL: `https://rafahim.com/streaks/`
- Descriptive title and meta description
- Target keywords in metadata
- Open Graph metadata
- Twitter Card metadata
- JSON-LD WebApplication schema
- JSON-LD Person schema
- `robots.txt`
- `sitemap.xml`
- Human-readable author details
- Privacy-first copy aligned with actual local storage behavior

## License

MIT
