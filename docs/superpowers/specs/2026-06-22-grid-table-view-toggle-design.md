# Grid/Table View Toggle — Design Spec

Date: 2026-06-22

## Goal

Let the user switch the video/category listing between the existing card grid
and a denser table view, useful for scanning long feeds (e.g. the 80+ episode
lists seen in `https://allrss.se/dramas`). The choice persists across reloads.

## UI

Two toggle buttons in the toolbar, next to the search box:

```html
<button id="view-grid-btn" type="button" class="view-toggle active">Grid</button>
<button id="view-table-btn" type="button" class="view-toggle">Table</button>
```

The active button gets a highlighted style (`.view-toggle.active`). Clicking
the inactive button switches views; clicking the already-active button is a
no-op.

## Rendering

A new `<table id="video-table" class="video-table" hidden>` element sits as a
sibling of the existing `<main id="video-grid">`, hidden by default:

```html
<table id="video-table" class="video-table" hidden>
  <thead>
    <tr><th></th><th>Title</th><th>Date</th></tr>
  </thead>
  <tbody id="video-table-body"></tbody>
</table>
```

Exactly one of `#video-grid` / `#video-table` is visible (`hidden` attribute
toggled) at any time, based on the current view.

**Table columns:**
- Thumbnail: small `<img>`, same fallback to `placeholder.svg` as the grid.
- Title: item title text, with the same inline bookmark star (`★`) and folder
  badge (`📁`) shown next to it as the grid uses (no new icon styling needed
  beyond reusing the existing badge classes inside a table cell).
- Date: `item.pubDate` rendered as-is (the raw string already returned by
  `feedService.js`, e.g. `"Sun, 01 Jun 2014 00:00:00 GMT"`). No date parsing
  or reformatting — out of scope, keeps this simple.

**Row click behavior is identical to grid card behavior:**
- `isSubFeed(item)` true → click navigates into the sub-feed
  (`navigateToSubFeed`).
- Otherwise, if `item.enclosureUrl` is set → click opens the player
  (`playItem`).
- Otherwise (no enclosure) → row is unclickable (`disabled` class, no
  listener), same as a disabled grid card.

View choice never changes *what* clicking an item does — only how the list
looks.

## State & Persistence

`public/app.js` adds:
- `let currentView = localStorage.getItem(VIEW_STORAGE_KEY) || 'grid';` — a
  new `VIEW_STORAGE_KEY` constant (e.g. `'rssvideo.view'`), separate from the
  existing feed-URL storage key. If the stored value isn't `'grid'` or
  `'table'` (e.g. corrupted/old data), fall back to `'grid'`.
- `setView(view)`: updates `currentView`, persists it to `localStorage`,
  updates the toggle buttons' active class, toggles which container
  (`#video-grid` / `#video-table`) is hidden, and re-renders the currently
  loaded items into the now-visible container.
- A new `renderTable(items)` function, structurally parallel to the existing
  `renderGrid(items)` — same per-item logic (subfeed class/badge, bookmark
  badge, disabled state, click routing) but emitting `<tr>` rows into
  `#video-table-body` instead of `<article>` cards into `#video-grid`.
- The two existing call sites that directly call
  `renderGrid(filterItemsByQuery(currentItems, searchInput.value))` (after a
  successful feed load, and on search input) are replaced with a single
  `renderCurrentView()` helper that dispatches to `renderGrid` or
  `renderTable` based on `currentView`. This keeps search filtering and
  feed-loading logic unaware of which view is active.
- On page load, the toggle buttons' active-state and container visibility
  are initialized once based on the restored `currentView`, before the
  initial `loadFeed(savedUrl)` call.

## Out of Scope

- No column sorting (e.g. click "Date" header to sort) — just a static
  column layout.
- No per-level view memory (e.g. remembering "table" for one sub-feed and
  "grid" for another) — one global view preference for the whole app.
- No date parsing/formatting — `pubDate` is shown exactly as the feed
  provides it.
- No changes to `clientLogic.mjs`, the backend, or feed-fetching logic — this
  is purely a frontend rendering/state addition reusing existing normalized
  item data and existing navigation/playback functions.
