import {
  DEFAULT_BULLET_LIST_SCENE,
  DEFAULT_CTA_SCENE,
  DEFAULT_QUOTE_SCENE,
  DEFAULT_SCENE_MEDIA,
  DEFAULT_STAT_SCENE,
  DEFAULT_TITLE_SCENE,
  DEFAULT_VIDEO_CONFIG,
  HEX_COLOR_PATTERN,
  rawVideoSpecSchema,
  videoSpecSchema,
  type BulletListScene,
  type CtaScene,
  type QuoteScene,
  type RawScene,
  type RawVideoSpec,
  type SceneMedia,
  type StatScene,
  type TitleScene,
  type VideoAsset,
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

const normalizeOpacity = (value: number | undefined, fallback: number): number => {
  if (value === undefined || Number.isNaN(value)) {
    return fallback;
  }

  return Math.min(0.95, Math.max(0, value));
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

const normalizeRequiredText = (value: string | undefined, errorMessage: string): string => {
  const text = value?.trim() ?? '';

  if (text.length === 0) {
    throw new Error(errorMessage);
  }

  return text;
};

const normalizeOptionalText = (value: string | undefined, fallback: string): string => {
  return value?.trim() ? value.trim() : fallback;
};

const getString = (value: unknown): string | undefined => {
  return typeof value === 'string' ? value : undefined;
};

const getNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
};

const getStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string');
};

const extractStatValueAndLabel = (
  rawValue: string | undefined,
  rawText: string | undefined,
  rawLabel: string | undefined,
): { value: string; label: string } => {
  const candidateValue = rawValue?.trim() ?? '';
  const candidateText = rawText?.trim() ?? '';
  const candidateLabel = rawLabel?.trim() ?? '';

  if (candidateValue && candidateValue.length <= 24) {
    return {
      value: candidateValue,
      label: candidateLabel || candidateText || candidateValue,
    };
  }

  const source = candidateValue || candidateText || candidateLabel;
  const match = source.match(
    /(\d+(?:[.,]\d+)?\s*%|\d+(?:[.,]\d+)?\s*[xх]|x\s*\d+(?:[.,]\d+)?|\d+(?:[.,]\d+)?)/i,
  );

  if (match) {
    const extractedValue = match[1].replace(/\s+/g, '').trim();
    const remainder = source.replace(match[0], '').replace(/\s{2,}/g, ' ').trim();

    return {
      value: extractedValue.slice(0, 24),
      label: candidateLabel || remainder || candidateText || source,
    };
  }

  return {
    value: source.slice(0, 24),
    label: candidateLabel || candidateText || source,
  };
};

const normalizeAssets = (assets: RawVideoSpec['assets']): VideoAsset[] => {
  if (!assets?.length) {
    return [];
  }

  const seenIds = new Set<string>();

  return assets.map((asset, index) => {
    const id = normalizeRequiredText(asset.id, `Asset ${index + 1} must contain a non-empty id.`);
    const src = normalizeRequiredText(
      asset.src,
      `Asset ${index + 1} must contain a non-empty src.`,
    );

    if (seenIds.has(id)) {
      throw new Error(`Asset id "${id}" is duplicated.`);
    }

    seenIds.add(id);

    return {
      id,
      type: 'image',
      src,
      alt: normalizeOptionalText(asset.alt, `Image asset ${id}`),
    };
  });
};

const normalizeSceneMedia = (
  media: RawScene['media'],
): SceneMedia | undefined => {
  if (!media) {
    return undefined;
  }

  return {
    assetId: normalizeRequiredText(media.assetId, 'Scene media must reference a non-empty assetId.'),
    mode: media.mode ?? DEFAULT_SCENE_MEDIA.mode,
    position:
      media.mode === 'side'
        ? media.position ?? DEFAULT_SCENE_MEDIA.position
        : media.position,
    overlayColor: normalizeColor(media.overlayColor, DEFAULT_SCENE_MEDIA.overlayColor),
    overlayOpacity: normalizeOpacity(media.overlayOpacity, DEFAULT_SCENE_MEDIA.overlayOpacity),
  };
};

