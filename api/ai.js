const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;

const SYSTEM_PROMPT = `Ты — Low Price, ИИ-ассистент сайта для поиска выгодных предложений на цифровые товары.

ПРАВИЛА (обязательны к исполнению):
1. НИКОГДА не используй эмодзи. Только текст.
2. Отвечай кратко: 2–3 предложения.
3. Отвечай по-русски.
4. Не выдумывай товары, которых нет.

О проекте:
- Low Price помогает находить игры, подписки, ключи активации, подарочные карты и аккаунты по выгодным ценам.
- Поиск работает ТОЛЬКО с английскими названиями. Если пользователь пишет по-русски — предложи написать запрос латиницей (например, «Steam Balance» вместо «стим баланс»).
- Пользователь может сортировать результаты по цене и рейтингу продавца.

Твоя роль:
- Отвечай на вопросы о сайте.
- На приветствия («привет», «как дела») отвечай дружелюбно и напоминай о поиске.
- Если спрашивают, что ты умеешь — расскажи о поиске игр, подписок, ключей, аккаунтов.
- Если вопрос не о сайте и не о товарах — вежливо верни разговор к поиску.`;

function removeEmojis(str) {
  return String(str || '')
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')
    .replace(/[\u{2600}-\u{27BF}]/gu, '')
    .replace(/[\u{2190}-\u{21FF}]/gu, '')
    .replace(/[\u{2B00}-\u{2BFF}]/gu, '')
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

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
        model: 'openrouter/free',
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

    const reply = removeEmojis(data.choices[0].message.content);
    res.json({ reply });
  } catch (e) {
    console.error('AI error:', e.message);
    res.status(500).json({ error: 'Ошибка: ' + e.message });
  }
};
