const API_KEY = process.env.YOUTUBE_API_KEY;

exports.handler = async (event) => {
  const { ids } = event.queryStringParameters || {};
  if (!ids) return { statusCode: 400, body: JSON.stringify({ error: 'Missing ids parameter' }) };

  try {
    const url = `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet,contentDetails&id=${encodeURIComponent(ids)}&key=${API_KEY}`;
    const data = await (await fetch(url)).json();
    return { statusCode: 200, body: JSON.stringify(data) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
