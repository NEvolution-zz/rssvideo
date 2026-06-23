export function filterItemsByQuery(items, query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return items;
  }
  return items.filter((item) => item.title.toLowerCase().includes(normalized));
}

export function needsHls(item) {
  if (item.enclosureType === 'application/x-mpegurl') {
    return true;
  }
  return Boolean(item.enclosureUrl && item.enclosureUrl.toLowerCase().endsWith('.m3u8'));
}

export function isSubFeed(item) {
  return item.enclosureType === 'application/rss+xml';
}
