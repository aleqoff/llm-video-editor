import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import ffmpegStatic from 'ffmpeg-static';
import { GoogleGenAI } from '@google/genai';
import 'dotenv/config';

const execFileAsync = promisify(execFile);

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) throw new Error('API key GEMINI_API_KEY was not found in .env');

const ai = new GoogleGenAI({ apiKey });

/**
 * Извлекает аудио из видеофайла через ffmpeg.
 * Возвращает путь к временному MP3 (16kHz, моно).
 */
const extractAudio = async (videoPath, outputPath) => {
  await execFileAsync(ffmpegStatic, [
    '-i', videoPath,
    '-vn',              // без видео
    '-ar', '16000',     // 16kHz — оптимально для распознавания речи
    '-ac', '1',         // моно
    '-f', 'mp3',
    '-y',               // перезаписать если существует
    outputPath,
  ]);
};

/**
 * Транскрибирует аудио через Gemini 2.5 Flash.
 * Возвращает массив сегментов с временными метками.
 *
 * @returns {Array<{text: string, startTime: number, endTime: number}>}
 */
const transcribeWithGemini = async (audioPath) => {
  const audioData = fs.readFileSync(audioPath).toString('base64');

  const prompt = [
    'Transcribe the speech in this audio file.',
    'Return ONLY a valid JSON array with no markdown, no explanation.',
    'Each item must have exactly these fields:',
    '  "text" (string): the spoken words,',
    '  "startTime" (number): start time in seconds (e.g. 0.0),',
    '  "endTime" (number): end time in seconds (e.g. 1.5).',
    'If there is no speech, return an empty array [].',
    'Example: [{"text":"Hello world","startTime":0.0,"endTime":1.2}]',
  ].join(' ');

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType: 'audio/mp3', data: audioData } },
          { text: prompt },
        ],
      },
    ],
    config: { responseMimeType: 'application/json' },
  });

  const raw = response.text?.trim() ?? '[]';

  try {
    const segments = JSON.parse(raw);
    if (!Array.isArray(segments)) return [];
    return segments.filter(
      (s) =>
        typeof s?.text === 'string' &&
        typeof s?.startTime === 'number' &&
        typeof s?.endTime === 'number',
    );
  } catch {
    console.warn('⚠️ Транскрипция: не удалось разобрать JSON ответ');
    return [];
  }
};

/**
 * Транскрибирует аудиодорожку из видеофайла.
 * Извлекает аудио через ffmpeg, затем отправляет в Gemini.
 *
 * @param {string} videoPath   — путь к видеофайлу
 * @param {string} audioDir    — папка для временных аудиофайлов
 * @returns {Array<{text: string, startTime: number, endTime: number}>}
 */
export const transcribeVideoAudio = async (videoPath, audioDir) => {
  fs.mkdirSync(audioDir, { recursive: true });

  const baseName = path.basename(videoPath, path.extname(videoPath));
  const audioPath = path.join(audioDir, `${baseName}_audio.mp3`);

  try {
    console.log(`🎧 Транскрипция: извлекаем аудио из ${path.basename(videoPath)}...`);
    await extractAudio(videoPath, audioPath);

    const stats = fs.statSync(audioPath);
    if (stats.size < 1000) {
      console.log('ℹ️ Транскрипция: аудиодорожка пуста или слишком короткая');
      return [];
    }

    console.log('🤖 Транскрипция: отправляем в Gemini...');
    const segments = await transcribeWithGemini(audioPath);
    console.log(`✅ Транскрипция: получено ${segments.length} сегментов`);
    return segments;
  } catch (err) {
    console.error('❌ Транскрипция не удалась:', err.message);
    return [];
  }
};

export default transcribeVideoAudio;
