import { filterItemsByQuery, needsHls, isSubFeed } from './clientLogic.mjs';

const FEED_URL = 'https://allrss.se/dramas';

const BOOKMARK_ICON_PATH = 'M6 2h12a1 1 0 0 1 1 1v19l-7-4-7 4V3a1 1 0 0 1 1-1z';
const FOLDER_ICON_PATH = 'M3 5a1 1 0 0 1 1-1h4.5l2 2H20a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5z';

const searchInput = document.getElementById('search-input');
const feedError = document.getElementById('feed-error');
const tableSkeleton = document.getElementById('table-skeleton');
const videoTable = document.getElementById('video-table');
const videoTableBody = document.getElementById('video-table-body');
const emptyState = document.getElementById('empty-state');
const playerPanel = document.getElementById('player-panel');
const playerVideo = document.getElementById('player-video');
const playerError = document.getElementById('player-error');
const playerClose = document.getElementById('player-close');
const backButton = document.getElementById('back-button');
const toolbar = document.querySelector('.toolbar');

let currentItems = [];
let hls = null;
// The feed actually displayed right now (the hardcoded root, or a
// navigated-into sub-feed).
let currentFeedUrl = null;
let feedHistory = [];

function showFeedError(message) {
  feedError.textContent = message;
  feedError.hidden = !message;
}

function showPlayerError(message) {
  playerError.textContent = message;
  playerError.hidden = !message;
}

function updateBackButton() {
  backButton.hidden = feedHistory.length === 0;
}

function updateToolbarHeightVar() {
  document.documentElement.style.setProperty('--toolbar-height', `${toolbar.offsetHeight}px`);
}

function renderCurrentView() {
  renderTable(filterItemsByQuery(currentItems, searchInput.value));
}

function createIcon(pathD) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '14');
  svg.setAttribute('height', '14');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', pathD);
  path.setAttribute('fill', 'currentColor');
  svg.appendChild(path);
  return svg;
}

function appendBadges(target, item, subFeed) {
  if (item.bookmark) {
    const badge = document.createElement('span');
    badge.className = 'bookmark-badge';
    badge.setAttribute('aria-label', 'Bookmarked');
    badge.appendChild(createIcon(BOOKMARK_ICON_PATH));
    target.appendChild(badge);
  }
  if (subFeed) {
    const folderBadge = document.createElement('span');
    folderBadge.className = 'subfeed-badge';
    folderBadge.setAttribute('aria-label', 'Category');
    folderBadge.appendChild(createIcon(FOLDER_ICON_PATH));
    target.appendChild(folderBadge);
  }
}

function attachItemHandler(el, item, subFeed) {
  if (subFeed) {
    el.addEventListener('click', () => navigateToSubFeed(item));
  } else if (item.enclosureUrl) {
    el.addEventListener('click', () => playItem(item));
  }
}

function renderTable(items) {
  videoTableBody.innerHTML = '';
  items.forEach((item) => {
    const subFeed = isSubFeed(item);
    const row = document.createElement('tr');
    row.className = 'video-row';
    if (!item.enclosureUrl) {
      row.classList.add('disabled');
    }
    if (subFeed) {
      row.classList.add('subfeed');
    }

    const thumbCell = document.createElement('td');
    const img = document.createElement('img');
    img.src = item.thumbnail || 'placeholder.svg';
    img.alt = item.title;
    img.loading = 'lazy';
    img.width = 60;
    img.height = 34;
    thumbCell.appendChild(img);
    row.appendChild(thumbCell);

    const titleCell = document.createElement('td');
    titleCell.textContent = item.title;
    appendBadges(titleCell, item, subFeed);
    row.appendChild(titleCell);

    const dateCell = document.createElement('td');
    dateCell.textContent = item.pubDate || '';
    row.appendChild(dateCell);

    attachItemHandler(row, item, subFeed);

    videoTableBody.appendChild(row);
  });

  const hasItems = items.length > 0;
  videoTable.hidden = !hasItems;
  emptyState.hidden = hasItems;
}

async function navigateToSubFeed(item) {
  stopPlayback();
  playerPanel.hidden = true;
  searchInput.value = '';
  const parentUrl = currentFeedUrl;
  const succeeded = await loadFeed(item.enclosureUrl);
  if (succeeded) {
    feedHistory.push(parentUrl);
    updateBackButton();
  }
}

function stopPlayback() {
  if (hls) {
    hls.destroy();
    hls = null;
  }
  playerVideo.pause();
  playerVideo.removeAttribute('src');
  playerVideo.load();
}

function playItem(item) {
  showPlayerError('');
  stopPlayback();
  searchInput.value = '';
  renderCurrentView();

  playerPanel.hidden = false;
  playerPanel.scrollIntoView({ behavior: 'smooth' });

  if (needsHls(item)) {
    if (playerVideo.canPlayType('application/vnd.apple.mpegurl')) {
      playerVideo.src = item.enclosureUrl;
    } else if (window.Hls && window.Hls.isSupported()) {
      hls = new window.Hls();
      hls.on(window.Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          showPlayerError('Unable to play this HLS stream.');
        }
      });
      hls.loadSource(item.enclosureUrl);
      hls.attachMedia(playerVideo);
    } else {
      showPlayerError('HLS playback is not supported in this browser.');
      return;
    }
  } else {
    playerVideo.src = item.enclosureUrl;
  }

  playerVideo.play().catch(() => {
    /* autoplay may be blocked; user can press play */
  });
}

async function loadFeed(url) {
  showFeedError('');
  tableSkeleton.hidden = false;
  videoTable.hidden = true;
  emptyState.hidden = true;
  try {
    const res = await fetch(`/api/feed?url=${encodeURIComponent(url)}`);
    const body = await res.json();
    if (!res.ok) {
      showFeedError(body.error || 'Failed to load feed');
      return false;
    }
    currentItems = body.items;
    currentFeedUrl = url;
    renderCurrentView();
    return true;
  } catch (err) {
    const message = navigator.onLine === false
      ? 'You are offline. Check your connection and try again.'
      : `Failed to load feed: ${err.message}`;
    showFeedError(message);
    return false;
  } finally {
    tableSkeleton.hidden = true;
  }
}

searchInput.addEventListener('input', () => {
  renderCurrentView();
});

playerClose.addEventListener('click', () => {
  stopPlayback();
  playerPanel.hidden = true;
});

playerVideo.addEventListener('error', () => {
  showPlayerError('Unable to play this video — the link may not be a direct media file.');
});

backButton.addEventListener('click', async () => {
  const previousUrl = feedHistory[feedHistory.length - 1];
  if (!previousUrl) {
    return;
  }
  stopPlayback();
  playerPanel.hidden = true;
  const succeeded = await loadFeed(previousUrl);
  if (succeeded) {
    feedHistory.pop();
    updateBackButton();
  }
});

updateToolbarHeightVar();
window.addEventListener('resize', updateToolbarHeightVar);

loadFeed(FEED_URL);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {
      /* offline support is a progressive enhancement; ignore registration failures */
    });
  });
}
