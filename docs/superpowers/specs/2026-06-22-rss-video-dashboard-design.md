# RSS Video Dashboard & Player — Design Spec

Date: 2026-06-22

## Goal

Build a web app that lets a user enter/change an RSS video feed URL, browse the
feed's videos in a dashboard, and play a selected video directly in the
browser. Default feed for testing: `https://rssvideoplayer.com/sample.xml`.

## Feed Format (observed from sample.xml)

Standard RSS 2.0 `<channel>` with `<item>` elements. Relevant fields per item:

- `title` — video title
- `link` — source page link (not the video file)
- `pubDate`
- `description` — may contain CDATA/HTML (e.g. an `<img>` tag)
- `enclosure[url, type, length]` — the actual playable media. Observed types:
  `video/mp4` and `application/x-mpegurl` (HLS)
- `media:thumbnail[url]` and/or `itunes:image[href]` — thumbnail image
- `bookmark` (custom tag, optional) — `true`/`false`

Different feeds may omit fields (e.g. no thumbnail, no bookmark). The backend
normalizer must tolerate missing fields.

## Why a Backend Is Needed

`https://rssvideoplayer.com/sample.xml` (and RSS feeds generally) do not send
`Access-Control-Allow-Origin` headers, so a browser cannot `fetch()` arbitrary
feed URLs directly (CORS). The server fetches feeds on the client's behalf.

## Architecture

- **Stack:** Node.js + Express. Frontend is static vanilla HTML/CSS/JS served
  from `/public`. No frontend build step.
- **Single API endpoint:** `GET /api/feed?url=<rss-url>`
  - Server-side fetches `url`, parses the XML (`fast-xml-parser`), and
    returns JSON: an array of normalized items:
    ```json
    {
      "title": "string",
      "link": "string",
      "pubDate": "string",
      "description": "string (HTML, sanitized of script tags)",
      "thumbnail": "string | null",
      "enclosureUrl": "string | null",
      "enclosureType": "string | null",
      "bookmark": "boolean"
    }
    ```
  - Errors (network failure, invalid XML, non-RSS content) return a JSON
    error body with an appropriate HTTP status (e.g. 502/400) and a short
    message safe to show to the user.
- **No database.** The current feed URL is stored in the browser's
  `localStorage`, defaulting to the sample feed URL on first visit. There is
  no server-side persistence or multi-user state.

## Frontend

Single page (`index.html`), no routing.

**Header**
- Text input pre-filled with the saved (or default) feed URL + "Load" button.
  Submitting calls `/api/feed?url=...` and re-renders the grid.
- Search input that filters the currently loaded grid by title (client-side,
  case-insensitive substring match, live as you type).

**Video grid**
- One card per item: thumbnail (fallback placeholder image if `thumbnail` is
  null), title, `pubDate`, and a bookmark star/badge if `bookmark === true`.
- Items with no `enclosureUrl` (not playable) render as disabled/greyed cards.
- Clicking a playable card reveals/scrolls to the player panel on the same
  page (no navigation, no modal routing).

**Player panel**
- `<video controls>` element, video title, and the item's `description`
  rendered as sanitized HTML (strip `<script>`; otherwise render as-is so the
  CDATA `<img>` in the sample feed displays).
- A "back to grid" control that pauses and hides the player.
- Playback source logic, run when a card is clicked:
  - If `enclosureType` is `application/x-mpegurl` or the URL ends in `.m3u8`:
    - If the browser's `video.canPlayType('application/vnd.apple.mpegurl')`
      is truthy (Safari), set `video.src` directly (native HLS support).
    - Else, load `hls.js` (via CDN `<script>` tag) and use
      `Hls.isSupported()` to attach it: `hls.loadSource(url);
      hls.attachMedia(video)`.
  - Otherwise (mp4/webm/etc.), set `video.src` directly.

## Error Handling

- Feed load failure (bad URL, network error, unparseable XML): show an inline
  error message near the feed input. Keep the previously loaded grid visible
  if one was already shown; don't blank the page on a failed reload.
- Missing thumbnail: fallback placeholder image (static asset in `/public`).
- Missing enclosure: card rendered disabled, not clickable.
- HLS playback failure (e.g. `hls.js` fatal error event): show an inline
  error message in the player panel rather than a silently stuck spinner.

## Out of Scope (for this spec)

- User accounts / multi-user shared feed state.
- Server-side persistence of feed URL or history of previously loaded feeds.
- Video download, transcoding, or proxying of media files themselves (only
  the RSS XML is proxied through the backend; `<video>`/`hls.js` fetch media
  directly from their original URLs).
- Pagination/infinite scroll (assume feeds are small enough for a single
  grid render).

## Docker (future stage)

Single-stage `Dockerfile`:
```
FROM node:lts-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```
No build step required since the frontend is vanilla JS/CSS/HTML.
