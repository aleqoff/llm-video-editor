import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';

const nodeCommand = process.execPath;
const remotionCliPath = path.resolve('node_modules/@remotion/cli/remotion-cli.js');
const previewPort = process.env.REMOTION_PREVIEW_PORT ?? '3010';
const webPort = process.env.VIDEO_ENGINE_WEB_PORT ?? '3000';
const studioUrl = `http://localhost:${webPort}`;

const children = [];

const spawnProcess = (command, args, name, envOverrides = {}) => {
  const child = spawn(command, args, {
    stdio: 'inherit',
    env: {
      ...process.env,
      ...envOverrides,
    },
    windowsHide: false,
  });

  child.on('error', (error) => {
    console.error(`${name} failed to start: ${error.message}`);
    process.exitCode = 1;
  });

  child.on('exit', (code) => {
    if (code && code !== 0) {
      console.error(`${name} exited with code ${code}`);
      process.exitCode = code;
    }

    children.forEach((runningChild) => {
      if (runningChild.pid && runningChild.pid !== child.pid) {
        runningChild.kill();
      }
    });
  });

  children.push(child);
};

const openInBrowser = (url) => {
  const platform = process.platform;

  if (platform === 'win32') {
    spawn('cmd', ['/c', 'start', '', url], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    }).unref();
    return;
  }

  if (platform === 'darwin') {
    spawn('open', [url], {
      detached: true,
      stdio: 'ignore',
    }).unref();
    return;
  }

  spawn('xdg-open', [url], {
    detached: true,
    stdio: 'ignore',
  }).unref();
};

const waitForServerAndOpen = (url, healthPath = '/health') => {
  const deadline = Date.now() + 15000;

  const tryOpen = () => {
    const request = http.get(`${url}${healthPath}`, (response) => {
      response.resume();

      if ((response.statusCode ?? 500) < 400) {
        openInBrowser(url);
        return;
      }

      if (Date.now() < deadline) {
        setTimeout(tryOpen, 500);
      }
    });

    request.on('error', () => {
      if (Date.now() < deadline) {
        setTimeout(tryOpen, 500);
      }
    });
  };

  tryOpen();
};

spawnProcess(nodeCommand, ['scripts/DevApiServer.mjs'], 'Studio page server', {
  REMOTION_PREVIEW_PORT: previewPort,
  VIDEO_ENGINE_WEB_PORT: webPort,
});

spawnProcess(
  nodeCommand,
  [remotionCliPath, 'preview', 'src/index.ts', `--port=${previewPort}`],
  'Remotion preview',
);

console.log(`Studio page: http://localhost:${webPort}`);
console.log(`Remotion preview: http://localhost:${previewPort}`);

waitForServerAndOpen(studioUrl);

const shutdown = () => {
  children.forEach((child) => {
    if (child.pid) {
      child.kill();
    }
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
