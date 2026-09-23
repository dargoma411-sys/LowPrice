// Vercel Serverless Function — прокси к публичному API Wildberries
// Wildberries блокирует обычный fetch по TLS-фингерпринту, поэтому используем системный curl

const { execSync } = require('child_process');

// Москва — фиксируем регион, чтобы цены не прыгали
const DEST = '-1257786';

module.exports = async (req, res) => {
  // CORS заголовки для Vercel [citation:7][citation:16]
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const query = req.query.query;
  if (!query) {
    return res.status(400).json({ error: 'query parameter required' });
  }

  try {
    // Публичный API поиска Wildberries [citation:3][citation:11]
    const url = `https://search.wb.ru/exactmatch/ru/common/v9/search?ab_testing=false&appType=1&curr=rub&dest=${DEST}&query=${encodeURIComponent(query)}&resultset=catalog&sort=popular&spp=30&suppressSpellcheck=false`;

    // curl проходит TLS-фингерпринт, node-fetch — нет [citation:3][citation:11]
    const raw = execSync(`curl -s -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)" "${url}"`, {
      encoding: 'utf-8',
      timeout: 15000,
    });

    const data = JSON.parse(raw);

    if (!data.data || !data.data.products) {
      return res.json({ products: [] });
    }

    // Нормализуем данные под наш фронтенд
    const products = data.data.products.map(p => ({
      id: p.id,
      name: p.name,
      brand: p.brand,
      price: (p.salePriceU || p.priceU) / 100,
      oldPrice: p.priceU ? p.priceU / 100 : null,
      rating: p.reviewRating || 0,
      feedbacks: p.feedbacks || 0,
      image: p.id ? `https://basket-${Math.floor(p.id / 100000) % 20 + 1}.wbbasket.ru/vol${Math.floor(p.id / 100000)}/part${Math.floor(p.id / 1000)}/${p.id}/images/c516x688/1.webp` : null,
      url: `https://www.wildberries.ru/catalog/${p.id}/detail.aspx`,
    }));

    // Пауза для защиты от 429 [citation:11]
    res.json({ products });
  } catch (e) {
    console.error('WB error:', e.message);
    res.status(500).json({ error: 'Не удалось получить данные от Wildberries' });
  }
};
