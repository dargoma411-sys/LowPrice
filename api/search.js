const APIFY_TOKEN = process.env.APIFY_TOKEN;
const ACTOR_ID = 'sian.agency~wildberries-product-scraper';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const query = req.query.query;
  if (!query) return res.status(400).json({ error: 'Введите поисковый запрос' });

  if (!APIFY_TOKEN) {
    return res.status(500).json({ error: 'APIFY_TOKEN не настроен в Vercel' });
  }

  try {
    const runRes = await fetch(
      `https://api.apify.com/v2/acts/${ACTOR_ID}/run-sync-get-dataset-items?token=${APIFY_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queries: [query],
          maxResults: 50,
          maxPages: 1,
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

    const products = items.map(p => ({
      id: p.nmId || p.id,
      name: p.name || '',
      brand: p.brand || '',
      price: p.salePrice || p.price || 0,
      oldPrice: p.price_original || null,
      rating: p.rating || 0,
      feedbacks: p.feedbacks || 0,
      image: p.image || p.imageUrl || null,
      url: p.url || p.productUrl || `https://www.wildberries.ru/catalog/${p.nmId}/detail.aspx`,
    }));

    res.json({ products });
  } catch (e) {
    console.error('Ошибка:', e.message);
    res.status(500).json({ error: 'Ошибка при получении данных: ' + e.message });
  }
};
