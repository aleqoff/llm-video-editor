import { GoogleGenerativeAI } from "@google/generative-ai";
import 'dotenv/config';

const apiKey = process.env.GEMINI_API_KEY; 

if (!apiKey) {
  console.error("❌ Ошибка: API ключ не найден в файле .env");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
  try {
    // В библиотеке Google нет прямого метода listModels в основном классе,
    // поэтому мы делаем запрос к системному эндпоинту через встроенный метод.
    // Но проще всего проверить работоспособность через вызов основной модели.
    
    console.log("🔍 Проверяем доступные модели...");
    
    // Попробуем получить список через итератор (если поддерживается версией)
    // Или просто протестируем альтернативное имя
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();
    
    console.log("Список моделей в вашем доступе:");
    data.models.forEach(m => {
      console.log(`- ${m.name} (Методы: ${m.supportedGenerationMethods})`);
    });

  } catch (error) {
    console.error("❌ Не удалось получить список:", error.message);
    console.log("\n💡 СОВЕТ: Если вы получаете 404 или ошибку сети, попробуйте включить VPN. API Google AI Studio официально работает не во всех регионах.");
  }
}

listModels();
