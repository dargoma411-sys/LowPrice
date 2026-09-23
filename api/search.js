const { execSync } = require('child_process');

const DEST = '-1257786';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const query = req.query.query;
  if (!query) return res.status(400).json({ error: 'query required' });

  try {
    const url = `https://search.wb.ru/exactmatch/ru/common/v9/search?ab_testing=false&appType=1&curr=rub&dest=${DEST}&query=${encodeURIComponent(query)}&resultset=catalog&sort=popular&spp=30&suppressSpellcheck=false`;

    const raw = execSync(
      `curl -s --tlsv1.2 --http2 -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36" -H "Accept: application/json" "${url}"`,
      { encoding: 'utf-8', timeout: 15000 }
    );

    const data = JSON.parse(raw);
    if (!data.data || !data.data.products) return res.json({ products: [] });

    const products = data.data.products.map(p => ({
      id: p.id,
      name: p.name,
      brand: p.brand,
      price: (p.salePriceU || p.priceU) / 100,
      oldPrice: p.priceU ? p.priceU / 100 : null,
      rating: p.reviewRating || 0,
      feedbacks: p.feedbacks || 0,
      image: `https://basket-${String(Math.floor(p.id / 100000) % 20 + 1).padStart(2,'0')}.wbbasket.ru/vol${Math.floor(p.id / 100000)}/part${Math.floor(p.id / 1000)}/${p.id}/images/c516x688/1.webp`,
      url: `https://www.wildberries.ru/catalog/${p.id}/detail.aspx`,
    }));

    res.json({ products });
  } catch (e) {
    console.error('WB error:', e.message);
    res.status(500).json({ error: 'Wildberries временно недоступен' });
  }
};
