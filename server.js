const express = require('express');
const path = require('node:path');
const { fetchFeed, FeedFetchError } = require('./src/feedService');

function createApp() {
  const app = express();
  app.use(express.static(path.join(__dirname, 'public')));

  app.get('/api/feed', async (req, res) => {
    const { url } = req.query;
    if (!url) {
      res.status(400).json({ error: 'Missing required "url" query parameter' });
      return;
    }

    try {
      const items = await fetchFeed(url);
      res.json({ items });
    } catch (err) {
      if (err instanceof FeedFetchError) {
        res.status(err.status).json({ error: err.message });
        return;
      }
      res.status(500).json({ error: 'Unexpected server error' });
    }
  });

  return app;
}

if (require.main === module) {
  const app = createApp();
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`RSS video dashboard listening on port ${port}`);
  });
}

module.exports = { createApp };
