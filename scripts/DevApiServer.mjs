import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';
import Ffmpeg from 'fluent-ffmpeg';
import generateVideoSpecByTopic from './utils/GenerateVideoSpec.mjs';
import { transcribeVideoAudio } from './utils/TranscribeAudio.mjs';

Ffmpeg.setFfmpegPath(ffmpegStatic);
Ffmpeg.setFfprobePath(ffprobeInstaller.path);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '../public');
const uploadsDir = path.join(publicDir, 'uploads');
const thumbsDir = path.join(uploadsDir, 'thumbs');
const audioDir = path.join(uploadsDir, 'audio');

const webPort = Number(process.env.VIDEO_ENGINE_WEB_PORT ?? 3010);
const previewPort = Number(process.env.REMOTION_PREVIEW_PORT ?? 3000);
const previewUrl = `http://localhost:${previewPort}`;
const MAX_ASSETS = 7;

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const ALLOWED_VIDEO_TYPES = new Set(['video/mp4', 'video/quicktime', 'video/webm']);
const ALLOWED_AUDIO_TYPES = new Set(['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/x-m4a', 'audio/m4a', 'audio/ogg']);

// ─── ffprobe helper ──────────────────────────────────────────────────────────

const probeMedia = (filePath) =>
  new Promise((resolve, reject) => {
    Ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }

      const videoStream = metadata.streams.find((s) => s.codec_type === 'video');
      const audioStream = metadata.streams.find((s) => s.codec_type === 'audio');
      const durationSeconds = parseFloat(metadata.format.duration) || 0;
      const fpsRaw = videoStream?.r_frame_rate ?? '30/1';
      const [num, den] = fpsRaw.split('/').map(Number);
      const fps = den ? Math.round(num / den) : 30;
      const width = videoStream?.width ?? 1080;
      const height = videoStream?.height ?? 1920;
      const hasAudio = !!audioStream;

      const streamSummary = metadata.streams
        .map((s) => `${s.codec_type}(${s.codec_name ?? '?'})`)
        .join(', ') || 'no streams';
      console.log(`🔍 ffprobe ${path.basename(filePath)}: [${streamSummary}] → hasAudio=${hasAudio}`);

      resolve({ durationSeconds, fps, width, height, hasAudio });
    });
  });

// Generate thumbnails at 0%, 25%, 50%, 75% of video duration.
const generateThumbnails = (filePath, baseName, durationSeconds) =>
  new Promise((resolve, reject) => {
    fs.mkdirSync(thumbsDir, { recursive: true });

    const count = 4;
    const timestamps = Array.from({ length: count }, (_, i) =>
      ((i / count) * durationSeconds).toFixed(2),
    );

    const fileNames = timestamps.map((ts) => `${baseName}-thumb-${ts}s.jpg`);

    Ffmpeg(filePath)
      .on('end', () => {
        const results = fileNames.map((name) => {
          const fullPath = path.join(thumbsDir, name);
          const exists = fs.existsSync(fullPath);
          return {
            src: `uploads/thumbs/${name}`,
            base64Data: exists
              ? fs.readFileSync(fullPath).toString('base64')
              : null,
          };
        });

        resolve(results.filter((t) => t.base64Data !== null));
      })
      .on('error', reject)
      .screenshots({
        timestamps,
        filename: `${baseName}-thumb-%ss.jpg`,
        folder: thumbsDir,
        size: '480x?',
      });
  });

// ─── HTML ────────────────────────────────────────────────────────────────────