const normalizeTitleScene = (
  scene: RawScene,
  index: number,
): TitleScene => {
  const text = normalizeRequiredText(
    getString(scene.text),
    `Scene ${index + 1} must contain non-empty text.`,
  );

  const duration = getNumber(scene.duration) ?? 0;
  assertDuration(duration, index);

  return {
    type: 'title',
    text,
    duration,
    backgroundColor: normalizeColor(
      getString(scene.backgroundColor) ?? getString(scene.color),
      DEFAULT_TITLE_SCENE.backgroundColor,
    ),
    textColor: normalizeColor(getString(scene.textColor), DEFAULT_TITLE_SCENE.textColor),
    align: normalizeTitleAlign(
      scene.align === 'left' || scene.align === 'center' || scene.align === 'right'
        ? scene.align
        : undefined,
    ),
    media: normalizeSceneMedia(scene.media),
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
  scene: RawScene,
  index: number,
): BulletListScene => {
  const title = normalizeRequiredText(
    getString(scene.title),
    `Scene ${index + 1} must contain a non-empty bullet-list title.`,
  );

  const duration = getNumber(scene.duration) ?? 0;
  assertDuration(duration, index);

  return {
    type: 'bullet-list',
    title,
    items: normalizeBulletListItems(getStringArray(scene.items), index),
    duration,
    backgroundColor: normalizeColor(
      getString(scene.backgroundColor) ?? getString(scene.color),
      DEFAULT_BULLET_LIST_SCENE.backgroundColor,
    ),
    textColor: normalizeColor(getString(scene.textColor), DEFAULT_BULLET_LIST_SCENE.textColor),
    accentColor: normalizeColor(
      getString(scene.accentColor),
      DEFAULT_BULLET_LIST_SCENE.accentColor,
    ),
    align: normalizeBulletListAlign(scene.align === 'left' || scene.align === 'center' ? scene.align : undefined),
    media: normalizeSceneMedia(scene.media),
  };
};

const normalizeQuoteScene = (
  scene: RawScene,
  index: number,
): QuoteScene => {
  const quote = normalizeRequiredText(
    getString(scene.quote),
    `Scene ${index + 1} must contain a non-empty quote.`,
  );
  const author = normalizeOptionalText(getString(scene.author), 'Source');

  const duration = getNumber(scene.duration) ?? 0;
  assertDuration(duration, index);

  return {
    type: 'quote',
    quote,
    author,
    duration,
    backgroundColor: normalizeColor(
      getString(scene.backgroundColor) ?? getString(scene.color),
      DEFAULT_QUOTE_SCENE.backgroundColor,
    ),
    textColor: normalizeColor(getString(scene.textColor), DEFAULT_QUOTE_SCENE.textColor),
    accentColor: normalizeColor(getString(scene.accentColor), DEFAULT_QUOTE_SCENE.accentColor),
    align: normalizeQuoteAlign(
      scene.align === 'left' || scene.align === 'center' || scene.align === 'right'
        ? scene.align
        : undefined,
    ),
    media: normalizeSceneMedia(scene.media),
  };
};

const splitCtaText = (value: string | undefined): { title?: string; action?: string } => {
  const text = value?.trim();

  if (!text) {
    return {};
  }

  const parts = text
    .split(/(?:[.!?]\s+|\n+)/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    return {
      title: parts[0],
      action: parts.slice(1).join(' '),
    };
  }

  return {
    title: text,
    action: text,
  };
};

const normalizeCtaScene = (
  scene: RawScene,
  index: number,
): CtaScene => {
  const ctaTextFallback = splitCtaText(getString(scene.text));
  const title = normalizeRequiredText(
    getString(scene.title) ?? ctaTextFallback.title,
    `Scene ${index + 1} must contain a non-empty cta title.`,
  );
  const action = normalizeRequiredText(
    getString(scene.action) ?? ctaTextFallback.action,
    `Scene ${index + 1} must contain a non-empty cta action.`,
  );

  const duration = getNumber(scene.duration) ?? 0;
  assertDuration(duration, index);

  return {
    type: 'cta',
    title,
    action,
    duration,
    backgroundColor: normalizeColor(
      getString(scene.backgroundColor) ?? getString(scene.color),
      DEFAULT_CTA_SCENE.backgroundColor,
    ),
    textColor: normalizeColor(getString(scene.textColor), DEFAULT_CTA_SCENE.textColor),
    accentColor: normalizeColor(getString(scene.accentColor), DEFAULT_CTA_SCENE.accentColor),
    align: normalizeCtaAlign(
      scene.align === 'left' || scene.align === 'center' || scene.align === 'right'
        ? scene.align
        : undefined,
    ),
    media: normalizeSceneMedia(scene.media),
  };
};

const normalizeStatScene = (
  scene: RawScene,
  index: number,
): StatScene => {
  const extractedStat = extractStatValueAndLabel(
    getString(scene.value),
    getString(scene.text),
    getString(scene.label),
  );
  const value = normalizeRequiredText(
    extractedStat.value,
    `Scene ${index + 1} must contain a non-empty stat value.`,
  );
  const label = normalizeRequiredText(
    extractedStat.label,
    `Scene ${index + 1} must contain a non-empty stat label.`,
  );

  const duration = getNumber(scene.duration) ?? 0;
  assertDuration(duration, index);

  return {
    type: 'stat',
    value,
    label,
    duration,
    backgroundColor: normalizeColor(
      getString(scene.backgroundColor) ?? getString(scene.color),
      DEFAULT_STAT_SCENE.backgroundColor,
    ),
    textColor: normalizeColor(getString(scene.textColor), DEFAULT_STAT_SCENE.textColor),
    accentColor: normalizeColor(getString(scene.accentColor), DEFAULT_STAT_SCENE.accentColor),
    align: normalizeStatAlign(
      scene.align === 'left' || scene.align === 'center' || scene.align === 'right'
        ? scene.align
        : undefined,
    ),
    media: normalizeSceneMedia(scene.media),
  };
};

const normalizeScene = (scene: RawScene, index: number): VideoScene => {
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

const assertSceneAssetsExist = (assets: VideoAsset[], scenes: VideoScene[]): void => {
  const assetIds = new Set(assets.map((asset) => asset.id));

  scenes.forEach((scene, index) => {
    if (scene.media && !assetIds.has(scene.media.assetId)) {
      throw new Error(
        `Scene ${index + 1} references unknown assetId "${scene.media.assetId}".`,
      );
    }
  });
};

export const normalizeVideoSpec = (input: unknown): VideoSpec => {
  const parsed = rawVideoSpecSchema.parse(input);
  const assets = normalizeAssets(parsed.assets);
  const scenes = parsed.scenes.map((scene, index) => normalizeScene(scene, index));

  assertSceneAssetsExist(assets, scenes);

  const normalized: VideoSpec = {
    schemaVersion: 2,
    videoConfig: normalizeVideoConfig(parsed.videoConfig),
    assets,
    scenes,
  };

  return videoSpecSchema.parse(normalized);
};

export default {
  normalizeVideoSpec,
};
