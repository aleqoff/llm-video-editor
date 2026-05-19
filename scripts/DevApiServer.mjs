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
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AutoSMM — Video Engine Studio</title>
  <link rel="icon" type="image/png" href="/favicon.png" />

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Unbounded:wght@700;900&display=swap" rel="stylesheet">

  <script src="https://unpkg.com/react@18.3.1/umd/react.development.js" integrity="sha384-hD6/rw4ppMLGNu3tX5cjIb+uRZ7UkRJ6BPkLpg4hAu/6onKUg4lLsHAs9EBPT82L" crossorigin="anonymous"><\/script>
  <script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js" integrity="sha384-u6aeetuaXnQ38mYT8rp6sbXaQe3NL9t+IBXmnYxwkUI2Hw4bsp2Wvmx4yRQF1uAm" crossorigin="anonymous"><\/script>
  <script src="https://unpkg.com/@babel/standalone@7.29.0/babel.min.js" integrity="sha384-m08KidiNqLdpJqLq95G/LEi8Qvjl/xUYll3QILypMoQ65QorJ9Lvtp2RXYGBFj1y" crossorigin="anonymous"><\/script>

  <style>
    @font-face {
      font-family: 'akony';
      src: url('/fonts/AKONY.woff2') format('woff2'), url('/fonts/AKONY.otf') format('opentype');
      font-weight: 700;
      font-display: swap;
    }
    @font-face {
      font-family: 'arodoraPro';
      src: url('/fonts/ArodoraPro-Light.otf') format('opentype');
      font-weight: 300;
      font-display: swap;
    }

    :root {
      --orange: #FF6400;
      --bg: #0b0b0b;
      --surface: rgba(255,255,255,0.03);
      --border: rgba(255,255,255,0.08);
      --border-hi: rgba(255,255,255,0.2);
      --text: #f0ede8;
      --muted: rgba(240,237,232,0.45);
      --dim: rgba(240,237,232,0.2);
      --head: 'akony','Unbounded',sans-serif;
      --body: 'arodoraPro','Unbounded',Arial,sans-serif;
    }

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    html, body {
      height: 100%; width: 100%;
      background: var(--bg);
      color: var(--text);
      font-family: var(--body);
      font-weight: 300;
      cursor: none;
      overflow: hidden;
      -webkit-font-smoothing: antialiased;
    }

    #prog {
      position: fixed; top: 0; left: 0;
      height: 2px; background: var(--orange); width: 0;
      z-index: 2000; transition: width 0.4s ease;
      box-shadow: 0 0 10px var(--orange), 0 0 4px var(--orange);
    }

    #dot-canvas {
      position: fixed; inset: 0;
      width: 100%; height: 100%;
      pointer-events: none; z-index: 0;
    }

    #cursor {
      position: fixed; top: 0; left: 0;
      width: 0; height: 0; pointer-events: none;
      z-index: 9999; mix-blend-mode: difference;
      transform: translate(-50%,-50%); will-change: transform;
    }
    .c-dot {
      position: absolute; left: 50%; top: 50%;
      width: 4px; height: 4px; background: #fff;
      border-radius: 50%; transform: translate(-50%,-50%);
    }
    .c-corner {
      position: absolute; left: 50%; top: 50%;
      width: 11px; height: 11px; border: 2px solid #fff;
    }
    .c-tl { transform: translate(-160%,-160%); border-right:none; border-bottom:none; }
    .c-tr { transform: translate(60%,-160%);   border-left:none;  border-bottom:none; }
    .c-br { transform: translate(60%,60%);     border-left:none;  border-top:none;    }
    .c-bl { transform: translate(-160%,60%);   border-right:none; border-top:none;    }
    .c-ring {
      position: absolute; left: 0; top: 0;
      width: 0; height: 0;
      animation: spin-cur 4s linear infinite;
    }
    @keyframes spin-cur { to { transform: rotate(360deg); } }

    .page {
      position: relative; z-index: 1;
      width: 100vw; height: 100dvh;
      display: grid;
      grid-template-rows: 52px 1fr 38px;
      overflow: hidden;
    }

    .hdr {
      display: flex; align-items: center;
      justify-content: space-between;
      padding: 0 40px;
      border-bottom: 1px solid var(--border);
    }
    .hdr-l { display: flex; align-items: center; gap: 14px; }
    .hdr-logo { width: 28px; height: 28px; object-fit: contain; }
    .hdr-name {
      font-family: var(--head); font-size: 12px;
      font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
    }
    .hdr-r { display: flex; align-items: center; gap: 8px; }
    .hdr-status {
      font-family: var(--body); font-size: 10px;
      color: var(--dim); letter-spacing: 0.08em;
      display: flex; align-items: center; gap: 7px;
    }
    .s-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--orange); }
    .s-dot.pulse { animation: blink 1.1s ease-in-out infinite; }
    @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.15} }

    .content {
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      padding: 28px 40px 20px;
      overflow: hidden;
      position: relative;
    }
    .inner {
      width: 100%; max-width: 780px;
      display: flex; flex-direction: column;
      gap: 0;
    }

    .hero-row {
      display: flex; align-items: center;
      justify-content: space-between;
      margin-bottom: 18px;
    }
    .hero-text { flex: 1; }
    .badge {
      display: inline-block;
      font-family: var(--head); font-size: 9px;
      font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase;
      color: var(--orange);
      border: 1px solid rgba(255,100,0,0.35);
      padding: 4px 11px; margin-bottom: 12px;
    }
    .h1 {
      font-family: var(--head);
      font-size: clamp(22px, 2.4vw, 36px);
      font-weight: 700; letter-spacing: -0.01em;
      line-height: 1.1; text-transform: uppercase;
      margin-bottom: 10px;
      color: var(--orange);
    }
    .desc {
      font-family: var(--body); font-size: 13px;
      font-weight: 300; line-height: 1.6;
      color: var(--muted); max-width: 500px;
    }
    .hero-orb {
      width: clamp(120px, 13vw, 190px);
      height: clamp(120px, 13vw, 190px);
      object-fit: contain; flex-shrink: 0;
      margin-left: 28px;
      opacity: 0.92;
    }

    .divider { height: 1px; background: var(--border); margin-bottom: 18px; }

    .form-stack {
      display: flex;
      flex-direction: column;
      gap: 14px;
      margin-bottom: 14px;
    }

    .lbl {
      display: block;
      font-family: var(--head); font-size: 9px; font-weight: 700;
      letter-spacing: 0.16em; text-transform: uppercase;
      color: var(--muted); margin-bottom: 8px;
    }
    textarea {
      display: block; width: 100%;
      background: var(--surface);
      border: 1px solid var(--border); border-radius: 0;
      color: var(--text); font-family: var(--body);
      font-weight: 300; font-size: 13px;
      padding: 12px 14px; resize: vertical; outline: none;
      line-height: 1.6; transition: border-color 0.18s;
      height: 130px; min-height: 80px;
    }
    textarea:focus { border-color: var(--border-hi); }
    textarea::placeholder { color: var(--dim); }

    .upload-zone {
      border: 1px solid var(--border); padding: 14px 16px;
      cursor: pointer; transition: border-color 0.18s, background 0.18s;
      display: flex; flex-direction: column; justify-content: center;
    }
    .upload-zone:hover  { border-color: var(--border-hi); background: var(--surface); }
    .upload-zone.drag   { border-color: var(--orange); background: rgba(255,100,0,0.03); }
    .up-row { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
    .up-icon {
      width: 26px; height: 26px; border: 1px solid var(--border);
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .up-icon svg { width: 12px; height: 12px; color: var(--muted); }
    .up-cta {
      font-family: var(--head); font-size: 9px; font-weight: 700;
      letter-spacing: 0.1em; text-transform: uppercase; color: var(--text);
    }
    .up-hint { font-family: var(--body); font-size: 10px; color: var(--dim); line-height: 1.5; }
    .chips { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 8px; }
    .chip {
      font-family: var(--body); font-size: 10px;
      padding: 2px 8px; border: 1px solid var(--border);
      color: var(--muted); display: flex; align-items: center; gap: 5px;
    }
    .chip-x { cursor: pointer; color: var(--dim); transition: color 0.15s; }
    .chip-x:hover { color: var(--orange); }

    .bottom-row {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .voice-row {
      display: flex; align-items: flex-start; gap: 11px;
      padding: 11px 14px; border: 1px solid var(--border);
      cursor: pointer; transition: border-color 0.18s; user-select: none;
    }
    .voice-row:hover { border-color: var(--border-hi); }
    .voice-row.on { border-color: rgba(255,100,0,0.4); }
    .chk {
      width: 14px; height: 14px; border: 1px solid var(--muted);
      flex-shrink: 0; margin-top: 1px;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.15s;
    }
    .voice-row.on .chk { background: var(--orange); border-color: var(--orange); }
    .chk svg { width: 8px; height: 8px; color: white; }
    .voice-txt { font-family: var(--body); font-size: 12px; font-weight: 300; line-height: 1.5; color: rgba(240,237,232,0.65); }
    .voice-txt b { font-weight: 300; color: var(--text); }

    .btns { display: flex; flex-direction: row; gap: 10px; }
    .btn-gen {
      white-space: nowrap;
      background: var(--orange); color: #fff; border: none;
      padding: 0 20px; height: 44px;
      font-family: var(--head); font-size: 10px;
      font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
      cursor: pointer; transition: opacity 0.18s;
    }
    .btn-gen:hover:not(:disabled) { opacity: 0.82; }
    .btn-gen:disabled { opacity: 0.35; cursor: not-allowed; }
    .btn-prev {
      white-space: nowrap;
      background: transparent; color: var(--text);
      border: 1px solid var(--border);
      padding: 0 20px; height: 44px;
      font-family: var(--head); font-size: 10px;
      font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
      cursor: pointer; transition: border-color 0.18s;
    }
    .btn-prev:hover { border-color: var(--border-hi); }
    .btn-prev.lit { border-color: var(--orange); color: var(--orange); }

    .gen-status {
      display: flex; align-items: center; gap: 8px;
      font-family: var(--body); font-size: 10px;
      color: var(--dim); letter-spacing: 0.05em;
      margin-top: 10px; min-height: 16px;
    }
    .gen-status.err { color: #ff6b6b; }
    .spinner {
      width: 9px; height: 9px;
      border: 1.5px solid rgba(255,100,0,0.2);
      border-top-color: var(--orange);
      border-radius: 50%;
      animation: spin 0.8s linear infinite; flex-shrink: 0;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .footer {
      font-family: var(--body); font-size: 10px;
      color: var(--dim); letter-spacing: 0.04em;
      padding: 0 40px;
      border-top: 1px solid var(--border);
      display: flex; align-items: center;
    }

    .done-wrap {
      position: fixed; inset: 0;
      background: rgba(11,11,11,0.88);
      backdrop-filter: blur(6px);
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      gap: 18px; z-index: 200;
    }
    .done-icon {
      width: 52px; height: 52px;
      border: 1px solid rgba(255,100,0,0.4);
      display: flex; align-items: center; justify-content: center;
    }
    .done-icon svg { width: 22px; height: 22px; color: var(--orange); }
    .done-h { font-family: var(--head); font-size: 16px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
    .done-sub { font-family: var(--body); font-size: 12px; color: var(--muted); }
    .done-btns { display: flex; gap: 10px; margin-top: 6px; }
  </style>
</head>
<body>
  <div id="prog"></div>
  <canvas id="dot-canvas"></canvas>
  <div id="cursor">
    <div class="c-dot"></div>
    <div class="c-ring">
      <div class="c-corner c-tl"></div>
      <div class="c-corner c-tr"></div>
      <div class="c-corner c-br"></div>
      <div class="c-corner c-bl"></div>
    </div>
  </div>
  <div id="root"></div>

  <script type="text/babel">
const { useState, useEffect, useRef, useCallback } = React;

const PREVIEW_URL = '${previewUrl}';
const MAX_FILES = ${MAX_ASSETS};

const GEN_STEPS = [
  'Анализирую тему...',
  'Отправляю в Gemini...',
  'LLM режиссирует монтаж...',
  'Генерирую JSON-сцены...',
  'Normalizing video schema...',
  'Собираю Remotion-композицию...',
  'Открываю preview...',
];

const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      resolve(result.includes(',') ? result.split(',')[1] : result);
    };
    reader.onerror = () => reject(new Error('Не удалось прочитать файл.'));
    reader.readAsDataURL(file);
  });

const readImageDimensions = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve({ width: img.naturalWidth, height: img.naturalHeight }); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Не удалось определить размер.')); };
    img.src = url;
  });

const readVideoDimensions = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const vid = document.createElement('video');
    vid.preload = 'metadata';
    vid.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve({ width: vid.videoWidth || 1080, height: vid.videoHeight || 1920, durationSeconds: vid.duration || 0 });
    };
    vid.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Не удалось определить параметры видео.')); };
    vid.src = url;
  });

