module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const query = req.query.query;
  if (!query || query.length < 3) {
    return res.status(400).json({ error: 'Запрос должен быть минимум 3 символа' });
  }

  try {
    const params = new URLSearchParams({
      query: query,
      pagesize: '100',
      pagenum: '1',
      visibleOnly: 'true',
      response: 'json',
    });

    const url = `https://plati.io/api/search.ashx?${params.toString()}`;

    const apiRes = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'ru-RU,ru;q=0.9',
        'Referer': 'https://plati.market/',
        'Origin': 'https://plati.market',
      },
    });

    const text = await apiRes.text();

    if (!apiRes.ok) {
      console.error('Plati HTTP', apiRes.status, text.slice(0, 200));
      return res.status(500).json({ error: 'Plati вернул ' + apiRes.status });
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error('Plati не JSON:', text.slice(0, 300));
      return res.status(500).json({ error: 'Plati вернул некорректный ответ' });
    }

    // Структура может быть разной: data.items.item, data.items, items
    let items = data?.data?.items?.item || data?.items?.item || data?.items || data?.data || [];

    if (!Array.isArray(items)) {
      console.error('Неожиданная структура:', JSON.stringify(data).slice(0, 400));
      return res.json({ products: [] });
    }

    const products = items.map(item => {
      const price = parseFloat(item.price_rur || item.price || 0);
      const name = item.name || item.name_goods || item.title || '';
      const sellerRating = parseFloat(item.seller_rating || 0);

      return {
        id: item.id || item.id_goods || name,
        name,
        price,
        rating: sellerRating,
        seller: item.seller || item.seller_name || '',
        image: item.image || item.img || null,
        url: item.url || (item.id ? `https://plati.market/itm/${item.id}/` : ''),
      };
    }).filter(p => p.name && p.price > 0);

    res.json({ products });
  } catch (e) {
    console.error('Plati error:', e.message);
    res.status(500).json({ error: 'Ошибка: ' + e.message });
  }
};
