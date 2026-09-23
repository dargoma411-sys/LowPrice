const PLATI_BASE = 'https://plati.io/api/search.ashx';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const query = req.query.query;
  if (!query || query.length < 3) {
    return res.status(400).json({ error: 'Запрос должен быть минимум 3 символа' });
  }

  try {
    const url = `${PLATI_BASE}?query=${encodeURIComponent(query)}&pagesize=100&response=json`;

    const apiRes = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
    });

    if (!apiRes.ok) {
      console.error('Plati HTTP', apiRes.status);
      return res.status(500).json({ error: 'Ошибка Plati: ' + apiRes.status });
    }

    const text = await apiRes.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error('Plati вернул не JSON:', text.slice(0, 300));
      return res.status(500).json({ error: 'Plati вернул некорректный ответ' });
    }

    // Plati отдаёт массив товаров внутри разных ключей в зависимости от версии API
    const items = data?.items || data?.products || data?.data || data || [];

    if (!Array.isArray(items)) {
      console.error('Неожиданная структура Plati:', Object.keys(data));
      return res.json({ products: [] });
    }

    const products = items.map(item => {
      // Plati может отдавать вложенные объекты, нормализуем
      const name = item.name || item.title || item.product_name || '';
      const price = parseFloat(item.price || item.price_rub || item.cost || 0);
      const sellerRating = parseFloat(item.seller_rating || item.rating || 0);
      const sellerName = item.seller || item.seller_name || '';
      const url = item.url || item.product_url || (item.id ? `https://plati.io/itm/${item.id}/` : '');
      const image = item.image || item.img || item.thumbnail || null;

      return {
        id: item.id || item.product_id || name,
        name,
        price,
        rating: sellerRating,
        seller: sellerName,
        image,
        url,
      };
    }).filter(p => p.name && p.price > 0);

    res.json({ products });
  } catch (e) {
    console.error('Plati error:', e.message);
    res.status(500).json({ error: 'Ошибка при получении данных: ' + e.message });
  }
};
