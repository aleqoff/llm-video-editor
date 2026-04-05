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
    }
  ]
}

Условия:
- Ровно 3 сцены.
- Используй только типы "title" и "bullet-list".
- Хотя бы одна сцена должна быть типа "bullet-list".
- duration должен быть целым числом кадров.
- backgroundColor, textColor и accentColor должны быть валидными HEX-цветами.
- Для bullet-list используй от 2 до 5 коротких пунктов.
- Текст должен быть коротким, емким и подходить для вертикального SMM-видео.
`;

export default buildPrompt;
