# Simple Highlights (Chrome Extension)

Simple Highlights is a Manifest V3 Chrome extension for selecting, highlighting, storing, restoring, and browsing highlighted text across web pages.

## Language Note

The extension interface is currently in Spanish (labels, helper text, and most user-facing messages), while this README is fully written in English.

## Current Features

- Floating toolbar appears near text selections.
- `Highlight` action applies highlights using the currently selected color.
- Color picker includes 4 pastel options and remembers the latest choice during the session.
- Hovering a highlight shows a `Remove` button with delayed auto-hide and fade-out.
- Highlights are stored persistently in `chrome.storage.local`.
- Each record stores: id, URL, hostname, page title, text, color, timestamp, and restore context.
- Automatic highlight restoration on page load for the current URL.
- Advanced restoration supports multi-node matches and context-based disambiguation.
- Popup library displays stored highlights.
- Popup search supports accent-insensitive and special-character-tolerant matching.
- Popup includes sort modes: relevance, newest, oldest, and site A-Z.
- Popup can toggle grouping by website on/off.
- Popup preferences (sort mode and grouping) persist across popup sessions.

## Project Structure

```text
SIMPLE-HIGHLIGHTS/
  manifest.json
  README.md
  src/
    background/
      service-worker.js
    content/
      content-script.js
      modules/
        floating-toolbar.js
        highlighter.js
        selection.js
        state.js
      styles/
        highlight.css
    popup/
      popup.css
      popup.html
      popup.js
    shared/
      highlight-library.js
```

## Security and Platform Notes

- Uses Chrome Extension Manifest V3 and a background service worker.
- Strict extension page CSP:
  - `script-src 'self'`
  - `object-src 'none'`
  - `base-uri 'none'`
- Does not use `eval()` or `innerHTML` for dynamic UI content.
- Uses minimal permission scope (`storage`) for persistence.

## Load in Chrome (Developer Mode)

1. Open Chrome and go to `chrome://extensions/`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the `SIMPLE-HIGHLIGHTS` folder.
5. Open any website and select text.
6. Use `Highlight` and `Color` from the floating toolbar.
7. Open the extension popup to browse, search, sort, and group saved highlights.

## Implementation Notes

- Highlight rendering is done with safe DOM operations (`Range`, `Selection`, `createElement`, `textContent`).
- Restoration includes a retry pass for late-rendered page content.
- Search normalization removes diacritics and non-alphanumeric separators to improve average-user matching behavior.

## Suggested Next Improvements

- Add one-click jump from popup item to highlighted location on the active page.
- Add export/import for highlight library backups.
- Add optional sync support (`chrome.storage.sync`) for cross-device preferences.