const html = `<!DOCTYPE html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Video Engine Studio</title>
    <style>
      :root {
        --bg: #08111f;
        --panel: rgba(9, 16, 30, 0.88);
        --panel-border: rgba(255, 255, 255, 0.08);
        --text: #f7f4ea;
        --muted: rgba(247, 244, 234, 0.72);
        --line: rgba(255, 255, 255, 0.12);
        --accent-a: #ff7a18;
        --accent-b: #ff4365;
        --accent-c: #ffd166;
        --danger: #ff9f9f;
        --success: #98f5b2;
      }

      * { box-sizing: border-box; }

      body {
        margin: 0;
        min-height: 100vh;
        color: var(--text);
        font-family: Georgia, "Times New Roman", serif;
        background:
          radial-gradient(circle at top left, rgba(255, 122, 24, 0.18), transparent 24%),
          radial-gradient(circle at right, rgba(255, 209, 102, 0.1), transparent 20%),
          linear-gradient(145deg, #050b14 0%, #0b1626 52%, #07101d 100%);
      }

      .page {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 48px 20px;
      }

      .card {
        width: 100%;
        max-width: 900px;
        padding: 38px;
        border-radius: 30px;
        border: 1px solid var(--panel-border);
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0)),
          var(--panel);
        box-shadow: 0 28px 80px rgba(0, 0, 0, 0.4);
        backdrop-filter: blur(14px);
      }

      .eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 18px;
        padding: 8px 14px;
        border-radius: 999px;
        background: rgba(255, 209, 102, 0.12);
        color: #ffe2a3;
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }

      h1 { margin: 0 0 12px; font-size: 52px; line-height: 0.95; }
      p { margin: 0; color: var(--muted); font-size: 20px; line-height: 1.55; }

      .grid { display: grid; gap: 22px; margin-top: 30px; }

      .field { display: grid; gap: 12px; }

      .label {
        font-size: 14px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: rgba(247, 244, 234, 0.7);
      }

      textarea, input[type="file"] { width: 100%; }

      textarea {
        min-height: 180px;
        resize: vertical;
        padding: 22px 24px;
        border-radius: 24px;
        border: 1px solid var(--line);
        color: var(--text);
        background: rgba(3, 8, 16, 0.72);
        font: inherit;
        font-size: 21px;
        line-height: 1.45;
      }

      textarea:focus, input[type="file"]:focus {
        outline: none;
        border-color: rgba(255, 122, 24, 0.45);
        box-shadow: 0 0 0 3px rgba(255, 122, 24, 0.14);
      }

      .dropzone {
        padding: 24px;
        border-radius: 24px;
        border: 1px dashed rgba(255, 255, 255, 0.18);
        background: rgba(3, 8, 16, 0.58);
      }

      input[type="file"] { color: var(--muted); font: inherit; }

      .preview-list {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 14px;
        margin-top: 16px;
      }

      .preview-card {
        overflow: hidden;
        border-radius: 20px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(255, 255, 255, 0.04);
      }

      .preview-card img,
      .preview-card video {
        display: block;
        width: 100%;
        height: 140px;
        object-fit: cover;
      }

      .preview-card .audio-thumb {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 140px;
        background: rgba(255, 209, 102, 0.08);
        font-size: 40px;
      }

      .tts-row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px 20px;
        border-radius: 16px;
        border: 1px solid var(--line);
        background: rgba(3, 8, 16, 0.4);
        cursor: pointer;
        user-select: none;
      }

      .tts-row input[type="checkbox"] { width: 18px; height: 18px; accent-color: var(--accent-a); cursor: pointer; }
      .tts-row .tts-label { font-size: 16px; color: var(--text); }

      .preview-meta {
        padding: 10px 12px 14px;
        font-size: 14px;
        color: var(--muted);
        display: grid;
        gap: 4px;
      }

      .preview-type-badge {
        display: inline-block;
        padding: 2px 8px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        background: rgba(255, 122, 24, 0.22);
        color: #ffb87a;
      }

      .actions { display: flex; gap: 14px; margin-top: 10px; }

      button {
        border: none;
        border-radius: 18px;
        padding: 17px 22px;
        font: inherit;
        font-size: 19px;
        font-weight: 700;
        cursor: pointer;
      }

      .primary {
        flex: 1;
        color: #fff9ef;
        background: linear-gradient(135deg, var(--accent-a) 0%, var(--accent-b) 85%);
      }

      .secondary { color: var(--text); background: rgba(255, 255, 255, 0.08); }

      .status { min-height: 28px; margin-top: 18px; color: var(--muted); font-size: 18px; }
      .status.error { color: var(--danger); }
      .status.success { color: var(--success); }

      .hint {
        margin-top: 18px;
        color: rgba(247, 244, 234, 0.55);
        font-size: 15px;
        line-height: 1.5;
      }

      @media (max-width: 720px) {
        .card { padding: 28px 20px; }
        h1 { font-size: 40px; }
        p { font-size: 18px; }
        textarea { font-size: 18px; }
        .actions { flex-direction: column; }
      }
    </style>
  </head>
  <body>
    <main class="page">
      <section class="card">
        <div class="eyebrow">Video Engine Studio</div>
        <h1>Тема, медиа, JSON и сразу в Remotion</h1>
        <p>
          Добавь тему и свои фото или видеоклипы. Studio отправит всё в Gemini, он смонтирует
          видео как режиссёр и откроет preview.
        </p>

        <form id="generate-form" class="grid">
          <label class="field">
            <span class="label">Тема видео</span>
            <textarea
              id="topic"
              name="topic"
              placeholder="Например: 5 причин вести блог для малого бизнеса"
            ></textarea>
          </label>

          <label class="field">
            <span class="label">Медиа для сцен</span>
            <div class="dropzone">
              <input
                id="media"
                name="media"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm,audio/mpeg,audio/wav,audio/mp4,audio/x-m4a,audio/ogg"
                multiple
              />
              <div class="hint">
                Фото: jpeg, png, webp, gif. Видео: mp4, mov, webm. Аудио (фоновая музыка): mp3, wav, m4a. До ${MAX_ASSETS} файлов.
              </div>
              <div id="preview-list" class="preview-list"></div>
            </div>
          </label>

          <label class="tts-row">
            <input type="checkbox" id="tts-checkbox" />
            <span class="tts-label">Озвучить нарративным голосом (Gemini TTS) — только если нет голоса в видео</span>
          </label>

          <div class="actions">
            <button class="primary" id="submit-button" type="submit">Сгенерировать и открыть preview</button>
            <button class="secondary" id="preview-button" type="button">Открыть текущее preview</button>
          </div>

          <div class="status" id="status"></div>
        </form>

        <div class="hint">
          Файлы сохраняются в <code>public/uploads</code>. Для видео генерируются превью-кадры,
          которые LLM использует как визуальный контекст при режиссуре монтажа.
        </div>
      </section>
    </main>

    <script>
      const form = document.getElementById('generate-form');
      const topicField = document.getElementById('topic');
      const mediaField = document.getElementById('media');
      const ttsCheckbox = document.getElementById('tts-checkbox');
      const previewList = document.getElementById('preview-list');
      const statusField = document.getElementById('status');
      const submitButton = document.getElementById('submit-button');
      const previewButton = document.getElementById('preview-button');
      const previewUrl = '${previewUrl}';

      const setStatus = (message, tone = 'default') => {
        statusField.textContent = message;
        statusField.className = tone === 'error'
          ? 'status error'
          : tone === 'success'
            ? 'status success'
            : 'status';
      };

      const fileToBase64 = (file) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = typeof reader.result === 'string' ? reader.result : '';
            const base64Data = result.includes(',') ? result.split(',')[1] : result;
            resolve(base64Data);
          };
          reader.onerror = () => reject(new Error('Не удалось прочитать файл.'));
          reader.readAsDataURL(file);
        });

      const readImageDimensions = (file) =>
        new Promise((resolve, reject) => {
          const objectUrl = URL.createObjectURL(file);
          const image = new Image();
          image.onload = () => {
            URL.revokeObjectURL(objectUrl);
            resolve({ width: image.naturalWidth, height: image.naturalHeight });
          };
          image.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('Не удалось определить размер.'));
          };
          image.src = objectUrl;
        });

      const readVideoDimensions = (file) =>
        new Promise((resolve, reject) => {
          const objectUrl = URL.createObjectURL(file);
          const video = document.createElement('video');
          video.preload = 'metadata';
          video.onloadedmetadata = () => {
            URL.revokeObjectURL(objectUrl);
            resolve({
              width: video.videoWidth || 1080,
              height: video.videoHeight || 1920,
              durationSeconds: video.duration || 0,
            });
          };
          video.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('Не удалось определить параметры видео.'));
          };
          video.src = objectUrl;
        });

      const renderPreviews = async () => {
        previewList.innerHTML = '';
        const files = Array.from(mediaField.files || []);

        await Promise.all(files.map(async (file) => {
          const card = document.createElement('div');
          card.className = 'preview-card';

          const isVideo = file.type.startsWith('video/');
          const isAudio = file.type.startsWith('audio/');

          if (isVideo) {
            const video = document.createElement('video');
            video.src = URL.createObjectURL(file);
            video.muted = true;
            video.preload = 'metadata';
            card.appendChild(video);
          } else if (isAudio) {
            const thumb = document.createElement('div');
            thumb.className = 'audio-thumb';
            thumb.textContent = '🎵';
            card.appendChild(thumb);
          } else {
            const image = document.createElement('img');
            image.src = URL.createObjectURL(file);
            image.alt = file.name;
            card.appendChild(image);
          }

          const meta = document.createElement('div');
          meta.className = 'preview-meta';

          const badge = document.createElement('span');
          badge.className = 'preview-type-badge';
          badge.textContent = isVideo ? 'видео' : isAudio ? 'аудио' : 'фото';

          const title = document.createElement('div');
          title.textContent = file.name;

          const details = document.createElement('div');
          try {
            if (isVideo) {
              const info = await readVideoDimensions(file);
              details.textContent = info.width + ' x ' + info.height + ' · ' + info.durationSeconds.toFixed(1) + 'с';
            } else if (isAudio) {
              details.textContent = (file.size / 1024).toFixed(0) + ' KB';
            } else {
              const dims = await readImageDimensions(file);
              details.textContent = dims.width + ' x ' + dims.height + ' px';
            }
          } catch {
            details.textContent = 'Размер не определён';
          }

          meta.appendChild(badge);
          meta.appendChild(title);
          meta.appendChild(details);
          card.appendChild(meta);
          previewList.appendChild(card);
        }));
      };

      mediaField.addEventListener('change', () => { void renderPreviews(); });

      previewButton.addEventListener('click', () => {
        window.open(previewUrl, '_blank', 'noopener,noreferrer');
      });

      form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const topic = topicField.value.trim();
        const files = Array.from(mediaField.files || []);

        if (!topic) {
          setStatus('Введите тему видео перед генерацией.', 'error');
          return;
        }

        if (files.length > ${MAX_ASSETS}) {
          setStatus(\`Можно загрузить не больше ${MAX_ASSETS} файлов за один раз.\`, 'error');
          return;
        }

        submitButton.disabled = true;
        previewButton.disabled = true;
        setStatus('Загружаем медиа и собираем новый JSON...');

        try {
          const mediaPayloads = await Promise.all(
            files.map(async (file) => {
              const isVideo = file.type.startsWith('video/');
              const isAudio = file.type.startsWith('audio/');
              const base64Data = await fileToBase64(file);

              if (isVideo) {
                let width = 1080, height = 1920, durationSeconds = 0;
                try {
                  const info = await readVideoDimensions(file);
                  width = info.width;
                  height = info.height;
                  durationSeconds = info.durationSeconds;
                } catch {}

                return {
                  name: file.name,
                  mimeType: file.type || 'video/mp4',
                  base64Data,
                  width,
                  height,
                  durationSeconds,
                  isVideo: true,
                };
              }

              if (isAudio) {
                return {
                  name: file.name,
                  mimeType: file.type || 'audio/mpeg',
                  base64Data,
                  isAudio: true,
                };
              }

              const dims = await readImageDimensions(file);
              return {
                name: file.name,
                mimeType: file.type || 'image/jpeg',
                base64Data,
                width: dims.width,
                height: dims.height,
                isVideo: false,
              };
            }),
          );

          const response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic, images: mediaPayloads, tts: ttsCheckbox.checked }),
          });

          const payload = await response.json();

          if (!response.ok) {
            throw new Error(payload.error || 'Не удалось сгенерировать видео.');
          }

          setStatus('Готово. Открываю Remotion preview...', 'success');
          window.open(previewUrl + '?t=' + Date.now(), '_blank', 'noopener,noreferrer');
        } catch (error) {
          setStatus(error.message || 'Неизвестная ошибка генерации.', 'error');
        } finally {
          submitButton.disabled = false;
          previewButton.disabled = false;
        }
      });
    </script>
  </body>
</html>`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const sendJson = (response, statusCode, payload) => {
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
};

