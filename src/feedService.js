const { XMLParser } = require('fast-xml-parser');
const dns = require('node:dns').promises;
const net = require('node:net');

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
});

class FeedFetchError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'FeedFetchError';
    this.status = status;
  }
}

function stripScriptTags(html) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, '');
}

// Returns true if `ip` falls within a disallowed (loopback / private /
// link-local, including the cloud metadata range) address space.
function isDisallowedIp(ip) {
  if (net.isIPv4(ip)) {
    const octets = ip.split('.').map(Number);
    const [a, b] = octets;

    if (a === 127) return true; // loopback (127.0.0.0/8)
    if (a === 10) return true; // private (10.0.0.0/8)
    if (a === 172 && b >= 16 && b <= 31) return true; // private (172.16.0.0/12)
    if (a === 192 && b === 168) return true; // private (192.168.0.0/16)
    if (a === 169 && b === 254) return true; // link-local incl. cloud metadata (169.254.0.0/16)
    if (a === 0) return true; // "this network" / unspecified
    return false;
  }

  if (net.isIPv6(ip)) {
    const normalized = ip.toLowerCase();
    if (normalized === '::1') return true; // loopback
    if (normalized === '::') return true; // unspecified
    if (normalized.startsWith('fe80:')) return true; // link-local
    if (/^f[cd][0-9a-f]{2}:/.test(normalized)) return true; // unique-local (fc00::/7)
    // IPv4-mapped IPv6 addresses (e.g. ::ffff:127.0.0.1)
    const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isDisallowedIp(mapped[1]);
    return false;
  }

  return false;
}

async function assertUrlIsSafe(url, { allowPrivateHosts = false } = {}) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new FeedFetchError('Invalid feed URL', 400);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new FeedFetchError('Only http and https feed URLs are supported', 400);
  }

  if (allowPrivateHosts) {
    return;
  }

  // URL#hostname retains brackets around IPv6 literals (e.g. "[::1]"),
  // but dns.lookup expects the bare address.
  const hostname = parsed.hostname.replace(/^\[(.*)\]$/, '$1');

  let address;
  try {
    const result = await dns.lookup(hostname);
    address = result.address;
  } catch {
    throw new FeedFetchError('Could not resolve feed URL host', 502);
  }

  if (isDisallowedIp(address)) {
    throw new FeedFetchError('Feed URL resolves to a disallowed address', 400);
  }
}

function normalizeItem(item) {
  const enclosure = item.enclosure || {};
  const mediaThumbnail = item['media:thumbnail'] || {};
  const itunesImage = item['itunes:image'] || {};

  const thumbnail = mediaThumbnail['@_url'] || itunesImage['@_href'] || null;
  const enclosureUrl = enclosure['@_url'] || null;
  const enclosureType = enclosure['@_type'] || null;
  const bookmark = String(item.bookmark).trim().toLowerCase() === 'true';

  return {
    title: item.title != null ? String(item.title) : '',
    link: item.link != null ? String(item.link) : null,
    pubDate: item.pubDate != null ? String(item.pubDate) : null,
    description: stripScriptTags(item.description != null ? String(item.description) : ''),
    thumbnail,
    enclosureUrl,
    enclosureType,
    bookmark,
  };
}

async function fetchFeed(url, options = {}) {
  await assertUrlIsSafe(url, options);

  let response;
  try {
    response = await fetch(url);
  } catch {
    throw new FeedFetchError('Could not reach feed URL', 502);
  }

  if (!response.ok) {
    throw new FeedFetchError('Failed to fetch feed URL', 502);
  }

  const xml = await response.text();

  let parsed;
  try {
    parsed = parser.parse(xml);
  } catch {
    throw new FeedFetchError('Feed content is not valid XML', 400);
  }

  const channel = parsed && parsed.rss && parsed.rss.channel;
  if (!channel) {
    throw new FeedFetchError('Feed content is not a valid RSS feed', 400);
  }

  let items = channel.item || [];
  if (!Array.isArray(items)) {
    items = [items];
  }

  return items.map(normalizeItem);
}

module.exports = { fetchFeed, normalizeItem, FeedFetchError };
