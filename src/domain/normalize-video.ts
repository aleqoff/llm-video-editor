import {
  DEFAULT_TITLE_SCENE,
  DEFAULT_VIDEO_CONFIG,
  HEX_COLOR_PATTERN,
  rawVideoSpecSchema,
  videoSpecSchema,
  type TitleScene,
  type VideoConfig,
  type VideoSpec,
} from './video-schema.ts';

const normalizeDimension = (value: number | undefined, fallback: number): number => {
  if (!Number.isInteger(value) || value === undefined || value < 320 || value > 4096) {
    return fallback;
  }

  return value;
};

const normalizeFps = (value: number | undefined): number => {
  if (!Number.isInteger(value) || value === undefined || value < 1 || value > 120) {
    return DEFAULT_VIDEO_CONFIG.fps;
  }

  return value;
};

const normalizeColor = (value: string | undefined, fallback: string): string => {
  if (!value) {
    return fallback;
  }

  const normalized = value.trim().toUpperCase();
  return HEX_COLOR_PATTERN.test(normalized) ? normalized : fallback;
};

const normalizeAlign = (value: TitleScene['align'] | undefined): TitleScene['align'] => {
  return value ?? DEFAULT_TITLE_SCENE.align;
};

const normalizeVideoConfig = (config: Partial<VideoConfig> | undefined): VideoConfig => {
  return {
    width: normalizeDimension(config?.width, DEFAULT_VIDEO_CONFIG.width),
    height: normalizeDimension(config?.height, DEFAULT_VIDEO_CONFIG.height),
    fps: normalizeFps(config?.fps),
  };
};

const normalizeTitleScene = (
  scene: {
    text: string;
    duration: number;
    backgroundColor?: string;
    color?: string;
    textColor?: string;
    align?: TitleScene['align'];
  },
  index: number,
): TitleScene => {
  const text = scene.text.trim();

  if (text.length === 0) {
    throw new Error(`Scene ${index + 1} must contain non-empty text.`);
  }

  if (!Number.isInteger(scene.duration) || scene.duration < 1 || scene.duration > 3600) {
    throw new Error(
      `Scene ${index + 1} has invalid duration "${scene.duration}". Duration must be an integer between 1 and 3600 frames.`,
    );
  }

  return {
    type: 'title',
    text,
    duration: scene.duration,
    backgroundColor: normalizeColor(
      scene.backgroundColor ?? scene.color,
      DEFAULT_TITLE_SCENE.backgroundColor,
    ),
    textColor: normalizeColor(scene.textColor, DEFAULT_TITLE_SCENE.textColor),
    align: normalizeAlign(scene.align),
  };
};

export const normalizeVideoSpec = (input: unknown): VideoSpec => {
  const parsed = rawVideoSpecSchema.parse(input);

  const normalized: VideoSpec = {
    schemaVersion: 1,
    videoConfig: normalizeVideoConfig(parsed.videoConfig),
    scenes: parsed.scenes.map((scene, index) => normalizeTitleScene(scene, index)),
  };

  return videoSpecSchema.parse(normalized);
};

export default {
  normalizeVideoSpec,
};
