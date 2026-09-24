const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;

const SYSTEM_PROMPT = `Ты — Low Price, дружелюбный ИИ-ассистент сайта для поиска выгодных предложений на цифровые товары.

О проекте:
- Low Price помогает находить игры, подписки, ключи активации, подарочные карты и аккаунты по выгодным ценам.
- Сайт собирает предложения из разных источников, показывает цены, продавцов и рейтинги.
- Пользователь может сортировать результаты по цене и рейтингу продавца.

Твоя роль:
- Отвечай на вопросы о том, как пользоваться сайтом.
- Если пользователь здоровается («привет», «как дела», «хай»), отвечай дружелюбно и напоминай, что ты можешь помочь найти цифровой товар.
- Если спрашивают, что ты умеешь, — расскажи про поиск игр, подписок, ключей, аккаунтов.
- Отвечай кратко (2–4 предложения), по-русски, дружелюбно, без лишних эмодзи.
- Не выдумывай факты о товарах, которых не знаешь. Если не уверен — предложи ввести название товара в поиск.`;

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
        model: 'deepseek/deepseek-v4-flash:free',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        max_tokens: 2000,
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
