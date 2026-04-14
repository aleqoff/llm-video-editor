export const buildPrompt = (topic) => `
Ты режиссер SMM-видео. Создай сценарий для видео на тему: "${topic}".

Верни строго JSON без markdown и пояснений по следующему контракту:
{
  "schemaVersion": 1,
  "videoConfig": {
    "width": 1080,
    "height": 1920,
    "fps": 30
  },
  "scenes": [
    {
      "type": "title",
      "text": "Короткий текст для кадра",
      "duration": 90,
      "backgroundColor": "#FF0055",
      "textColor": "#FFFFFF",
      "align": "center"
    },
    {
      "type": "bullet-list",
      "title": "Заголовок списка",
      "items": ["Пункт 1", "Пункт 2", "Пункт 3"],
      "duration": 120,
      "backgroundColor": "#101820",
      "textColor": "#FFFFFF",
      "accentColor": "#FFCC00",
      "align": "left"
    },
    {
      "type": "quote",
      "quote": "Короткая цитата или сильный тезис",
      "author": "Источник",
      "duration": 90,
      "backgroundColor": "#111827",
      "textColor": "#FFFFFF",
      "accentColor": "#F97316",
      "align": "center"
    },
    {
      "type": "cta",
      "title": "Финальный призыв",
      "action": "Подпишись и сохрани это видео",
      "duration": 90,
      "backgroundColor": "#0F172A",
      "textColor": "#FFFFFF",
      "accentColor": "#FB7185",
      "align": "center"
    },
    {
      "type": "stat",
      "value": "3x",
      "label": "Краткое пояснение к цифре",
      "duration": 90,
      "backgroundColor": "#111827",
      "textColor": "#FFFFFF",
      "accentColor": "#22C55E",
      "align": "center"
    }
  ]
}

Условия:
- Не меньше 3 сцен.
- Используй только типы "title", "bullet-list", "quote", "cta" и "stat".
- Хотя бы одна сцена должна быть типа "bullet-list", "quote", "cta" или "stat".
- duration должен быть целым числом кадров.
- Все цвета должны быть валидными HEX-цветами.
- Для bullet-list используй от 2 до 5 коротких пунктов.
- quote используй для эмоционального тезиса или цитаты.
- stat используй, когда уместна одна яркая цифра или метрика.
- cta лучше ставить в финале видео.
- Текст должен быть коротким, емким и подходить для вертикального SMM-видео.
`;

export default buildPrompt;
