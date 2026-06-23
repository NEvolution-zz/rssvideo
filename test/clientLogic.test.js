const { test } = require('node:test');
const assert = require('node:assert/strict');

test('filterItemsByQuery returns all items when query is empty', async () => {
  const { filterItemsByQuery } = await import('../public/clientLogic.mjs');
  const items = [{ title: 'Big Buck Bunny' }, { title: 'Apple Demo' }];
  assert.deepEqual(filterItemsByQuery(items, ''), items);
  assert.deepEqual(filterItemsByQuery(items, '   '), items);
});

test('filterItemsByQuery filters case-insensitively by title substring', async () => {
  const { filterItemsByQuery } = await import('../public/clientLogic.mjs');
  const items = [{ title: 'Big Buck Bunny' }, { title: 'Apple Demo' }];
  assert.deepEqual(filterItemsByQuery(items, 'bunny'), [{ title: 'Big Buck Bunny' }]);
  assert.deepEqual(filterItemsByQuery(items, 'APPLE'), [{ title: 'Apple Demo' }]);
  assert.deepEqual(filterItemsByQuery(items, 'zzz'), []);
});

test('needsHls detects application/x-mpegurl type', async () => {
  const { needsHls } = await import('../public/clientLogic.mjs');
  assert.equal(needsHls({ enclosureType: 'application/x-mpegurl', enclosureUrl: 'http://x/y' }), true);
});

test('needsHls detects .m3u8 url when type is missing', async () => {
  const { needsHls } = await import('../public/clientLogic.mjs');
  assert.equal(needsHls({ enclosureType: null, enclosureUrl: 'http://x/stream.M3U8' }), true);
});

test('needsHls returns false for an mp4 enclosure', async () => {
  const { needsHls } = await import('../public/clientLogic.mjs');
  assert.equal(needsHls({ enclosureType: 'video/mp4', enclosureUrl: 'http://x/video.mp4' }), false);
});

test('isSubFeed detects an application/rss+xml enclosure', async () => {
  const { isSubFeed } = await import('../public/clientLogic.mjs');
  assert.equal(isSubFeed({ enclosureType: 'application/rss+xml', enclosureUrl: 'http://x/y.xml' }), true);
});

test('isSubFeed returns false for a video enclosure', async () => {
  const { isSubFeed } = await import('../public/clientLogic.mjs');
  assert.equal(isSubFeed({ enclosureType: 'video/mp4', enclosureUrl: 'http://x/video.mp4' }), false);
  assert.equal(isSubFeed({ enclosureType: null, enclosureUrl: null }), false);
});
