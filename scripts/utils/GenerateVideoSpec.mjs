import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config';
import buildPrompt from './BuildPrompt.mjs';
import saveAiResponseToFile from './ResponseToFile.mjs';

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error('API key GEMINI_API_KEY was not found in .env');
}

const genAI = new GoogleGenerativeAI(apiKey);

const logStep = (step, message) => {
  console.log(`✅${step}) ${message}`);
};

const createImagePart = (asset) => {
  return {
    inlineData: {
      mimeType: asset.mimeType,
      data: asset.base64Data,
    },
  };
};

const createAssetSummary = (asset) => {
  return {
    id: asset.id,
    type: 'image',
    src: asset.src,
    alt: asset.alt,
    width: asset.width,
    height: asset.height,
  };
};

export const generateVideoSpecByTopic = async (topic, assets = []) => {
  const normalizedTopic = topic.trim();

  if (!normalizedTopic) {
    throw new Error('Video topic cannot be empty.');
  }

  logStep(1, 'Начата подготовка запроса к LLM.');
  logStep(2, `Подготовлены данные темы и ${assets.length} image asset(s).`);

  const model = genAI.getGenerativeModel({
    model: 'gemini-flash-latest',
    generationConfig: {
      responseMimeType: 'application/json',
    },
  });

  const prompt = buildPrompt({
    topic: normalizedTopic,
    assets: assets.map(createAssetSummary),
  });

  logStep(3, 'Собран prompt для модели.');
  console.log('\nPrompt sent to Gemini:\n');
  console.log(prompt);
  console.log('\nEnd of prompt.\n');

  const parts = [
    ...assets.map(createImagePart),
    {
      text: prompt,
    },
  ];

  logStep(4, 'Отправлен запрос к LLM.');
  const result = await model.generateContent(parts);
  const rawResponseText = result.response.text();

  logStep(5, 'Получен ответ от LLM.');
  console.log('\nRaw Gemini response:\n');
  console.log(rawResponseText);
  console.log('\nEnd of raw Gemini response.\n');

  logStep(6, 'Начат разбор JSON-ответа модели.');
  const rawPayload = JSON.parse(rawResponseText);
  rawPayload.assets = assets.map(createAssetSummary);

  logStep(7, 'Ответ модели разобран, assets синхронизированы с локальными файлами.');
  logStep(8, `Сохраняем итоговый JSON для темы "${normalizedTopic}".`);

  const savedSpec = await saveAiResponseToFile(rawPayload);
  logStep(9, 'Нормализованный video spec сохранён.');

  return savedSpec;
};

export default generateVideoSpecByTopic;
