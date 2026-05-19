import { z } from 'zod';

export const DEFAULT_VIDEO_CONFIG = {
  width: 1080,
  height: 1920,
  fps: 30,
} as const;

export const DEFAULT_COMPOSITION_SCENE = {
  type: 'composition',
  backgroundColor: '#101820',
  textColor: '#FFFFFF',
  accentColor: '#FF6B35',
  align: 'center',
} as const;

export const DEFAULT_SCENE_MEDIA = {
  mode: 'background',
  position: 'right',
  overlayColor: '#000000',
  overlayOpacity: 0,
} as const;

export const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const sceneMediaModeSchema = z.enum(['background', 'frame', 'side']);
const sceneMediaPositionSchema = z.enum(['left', 'right']);
const sceneAlignSchema = z.enum(['left', 'center', 'right']);
const focalPointSchema = z.enum(['center', 'top', 'bottom']);
const enterTransitionSchema = z.enum(['fade', 'slideUp', 'slideLeft', 'scale', 'none']);
const exitTransitionSchema = z.enum(['fade', 'slideDown', 'scale', 'none']);
const sceneTransitionSchema = z.enum(['slideUp', 'scale', 'slideLeft', 'none']);
const subtitleFontSizeSchema = z.enum(['sm', 'md', 'lg']);
const subtitlePositionSchema = z.enum(['top', 'middle', 'bottom']);

const rawVideoConfigSchema = z
  .object({
    width: z.coerce.number().int().positive().optional(),
    height: z.coerce.number().int().positive().optional(),
    fps: z.coerce.number().int().positive().optional(),
  })
  .optional();

const rawAssetSchema = z.object({
  id: z.string().trim().min(1),
  type: z.enum(['image', 'video', 'audio']).optional(),
  src: z.string().trim().min(1),
  alt: z.string().trim().optional(),
  width: z.coerce.number().int().positive().optional(),
  height: z.coerce.number().int().positive().optional(),
  durationSeconds: z.coerce.number().positive().optional(),
  fps: z.coerce.number().positive().optional(),
  hasAudio: z.boolean().optional(),
  transcript: z.array(z.object({
    text: z.string(),
    startTime: z.number(),
    endTime: z.number(),
  })).optional(),
});

const rawSceneMediaSchema = z.object({
  assetId: z.string().trim().min(1),
  mode: sceneMediaModeSchema.optional(),
  position: sceneMediaPositionSchema.optional(),
  overlayColor: z.string().trim().optional(),
  overlayOpacity: z.coerce.number().optional(),
  focalPoint: focalPointSchema.optional(),
  trimStart: z.coerce.number().min(0).optional(),
  trimEnd: z.coerce.number().min(0).optional(),
});

const rawBlockSchema = z
  .object({
    kind: z.string().trim().optional(),
    align: sceneAlignSchema.optional(),
  })
  .passthrough();

const rawSceneSchema = z
  .object({
    type: z.string().trim().optional(),
    media: rawSceneMediaSchema.optional(),
    // layers — новое имя поля; blocks — обратная совместимость
    layers: z.array(rawBlockSchema).optional(),
    blocks: z.array(rawBlockSchema).optional(),
  })
  .passthrough();

export const rawVideoSpecSchema = z.object({
  schemaVersion: z.coerce.number().int().positive().optional(),
  videoConfig: rawVideoConfigSchema,
  assets: z.array(rawAssetSchema).optional(),
  scenes: z.array(rawSceneSchema).min(1),
  narration: z.object({}).passthrough().optional(),
  backgroundMusic: z.object({}).passthrough().optional(),
});

export const videoConfigSchema = z.object({
  width: z.number().int().min(320).max(4096),
  height: z.number().int().min(320).max(4096),
  fps: z.number().int().min(1).max(120),
});

const transcriptSegmentSchema = z.object({
  text: z.string(),
  startTime: z.number().min(0),
  endTime: z.number().min(0),
});

export const imageVideoAssetSchema = z.object({
  id: z.string().trim().min(1).max(80),
  type: z.enum(['image', 'video']),
  src: z.string().trim().min(1).max(2048),
  alt: z.string().trim().min(1).max(240),
  width: z.number().int().min(1).max(12000),
  height: z.number().int().min(1).max(12000),
  durationSeconds: z.number().positive().optional(),
  fps: z.number().positive().optional(),
  hasAudio: z.boolean().optional(),
  transcript: z.array(transcriptSegmentSchema).optional(),
});

