import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import generateVideoSpecByTopic from './utils/GenerateVideoSpec.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '../public');
const uploadsDir = path.join(publicDir, 'uploads');

const webPort = Number(process.env.VIDEO_ENGINE_WEB_PORT ?? 3010);
const previewPort = Number(process.env.REMOTION_PREVIEW_PORT ?? 3000);
const previewUrl = `http://localhost:${previewPort}`;

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

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

      * {
        box-sizing: border-box;
      }

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

      h1 {
        margin: 0 0 12px;
        font-size: 52px;
        line-height: 0.95;
      }

      p {
        margin: 0;
        color: var(--muted);
        font-size: 20px;
        line-height: 1.55;
      }

      .grid {
        display: grid;
        gap: 22px;
        margin-top: 30px;
      }

      .field {
        display: grid;
        gap: 12px;
      }

      .label {
        font-size: 14px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: rgba(247, 244, 234, 0.7);
      }

      textarea,
      input[type="file"] {
        width: 100%;
      }

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

      textarea:focus,
      input[type="file"]:focus {
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

      input[type="file"] {
        color: var(--muted);
        font: inherit;
      }

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

      .preview-card img {
        display: block;
        width: 100%;
        height: 140px;
        object-fit: cover;
      }

      .preview-meta {
        padding: 10px 12px 14px;
        font-size: 14px;
        color: var(--muted);
      }

      .actions {
        display: flex;
        gap: 14px;
        margin-top: 10px;
      }

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

      .secondary {
        color: var(--text);
        background: rgba(255, 255, 255, 0.08);
      }

      .status {
        min-height: 28px;
        margin-top: 18px;
        color: var(--muted);
        font-size: 18px;
      }

      .status.error {
        color: var(--danger);
      }

      .status.success {
        color: var(--success);
      }

      .hint {
        margin-top: 18px;
        color: rgba(247, 244, 234, 0.55);
        font-size: 15px;
        line-height: 1.5;
      }

      @media (max-width: 720px) {
        .card {
          padding: 28px 20px;
        }

        h1 {
          font-size: 40px;
        }

        p {
          font-size: 18px;
        }

        textarea {
          font-size: 18px;
        }

        .actions {
          flex-direction: column;
        }
      }
    </style>
  </head>
  <body>
    <main class="page">
      <section class="card">
        <div class="eyebrow">Video Engine Studio</div>
        <h1>Тема, фото, JSON и сразу в Remotion</h1>
        <p>
          Добавь тему и одно или несколько изображений. Studio отправит всё в Gemini, получит
          JSON со ссылками на <code>assetId</code> и откроет preview с уже встроенными медиа.
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
            <span class="label">Фото для сцен</span>
            <div class="dropzone">
              <input id="images" name="images" type="file" accept="image/*" multiple />
              <div class="hint">
                Пока поддерживаются изображения jpeg, png, webp, gif.
              </div>
              <div id="preview-list" class="preview-list"></div>
            </div>
          </label>

          <div class="actions">
            <button class="primary" id="submit-button" type="submit">Сгенерировать и открыть preview</button>
            <button class="secondary" id="preview-button" type="button">Открыть текущее preview</button>
          </div>

          <div class="status" id="status"></div>
        </form>

        <div class="hint">
          Изображения сохраняются локально в каталог <code>public/uploads</code> и затем
          используются в Remotion как assets для сцен.
        </div>
      </section>
    </main>

    <script>
      const form = document.getElementById('generate-form');
      const topicField = document.getElementById('topic');
      const imagesField = document.getElementById('images');
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

      const renderPreviews = () => {
        previewList.innerHTML = '';

        Array.from(imagesField.files || []).forEach((file) => {
          const card = document.createElement('div');
          card.className = 'preview-card';

          const image = document.createElement('img');
          image.src = URL.createObjectURL(file);
          image.alt = file.name;

          const meta = document.createElement('div');
          meta.className = 'preview-meta';
          meta.textContent = file.name;

          card.appendChild(image);
          card.appendChild(meta);
          previewList.appendChild(card);
        });
      };

      imagesField.addEventListener('change', renderPreviews);

      previewButton.addEventListener('click', () => {
        window.open(previewUrl, '_blank', 'noopener,noreferrer');
      });

      form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const topic = topicField.value.trim();

        if (!topic) {
          setStatus('Введите тему видео перед генерацией.', 'error');
          return;
        }

        submitButton.disabled = true;
        previewButton.disabled = true;
        setStatus('Загружаем изображения и собираем новый JSON...');

        try {
          const imagePayloads = await Promise.all(
            Array.from(imagesField.files || []).map(async (file) => ({
              name: file.name,
              mimeType: file.type || 'image/jpeg',
              base64Data: await fileToBase64(file),
            })),
          );

          const response = await fetch('/api/generate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              topic,
              images: imagePayloads,
            }),
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

const sendJson = (response, statusCode, payload) => {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
  });

  response.end(JSON.stringify(payload));
};

const sendHtml = (response, markup) => {
  response.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
  });

  response.end(markup);
};

const readJsonBody = (request) => {
  return new Promise((resolve, reject) => {
    let body = '';

    request.on('data', (chunk) => {
      body += chunk;
    });

    request.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch (error) {
        reject(error);
      }
    });

    request.on('error', reject);
  });
};

const sanitizeSegment = (value) => {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'image';
};

const getExtensionFromMimeType = (mimeType) => {
  switch (mimeType) {
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    default:
      return 'jpg';
  }
};

const ensureUploadsDir = () => {
  fs.mkdirSync(uploadsDir, { recursive: true });
};

const saveImages = (images) => {
  ensureUploadsDir();

  return images.map((image, index) => {
    if (!image || typeof image !== 'object') {
      throw new Error(`Image ${index + 1} payload is invalid.`);
    }

    const mimeType = typeof image.mimeType === 'string' ? image.mimeType.trim().toLowerCase() : '';

    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      throw new Error(`Unsupported image type for file ${index + 1}: ${mimeType || 'unknown'}.`);
    }

    const base64Data = typeof image.base64Data === 'string' ? image.base64Data.trim() : '';

    if (!base64Data) {
      throw new Error(`Image ${index + 1} does not contain base64 data.`);
    }

    const originalName = typeof image.name === 'string' ? image.name.trim() : `image-${index + 1}`;
    const safeName = sanitizeSegment(originalName.replace(/\.[^.]+$/, ''));
    const uniqueHash = crypto.randomBytes(6).toString('hex');
    const extension = getExtensionFromMimeType(mimeType);
    const fileName = `${Date.now()}-${safeName}-${uniqueHash}.${extension}`;
    const absolutePath = path.join(uploadsDir, fileName);

    fs.writeFileSync(absolutePath, Buffer.from(base64Data, 'base64'));

    return {
      id: `user-photo-${index + 1}`,
      type: 'image',
      src: `uploads/${fileName}`,
      alt: originalName,
      mimeType,
      base64Data,
    };
  });
};

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
      const images = Array.isArray(payload.images) ? payload.images : [];
      const savedAssets = saveImages(images);
      const videoSpec = await generateVideoSpecByTopic(topic, savedAssets);

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
