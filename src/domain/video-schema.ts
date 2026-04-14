import { z } from 'zod';

export const DEFAULT_VIDEO_CONFIG = {
  width: 1080,
  height: 1920,
  fps: 30,
} as const;

export const DEFAULT_TITLE_SCENE = {
  type: 'title',
  backgroundColor: '#1F1F1F',
  textColor: '#FFFFFF',
  align: 'center',
} as const;

export const DEFAULT_BULLET_LIST_SCENE = {
  type: 'bullet-list',
  backgroundColor: '#101820',
  textColor: '#FFFFFF',
  accentColor: '#FFCC00',
  align: 'left',
} as const;

export const DEFAULT_QUOTE_SCENE = {
  type: 'quote',
  backgroundColor: '#111827',
  textColor: '#FFFFFF',
  accentColor: '#F97316',
  align: 'center',
} as const;

export const DEFAULT_CTA_SCENE = {
  type: 'cta',
  backgroundColor: '#0F172A',
  textColor: '#FFFFFF',
  accentColor: '#FB7185',
  align: 'center',
} as const;

export const DEFAULT_STAT_SCENE = {
  type: 'stat',
  backgroundColor: '#111827',
  textColor: '#FFFFFF',
  accentColor: '#22C55E',
  align: 'center',
} as const;

export const DEFAULT_SCENE_MEDIA = {
  mode: 'background',
  position: 'right',
  overlayColor: '#000000',
  overlayOpacity: 0.38,
} as const;

export const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const sceneMediaModeSchema = z.enum(['background', 'frame', 'side']);
const sceneMediaPositionSchema = z.enum(['left', 'right']);

const rawVideoConfigSchema = z
  .object({
    width: z.coerce.number().int().positive().optional(),
    height: z.coerce.number().int().positive().optional(),
    fps: z.coerce.number().int().positive().optional(),
  })
  .optional();

const rawAssetSchema = z.object({
  id: z.string().trim().min(1),
  type: z.literal('image').optional(),
  src: z.string().trim().min(1),
  alt: z.string().trim().optional(),
});

const rawSceneMediaSchema = z.object({
  assetId: z.string().trim().min(1),
  mode: sceneMediaModeSchema.optional(),
  position: sceneMediaPositionSchema.optional(),
  overlayColor: z.string().trim().optional(),
  overlayOpacity: z.coerce.number().optional(),
});

const rawSceneSchema = z
  .object({
    type: z.string().trim().optional(),
    media: rawSceneMediaSchema.optional(),
  })
  .passthrough();

export const rawVideoSpecSchema = z.object({
  schemaVersion: z.coerce.number().int().positive().optional(),
  videoConfig: rawVideoConfigSchema,
  assets: z.array(rawAssetSchema).optional(),
  scenes: z.array(rawSceneSchema).min(1),
});

export const videoConfigSchema = z.object({
  width: z.number().int().min(320).max(4096),
  height: z.number().int().min(320).max(4096),
  fps: z.number().int().min(1).max(120),
});

export const assetSchema = z.object({
  id: z.string().trim().min(1).max(80),
  type: z.literal('image'),
  src: z.string().trim().min(1).max(2048),
  alt: z.string().trim().min(1).max(240),
});

export const sceneMediaSchema = z.object({
  assetId: z.string().trim().min(1).max(80),
  mode: sceneMediaModeSchema,
  position: sceneMediaPositionSchema.optional(),
  overlayColor: z.string().regex(HEX_COLOR_PATTERN),
  overlayOpacity: z.number().min(0).max(0.95),
});

const sceneMediaField = {
  media: sceneMediaSchema.optional(),
};

export const titleSceneSchema = z.object({
  type: z.literal('title'),
  text: z.string().trim().min(1).max(220),
  duration: z.number().int().min(1).max(3600),
  backgroundColor: z.string().regex(HEX_COLOR_PATTERN),
  textColor: z.string().regex(HEX_COLOR_PATTERN),
  align: z.enum(['left', 'center', 'right']),
  ...sceneMediaField,
});

