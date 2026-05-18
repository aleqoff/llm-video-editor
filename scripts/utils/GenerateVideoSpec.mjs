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

const createImagePart = (asset) => ({
  inlineData: {
    mimeType: asset.mimeType,
    data: asset.base64Data,
  },
});

const createAssetParts = (asset) => {
  if (asset.type === 'video') {
    if (!asset.thumbnails?.length) return [];
    return asset.thumbnails.map((thumb) => ({
      inlineData: {
        mimeType: 'image/jpeg',
        data: thumb.base64Data,
      },
    }));
  }
  if (!asset.base64Data) return [];
  return [createImagePart(asset)];
};

const createAssetSummary = (asset) => {
  const base = {
    id: asset.id,
    type: asset.type ?? 'image',
    src: asset.src,
    alt: asset.alt,
    width: asset.width,
    height: asset.height,
  };
  if (asset.type === 'video') {
    if (asset.durationSeconds != null) base.durationSeconds = asset.durationSeconds;
    if (asset.fps != null) base.fps = asset.fps;
  }
  return base;
};

export const generateVideoSpecByTopic = async (topic, assets = []) => {
  const normalizedTopic = topic.trim();

  if (!normalizedTopic) {
    throw new Error('Video topic cannot be empty.');
  }

  logStep(1, 'Начата подготовка запроса к LLM.');
  const imageCount = assets.filter((a) => a.type !== 'video').length;
  const videoCount = assets.filter((a) => a.type === 'video').length;
  logStep(2, `Подготовлены данные темы, ${imageCount} image(s) и ${videoCount} video(s).`);

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
    ...assets.flatMap(createAssetParts),
    { text: prompt },
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