function App() {
  const [topic, setTopic] = useState('');
  const [files, setFiles] = useState([]);
  const [voice, setVoice] = useState(false);
  const [drag, setDrag] = useState(false);
  const [appState, setAppState] = useState('idle');
  const [genStep, setGenStep] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');
  const [statusErr, setStatusErr] = useState(false);
  const fileRef = useRef(null);

  const addFiles = useCallback((fs) =>
    setFiles((prev) => [...prev, ...Array.from(fs)].slice(0, MAX_FILES)), []);
  const rmFile = (i) => setFiles((f) => f.filter((_, j) => j !== i));
  const onDrop = (e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); };

  const generate = async () => {
    if (!topic.trim() || appState === 'gen') return;
    setAppState('gen');
    setGenStep(0);
    setStatusMsg('');
    setStatusErr(false);

    let step = 0;
    const prog = document.getElementById('prog');
    let p = 0;
    const tick = setInterval(() => {
      p = Math.min(p + Math.random() * 15 + 5, 92);
      if (prog) prog.style.width = p + '%';
      step = Math.min(step + 1, GEN_STEPS.length - 1);
      setGenStep(step);
    }, 700);

    try {
      const mediaPayloads = await Promise.all(
        files.map(async (file) => {
          const isVideo = file.type.startsWith('video/');
          const isAudio = file.type.startsWith('audio/');
          const base64Data = await fileToBase64(file);
          if (isVideo) {
            let width = 1080, height = 1920, durationSeconds = 0;
            try { const info = await readVideoDimensions(file); width = info.width; height = info.height; durationSeconds = info.durationSeconds; } catch {}
            return { name: file.name, mimeType: file.type || 'video/mp4', base64Data, width, height, durationSeconds, isVideo: true };
          }
          if (isAudio) return { name: file.name, mimeType: file.type || 'audio/mpeg', base64Data, isAudio: true };
          const dims = await readImageDimensions(file);
          return { name: file.name, mimeType: file.type || 'image/jpeg', base64Data, width: dims.width, height: dims.height, isVideo: false };
        })
      );

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, images: mediaPayloads, tts: voice }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Не удалось сгенерировать видео.');

      clearInterval(tick);
      if (prog) { prog.style.width = '100%'; setTimeout(() => { prog.style.width = '0%'; }, 500); }
      setAppState('done');
      window.open(PREVIEW_URL + '?t=' + Date.now(), '_blank', 'noopener,noreferrer');
    } catch (err) {
      clearInterval(tick);
      if (prog) prog.style.width = '0%';
      setAppState('error');
      setStatusMsg(err.message || 'Неизвестная ошибка генерации.');
      setStatusErr(true);
    }
  };

  const reset = () => { setAppState('idle'); setStatusMsg(''); setStatusErr(false); setFiles([]); setTopic(''); };

  const isReady = topic.trim().length > 0;
  const isGen = appState === 'gen';

  return (
    <>
      <div className="page">
        <header className="hdr">
          <div className="hdr-l" style={{ alignItems: 'center', gap: 14 }}>
            <img className="hdr-logo" src="/assets/logo.png" alt="AutoSMM" style={{ width: 48, height: 38, objectFit: 'contain' }} />
            <span className="hdr-name">АВТОСММ</span>
          </div>
          <div className="hdr-r">
            <div className="hdr-status">
              <div className={'s-dot' + (isGen ? ' pulse' : '')}
                style={{ background: appState === 'done' ? '#00C170' : 'var(--orange)' }} />
              {appState === 'idle' && 'ОЖИДАНИЕ'}
              {appState === 'gen' && 'ГЕНЕРАЦИЯ'}
              {appState === 'done' && 'ГОТОВО'}
              {appState === 'error' && 'ОШИБКА'}
            </div>
          </div>
        </header>

        <div className="content">
          <div className="inner">
            <div className="hero-row">
              <div className="hero-text">
                <div className="badge" style={{ border: 'none', color: '#fff', paddingLeft: 0 }}></div>
                <h1 className="h1">Тема, медиа,<br />и сразу в Remotion</h1>
                <p className="desc" style={{ color: '#b5b4b3' }}>
                  Добавь тему и свои фото или видеоклипы. Studio отправит всё в Gemini —<br />
                  он смонтирует видео как режиссёр и откроет preview.
                </p>
              </div>
              <img className="hero-orb" src="/assets/sunset-logo.png" alt="" aria-hidden="true" />
            </div>

            <div className="divider"></div>

            <div className="form-stack">
              <div>
                <label className="lbl" style={{ color: '#f0ede8' }}>Тема видео</label>
                <textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Например: 5 причин вести блог для малого бизнеса"
                  disabled={isGen} />
              </div>

              <div>
                <label className="lbl" style={{ color: '#f0ede8' }}>Медиа для сцен</label>
                <div
                  className={'upload-zone' + (drag ? ' drag' : '')}
                  onClick={() => !isGen && fileRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                  onDragLeave={() => setDrag(false)}
                  onDrop={!isGen ? onDrop : undefined}>
                  <div className="up-row">
                    <div className="up-icon">
                      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M10 13V7m0 0L7 10m3-3l3 3" strokeLinecap="round" />
                        <rect x="2" y="2" width="16" height="16" rx="0" strokeDasharray="3 2" />
                      </svg>
                    </div>
                    <span className="up-cta">
                      {files.length ? files.length + ' файл(а) выбрано' : 'Выбрать или перетащить'}
                    </span>
                  </div>
                  <p className="up-hint">Фото: jpeg, png, webp · Видео: mp4, mov · Аудио: mp3, m4a · До {MAX_FILES} файлов</p>
                  {files.length > 0 &&
                    <div className="chips">
                      {files.map((f, i) =>
                        <span key={i} className="chip">
                          {f.name.length > 16 ? f.name.slice(0, 13) + '…' : f.name}
                          {!isGen && <span className="chip-x" onClick={(e) => { e.stopPropagation(); rmFile(i); }}>×</span>}
                        </span>
                      )}
                    </div>
                  }
                </div>
                <input ref={fileRef} type="file" multiple
                  accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm,audio/mpeg,audio/wav,audio/mp4,audio/x-m4a,audio/ogg"
                  style={{ display: 'none' }} onChange={(e) => addFiles(e.target.files)} />
              </div>
            </div>

            <div className="bottom-row" style={{ marginBottom: 0 }}>
              <div className={'voice-row' + (voice ? ' on' : '')} onClick={() => !isGen && setVoice((v) => !v)}>
                <div className="chk">
                  {voice &&
                    <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="1.5,5 4,7.5 8.5,2.5" />
                    </svg>
                  }
                </div>
                <span className="voice-txt">
                  <span style={{ color: '#b5b4b3' }}>Озвучить нарративным голосом (</span><b>TTS</b><span style={{ color: '#b5b4b3' }}>) — только если нет голоса в видео</span>
                </span>
              </div>

              <div className="btns">
                <button className="btn-gen" style={{ flex: 1 }} disabled={!isReady || isGen} onClick={generate}>
                  {isGen ? 'Генерация...' : 'Сгенерировать и открыть Preview'}
                </button>
                <button className={'btn-prev' + (appState === 'done' ? ' lit' : '')}
                  onClick={() => window.open(PREVIEW_URL, '_blank', 'noopener,noreferrer')}>
                  ОТКРЫТЬ ПРЕВЬЮ
                </button>
              </div>
            </div>

            <div className={'gen-status' + (statusErr ? ' err' : '')}>
              {isGen && <><div className="spinner" />{GEN_STEPS[genStep]}</>}
              {appState === 'done' && <span style={{ color: '#00C170' }}>✓&nbsp;&nbsp;Готово — preview открыт в Remotion Studio</span>}
              {appState === 'error' && statusMsg}
            </div>
          </div>
        </div>

        <footer className="footer">
          Файлы сохраняются в <code style={{ fontFamily: 'monospace', opacity: 0.55, margin: '0 4px' }}>public/uploads</code>.
          Для видео генерируются превью-кадры, которые LLM использует как визуальный контекст при режиссуре монтажа.
        </footer>
      </div>

      {appState === 'done' &&
        <div className="done-wrap">
          <div className="done-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polyline points="5,12 10,17 19,7" />
            </svg>
          </div>
          <div className="done-h">Preview готов</div>
          <div className="done-sub">Remotion Studio открыт на {PREVIEW_URL}</div>
          <div className="done-btns">
            <button className="btn-gen" style={{ height: 44 }}
              onClick={() => window.open(PREVIEW_URL, '_blank', 'noopener,noreferrer')}>
              Открыть Preview
            </button>
            <button className="btn-prev" style={{ height: 44 }} onClick={reset}>Новое видео</button>
          </div>
        </div>
      }
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
  <\/script>

  <script>
    const cur = document.getElementById('cursor');
    let cx = -200, cy = -200;
    document.addEventListener('mousemove', e => {
      cx = e.clientX; cy = e.clientY;
      cur.style.transform = 'translate(calc(' + cx + 'px - 50%), calc(' + cy + 'px - 50%))';
    });

    (function(){
      const canvas = document.getElementById('dot-canvas');
      const ctx = canvas.getContext('2d');
      const SPACING = 38, R = 1.1;
      let W, H, dots;

      const RADIUS = 160;

      function init() {
        W = canvas.width  = window.innerWidth;
        H = canvas.height = window.innerHeight;
        dots = [];
        const cols = Math.ceil(W / SPACING) + 1;
        const rows = Math.ceil(H / SPACING) + 1;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            dots.push({
              x: c * SPACING, y: r * SPACING,
              phase: Math.random() * Math.PI * 2,
              speed: 0.0025 + Math.random() * 0.003,
            });
          }
        }
      }

      let frame = 0;
      function draw() {
        requestAnimationFrame(draw);
        frame++;
        ctx.clearRect(0, 0, W, H);
        for (const d of dots) {
          const breathe = 0.35 + 0.12 * Math.sin(frame * d.speed + d.phase);
          const dx = d.x - cx, dy = d.y - cy;
          const dist = Math.sqrt(dx*dx + dy*dy);
          ctx.beginPath();
          ctx.arc(d.x, d.y, R, 0, Math.PI * 2);
          if (dist < RADIUS) {
            const t = 1 - dist / RADIUS;
            const r2 = Math.round(140 + t * (255 - 140));
            const g2 = Math.round(80  + t * (100 - 80));
            const b2 = Math.round(255 + t * (0   - 255));
            const a  = Math.min(breathe + t * 0.5, 1);
            ctx.fillStyle = 'rgba(' + r2 + ',' + g2 + ',' + b2 + ',' + a + ')';
          } else {
            ctx.fillStyle = 'rgba(140,80,255,' + breathe + ')';
          }
          ctx.fill();
        }
      }

      window.addEventListener('resize', init);
      init();
      draw();
    })();
  <\/script>
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

  if (request.method === 'GET' && request.url === '/favicon.png') {
    const faviconPath = path.join(publicDir, 'favicon.png');
    if (fs.existsSync(faviconPath)) {
      response.writeHead(200, { 'Content-Type': 'image/png' });
      fs.createReadStream(faviconPath).pipe(response);
    } else {
      response.writeHead(404);
      response.end();
    }
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

  if (request.method === 'GET' && (request.url.startsWith('/fonts/') || request.url.startsWith('/assets/'))) {
    const filePath = path.join(publicDir, decodeURIComponent(request.url.split('?')[0]));
    if (fs.existsSync(filePath)) {
      const ext = path.extname(filePath).toLowerCase();
      const mime = ext === '.otf' ? 'font/otf' : ext === '.png' ? 'image/png' : 'application/octet-stream';
      response.writeHead(200, { 'Content-Type': mime });
      fs.createReadStream(filePath).pipe(response);
    } else {
      response.writeHead(404);
      response.end();
    }
    return;
  }

  sendJson(response, 404, { error: 'Not found.' });
});

server.listen(webPort, () => {
  console.log(`Studio page started on http://localhost:${webPort}`);
  console.log(`Remotion preview expected on ${previewUrl}`);
});
