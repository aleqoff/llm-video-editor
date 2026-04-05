import path from 'node:path';
import { spawn } from 'node:child_process';

const nodeCommand = process.execPath;
const remotionCliPath = path.resolve('node_modules/@remotion/cli/remotion-cli.js');
const previewPort = process.env.REMOTION_PREVIEW_PORT ?? '3000';
const webPort = process.env.VIDEO_ENGINE_WEB_PORT ?? '3010';

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

const shutdown = () => {
  children.forEach((child) => {
    if (child.pid) {
      child.kill();
    }
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