export const audioAssetSchema = z.object({
  id: z.string().trim().min(1).max(80),
  type: z.literal('audio'),
  src: z.string().trim().min(1).max(2048),
  durationSeconds: z.number().positive().optional(),
});

export const assetSchema = z.discriminatedUnion('type', [
  imageVideoAssetSchema.extend({ type: z.literal('image') }),
  imageVideoAssetSchema.extend({ type: z.literal('video') }),
  audioAssetSchema,
]);

export const sceneMediaSchema = z.object({
  assetId: z.string().trim().min(1).max(80),
  mode: sceneMediaModeSchema,
  position: sceneMediaPositionSchema.optional(),
  overlayColor: z.string().regex(HEX_COLOR_PATTERN),
  overlayOpacity: z.number().min(0).max(0.95),
  focalPoint: focalPointSchema.optional(),
  trimStart: z.number().min(0).optional(),
  trimEnd: z.number().min(0).optional(),
});

// Базовые поля блока (цвет, выравнивание) — без тайминга
const blockBaseShape = {
  align: sceneAlignSchema.optional(),
  color: z.string().regex(HEX_COLOR_PATTERN).optional(),
  accentColor: z.string().regex(HEX_COLOR_PATTERN).optional(),
};

// Расширение blockBaseShape — добавляет per-layer тайминг и переходы
const layerBaseShape = {
  ...blockBaseShape,
  enterAt: z.number().int().min(0).optional(),
  exitAt: z.number().int().min(0).optional(),
  opacity: z.number().min(0).max(1).optional(),
  enterTransition: enterTransitionSchema.optional(),
  exitTransition: exitTransitionSchema.optional(),
};

export const headingBlockSchema = z.object({
  kind: z.literal('heading'),
  text: z.string().trim().min(1).max(220),
  size: z.enum(['sm', 'md', 'lg', 'xl']).optional(),
  ...layerBaseShape,
});

export const bodyBlockSchema = z.object({
  kind: z.literal('body'),
  text: z.string().trim().min(1).max(280),
  ...layerBaseShape,
});

export const listBlockSchema = z.object({
  kind: z.literal('list'),
  title: z.string().trim().min(1).max(120).optional(),
  items: z.array(z.string().trim().min(1).max(120)).min(2).max(5),
  ...layerBaseShape,
});

export const statBlockSchema = z.object({
  kind: z.literal('stat'),
  value: z.string().trim().min(1).max(24),
  label: z.string().trim().min(1).max(140),
  ...layerBaseShape,
});

export const quoteBlockSchema = z.object({
  kind: z.literal('quote'),
  text: z.string().trim().min(1).max(220),
  author: z.string().trim().min(1).max(80).optional(),
  ...layerBaseShape,
});

export const ctaBlockSchema = z.object({
  kind: z.literal('cta'),
  title: z.string().trim().min(1).max(120),
  action: z.string().trim().min(1).max(140),
  ...layerBaseShape,
});

export const badgeBlockSchema = z.object({
  kind: z.literal('badge'),
  text: z.string().trim().min(1).max(60),
  ...layerBaseShape,
});

export const dividerBlockSchema = z.object({
  kind: z.literal('divider'),
  ...layerBaseShape,
});

export const imageBlockSchema = z.object({
  kind: z.literal('image'),
  assetId: z.string().trim().min(1).max(80),
  caption: z.string().trim().min(1).max(120).optional(),
  display: z.enum(['card', 'stack', 'strip']).optional(),
  focalPoint: focalPointSchema.optional(),
  ...layerBaseShape,
});

export const subtitleLayerSchema = z.object({
  kind: z.literal('subtitle'),
  text: z.string().trim().min(1).max(300),
  fontSize: subtitleFontSizeSchema.optional(),
  background: z.string().regex(HEX_COLOR_PATTERN).optional(),
  backgroundOpacity: z.number().min(0).max(1).optional(),
  outline: z.string().regex(HEX_COLOR_PATTERN).optional(),
  position: subtitlePositionSchema.optional(),
  ...layerBaseShape,
});

export const sceneLayerSchema = z.discriminatedUnion('kind', [
  headingBlockSchema,
  bodyBlockSchema,
  listBlockSchema,
  statBlockSchema,
  quoteBlockSchema,
  ctaBlockSchema,
  badgeBlockSchema,
  dividerBlockSchema,
  imageBlockSchema,
  subtitleLayerSchema,
]);

// Обратная совместимость: sceneBlockSchema = sceneLayerSchema
export const sceneBlockSchema = sceneLayerSchema;

