import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { GoogleGenAI } from '@google/genai';
import 'dotenv/config';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) throw new Error('API key GEMINI_API_KEY was not found in .env');

const ai = new GoogleGenAI({ apiKey });

const TTS_MODELS = [
  'gemini-2.5-flash-preview-tts',
  'gemini-3.1-flash-tts-preview',
];

/** PCM 16-bit LE + RIFF/WAV заголовок (без внешних зависимостей) */
const pcmToWav = (pcmBuffer, sampleRate = 24000, numChannels = 1, bitsPerSample = 16) => {
  const dataSize = pcmBuffer.length;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);                                          // PCM
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * numChannels * (bitsPerSample / 8), 28);
  header.writeUInt16LE(numChannels * (bitsPerSample / 8), 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);
  return Buffer.concat([header, pcmBuffer]);
};

/**
 * Генерирует WAV-файл из текста через Gemini TTS с fallback по моделям.
 *
 * @param {string} text         — текст для озвучки
 * @param {string} [voice]      — имя голоса Gemini (default: 'Aoede')
 * @param {string} outputDir    — папка для сохранения WAV
 * @returns {{ id: string, type: 'audio', src: string, durationSeconds?: number }}
 */
export const generateTTS = async (text, voice = 'Aoede', outputDir) => {
  let audioBuffer = null;

  for (const model of TTS_MODELS) {
    try {
      console.log(`🎙️ TTS: пробуем модель ${model}...`);

      const response = await ai.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text }] }],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voice },
            },
          },
        },
      });

      const part = response.candidates?.[0]?.content?.parts?.[0];
      if (!part?.inlineData?.data) {
        throw new Error('Ответ TTS не содержит аудиоданных');
      }

      audioBuffer = Buffer.from(part.inlineData.data, 'base64');
      console.log(`✅ TTS: аудио получено от ${model} (${audioBuffer.length} байт)`);
      break;
    } catch (err) {
      const isOverloaded =
        err.status === 503 ||
        err.status === 429 ||
        String(err).includes('503') ||
        String(err).includes('429');
      if (isOverloaded && model !== TTS_MODELS.at(-1)) {
        console.warn(`⚠️ TTS: ${model} перегружена, переключаемся...`);
        continue;
      }
      throw err;
    }
  }

  if (!audioBuffer) throw new Error('Все TTS модели недоступны');

  const wavBuffer = pcmToWav(audioBuffer);
  const id = `tts-${crypto.randomUUID().slice(0, 8)}`;
  const filename = `${id}.wav`;
  const filePath = path.join(outputDir, filename);

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(filePath, wavBuffer);

  // Длительность: PCM 24kHz, 16-bit, моно → 2 байта на сэмпл
  const durationSeconds = audioBuffer.length / (24000 * 2);

  console.log(`💾 TTS: сохранено ${filePath} (${durationSeconds.toFixed(1)}с)`);

  return {
    id,
    type: 'audio',
    src: `uploads/audio/${filename}`,
    durationSeconds: Math.round(durationSeconds * 10) / 10,
  };
};

export default generateTTS;
