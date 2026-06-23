import { filterItemsByQuery, needsHls, isSubFeed } from './clientLogic.mjs';

const STORAGE_KEY = 'rssvideo.feedUrl';
const DEFAULT_FEED_URL = 'https://rssvideoplayer.com/sample.xml';
const VIEW_STORAGE_KEY = 'rssvideo.view';

const feedForm = document.getElementById('feed-form');
const feedUrlInput = document.getElementById('feed-url-input');
const searchInput = document.getElementById('search-input');
const feedError = document.getElementById('feed-error');
const videoGrid = document.getElementById('video-grid');
const videoTable = document.getElementById('video-table');
const videoTableBody = document.getElementById('video-table-body');
const viewGridBtn = document.getElementById('view-grid-btn');
const viewTableBtn = document.getElementById('view-table-btn');
const playerPanel = document.getElementById('player-panel');
const playerVideo = document.getElementById('player-video');
const playerTitle = document.getElementById('player-title');
const playerDescription = document.getElementById('player-description');
const playerError = document.getElementById('player-error');
const playerClose = document.getElementById('player-close');
const backButton = document.getElementById('back-button');

let currentItems = [];
let hls = null;
// The feed actually displayed right now (root or a navigated-into sub-feed) —
// distinct from feedUrlInput.value, which only ever reflects the root URL the
// user typed/submitted.
let currentFeedUrl = null;
let feedHistory = [];

const storedView = localStorage.getItem(VIEW_STORAGE_KEY);
let currentView = storedView === 'table' ? 'table' : 'grid';

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

function setView(view) {
  currentView = view;
  localStorage.setItem(VIEW_STORAGE_KEY, view);
  viewGridBtn.classList.toggle('active', view === 'grid');
  viewTableBtn.classList.toggle('active', view === 'table');
  videoGrid.hidden = view !== 'grid';
  videoTable.hidden = view !== 'table';
  renderCurrentView();
}

function renderCurrentView() {
  const filtered = filterItemsByQuery(currentItems, searchInput.value);
  if (currentView === 'table') {
    renderTable(filtered);
  } else {
    renderGrid(filtered);
  }
}

function appendBadges(target, item, subFeed) {
  if (item.bookmark) {
    const badge = document.createElement('span');
    badge.className = 'bookmark-badge';
    badge.textContent = '★';
    target.appendChild(badge);
  }
  if (subFeed) {
    const folderBadge = document.createElement('span');
    folderBadge.className = 'subfeed-badge';
    folderBadge.textContent = '📁';
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
}

async function navigateToSubFeed(item) {
  stopPlayback();
  playerPanel.hidden = true;
  const parentUrl = currentFeedUrl;
  const succeeded = await loadFeed(item.enclosureUrl, { isNavigation: true });
  if (succeeded) {
    feedHistory.push(parentUrl);
    updateBackButton();
  }
}

function renderGrid(items) {
  videoGrid.innerHTML = '';
  items.forEach((item) => {
    const subFeed = isSubFeed(item);
    const card = document.createElement('article');
    card.className = 'video-card';
    if (!item.enclosureUrl) {
      card.classList.add('disabled');
    }
    if (subFeed) {
      card.classList.add('subfeed');
    }

    const img = document.createElement('img');
    img.src = item.thumbnail || 'placeholder.svg';
    img.alt = item.title;
    card.appendChild(img);

    appendBadges(card, item, subFeed);

    const title = document.createElement('div');
    title.className = 'card-title';
    title.textContent = item.title;
    card.appendChild(title);

    attachItemHandler(card, item, subFeed);

    videoGrid.appendChild(card);
  });
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

  playerTitle.textContent = item.title;
  playerDescription.textContent = item.description;
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

async function loadFeed(url, { isNavigation = false } = {}) {
  showFeedError('');
  try {
    const res = await fetch(`/api/feed?url=${encodeURIComponent(url)}`);
    const body = await res.json();
    if (!res.ok) {
      showFeedError(body.error || 'Failed to load feed');
      return false;
    }
    currentItems = body.items;
    currentFeedUrl = url;
    if (!isNavigation) {
      localStorage.setItem(STORAGE_KEY, url);
    }
    renderCurrentView();
    return true;
  } catch (err) {
    showFeedError(`Failed to load feed: ${err.message}`);
    return false;
  }
}

feedForm.addEventListener('submit', (event) => {
  event.preventDefault();
  feedHistory = [];
  updateBackButton();
  loadFeed(feedUrlInput.value.trim());
});

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
  const succeeded = await loadFeed(previousUrl, { isNavigation: true });
  if (succeeded) {
    feedHistory.pop();
    updateBackButton();
  }
});

viewGridBtn.addEventListener('click', () => setView('grid'));
viewTableBtn.addEventListener('click', () => setView('table'));

viewGridBtn.classList.toggle('active', currentView === 'grid');
viewTableBtn.classList.toggle('active', currentView === 'table');
videoGrid.hidden = currentView !== 'grid';
videoTable.hidden = currentView !== 'table';

const savedUrl = localStorage.getItem(STORAGE_KEY) || DEFAULT_FEED_URL;
feedUrlInput.value = savedUrl;
loadFeed(savedUrl);
