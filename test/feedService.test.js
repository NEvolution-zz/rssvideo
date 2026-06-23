const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { SAMPLE_XML } = require('./fixtures/sampleFeed');
const { fetchFeed, FeedFetchError } = require('../src/feedService');

function startFixtureServer(status, body) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      res.writeHead(status);
      res.end(body);
    });
    server.listen(0, () => resolve(server));
  });
}

test('fetchFeed normalizes a valid RSS feed', async () => {
  const server = await startFixtureServer(200, SAMPLE_XML);
  const port = server.address().port;
  try {
    // allowPrivateHosts is a test-only escape hatch around the SSRF guard
    // (see assertUrlIsSafe in src/feedService.js) so this fixture server,
    // which necessarily binds to a loopback address in this sandbox, can be
    // reached. The real /api/feed route in server.js never passes this option.
    const items = await fetchFeed(`http://localhost:${port}/feed.xml`, {
      allowPrivateHosts: true,
    });
    assert.equal(items.length, 2);

    assert.equal(items[0].title, 'Big Buck Bunny');
    assert.equal(
      items[0].enclosureUrl,
      'http://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_320x180.mp4'
    );
    assert.equal(items[0].enclosureType, 'video/mp4');
    assert.equal(
      items[0].thumbnail,
      'http://peach.blender.org/wp-content/uploads/title_anouncement.jpg'
    );
    assert.equal(items[0].bookmark, false);

    assert.equal(items[1].title, 'HTTP Live Streaming - Apple Demo');
    assert.equal(items[1].enclosureType, 'application/x-mpegurl');
    assert.equal(items[1].bookmark, true);
  } finally {
    server.close();
  }
});

test('fetchFeed throws FeedFetchError on HTTP error status', async () => {
  const server = await startFixtureServer(500, 'server error');
  const port = server.address().port;
  try {
    await assert.rejects(
      () => fetchFeed(`http://localhost:${port}/feed.xml`, { allowPrivateHosts: true }),
      FeedFetchError
    );
  } finally {
    server.close();
  }
});

test('fetchFeed throws FeedFetchError when content is not a valid RSS feed', async () => {
  const server = await startFixtureServer(200, 'not xml at all {{{');
  const port = server.address().port;
  try {
    await assert.rejects(
      () => fetchFeed(`http://localhost:${port}/feed.xml`, { allowPrivateHosts: true }),
      FeedFetchError
    );
  } finally {
    server.close();
  }
});

test('fetchFeed throws FeedFetchError when the host is unreachable', async () => {
  await assert.rejects(
    () => fetchFeed('http://127.0.0.1:1/feed.xml', { allowPrivateHosts: true }),
    FeedFetchError
  );
});

test('fetchFeed throws FeedFetchError for non-http(s) protocols', async () => {
  await assert.rejects(
    () => fetchFeed('ftp://example.com/feed.xml'),
    FeedFetchError
  );
});

test('fetchFeed throws FeedFetchError for URLs resolving to loopback/private addresses', async () => {
  await assert.rejects(
    () => fetchFeed('http://127.0.0.1/feed.xml'),
    FeedFetchError
  );
  await assert.rejects(
    () => fetchFeed('http://localhost/feed.xml'),
    FeedFetchError
  );
});
