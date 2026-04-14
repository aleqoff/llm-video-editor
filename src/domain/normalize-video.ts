import {
  DEFAULT_BULLET_LIST_SCENE,
  DEFAULT_CTA_SCENE,
  DEFAULT_QUOTE_SCENE,
  DEFAULT_STAT_SCENE,
  DEFAULT_TITLE_SCENE,
  DEFAULT_VIDEO_CONFIG,
  HEX_COLOR_PATTERN,
  rawVideoSpecSchema,
  videoSpecSchema,
  type BulletListScene,
  type CtaScene,
  type QuoteScene,
  type RawVideoSpec,
  type StatScene,
  type TitleScene,
  type VideoConfig,
  type VideoScene,
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

const normalizeTitleAlign = (value: TitleScene['align'] | undefined): TitleScene['align'] => {
  return value ?? DEFAULT_TITLE_SCENE.align;
};

const normalizeBulletListAlign = (
  value: BulletListScene['align'] | undefined,
): BulletListScene['align'] => {
  return value ?? DEFAULT_BULLET_LIST_SCENE.align;
};

const normalizeQuoteAlign = (value: QuoteScene['align'] | undefined): QuoteScene['align'] => {
  return value ?? DEFAULT_QUOTE_SCENE.align;
};

const normalizeCtaAlign = (value: CtaScene['align'] | undefined): CtaScene['align'] => {
  return value ?? DEFAULT_CTA_SCENE.align;
};

const normalizeStatAlign = (value: StatScene['align'] | undefined): StatScene['align'] => {
  return value ?? DEFAULT_STAT_SCENE.align;
};

const normalizeVideoConfig = (config: Partial<VideoConfig> | undefined): VideoConfig => {
  return {
    width: normalizeDimension(config?.width, DEFAULT_VIDEO_CONFIG.width),
    height: normalizeDimension(config?.height, DEFAULT_VIDEO_CONFIG.height),
    fps: normalizeFps(config?.fps),
  };
};

const assertDuration = (duration: number, index: number): void => {
  if (!Number.isInteger(duration) || duration < 1 || duration > 3600) {
    throw new Error(
      `Scene ${index + 1} has invalid duration "${duration}". Duration must be an integer between 1 and 3600 frames.`,
    );
  }
};

const normalizeRequiredText = (value: string, errorMessage: string): string => {
  const text = value.trim();

  if (text.length === 0) {
    throw new Error(errorMessage);
  }

  return text;
};

const normalizeTitleScene = (
  scene: {
    type?: 'title';
    text: string;
    duration: number;
    backgroundColor?: string;
    color?: string;
    textColor?: string;
    align?: TitleScene['align'];
  },
  index: number,
): TitleScene => {
  const text = normalizeRequiredText(scene.text, `Scene ${index + 1} must contain non-empty text.`);

  assertDuration(scene.duration, index);

  return {
    type: 'title',
    text,
    duration: scene.duration,
    backgroundColor: normalizeColor(
      scene.backgroundColor ?? scene.color,
      DEFAULT_TITLE_SCENE.backgroundColor,
    ),
    textColor: normalizeColor(scene.textColor, DEFAULT_TITLE_SCENE.textColor),
    align: normalizeTitleAlign(scene.align),
  };
};

const normalizeBulletListItems = (items: string[], index: number): string[] => {
  const normalizedItems = items
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .slice(0, 5);

  if (normalizedItems.length < 2) {
    throw new Error(`Scene ${index + 1} must contain at least 2 non-empty bullet items.`);
  }

  return normalizedItems;
};

const normalizeBulletListScene = (
  scene: {
    type: 'bullet-list';
    title: string;
    items: string[];
    duration: number;
    backgroundColor?: string;
    color?: string;
    textColor?: string;
    accentColor?: string;
    align?: BulletListScene['align'];
  },
  index: number,
): BulletListScene => {
  const title = normalizeRequiredText(
    scene.title,
    `Scene ${index + 1} must contain a non-empty bullet-list title.`,
  );

  assertDuration(scene.duration, index);

  return {
    type: 'bullet-list',
    title,
    items: normalizeBulletListItems(scene.items, index),
    duration: scene.duration,
    backgroundColor: normalizeColor(
      scene.backgroundColor ?? scene.color,
      DEFAULT_BULLET_LIST_SCENE.backgroundColor,
    ),
    textColor: normalizeColor(scene.textColor, DEFAULT_BULLET_LIST_SCENE.textColor),
    accentColor: normalizeColor(scene.accentColor, DEFAULT_BULLET_LIST_SCENE.accentColor),
    align: normalizeBulletListAlign(scene.align),
  };
};

const normalizeQuoteScene = (
  scene: {
    type: 'quote';
    quote: string;
    author?: string;
    duration: number;
    backgroundColor?: string;
    color?: string;
    textColor?: string;
    accentColor?: string;
    align?: QuoteScene['align'];
  },
  index: number,
): QuoteScene => {
  const quote = normalizeRequiredText(
    scene.quote,
    `Scene ${index + 1} must contain a non-empty quote.`,
  );
  const author = normalizeRequiredText(
    scene.author ?? 'Источник',
    `Scene ${index + 1} must contain a non-empty quote author.`,
  );

  assertDuration(scene.duration, index);

  return {
    type: 'quote',
    quote,
    author,
    duration: scene.duration,
    backgroundColor: normalizeColor(
      scene.backgroundColor ?? scene.color,
      DEFAULT_QUOTE_SCENE.backgroundColor,
    ),
    textColor: normalizeColor(scene.textColor, DEFAULT_QUOTE_SCENE.textColor),
    accentColor: normalizeColor(scene.accentColor, DEFAULT_QUOTE_SCENE.accentColor),
    align: normalizeQuoteAlign(scene.align),
  };
};

const normalizeCtaScene = (
  scene: {
    type: 'cta';
    title: string;
    action: string;
    duration: number;
    backgroundColor?: string;
    color?: string;
    textColor?: string;
    accentColor?: string;
    align?: CtaScene['align'];
  },
  index: number,
): CtaScene => {
  const title = normalizeRequiredText(
    scene.title,
    `Scene ${index + 1} must contain a non-empty cta title.`,
  );
  const action = normalizeRequiredText(
    scene.action,
    `Scene ${index + 1} must contain a non-empty cta action.`,
  );

  assertDuration(scene.duration, index);

  return {
    type: 'cta',
    title,
    action,
    duration: scene.duration,
    backgroundColor: normalizeColor(
      scene.backgroundColor ?? scene.color,
      DEFAULT_CTA_SCENE.backgroundColor,
    ),
    textColor: normalizeColor(scene.textColor, DEFAULT_CTA_SCENE.textColor),
    accentColor: normalizeColor(scene.accentColor, DEFAULT_CTA_SCENE.accentColor),
    align: normalizeCtaAlign(scene.align),
  };
};

const normalizeStatScene = (
  scene: {
    type: 'stat';
    value: string;
    label: string;
    duration: number;
    backgroundColor?: string;
    color?: string;
    textColor?: string;
    accentColor?: string;
    align?: StatScene['align'];
  },
  index: number,
): StatScene => {
  const value = normalizeRequiredText(
    scene.value,
    `Scene ${index + 1} must contain a non-empty stat value.`,
  );
  const label = normalizeRequiredText(
    scene.label,
    `Scene ${index + 1} must contain a non-empty stat label.`,
  );

  assertDuration(scene.duration, index);

  return {
    type: 'stat',
    value,
    label,
    duration: scene.duration,
    backgroundColor: normalizeColor(
      scene.backgroundColor ?? scene.color,
      DEFAULT_STAT_SCENE.backgroundColor,
    ),
    textColor: normalizeColor(scene.textColor, DEFAULT_STAT_SCENE.textColor),
    accentColor: normalizeColor(scene.accentColor, DEFAULT_STAT_SCENE.accentColor),
    align: normalizeStatAlign(scene.align),
  };
};

const normalizeScene = (scene: RawVideoSpec['scenes'][number], index: number): VideoScene => {
  switch (scene.type) {
    case 'bullet-list':
      return normalizeBulletListScene(scene, index);
    case 'quote':
      return normalizeQuoteScene(scene, index);
    case 'cta':
      return normalizeCtaScene(scene, index);
    case 'stat':
      return normalizeStatScene(scene, index);
    default:
      return normalizeTitleScene(scene, index);
  }
};

export const normalizeVideoSpec = (input: unknown): VideoSpec => {
  const parsed = rawVideoSpecSchema.parse(input);

  const normalized: VideoSpec = {
    schemaVersion: 1,
    videoConfig: normalizeVideoConfig(parsed.videoConfig),
    scenes: parsed.scenes.map((scene, index) => normalizeScene(scene, index)),
  };

  return videoSpecSchema.parse(normalized);
};

export default {
  normalizeVideoSpec,
};
