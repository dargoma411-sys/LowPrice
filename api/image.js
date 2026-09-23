module.exports = async (req, res) => {
  const url = req.query.url;
  if (!url || !url.startsWith('https://')) {
    return res.status(400).end();
  }

  try {
    const imgRes = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Referer': 'https://www.wildberries.ru/',
      },
    });

    if (!imgRes.ok) {
      return res.status(imgRes.status).end();
    }

    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const contentType = imgRes.headers.get('content-type') || 'image/webp';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(buffer);
  } catch (e) {
    console.error('Image proxy error:', e.message);
    res.status(500).end();
  }
};
