const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { SAMPLE_XML } = require('./fixtures/sampleFeed');
const { createApp } = require('../server');

function startFixtureServer(status, body) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      res.writeHead(status);
      res.end(body);
    });
    server.listen(0, () => resolve(server));
  });
}

function startApp() {
  const app = createApp();
  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve(server));
  });
}

test('GET /api/feed rejects loopback feed urls as a disallowed address (SSRF guard)', async () => {
  const fixtureServer = await startFixtureServer(200, SAMPLE_XML);
  const appServer = await startApp();
  try {
    const fixturePort = fixtureServer.address().port;
    const appPort = appServer.address().port;
    const feedUrl = encodeURIComponent(`http://localhost:${fixturePort}/feed.xml`);

    // The /api/feed route never allows private/loopback hosts (that's the
    // SSRF fix), so even a same-machine fixture server is correctly rejected
    // with 400 rather than being fetched.
    const res = await fetch(`http://localhost:${appPort}/api/feed?url=${feedUrl}`);
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /disallowed address/i);
  } finally {
    appServer.close();
    fixtureServer.close();
  }
});

test('GET /api/feed without a url query param returns 400', async () => {
  const appServer = await startApp();
  try {
    const appPort = appServer.address().port;
    const res = await fetch(`http://localhost:${appPort}/api/feed`);
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /url/i);
  } finally {
    appServer.close();
  }
});

test('GET /api/feed with a loopback feed url returns 400 (disallowed address)', async () => {
  const appServer = await startApp();
  try {
    const appPort = appServer.address().port;
    const res = await fetch(`http://localhost:${appPort}/api/feed?url=${encodeURIComponent('http://127.0.0.1:1/feed.xml')}`);
    assert.equal(res.status, 400);
  } finally {
    appServer.close();
  }
});

test('GET / serves the static index.html', async () => {
  const appServer = await startApp();
  try {
    const appPort = appServer.address().port;
    const res = await fetch(`http://localhost:${appPort}/`);
    assert.equal(res.status, 200);
    const text = await res.text();
    assert.match(text, /<html/i);
  } finally {
    appServer.close();
  }
});

test('GET / serves markup with the expected element ids', async () => {
  const appServer = await startApp();
  try {
    const appPort = appServer.address().port;
    const res = await fetch(`http://localhost:${appPort}/`);
    const text = await res.text();
    assert.match(text, /id="search-input"/);
    assert.match(text, /id="player-panel"/);
    assert.match(text, /id="player-video"/);
    assert.match(text, /id="back-button"/);
    assert.match(text, /id="video-table"/);
    assert.match(text, /id="table-skeleton"/);
    assert.match(text, /id="empty-state"/);
    assert.match(text, /rel="manifest"/);
  } finally {
    appServer.close();
  }
});
