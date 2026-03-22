import { GoogleGenerativeAI } from "@google/generative-ai";
import 'dotenv/config';
import saveAiResponseToFile from "./utils/ResponseToFile.mjs";

const apiKey = process.env.GEMINI_API_KEY; 

if (!apiKey) {
  console.error("❌ Ошибка: API ключ не найден в файле .env");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function generateScript() {
    console.log("Отправлен запрос Гемини");

    const model = genAI.getGenerativeModel({
        model: "gemini-flash-latest",
        generationConfig: {
            responseMimeType: "application/json",
        }
    });

    const prompt = `
    Ты режиссер SMM-видео. Создай сценарий для видео на тему: "3 причины начать учить программирование".
    
    Верни строго JSON по следующей структуре (без маркдауна и лишних слов):
    {
      "videoConfig": {
        "width": 1080,
        "height": 1920,
        "fps": 30
      },
      "scenes": [
        {
          "text": "строка (короткий текст для кадра)",
          "duration": "число (длительность в кадрах, например 60 или 90)",
          "color": "строка (HEX-код цвета фона, например #ff0000)"
        }
      ]
    }
    
    Сделай ровно 3 сцены с яркими цветами фона.
  `;
    
  try {
    const result = await model.generateContent(prompt);

    console.log("Успех, получен жсон от модели");
    console.log(result.response.text());

    const aiText = result.response.text();

    await saveAiResponseToFile(aiText);

  } catch(error){
    console.error("Ошибка:", error)
  }
}

generateScript();