const sendHtml = (response, markup) => {
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  response.end(markup);
};

const readJsonBody = (request) =>
  new Promise((resolve, reject) => {
    let body = '';
    request.on('data', (chunk) => { body += chunk; });
    request.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); }
      catch (error) { reject(error); }
    });
    request.on('error', reject);
  });

const sanitizeSegment = (value) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'file';

const getExtension = (mimeType) => {
  switch (mimeType) {
    case 'image/png': return 'png';
    case 'image/webp': return 'webp';
    case 'image/gif': return 'gif';
    case 'video/mp4': return 'mp4';
    case 'video/quicktime': return 'mov';
    case 'video/webm': return 'webm';
    case 'audio/wav': return 'wav';
    case 'audio/mp4':
    case 'audio/x-m4a':
    case 'audio/m4a': return 'm4a';
    case 'audio/mpeg': return 'mp3';
    default: return 'jpg';
  }
};

const ensureUploadsDir = () => {
  fs.mkdirSync(uploadsDir, { recursive: true });
  fs.mkdirSync(audioDir, { recursive: true });
};

// ─── saveMedia ────────────────────────────────────────────────────────────────

const saveMedia = async (files) => {
  ensureUploadsDir();

  if (files.length > MAX_ASSETS) {
    throw new Error(`Only up to ${MAX_ASSETS} files are supported per generation.`);
  }

  const results = [];

  for (let index = 0; index < files.length; index++) {
    const file = files[index];

    if (!file || typeof file !== 'object') {
      throw new Error(`File ${index + 1} payload is invalid.`);
    }

    const mimeType = typeof file.mimeType === 'string' ? file.mimeType.trim().toLowerCase() : '';
    const isVideo = file.isVideo === true || ALLOWED_VIDEO_TYPES.has(mimeType);
    const isAudio = file.isAudio === true || ALLOWED_AUDIO_TYPES.has(mimeType);
    const isImage = ALLOWED_IMAGE_TYPES.has(mimeType);

    if (!isVideo && !isAudio && !isImage) {
      throw new Error(`Unsupported file type for item ${index + 1}: ${mimeType || 'unknown'}.`);
    }

    const base64Data = typeof file.base64Data === 'string' ? file.base64Data.trim() : '';

    if (!base64Data) {
      throw new Error(`File ${index + 1} does not contain base64 data.`);
    }

    const originalName = typeof file.name === 'string' ? file.name.trim() : `file-${index + 1}`;
    const safeName = sanitizeSegment(originalName.replace(/\.[^.]+$/, ''));
    const uniqueHash = crypto.randomBytes(6).toString('hex');
    const extension = getExtension(mimeType);

    // Audio files go to uploads/audio/, everything else to uploads/
    const saveDir = isAudio ? audioDir : uploadsDir;
    const fileName = `${Date.now()}-${safeName}-${uniqueHash}.${extension}`;
    const absolutePath = path.join(saveDir, fileName);
    const relativeSrc = isAudio ? `uploads/audio/${fileName}` : `uploads/${fileName}`;

    fs.writeFileSync(absolutePath, Buffer.from(base64Data, 'base64'));

    if (isAudio) {
      results.push({
        id: `user-asset-${index + 1}`,
        type: 'audio',
        src: relativeSrc,
        mimeType,
      });
    } else if (isVideo) {
      const clientWidth = typeof file.width === 'number' ? file.width : Number(file.width) || 1080;
      const clientHeight = typeof file.height === 'number' ? file.height : Number(file.height) || 1920;
      const clientDuration = typeof file.durationSeconds === 'number' ? file.durationSeconds : 0;

      let durationSeconds = clientDuration;
      let fps = 30;
      let width = clientWidth;
      let height = clientHeight;
      let hasAudio = false;
      let transcript = [];

      try {
        const probe = await probeMedia(absolutePath);
        durationSeconds = probe.durationSeconds || durationSeconds;
        fps = probe.fps || fps;
        width = probe.width || width;
        height = probe.height || height;
        hasAudio = probe.hasAudio;
      } catch (err) {
        console.warn(`⚠️ probeMedia не удалось для ${fileName}:`, err.message);
      }

      if (hasAudio) {
        try {
          transcript = await transcribeVideoAudio(absolutePath, audioDir);
        } catch (err) {
          console.warn('⚠️ Транскрипция не удалась:', err.message);
        }
      }

      let thumbnails = [];
      try {
        const baseName = `${safeName}-${uniqueHash}`;
        thumbnails = await generateThumbnails(absolutePath, baseName, durationSeconds);
      } catch {}

      results.push({
        id: `user-asset-${index + 1}`,
        type: 'video',
        src: relativeSrc,
        alt: originalName,
        width,
        height,
        durationSeconds,
        fps,
        hasAudio,
        ...(transcript.length > 0 ? { transcript } : {}),
        mimeType,
        thumbnails,
      });
    } else {
      const width = typeof file.width === 'number' ? file.width : Number(file.width);
      const height = typeof file.height === 'number' ? file.height : Number(file.height);

      if (!Number.isInteger(width) || width < 1 || !Number.isInteger(height) || height < 1) {
        throw new Error(`Image ${index + 1} must include valid width and height.`);
      }

      results.push({
        id: `user-asset-${index + 1}`,
        type: 'image',
        src: relativeSrc,
        alt: originalName,
        width,
        height,
        mimeType,
        base64Data,
      });
    }
  }

  return results;
};

