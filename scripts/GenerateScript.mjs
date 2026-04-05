import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config';
import saveAiResponseToFile from './utils/ResponseToFile.mjs';

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error('Ошибка: API ключ не найден в файле .env');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function generateScript() {
  console.log('Отправляю запрос в Gemini');

  const model = genAI.getGenerativeModel({
    model: 'gemini-flash-latest',
    generationConfig: {
      responseMimeType: 'application/json',
    },
  });

  const prompt = `
Ты режиссер SMM-видео. Создай сценарий для видео на тему: "3 причины начать учить программирование".

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
    }
  ]
}

Условия:
- Ровно 3 сцены.
- Используй только type = "title".
- duration должен быть целым числом кадров.
- backgroundColor и textColor должны быть валидными HEX-цветами.
- Текст должен быть коротким, емким и подходить для вертикального SMM-видео.
`;

  try {
    const result = await model.generateContent(prompt);

    console.log('Успешно получил JSON от модели');
    console.log(result.response.text());

    const aiText = result.response.text();

    await saveAiResponseToFile(aiText);
  } catch (error) {
    console.error('Ошибка:', error);
  }
}

generateScript();