export const compositionSceneSchema = z.object({
  type: z.literal('composition'),
  transition: sceneTransitionSchema.optional(),
  duration: z.number().int().min(1).max(3600),
  backgroundColor: z.string().regex(HEX_COLOR_PATTERN),
  textColor: z.string().regex(HEX_COLOR_PATTERN),
  accentColor: z.string().regex(HEX_COLOR_PATTERN),
  align: sceneAlignSchema,
  media: sceneMediaSchema.optional(),
  layers: z.array(sceneLayerSchema).max(16),
});

export const videoSceneSchema = z.discriminatedUnion('type', [compositionSceneSchema]);

export const narrationSchema = z.object({
  text: z.string().trim().min(1),
  assetId: z.string().trim().optional(),
  voice: z.string().trim().optional(),
});

export const volumeKeyframeSchema = z.object({
  frame: z.number().int().min(0),
  volume: z.number().min(0).max(1),
});

export const backgroundMusicSchema = z.object({
  assetId: z.string().trim().min(1).max(80),
  volume: z.number().min(0).max(1).default(0.15),
  volumeKeyframes: z.array(volumeKeyframeSchema).optional(),
  startFrom: z.number().min(0).optional(),
});

export const videoSpecSchema = z.object({
  schemaVersion: z.union([z.literal(3), z.literal(4)]),
  videoConfig: videoConfigSchema,
  assets: z.array(assetSchema),
  scenes: z.array(videoSceneSchema).min(1),
  narration: narrationSchema.optional(),
  backgroundMusic: backgroundMusicSchema.optional(),
});

export type RawVideoSpec = z.infer<typeof rawVideoSpecSchema>;
export type RawScene = z.infer<typeof rawSceneSchema>;
export type RawBlock = z.infer<typeof rawBlockSchema>;
export type VideoConfig = z.infer<typeof videoConfigSchema>;
export type VideoAsset = z.infer<typeof assetSchema>;
export type ImageVideoAsset = z.infer<typeof imageVideoAssetSchema>;
export type AudioAsset = z.infer<typeof audioAssetSchema>;
export type TranscriptSegment = z.infer<typeof transcriptSegmentSchema>;
export type Narration = z.infer<typeof narrationSchema>;
export type VolumeKeyframe = z.infer<typeof volumeKeyframeSchema>;
export type BackgroundMusic = z.infer<typeof backgroundMusicSchema>;
export type SceneMedia = z.infer<typeof sceneMediaSchema>;
export type HeadingBlock = z.infer<typeof headingBlockSchema>;
export type BodyBlock = z.infer<typeof bodyBlockSchema>;
export type ListBlock = z.infer<typeof listBlockSchema>;
export type StatBlock = z.infer<typeof statBlockSchema>;
export type QuoteBlock = z.infer<typeof quoteBlockSchema>;
export type CtaBlock = z.infer<typeof ctaBlockSchema>;
export type BadgeBlock = z.infer<typeof badgeBlockSchema>;
export type DividerBlock = z.infer<typeof dividerBlockSchema>;
export type ImageBlock = z.infer<typeof imageBlockSchema>;
export type SubtitleLayer = z.infer<typeof subtitleLayerSchema>;
export type SceneLayer = z.infer<typeof sceneLayerSchema>;
export type SceneBlock = SceneLayer;
export type CompositionScene = z.infer<typeof compositionSceneSchema>;
export type VideoScene = z.infer<typeof videoSceneSchema>;
export type VideoSpec = z.infer<typeof videoSpecSchema>;

export default {
  DEFAULT_VIDEO_CONFIG,
  DEFAULT_COMPOSITION_SCENE,
  DEFAULT_SCENE_MEDIA,
  HEX_COLOR_PATTERN,
  rawVideoSpecSchema,
  rawSceneSchema,
  rawBlockSchema,
  videoConfigSchema,
  imageVideoAssetSchema,
  audioAssetSchema,
  assetSchema,
  narrationSchema,
  volumeKeyframeSchema,
  backgroundMusicSchema,
  sceneMediaSchema,
  headingBlockSchema,
  bodyBlockSchema,
  listBlockSchema,
  statBlockSchema,
  quoteBlockSchema,
  ctaBlockSchema,
  badgeBlockSchema,
  dividerBlockSchema,
  imageBlockSchema,
  subtitleLayerSchema,
  sceneLayerSchema,
  sceneBlockSchema,
  compositionSceneSchema,
  videoSceneSchema,
  videoSpecSchema,
};
