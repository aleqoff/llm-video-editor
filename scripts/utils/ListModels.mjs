import { GoogleGenAI } from '@google/genai';
import 'dotenv/config';

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error('❌ Ошибка: API ключ не найден в файле .env');
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

async function listModels() {
  try {
    console.log('🔍 Проверяем доступные модели...');

    const pager = await ai.models.list();

    console.log('Список моделей в вашем доступе:');
    for await (const model of pager) {
      console.log(`- ${model.name} (Методы: ${model.supportedGenerationMethods})`);
    }
  } catch (error) {
    console.error('❌ Не удалось получить список:', error.message);
    console.log('\n💡 СОВЕТ: Если вы получаете 404 или ошибку сети, попробуйте включить VPN. API Google AI Studio официально работает не во всех регионах.');
  }
}

listModels();
