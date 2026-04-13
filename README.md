# TLSentinel — Chrome Extension

Chrome extension for [TLSentinel](https://github.com/denniskoch/tlsentinel-server). See live TLS certificate info for any HTTPS site and manage monitoring directly from your browser.

## Features

- **Live cert lookup** — the extension asks your TLSentinel instance to dial the site in real-time, so you always see the actual certificate, not cached data
- **Badge indicator** — color-coded badge on the extension icon shows cert status at a glance
- **Monitoring status** — see whether a site is already monitored in TLSentinel, and add it with one click if not
- **Quick navigation** — jump straight to the endpoint detail page in TLSentinel

## Badge colors

| Color | Meaning |
|-------|---------|
| 🟢 Green | Valid, > 30 days remaining |
| 🟡 Amber | Expiring within 30 days |
| 🔴 Red | Expiring within 7 days or already expired |
| ⚫ Gray | Not an HTTPS page, or TLSentinel unreachable |

## Requirements

- A running [TLSentinel](https://github.com/denniskoch/tlsentinel-server) instance
- An API key with at minimum `certs:view` permission

## Setup

1. Build the extension (see below) or load from a release zip
2. In Chrome, go to `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and select the `dist/` folder
3. Click the TLSentinel icon and open Settings via the gear icon
4. Enter your instance URL (e.g. `https://tls.example.com`) and API key
5. Click **Test Connection** to verify, then **Save**

## Development

**Prerequisites:** Node.js 18+

```bash
make install   # install dependencies
make build     # production build → dist/
make dev       # watch mode, rebuilds on save
make clean     # remove dist/
```

After building, reload the extension in `chrome://extensions` to pick up changes.

## Project structure

```
src/
  api/          API client (talks to TLSentinel server)
  background/   Service worker (badge updates)
  lib/          Badge state, storage helpers
  options/      Settings page
  popup/        Popup UI
public/
  manifest.json
  icons/        Extension icons (16, 32, 48, 128px)
```

