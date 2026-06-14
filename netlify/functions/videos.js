const API_KEY = process.env.YOUTUBE_API_KEY;

exports.handler = async (event) => {
  const { playlistId, maxResults = 50 } = event.queryStringParameters || {};
  if (!playlistId) return { statusCode: 400, body: JSON.stringify({ error: 'Missing playlistId' }) };

  try {
    const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${playlistId}&maxResults=${maxResults}&key=${API_KEY}`;
    const data = await (await fetch(url)).json();
    return { statusCode: 200, body: JSON.stringify(data) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
