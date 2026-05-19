import { GoogleGenAI } from '@google/genai';
import 'dotenv/config';
import buildPrompt from './BuildPrompt.mjs';
import saveAiResponseToFile from './ResponseToFile.mjs';

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error('API key GEMINI_API_KEY was not found in .env');
}

const ai = new GoogleGenAI({ apiKey });

const MODELS = [
  'gemini-2.5-flash',       // 5 RPM, 20 RPD  — наилучшее качество
  'gemini-3-flash-preview', // 5 RPM, 20 RPD  — Gemini 3
  'gemini-2.5-flash-lite',  // 10 RPM, 20 RPD — облегчённый
  'gemini-3.1-flash-lite',  // 15 RPM, 500 RPD — надёжный финальный фоллбэк
];

const logStep = (step, message) => {
  console.log(`✅${step}) ${message}`);
};

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
  return [{ inlineData: { mimeType: asset.mimeType, data: asset.base64Data } }];
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

const callWithFallback = async (contents) => {
  for (const model of MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config: { responseMimeType: 'application/json' },
      });
      console.log(`✅ Используется модель: ${model}`);
      return response.text;
    } catch (err) {
      const isOverloaded =
        err.status === 503 ||
        err.status === 429 ||
        String(err).includes('503') ||
        String(err).includes('429');
      if (isOverloaded && model !== MODELS.at(-1)) {
        console.warn(`⚠️ ${model} перегружена, переключаемся на следующую...`);
        continue;
      }
      throw err;
    }
  }
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

  const contents = [{ role: 'user', parts }];

  logStep(4, 'Отправлен запрос к LLM.');
  const rawResponseText = await callWithFallback(contents);

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