export const bulletListSceneSchema = z.object({
  type: z.literal('bullet-list'),
  title: z.string().trim().min(1).max(120),
  items: z.array(z.string().trim().min(1).max(120)).min(2).max(5),
  duration: z.number().int().min(1).max(3600),
  backgroundColor: z.string().regex(HEX_COLOR_PATTERN),
  textColor: z.string().regex(HEX_COLOR_PATTERN),
  accentColor: z.string().regex(HEX_COLOR_PATTERN),
  align: z.enum(['left', 'center']),
  ...sceneMediaField,
});

export const quoteSceneSchema = z.object({
  type: z.literal('quote'),
  quote: z.string().trim().min(1).max(220),
  author: z.string().trim().min(1).max(80),
  duration: z.number().int().min(1).max(3600),
  backgroundColor: z.string().regex(HEX_COLOR_PATTERN),
  textColor: z.string().regex(HEX_COLOR_PATTERN),
  accentColor: z.string().regex(HEX_COLOR_PATTERN),
  align: z.enum(['left', 'center', 'right']),
  ...sceneMediaField,
});

export const ctaSceneSchema = z.object({
  type: z.literal('cta'),
  title: z.string().trim().min(1).max(120),
  action: z.string().trim().min(1).max(140),
  duration: z.number().int().min(1).max(3600),
  backgroundColor: z.string().regex(HEX_COLOR_PATTERN),
  textColor: z.string().regex(HEX_COLOR_PATTERN),
  accentColor: z.string().regex(HEX_COLOR_PATTERN),
  align: z.enum(['left', 'center', 'right']),
  ...sceneMediaField,
});

export const statSceneSchema = z.object({
  type: z.literal('stat'),
  value: z.string().trim().min(1).max(24),
  label: z.string().trim().min(1).max(120),
  duration: z.number().int().min(1).max(3600),
  backgroundColor: z.string().regex(HEX_COLOR_PATTERN),
  textColor: z.string().regex(HEX_COLOR_PATTERN),
  accentColor: z.string().regex(HEX_COLOR_PATTERN),
  align: z.enum(['left', 'center', 'right']),
  ...sceneMediaField,
});

export const videoSceneSchema = z.discriminatedUnion('type', [
  titleSceneSchema,
  bulletListSceneSchema,
  quoteSceneSchema,
  ctaSceneSchema,
  statSceneSchema,
]);

export const videoSpecSchema = z.object({
  schemaVersion: z.literal(2),
  videoConfig: videoConfigSchema,
  assets: z.array(assetSchema),
  scenes: z.array(videoSceneSchema).min(1),
});

export type RawVideoSpec = z.infer<typeof rawVideoSpecSchema>;
export type RawScene = z.infer<typeof rawSceneSchema>;
export type VideoConfig = z.infer<typeof videoConfigSchema>;
export type VideoAsset = z.infer<typeof assetSchema>;
export type SceneMedia = z.infer<typeof sceneMediaSchema>;
export type TitleScene = z.infer<typeof titleSceneSchema>;
export type BulletListScene = z.infer<typeof bulletListSceneSchema>;
export type QuoteScene = z.infer<typeof quoteSceneSchema>;
export type CtaScene = z.infer<typeof ctaSceneSchema>;
export type StatScene = z.infer<typeof statSceneSchema>;
export type VideoScene = z.infer<typeof videoSceneSchema>;
export type VideoSpec = z.infer<typeof videoSpecSchema>;

export default {
  DEFAULT_VIDEO_CONFIG,
  DEFAULT_TITLE_SCENE,
  DEFAULT_BULLET_LIST_SCENE,
  DEFAULT_QUOTE_SCENE,
  DEFAULT_CTA_SCENE,
  DEFAULT_STAT_SCENE,
  DEFAULT_SCENE_MEDIA,
  HEX_COLOR_PATTERN,
  rawVideoSpecSchema,
  rawSceneSchema,
  videoConfigSchema,
  assetSchema,
  sceneMediaSchema,
  titleSceneSchema,
  bulletListSceneSchema,
  quoteSceneSchema,
  ctaSceneSchema,
  statSceneSchema,
  videoSceneSchema,
  videoSpecSchema,
};