// ─── Server ───────────────────────────────────────────────────────────────────

const server = http.createServer(async (request, response) => {
  if (!request.url) {
    sendJson(response, 400, { error: 'Missing request URL.' });
    return;
  }

  if (request.method === 'GET' && (request.url === '/' || request.url.startsWith('/?'))) {
    sendHtml(response, html);
    return;
  }

  if (request.method === 'GET' && request.url === '/health') {
    sendJson(response, 200, { ok: true, previewUrl });
    return;
  }

  if (request.method === 'POST' && request.url === '/api/generate') {
    try {
      const payload = await readJsonBody(request);
      const topic = typeof payload.topic === 'string' ? payload.topic : '';
      const files = Array.isArray(payload.images) ? payload.images : [];
      const generateTTS = payload.tts === true;
      const savedAssets = await saveMedia(files);
      const videoSpec = await generateVideoSpecByTopic(topic, savedAssets, { generateTTS });

      sendJson(response, 200, { ok: true, previewUrl, videoSpec });
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : 'Unknown generation error.',
      });
    }

    return;
  }

  sendJson(response, 404, { error: 'Not found.' });
});

server.listen(webPort, () => {
  console.log(`Studio page started on http://localhost:${webPort}`);
  console.log(`Remotion preview expected on ${previewUrl}`);
});
