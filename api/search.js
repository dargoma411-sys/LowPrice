const { Curl, CurlOpt, Browser } = require('node-libcurl-ja3');

const DEST = '-1257786';

function fetchWB(url) {
  return new Promise((resolve, reject) => {
    const curl = Curl.impersonate(Browser.Chrome);

    curl.setOpt(CurlOpt.Url, url);
    curl.setOpt(CurlOpt.FollowLocation, 1);
    curl.setOpt(CurlOpt.TimeoutMs, 15000);
    curl.setOpt(CurlOpt.HttpHeader, [
      'Accept: application/json',
      'Accept-Language: ru-RU,ru;q=0.9',
    ]);

    curl.on('end', (statusCode, data) => {
      curl.close();
      if (statusCode !== 200) {
        return reject(new Error(`WB вернул статус ${statusCode}`));
      }
      resolve(data);
    });

    curl.on('error', (err) => {
      curl.close();
      reject(err);
    });

    curl.perform();
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const query = req.query.query;
  if (!query) return res.status(400).json({ error: 'query required' });

  try {
    const url = `https://search.wb.ru/exactmatch/ru/common/v9/search?ab_testing=false&appType=1&curr=rub&dest=${DEST}&query=${encodeURIComponent(query)}&resultset=catalog&sort=popular&spp=30&suppressSpellcheck=false`;

    const raw = await fetchWB(url);
    const data = JSON.parse(raw);

    if (!data.data || !data.data.products) {
      return res.json({ products: [] });
    }

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
