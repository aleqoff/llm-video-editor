import {
  DEFAULT_COMPOSITION_SCENE,
  DEFAULT_SCENE_MEDIA,
  DEFAULT_VIDEO_CONFIG,
  HEX_COLOR_PATTERN,
  rawVideoSpecSchema,
  videoSpecSchema,
  type BackgroundMusic,
  type CompositionScene,
  type CtaBlock,
  type ImageVideoAsset,
  type Narration,
  type RawBlock,
  type RawScene,
  type RawVideoSpec,
  type SceneLayer,
  type SceneMedia,
  type VideoAsset,
  type VideoConfig,
  type VideoScene,
  type VideoSpec,
  type VolumeKeyframe,
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

  if (!text) {
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

const normalizeAlign = (
  value: unknown,
  fallback: CompositionScene['align'],
): CompositionScene['align'] => {
  return value === 'left' || value === 'center' || value === 'right' ? value : fallback;
};

const normalizeEnterTransition = (
  value: unknown,
): SceneLayer['enterTransition'] => {
  if (
    value === 'fade' ||
    value === 'slideUp' ||
    value === 'slideLeft' ||
    value === 'scale' ||
    value === 'none'
  ) {
    return value;
  }

  return undefined;
};

const normalizeExitTransition = (
  value: unknown,
): SceneLayer['exitTransition'] => {
  if (value === 'fade' || value === 'slideDown' || value === 'scale' || value === 'none') {
    return value;
  }

  return undefined;
};

const normalizeLayerTiming = (
  block: RawBlock,
  sceneDuration: number,
): Pick<SceneLayer, 'enterAt' | 'exitAt' | 'opacity' | 'enterTransition' | 'exitTransition'> => {
  const enterAt = getNumber(block.enterAt);
  const exitAt = getNumber(block.exitAt);
  const opacity = getNumber(block.opacity);

  return {
    enterAt:
      enterAt !== undefined && Number.isInteger(enterAt) && enterAt >= 0 && enterAt < sceneDuration
        ? enterAt
        : undefined,
    exitAt:
      exitAt !== undefined && Number.isInteger(exitAt) && exitAt > 0 && exitAt <= sceneDuration
        ? exitAt
        : undefined,
    opacity:
      opacity !== undefined && !Number.isNaN(opacity)
        ? Math.min(1, Math.max(0, opacity))
        : undefined,
    enterTransition: normalizeEnterTransition(block.enterTransition),
    exitTransition: normalizeExitTransition(block.exitTransition),
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

    // Audio asset — минимальная нормализация без width/height
    if (asset.type === 'audio') {
      const durationSeconds =
        typeof asset.durationSeconds === 'number' && asset.durationSeconds > 0
          ? asset.durationSeconds
          : undefined;
      return { id, type: 'audio' as const, src, durationSeconds };
    }

    const type = asset.type === 'video' ? 'video' : 'image';

    const base = {
      id,
      src,
      alt: normalizeOptionalText(asset.alt, `${type === 'video' ? 'Video' : 'Image'} asset ${id}`),
      width: Math.max(1, Math.min(12000, asset.width ?? 1080)),
      height: Math.max(1, Math.min(12000, asset.height ?? 1080)),
    };

    if (type === 'video') {
      const durationSeconds =
        typeof asset.durationSeconds === 'number' && asset.durationSeconds > 0
          ? asset.durationSeconds
          : undefined;
      const fps = typeof asset.fps === 'number' && asset.fps > 0 ? asset.fps : undefined;
      const hasAudio = typeof asset.hasAudio === 'boolean' ? asset.hasAudio : undefined;
      const transcript =
        Array.isArray(asset.transcript) && asset.transcript.length > 0
          ? asset.transcript
          : undefined;

      return { ...base, type: 'video' as const, durationSeconds, fps, hasAudio, transcript };
    }

    return { ...base, type: 'image' as const };
  });
};

const normalizeNarration = (raw: unknown): Narration | undefined => {
  if (!raw || typeof raw !== 'object') return undefined;
  const obj = raw as Record<string, unknown>;
  const text = getString(obj.text)?.trim();
  if (!text) return undefined;
  return {
    text,
    assetId: getString(obj.assetId)?.trim() || undefined,
    voice: getString(obj.voice)?.trim() || undefined,
  };
};

const normalizeBackgroundMusic = (
  raw: unknown,
  assets: VideoAsset[],
): BackgroundMusic | undefined => {
  if (!raw || typeof raw !== 'object') return undefined;
  const obj = raw as Record<string, unknown>;
  const assetId = getString(obj.assetId)?.trim();
  if (!assetId) return undefined;

  const assetExists = assets.some((a) => a.id === assetId);
  if (!assetExists) return undefined;

  const volume = getNumber(obj.volume);
  const startFrom = getNumber(obj.startFrom);

  let volumeKeyframes: VolumeKeyframe[] | undefined;
  if (Array.isArray(obj.volumeKeyframes) && obj.volumeKeyframes.length > 0) {
    const parsed = obj.volumeKeyframes
      .filter(
        (kf): kf is { frame: number; volume: number } =>
          typeof kf === 'object' &&
          kf !== null &&
          typeof (kf as Record<string, unknown>).frame === 'number' &&
          typeof (kf as Record<string, unknown>).volume === 'number',
      )
      .map((kf) => ({
        frame: Math.max(0, Math.round(kf.frame)),
        volume: Math.min(1, Math.max(0, kf.volume)),
      }));
    if (parsed.length > 0) volumeKeyframes = parsed;
  }

  return {
    assetId,
    volume: volume !== undefined ? Math.min(1, Math.max(0, volume)) : 0.15,
    volumeKeyframes,
    startFrom: startFrom !== undefined && startFrom >= 0 ? startFrom : undefined,
  };
};

const normalizeSceneMedia = (
  media: RawScene['media'],
  assets: VideoAsset[],
): SceneMedia | undefined => {
  if (!media) {
    return undefined;
  }

  const assetId = normalizeRequiredText(
    media.assetId,
    'Scene media must reference a non-empty assetId.',
  );

  const focalPoint =
    media.focalPoint === 'center' ||
    media.focalPoint === 'top' ||
    media.focalPoint === 'bottom'
      ? media.focalPoint
      : undefined;

  const videoAsset = assets.find((a) => a.id === assetId && a.type === 'video');

  let trimStart: number | undefined;
  let trimEnd: number | undefined;

  if (videoAsset) {
    const rawStart = getNumber(media.trimStart);
    const rawEnd = getNumber(media.trimEnd);
    const maxDuration = videoAsset.durationSeconds ?? Infinity;

    trimStart =
      rawStart !== undefined && rawStart >= 0 && rawStart < maxDuration ? rawStart : undefined;
    trimEnd =
      rawEnd !== undefined &&
      rawEnd > (trimStart ?? 0) &&
      rawEnd <= maxDuration
        ? rawEnd
        : undefined;
  }

  return {
    assetId,
    mode: media.mode ?? DEFAULT_SCENE_MEDIA.mode,
    position:
      media.mode === 'side' ? media.position ?? DEFAULT_SCENE_MEDIA.position : media.position,
    overlayColor: normalizeColor(media.overlayColor, DEFAULT_SCENE_MEDIA.overlayColor),
    overlayOpacity: normalizeOpacity(media.overlayOpacity, DEFAULT_SCENE_MEDIA.overlayOpacity),
    focalPoint,
    trimStart,
    trimEnd,
  };
};

const normalizeBlockAlign = (block: RawBlock, sceneAlign: CompositionScene['align']) => {
  return normalizeAlign(block.align, sceneAlign);
};

const buildTextBlockColor = (
  block: RawBlock,
  scene: RawScene,
  fallback: string,
): string | undefined => {
  const blockColor = getString(block.color);
  const sceneColor = getString(scene.textColor);
  return normalizeColor(blockColor ?? sceneColor, fallback);
};

const buildAccentColor = (
  block: RawBlock,
  scene: RawScene,
  fallback: string,
): string | undefined => {
  const blockAccent = getString(block.accentColor);
  const sceneAccent = getString(scene.accentColor);
  return normalizeColor(blockAccent ?? sceneAccent, fallback);
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

const normalizeLayers = (
  blocks: RawBlock[] | undefined,
  scene: RawScene,
  index: number,
  sceneDuration: number,
): SceneLayer[] => {
  const sceneAlign = normalizeAlign(scene.align, DEFAULT_COMPOSITION_SCENE.align);
  const sceneTextColor = normalizeColor(getString(scene.textColor), DEFAULT_COMPOSITION_SCENE.textColor);
  const sceneAccentColor = normalizeColor(
    getString(scene.accentColor),
    DEFAULT_COMPOSITION_SCENE.accentColor,
  );

  if (!blocks?.length) {
    throw new Error(`Scene ${index + 1} must contain at least one block.`);
  }

  return blocks.map((block, blockIndex) => {
    const timing = normalizeLayerTiming(block, sceneDuration);

    switch (block.kind) {
      case 'heading':
        return {
          kind: 'heading',
          text: normalizeRequiredText(
            getString(block.text),
            `Scene ${index + 1}, block ${blockIndex + 1} must contain heading text.`,
          ),
          size:
            block.size === 'sm' || block.size === 'md' || block.size === 'lg' || block.size === 'xl'
              ? block.size
              : 'lg',
          align: normalizeBlockAlign(block, sceneAlign),
          color: buildTextBlockColor(block, scene, sceneTextColor),
          accentColor: buildAccentColor(block, scene, sceneAccentColor),
          ...timing,
        };
      case 'body':
        return {
          kind: 'body',
          text: normalizeRequiredText(
            getString(block.text),
            `Scene ${index + 1}, block ${blockIndex + 1} must contain body text.`,
          ),
          align: normalizeBlockAlign(block, sceneAlign),
          color: buildTextBlockColor(block, scene, sceneTextColor),
          accentColor: buildAccentColor(block, scene, sceneAccentColor),
          ...timing,
        };
      case 'list': {
        const items = getStringArray(block.items)
          .map((item) => item.trim())
          .filter(Boolean)
          .slice(0, 5);

        if (items.length < 2) {
          throw new Error(
            `Scene ${index + 1}, block ${blockIndex + 1} must contain at least 2 list items.`,
          );
        }

        return {
          kind: 'list',
          title: getString(block.title)?.trim() || undefined,
          items,
          align: normalizeBlockAlign(block, sceneAlign),
          color: buildTextBlockColor(block, scene, sceneTextColor),
          accentColor: buildAccentColor(block, scene, sceneAccentColor),
          ...timing,
        };
      }
      case 'stat': {
        const extractedStat = extractStatValueAndLabel(
          getString(block.value),
          getString(block.text),
          getString(block.label),
        );

        return {
          kind: 'stat',
          value: normalizeRequiredText(
            extractedStat.value,
            `Scene ${index + 1}, block ${blockIndex + 1} must contain stat value.`,
          ),
          label: normalizeRequiredText(
            extractedStat.label,
            `Scene ${index + 1}, block ${blockIndex + 1} must contain stat label.`,
          ),
          align: normalizeBlockAlign(block, sceneAlign),
          color: buildTextBlockColor(block, scene, sceneTextColor),
          accentColor: buildAccentColor(block, scene, sceneAccentColor),
          ...timing,
        };
      }
      case 'quote':
        return {
          kind: 'quote',
          text: normalizeRequiredText(
            getString(block.text) ?? getString(block.quote),
            `Scene ${index + 1}, block ${blockIndex + 1} must contain quote text.`,
          ),
          author: getString(block.author)?.trim() || undefined,
          align: normalizeBlockAlign(block, sceneAlign),
          color: buildTextBlockColor(block, scene, sceneTextColor),
          accentColor: buildAccentColor(block, scene, sceneAccentColor),
          ...timing,
        };
      case 'cta': {
        const fallback = splitCtaText(getString(block.text));
        const normalized: CtaBlock = {
          kind: 'cta',
          title: normalizeRequiredText(
            getString(block.title) ?? fallback.title,
            `Scene ${index + 1}, block ${blockIndex + 1} must contain cta title.`,
          ),
          action: normalizeRequiredText(
            getString(block.action) ?? fallback.action,
            `Scene ${index + 1}, block ${blockIndex + 1} must contain cta action.`,
          ),
          align: normalizeBlockAlign(block, sceneAlign),
          color: buildTextBlockColor(block, scene, sceneTextColor),
          accentColor: buildAccentColor(block, scene, sceneAccentColor),
          ...timing,
        };

        return normalized;
      }
      case 'badge':
        return {
          kind: 'badge',
          text: normalizeRequiredText(
            getString(block.text),
            `Scene ${index + 1}, block ${blockIndex + 1} must contain badge text.`,
          ),
          align: normalizeBlockAlign(block, sceneAlign),
          color: buildTextBlockColor(block, scene, sceneTextColor),
          accentColor: buildAccentColor(block, scene, sceneAccentColor),
          ...timing,
        };
      case 'divider':
        return {
          kind: 'divider',
          align: normalizeBlockAlign(block, sceneAlign),
          color: buildTextBlockColor(block, scene, sceneTextColor),
          accentColor: buildAccentColor(block, scene, sceneAccentColor),
          ...timing,
        };
      case 'image':
        return {
          kind: 'image',
          assetId: normalizeRequiredText(
            getString(block.assetId),
            `Scene ${index + 1}, block ${blockIndex + 1} must contain image assetId.`,
          ),
          caption: getString(block.caption)?.trim() || undefined,
          display:
            block.display === 'card' || block.display === 'stack' || block.display === 'strip'
              ? block.display
              : 'card',
          focalPoint:
            block.focalPoint === 'center' ||
            block.focalPoint === 'top' ||
            block.focalPoint === 'bottom'
              ? block.focalPoint
              : 'center',
          align: normalizeBlockAlign(block, sceneAlign),
          color: buildTextBlockColor(block, scene, sceneTextColor),
          accentColor: buildAccentColor(block, scene, sceneAccentColor),
          ...timing,
        };
      case 'subtitle':
        return {
          kind: 'subtitle',
          text: normalizeRequiredText(
            getString(block.text),
            `Scene ${index + 1}, block ${blockIndex + 1} must contain subtitle text.`,
          ),
          align: normalizeBlockAlign(block, sceneAlign),
          color: buildTextBlockColor(block, scene, sceneTextColor),
          accentColor: buildAccentColor(block, scene, sceneAccentColor),
          ...timing,
        };
      default:
        throw new Error(
          `Scene ${index + 1}, block ${blockIndex + 1} has unsupported kind "${block.kind ?? 'unknown'}".`,
        );
    }
  });
};

const legacySceneToBlocks = (scene: RawScene): RawBlock[] => {
  switch (scene.type) {
    case 'title':
      return [{ kind: 'heading', text: getString(scene.text), size: 'xl' }];
    case 'bullet-list':
      return [
        { kind: 'heading', text: getString(scene.title), size: 'md' },
        { kind: 'list', items: getStringArray(scene.items) },
      ];
    case 'quote':
      return [{ kind: 'quote', text: getString(scene.quote), author: getString(scene.author) }];
    case 'cta':
      return [
        {
          kind: 'cta',
          title: getString(scene.title) ?? getString(scene.text),
          action: getString(scene.action) ?? getString(scene.text),
        },
      ];
    case 'stat':
      return [
        {
          kind: 'stat',
          value: getString(scene.value),
          label: getString(scene.label),
          text: getString(scene.text),
        },
      ];
    default:
      // prefer layers (new), fall back to blocks (legacy)
      return scene.layers ?? scene.blocks ?? [];
  }
};

const normalizeCompositionScene = (
  scene: RawScene,
  index: number,
  assets: VideoAsset[],
  videoFps: number,
): CompositionScene => {
  // Определяем duration: явное значение или авто из video trim
  let duration = getNumber(scene.duration) ?? 0;

  if (!duration && scene.media) {
    const mediaAsset = assets.find(
      (a): a is ImageVideoAsset => a.id === scene.media?.assetId && a.type === 'video',
    );
    if (mediaAsset) {
      const trimStart = getNumber(scene.media.trimStart) ?? 0;
      const trimEnd =
        getNumber(scene.media.trimEnd) ?? mediaAsset.durationSeconds ?? 0;
      const seconds = trimEnd - trimStart;
      if (seconds > 0) {
        duration = Math.round(seconds * (mediaAsset.fps ?? videoFps));
      }
    }
  }

  assertDuration(duration, index);

  // Нормализуем media с учётом ассетов для trim-валидации
  const media = normalizeSceneMedia(scene.media, assets);

  // Предпочитаем layers (новый формат), с fallback на blocks (старый)
  const rawLayers = scene.layers?.length ? scene.layers : legacySceneToBlocks(scene);

  return {
    type: 'composition',
    duration,
    backgroundColor: normalizeColor(
      getString(scene.backgroundColor) ?? getString(scene.color),
      DEFAULT_COMPOSITION_SCENE.backgroundColor,
    ),
    textColor: normalizeColor(getString(scene.textColor), DEFAULT_COMPOSITION_SCENE.textColor),
    accentColor: normalizeColor(getString(scene.accentColor), DEFAULT_COMPOSITION_SCENE.accentColor),
    align: normalizeAlign(scene.align, DEFAULT_COMPOSITION_SCENE.align),
    media,
    layers: normalizeLayers(rawLayers, scene, index, duration),
  };
};

const normalizeScene = (
  scene: RawScene,
  index: number,
  assets: VideoAsset[],
  videoFps: number,
): VideoScene => {
  return normalizeCompositionScene(scene, index, assets, videoFps);
};

const assertSceneAssetsExist = (assets: VideoAsset[], scenes: VideoScene[]): void => {
  const assetIds = new Set(assets.map((asset) => asset.id));

  scenes.forEach((scene, index) => {
    if (scene.media && !assetIds.has(scene.media.assetId)) {
      throw new Error(`Scene ${index + 1} references unknown assetId "${scene.media.assetId}".`);
    }

    scene.layers.forEach((layer, layerIndex) => {
      if (layer.kind === 'image' && !assetIds.has(layer.assetId)) {
        throw new Error(
          `Scene ${index + 1}, layer ${layerIndex + 1} references unknown assetId "${layer.assetId}".`,
        );
      }
    });
  });
};

export const normalizeVideoSpec = (input: unknown): VideoSpec => {
  const parsed = rawVideoSpecSchema.parse(input);
  const assets = normalizeAssets(parsed.assets);
  const videoFps = parsed.videoConfig?.fps ?? DEFAULT_VIDEO_CONFIG.fps;
  const scenes = parsed.scenes.map((scene, index) =>
    normalizeScene(scene, index, assets, videoFps),
  );

  assertSceneAssetsExist(assets, scenes);

  const narration = normalizeNarration(parsed.narration);
  const backgroundMusic = normalizeBackgroundMusic(parsed.backgroundMusic, assets);

  const normalized: VideoSpec = {
    schemaVersion: 4,
    videoConfig: normalizeVideoConfig(parsed.videoConfig),
    assets,
    scenes,
    ...(narration ? { narration } : {}),
    ...(backgroundMusic ? { backgroundMusic } : {}),
  };

  return videoSpecSchema.parse(normalized);
};

export default {
  normalizeVideoSpec,
};
