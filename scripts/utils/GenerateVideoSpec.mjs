import { GoogleGenAI } from '@google/genai';
import 'dotenv/config';
import buildPrompt from './BuildPrompt.mjs';
import { generateTTS } from './GenerateTTS.mjs';
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
  if (asset.type === 'audio') {
    return { id: asset.id, type: 'audio', src: asset.src };
  }
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
    if (asset.hasAudio != null) base.hasAudio = asset.hasAudio;
    if (Array.isArray(asset.transcript) && asset.transcript.length > 0) {
      base.transcript = asset.transcript;
    }
  }
  return base;
};

const injectTranscriptSubtitles = (rawPayload, assetSummaries) => {
  const fps = rawPayload.videoConfig?.fps ?? 30;
  for (const scene of rawPayload.scenes ?? []) {
    if (!scene.media?.assetId) continue;
    const asset = assetSummaries.find((a) => a.id === scene.media.assetId);
    if (!asset) continue;
    if (!Array.isArray(asset?.transcript) || !asset.transcript.length) {
      if (asset.hasAudio) {
        console.warn(`⚠️ Субтитры: ассет ${asset.id} имеет hasAudio=true, но транскрипт отсутствует — транскрипция не удалась при загрузке файла`);
      }
      continue;
    }

    const trimStart = scene.media.trimStart ?? 0;
    const trimEnd = scene.media.trimEnd ?? asset.durationSeconds ?? Infinity;
    const segments = asset.transcript.filter(
      (s) => s.endTime > trimStart && s.startTime < trimEnd,
    );
    if (!segments.length) {
      console.log(`ℹ️ Субтитры: нет сегментов для сцены в диапазоне [${trimStart}–${trimEnd}]`);
      continue;
    }

    // Carry over subtitle style from the first LLM-generated subtitle layer (if any)
    const styleTemplate = (() => {
      const existing = (scene.layers ?? []).find((l) => l.kind === 'subtitle');
      if (!existing) return {};
      const { fontSize, background, backgroundOpacity, outline, position, color, accentColor } = existing;
      return Object.fromEntries(
        Object.entries({ fontSize, background, backgroundOpacity, outline, position, color, accentColor })
          .filter(([, v]) => v !== undefined),
      );
    })();

    const subtitleLayers = segments.map((s) => ({
      kind: 'subtitle',
      ...styleTemplate,
      text: s.text.length > 120 ? s.text.slice(0, 117) + '...' : s.text,
      enterAt: Math.max(0, Math.round((s.startTime - trimStart) * fps)),
      exitAt: Math.round((Math.min(s.endTime, trimEnd) - trimStart) * fps),
      enterTransition: styleTemplate.enterTransition ?? 'fade',
      exitTransition: styleTemplate.exitTransition ?? 'fade',
    }));

    scene.layers = [
      ...(scene.layers ?? []).filter((l) => l.kind !== 'subtitle'),
      ...subtitleLayers,
    ];

    console.log(`💬 Субтитры: вставлено ${subtitleLayers.length} слоёв в сцену (trimStart=${trimStart}, trimEnd=${trimEnd})`);
  }
};

const injectBackgroundMusic = (rawPayload, assetSummaries) => {
  if (rawPayload.backgroundMusic) return;
  const audioAsset = assetSummaries.find((a) => a.type === 'audio');
  if (!audioAsset) return;
  rawPayload.backgroundMusic = { assetId: audioAsset.id, volume: 0.15 };
  console.log(`🎵 Фоновая музыка: автоматически добавлен ассет ${audioAsset.id}`);
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

export const generateVideoSpecByTopic = async (topic, assets = [], options = {}) => {
  const normalizedTopic = topic.trim();

  if (!normalizedTopic) {
    throw new Error('Video topic cannot be empty.');
  }

  const { generateTTS: wantTTS = false } = options;

  logStep(1, 'Начата подготовка запроса к LLM.');
  const imageCount = assets.filter((a) => a.type === 'image').length;
  const videoCount = assets.filter((a) => a.type === 'video').length;
  const audioCount = assets.filter((a) => a.type === 'audio').length;
  logStep(2, `Подготовлены данные темы, ${imageCount} image(s), ${videoCount} video(s), ${audioCount} audio(s).`);

  const assetSummaries = assets.map(createAssetSummary);

  const prompt = buildPrompt({
    topic: normalizedTopic,
    assets: assetSummaries,
    requestTTS: wantTTS,
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
  rawPayload.assets = assetSummaries;

  injectTranscriptSubtitles(rawPayload, assetSummaries);
  injectBackgroundMusic(rawPayload, assetSummaries);

  logStep(7, 'Ответ модели разобран, assets синхронизированы с локальными файлами.');

  if (wantTTS && rawPayload.narration?.text) {
    const hasVoice = assetSummaries.some((a) => a.type === 'video' && a.hasAudio);
    if (!hasVoice) {
      logStep('7b', 'Генерируем TTS для нарратива...');
      try {
        const __dirname = new URL('.', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
        const audioDir = `${__dirname}/../../public/uploads/audio`.replace(/\//g, '/');
        const voice = rawPayload.narration.voice ?? 'Aoede';
        const audioAsset = await generateTTS(rawPayload.narration.text, voice, audioDir);
        rawPayload.assets.push(audioAsset);
        rawPayload.narration.assetId = audioAsset.id;
        logStep('7c', `TTS создан: ${audioAsset.src}`);
      } catch (err) {
        console.warn('⚠️ TTS не удался, продолжаем без озвучки:', err.message);
      }
    } else {
      logStep('7b', 'Видео имеет аудиодорожку — TTS пропускается.');
    }
  }

  logStep(8, `Сохраняем итоговый JSON для темы "${normalizedTopic}".`);

  const savedSpec = await saveAiResponseToFile(rawPayload);
  logStep(9, 'Нормализованный video spec сохранён.');

  return savedSpec;
};

export default generateVideoSpecByTopic;
