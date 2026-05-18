import {
  DEFAULT_COMPOSITION_SCENE,
  DEFAULT_SCENE_MEDIA,
  DEFAULT_VIDEO_CONFIG,
  HEX_COLOR_PATTERN,
  rawVideoSpecSchema,
  videoSpecSchema,
  type CompositionScene,
  type CtaBlock,
  type RawBlock,
  type RawScene,
  type RawVideoSpec,
  type SceneBlock,
  type SceneMedia,
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
      width: Math.max(1, Math.min(12000, asset.width ?? 1080)),
      height: Math.max(1, Math.min(12000, asset.height ?? 1080)),
    };
  });
};

const normalizeSceneMedia = (media: RawScene['media']): SceneMedia | undefined => {
  if (!media) {
    return undefined;
  }

  return {
    assetId: normalizeRequiredText(media.assetId, 'Scene media must reference a non-empty assetId.'),
    mode: media.mode ?? DEFAULT_SCENE_MEDIA.mode,
    position: media.mode === 'side' ? media.position ?? DEFAULT_SCENE_MEDIA.position : media.position,
    overlayColor: normalizeColor(media.overlayColor, DEFAULT_SCENE_MEDIA.overlayColor),
    overlayOpacity: normalizeOpacity(media.overlayOpacity, DEFAULT_SCENE_MEDIA.overlayOpacity),
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

const normalizeBlocks = (blocks: RawBlock[] | undefined, scene: RawScene, index: number): SceneBlock[] => {
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
        };
      case 'divider':
        return {
          kind: 'divider',
          align: normalizeBlockAlign(block, sceneAlign),
          color: buildTextBlockColor(block, scene, sceneTextColor),
          accentColor: buildAccentColor(block, scene, sceneAccentColor),
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
    case 'composition':
      return scene.blocks ?? [];
    default:
      return scene.blocks ?? [];
  }
};

const normalizeCompositionScene = (scene: RawScene, index: number): CompositionScene => {
  const duration = getNumber(scene.duration) ?? 0;
  assertDuration(duration, index);

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
    media: normalizeSceneMedia(scene.media),
    blocks: normalizeBlocks(scene.blocks ?? legacySceneToBlocks(scene), scene, index),
  };
};

const normalizeScene = (scene: RawScene, index: number): VideoScene => {
  return normalizeCompositionScene(scene, index);
};

const assertSceneAssetsExist = (assets: VideoAsset[], scenes: VideoScene[]): void => {
  const assetIds = new Set(assets.map((asset) => asset.id));

  scenes.forEach((scene, index) => {
    if (scene.media && !assetIds.has(scene.media.assetId)) {
      throw new Error(`Scene ${index + 1} references unknown assetId "${scene.media.assetId}".`);
    }

    scene.blocks.forEach((block, blockIndex) => {
      if (block.kind === 'image' && !assetIds.has(block.assetId)) {
        throw new Error(
          `Scene ${index + 1}, block ${blockIndex + 1} references unknown assetId "${block.assetId}".`,
        );
      }
    });
  });
};

export const normalizeVideoSpec = (input: unknown): VideoSpec => {
  const parsed = rawVideoSpecSchema.parse(input);
  const assets = normalizeAssets(parsed.assets);
  const scenes = parsed.scenes.map((scene, index) => normalizeScene(scene, index));

  assertSceneAssetsExist(assets, scenes);

  const normalized: VideoSpec = {
    schemaVersion: 3,
    videoConfig: normalizeVideoConfig(parsed.videoConfig),
    assets,
    scenes,
  };

  return videoSpecSchema.parse(normalized);
};

export default {
  normalizeVideoSpec,
};
