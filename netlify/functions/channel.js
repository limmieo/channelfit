const API_KEY = process.env.YOUTUBE_API_KEY;

function parseHandle(input) {
  input = input.trim();
  const atMatch = input.match(/@([\w.-]+)/);
  if (atMatch) return { type: 'handle', value: atMatch[1] };
  const channelMatch = input.match(/\/channel\/(UC[\w-]+)/);
  if (channelMatch) return { type: 'id', value: channelMatch[1] };
  if (input.startsWith('@')) return { type: 'handle', value: input.slice(1) };
  if (input.startsWith('UC')) return { type: 'id', value: input };
  return { type: 'search', value: input };
}

exports.handler = async (event) => {
  const input = event.queryStringParameters?.handle;
  if (!input) return { statusCode: 400, body: JSON.stringify({ error: 'Missing handle parameter' }) };

  try {
    const parsed = parseHandle(input);
    let channelId;

    if (parsed.type === 'id') {
      channelId = parsed.value;
    } else if (parsed.type === 'handle') {
      const url = `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${encodeURIComponent(parsed.value)}&key=${API_KEY}`;
      const data = await (await fetch(url)).json();
      if (!data.items || data.items.length === 0) {
        const surl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(parsed.value)}&maxResults=1&key=${API_KEY}`;
        const sdata = await (await fetch(surl)).json();
        if (!sdata.items || sdata.items.length === 0) return { statusCode: 404, body: JSON.stringify({ error: 'Channel not found' }) };
        channelId = sdata.items[0].snippet.channelId;
      } else {
        channelId = data.items[0].id;
      }
    } else {
      const surl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(parsed.value)}&maxResults=1&key=${API_KEY}`;
      const sdata = await (await fetch(surl)).json();
      if (!sdata.items || sdata.items.length === 0) return { statusCode: 404, body: JSON.stringify({ error: 'Channel not found' }) };
      channelId = sdata.items[0].snippet.channelId;
    }

    const detailUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,brandingSettings,contentDetails&id=${channelId}&key=${API_KEY}`;
    const detail = await (await fetch(detailUrl)).json();
    if (!detail.items || detail.items.length === 0) return { statusCode: 404, body: JSON.stringify({ error: 'Channel not found' }) };

    return { statusCode: 200, body: JSON.stringify(detail.items[0]) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
