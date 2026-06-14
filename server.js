require('dotenv').config();
const express = require('express');
const https = require('https');
const path = require('path');

const app = express();
const API_KEY = process.env.YOUTUBE_API_KEY;
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

function ytFetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { reject(e); }
      });
    }).on('error', reject);
  });
}

// Parse channel handle/URL → channel ID
function parseHandle(input) {
  input = input.trim();
  // @handle
  const atMatch = input.match(/@([\w.-]+)/);
  if (atMatch) return { type: 'handle', value: atMatch[1] };
  // /channel/UC...
  const channelMatch = input.match(/\/channel\/(UC[\w-]+)/);
  if (channelMatch) return { type: 'id', value: channelMatch[1] };
  // bare handle
  if (input.startsWith('@')) return { type: 'handle', value: input.slice(1) };
  // assume it's a raw channel ID
  if (input.startsWith('UC')) return { type: 'id', value: input };
  // fallback: search
  return { type: 'search', value: input };
}

// GET /api/channel?handle=@mkbhd
app.get('/api/channel', async (req, res) => {
  const input = req.query.handle;
  if (!input) return res.status(400).json({ error: 'Missing handle parameter' });

  try {
    const parsed = parseHandle(input);
    let channelId;

    if (parsed.type === 'id') {
      channelId = parsed.value;
    } else if (parsed.type === 'handle') {
      const url = `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${encodeURIComponent(parsed.value)}&key=${API_KEY}`;
      const data = await ytFetch(url);
      if (!data.items || data.items.length === 0) {
        // fallback to search
        const surl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(parsed.value)}&maxResults=1&key=${API_KEY}`;
        const sdata = await ytFetch(surl);
        if (!sdata.items || sdata.items.length === 0) return res.status(404).json({ error: 'Channel not found' });
        channelId = sdata.items[0].snippet.channelId;
      } else {
        channelId = data.items[0].id;
      }
    } else {
      // search fallback
      const surl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(parsed.value)}&maxResults=1&key=${API_KEY}`;
      const sdata = await ytFetch(surl);
      if (!sdata.items || sdata.items.length === 0) return res.status(404).json({ error: 'Channel not found' });
      channelId = sdata.items[0].snippet.channelId;
    }

    const detailUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,brandingSettings,contentDetails&id=${channelId}&key=${API_KEY}`;
    const detail = await ytFetch(detailUrl);
    if (!detail.items || detail.items.length === 0) return res.status(404).json({ error: 'Channel not found' });

    res.json(detail.items[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/videos?playlistId=UU...&maxResults=50
app.get('/api/videos', async (req, res) => {
  const { playlistId, maxResults = 50 } = req.query;
  if (!playlistId) return res.status(400).json({ error: 'Missing playlistId' });

  try {
    const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${playlistId}&maxResults=${maxResults}&key=${API_KEY}`;
    const data = await ytFetch(url);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/video-stats?ids=id1,id2,id3
app.get('/api/video-stats', async (req, res) => {
  const { ids } = req.query;
  if (!ids) return res.status(400).json({ error: 'Missing ids parameter' });

  try {
    const url = `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet,contentDetails&id=${encodeURIComponent(ids)}&key=${API_KEY}`;
    const data = await ytFetch(url);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`ChannelFit running at http://localhost:${PORT}`);
});
