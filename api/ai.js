const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const prompt = req.query.prompt || req.body?.prompt;
  if (!prompt) return res.status(400).json({ error: 'prompt required' });
  if (!OPENROUTER_KEY) return res.status(500).json({ error: 'OPENROUTER_API_KEY не настроен' });

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://low-price-seven.vercel.app',
        'X-Title': 'Low Price',
      },
      body: JSON.stringify({
        model: 'stealth/space-bunny-alpha',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('OpenRouter HTTP', response.status, text.slice(0, 300));
      return res.status(500).json({ error: 'OpenRouter вернул ' + response.status });
    }

    const data = await response.json();

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Неожиданный ответ OpenRouter:', JSON.stringify(data).slice(0, 400));
      return res.status(500).json({ error: 'Некорректный ответ от ИИ' });
    }

    res.json({ reply: data.choices[0].message.content });
  } catch (e) {
    console.error('AI error:', e.message);
    res.status(500).json({ error: 'Ошибка: ' + e.message });
  }
};
