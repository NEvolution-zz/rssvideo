# Nested Feed Navigation — Design Spec

Date: 2026-06-22

## Goal

Some RSS video feeds (e.g. `https://allrss.se/dramas`) aren't flat lists of
videos — each `<item>` is a *category* whose `<enclosure>` points to another
RSS feed (`type="application/rss+xml"`), not a video file. Currently the
dashboard treats every enclosure as playable media, so clicking a category
item tries (and fails) to play an XML feed as a video. This spec adds
navigation: clicking such an item loads that feed as the new grid content,
with a way to go back.

## Observed Feed Shape

```xml
<item>
  <title>HK Drama</title>
  <enclosure url="https://allrss.se/dramas/?channel=hk-drama&amp;nocache=1" type="application/rss+xml" bookmark="false"/>
  <description><![CDATA[<img src='http://allrss.se/dramas/hk.jpg' />]]></description>
  <guid isPermaLink="false">dramas:hkd</guid>
  <pubDate>Sun, 01 Jun 2014 00:00:00 GMT</pubDate>
  <itunes:image href="https://allrss.se/dramas/play.png"/>
</item>
```

This normalizes via the existing `feedService.js` pipeline into the same item
shape already in use (`{title, link, pubDate, description, thumbnail,
enclosureUrl, enclosureType, bookmark}`) — no backend changes needed.
`enclosureType` is `"application/rss+xml"` for these items, which is how the
client distinguishes them from playable video items (`video/mp4`,
`application/x-mpegurl`, etc.).

## Client-Side Logic

Add to `public/clientLogic.mjs`:

```js
export function isSubFeed(item) {
  return item.enclosureType === 'application/rss+xml';
}
```

Pure function, same pattern as the existing `needsHls`. Unit-tested the same
way (`test/clientLogic.test.js`).

## Frontend Behavior

**Card rendering (`public/app.js`, `renderGrid`):**
- For each item, check `isSubFeed(item)` before `needsHls`/play logic.
- If `isSubFeed(item)` is true: the card is clickable but tagged with a
  `subfeed` CSS class (small folder-style badge in the corner, distinct from
  the bookmark star) and its click handler calls `navigateToSubFeed(item)`
  instead of `playItem(item)`.
- If `isSubFeed(item)` is false: existing behavior is unchanged (playable
  video → `playItem`; missing `enclosureUrl` → disabled card).

**Navigation stack:**
- Module-level `let feedHistory = []` (array of feed URL strings).
- `navigateToSubFeed(item)`: pushes the *currently loaded* feed URL onto
  `feedHistory`, then calls `loadFeed(item.enclosureUrl, { isNavigation: true
  })`.
- A "← Back" button, hidden by default, becomes visible whenever
  `feedHistory.length > 0`. Clicking it pops the last URL off `feedHistory`
  and calls `loadFeed(poppedUrl, { isNavigation: true })`. If the popped URL
  was the original root, `feedHistory` is now empty and the button hides
  again.
- Submitting the top feed-URL form (the existing "Load" button) always treats
  the entered URL as a *new root*: it clears `feedHistory` before calling
  `loadFeed(url)` (no `isNavigation` flag).

**`loadFeed(url, { isNavigation } = {})` changes:**
- Behavior is unchanged except for `localStorage` persistence: the existing
  `localStorage.setItem(STORAGE_KEY, url)` call only happens when
  `isNavigation` is falsy (i.e., only root-level loads are remembered).
  Navigating into and out of sub-feeds never touches `localStorage`, so
  reloading the page always returns to the last explicitly-loaded root feed,
  not wherever the user last drilled into.
- On feed-load failure while navigating (`isNavigation: true`), the existing
  inline error UI (`#feed-error`) is shown exactly as it is today, and
  `feedHistory` is left as-is (the failed navigation didn't change levels, so
  there's nothing to roll back — the grid still shows the last successfully
  loaded content because `loadFeed` only replaces `currentItems`/re-renders
  on success).

## Markup & Styles

`public/index.html`: add a "← Back" button in the toolbar, hidden by default
(`hidden` attribute), e.g. `id="back-button"`.

`public/style.css`: add a `.video-card.subfeed` style with a small
folder-icon badge (similar positioning to `.bookmark-badge` but visually
distinct, e.g. a different corner or icon glyph) so users can tell category
cards apart from video cards before clicking.

## Out of Scope

- No breadcrumb trail UI (just a single "Back" step at a time, repeatable).
- No caching of previously-visited sub-feed contents — navigating back
  re-fetches via `/api/feed` rather than restoring from memory.
- No change to the backend (`server.js`, `src/feedService.js`) — this is
  purely a client-side interpretation of an enclosure type the backend
  already normalizes correctly.
