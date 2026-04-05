import http from 'node:http';
import generateVideoSpecByTopic from './utils/GenerateVideoSpec.mjs';

const webPort = Number(process.env.VIDEO_ENGINE_WEB_PORT ?? 3010);
const previewPort = Number(process.env.REMOTION_PREVIEW_PORT ?? 3000);
const previewUrl = `http://localhost:${previewPort}`;

const html = `<!DOCTYPE html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Video Engine Studio</title>
    <style>
      :root {
        color-scheme: dark;
        --bg: #020617;
        --panel: rgba(15, 23, 42, 0.92);
        --panel-border: rgba(255, 255, 255, 0.08);
        --text: #f8fafc;
        --muted: rgba(248, 250, 252, 0.72);
        --accent-a: #f97316;
        --accent-b: #fb7185;
        --danger: #fca5a5;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100vh;
        font-family: Arial, sans-serif;
        background:
          radial-gradient(circle at top, rgba(255, 204, 0, 0.18), transparent 28%),
          linear-gradient(160deg, #0f172a 0%, #111827 55%, #020617 100%);
        color: var(--text);
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
        max-width: 760px;
        background: var(--panel);
        border: 1px solid var(--panel-border);
        border-radius: 28px;
        padding: 40px;
        box-shadow: 0 24px 80px rgba(0, 0, 0, 0.38);
      }

      .eyebrow {
        display: inline-block;
        margin-bottom: 16px;
        padding: 8px 12px;
        border-radius: 999px;
        background: rgba(249, 115, 22, 0.12);
        color: #fdba74;
        font-size: 14px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      h1 {
        margin: 0 0 18px;
        font-size: 48px;
        line-height: 1.02;
      }

      p {
        margin: 0 0 24px;
        font-size: 20px;
        line-height: 1.55;
        color: var(--muted);
      }

      textarea {
        width: 100%;
        min-height: 180px;
        resize: vertical;
        border-radius: 22px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        background: rgba(2, 6, 23, 0.85);
        color: var(--text);
        padding: 22px 24px;
        font: inherit;
        font-size: 22px;
        line-height: 1.5;
        outline: none;
      }

      textarea:focus {
        border-color: rgba(251, 113, 133, 0.6);
        box-shadow: 0 0 0 3px rgba(251, 113, 133, 0.12);
      }

      .actions {
        display: flex;
        gap: 14px;
        margin-top: 20px;
      }

      button {
        border: none;
        border-radius: 18px;
        padding: 18px 22px;
        font: inherit;
        font-size: 20px;
        font-weight: 800;
        cursor: pointer;
      }

      .primary {
        flex: 1;
        color: white;
        background: linear-gradient(135deg, var(--accent-a) 0%, var(--accent-b) 100%);
      }

      .secondary {
        color: var(--text);
        background: rgba(255, 255, 255, 0.08);
      }

      .status {
        min-height: 28px;
        margin-top: 16px;
        font-size: 18px;
        color: var(--muted);
      }

      .status.error {
        color: var(--danger);
      }

      .hint {
        margin-top: 18px;
        font-size: 16px;
        color: rgba(248, 250, 252, 0.54);
      }

      @media (max-width: 720px) {
        .card {
          padding: 28px 20px;
        }

        h1 {
          font-size: 38px;
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
        <h1>Сначала введи тему, потом откроется Remotion preview</h1>
        <p>
          Эта страница отвечает только за ввод темы и запуск генерации. Само превью видео
          открывается отдельно, чтобы UI и Remotion были разделены архитектурно.
        </p>
        <form id="generate-form">
          <textarea
            id="topic"
            name="topic"
            placeholder="Например: 5 причин вести блог для малого бизнеса"
          ></textarea>
          <div class="actions">
            <button class="primary" id="submit-button" type="submit">Сгенерировать и открыть preview</button>
            <button class="secondary" id="preview-button" type="button">Открыть текущее preview</button>
          </div>
          <div class="status" id="status"></div>
        </form>
        <div class="hint">
          После генерации откроется окно Remotion preview. Если оно уже открыто, просто обнови вкладку.
        </div>
      </section>
    </main>

    <script>
      const form = document.getElementById('generate-form');
      const topicField = document.getElementById('topic');
      const statusField = document.getElementById('status');
      const submitButton = document.getElementById('submit-button');
      const previewButton = document.getElementById('preview-button');
      const previewUrl = '${previewUrl}';

      const setStatus = (message, isError = false) => {
        statusField.textContent = message;
        statusField.className = isError ? 'status error' : 'status';
      };

      previewButton.addEventListener('click', () => {
        window.open(previewUrl, '_blank', 'noopener,noreferrer');
      });

      form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const topic = topicField.value.trim();

        if (!topic) {
          setStatus('Введите тему видео перед генерацией.', true);
          return;
        }

        submitButton.disabled = true;
        previewButton.disabled = true;
        setStatus('Генерируем DSL и сохраняем новое видео...');

        try {
          const response = await fetch('/api/generate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ topic }),
          });

          const payload = await response.json();

          if (!response.ok) {
            throw new Error(payload.error || 'Не удалось сгенерировать видео.');
          }

          setStatus('Готово. Открываю Remotion preview...');
          window.open(previewUrl + '?t=' + Date.now(), '_blank', 'noopener,noreferrer');
        } catch (error) {
          setStatus(error.message || 'Неизвестная ошибка генерации.', true);
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

const server = http.createServer((request, response) => {
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
    let body = '';

    request.on('data', (chunk) => {
      body += chunk;
    });

    request.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const topic = typeof payload.topic === 'string' ? payload.topic : '';
        const videoSpec = await generateVideoSpecByTopic(topic);

        sendJson(response, 200, { ok: true, previewUrl, videoSpec });
      } catch (error) {
        sendJson(response, 400, {
          error: error instanceof Error ? error.message : 'Unknown generation error.',
        });
      }
    });

    return;
  }

  sendJson(response, 404, { error: 'Not found.' });
});

server.listen(webPort, () => {
  console.log(`Studio page started on http://localhost:${webPort}`);
  console.log(`Remotion preview expected on ${previewUrl}`);
});
