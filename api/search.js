const APIFY_TOKEN = process.env.APIFY_TOKEN;
const ACTOR_ID = 'sian.agency~wildberries-product-scraper';

const PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><rect width="300" height="300" fill="#1a1a1a"/><text x="150" y="155" font-family="sans-serif" font-size="14" fill="#666" text-anchor="middle">Нет фото</text></svg>'
);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const query = req.query.query;
  if (!query) return res.status(400).json({ error: 'Введите поисковый запрос' });
  if (!APIFY_TOKEN) return res.status(500).json({ error: 'APIFY_TOKEN не настроен' });

  try {
    const runRes = await fetch(
      `https://api.apify.com/v2/acts/${ACTOR_ID}/run-sync-get-dataset-items?token=${APIFY_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queries: [query],
          maxResults: 100,
          maxPages: 3,
        }),
      }
    );

    if (!runRes.ok) {
      const text = await runRes.text();
      console.error('Apify error:', runRes.status, text);
      return res.status(500).json({ error: 'Ошибка Apify: ' + runRes.status });
    }

    const items = await runRes.json();

    if (!Array.isArray(items)) {
      console.error('Неожиданный ответ Apify:', items);
      return res.json({ products: [] });
    }

    const products = items.map(p => {
      let img = p.thumbnail || null;
      if (!img && Array.isArray(p.images) && p.images.length > 0) {
        const first = p.images[0];
        img = typeof first === 'string' ? first : (first?.url || first?.big || first?.c516x688 || null);
      }
      if (!img && p.image) img = p.image;
      if (!img && p.imageUrl) img = p.imageUrl;

      return {
        id: p.id || p.nmId,
        name: p.productTitle || p.name || '',
        brand: p.brand || '',
        price: p.price || p.salePrice || 0,
        oldPrice: p.price_original || null,
        rating: p.rating || 0,
        feedbacks: p.feedbacks || 0,
        image: img || PLACEHOLDER,
        url: p.url || p.productUrl || `https://www.wildberries.ru/catalog/${p.id}/detail.aspx`,
      };
    });

    res.json({ products });
  } catch (e) {
    console.error('Ошибка:', e.message);
    res.status(500).json({ error: 'Ошибка при получении данных: ' + e.message });
  }
};
