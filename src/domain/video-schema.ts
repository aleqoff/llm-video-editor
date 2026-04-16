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
  overlayOpacity: 0.38,
} as const;

export const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const sceneMediaModeSchema = z.enum(['background', 'frame', 'side']);
const sceneMediaPositionSchema = z.enum(['left', 'right']);
const sceneAlignSchema = z.enum(['left', 'center', 'right']);

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
    blocks: z.array(rawBlockSchema).optional(),
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

const blockBaseShape = {
  align: sceneAlignSchema.optional(),
  color: z.string().regex(HEX_COLOR_PATTERN).optional(),
  accentColor: z.string().regex(HEX_COLOR_PATTERN).optional(),
};

export const headingBlockSchema = z.object({
  kind: z.literal('heading'),
  text: z.string().trim().min(1).max(220),
  size: z.enum(['sm', 'md', 'lg', 'xl']).optional(),
  ...blockBaseShape,
});

export const bodyBlockSchema = z.object({
  kind: z.literal('body'),
  text: z.string().trim().min(1).max(280),
  ...blockBaseShape,
});

export const listBlockSchema = z.object({
  kind: z.literal('list'),
  title: z.string().trim().min(1).max(120).optional(),
  items: z.array(z.string().trim().min(1).max(120)).min(2).max(5),
  ...blockBaseShape,
});

export const statBlockSchema = z.object({
  kind: z.literal('stat'),
  value: z.string().trim().min(1).max(24),
  label: z.string().trim().min(1).max(140),
  ...blockBaseShape,
});

export const quoteBlockSchema = z.object({
  kind: z.literal('quote'),
  text: z.string().trim().min(1).max(220),
  author: z.string().trim().min(1).max(80).optional(),
  ...blockBaseShape,
});

export const ctaBlockSchema = z.object({
  kind: z.literal('cta'),
  title: z.string().trim().min(1).max(120),
  action: z.string().trim().min(1).max(140),
  ...blockBaseShape,
});

export const badgeBlockSchema = z.object({
  kind: z.literal('badge'),
  text: z.string().trim().min(1).max(60),
  ...blockBaseShape,
});

export const dividerBlockSchema = z.object({
  kind: z.literal('divider'),
  ...blockBaseShape,
});

export const sceneBlockSchema = z.discriminatedUnion('kind', [
  headingBlockSchema,
  bodyBlockSchema,
  listBlockSchema,
  statBlockSchema,
  quoteBlockSchema,
  ctaBlockSchema,
  badgeBlockSchema,
  dividerBlockSchema,
]);

export const compositionSceneSchema = z.object({
  type: z.literal('composition'),
  duration: z.number().int().min(1).max(3600),
  backgroundColor: z.string().regex(HEX_COLOR_PATTERN),
  textColor: z.string().regex(HEX_COLOR_PATTERN),
  accentColor: z.string().regex(HEX_COLOR_PATTERN),
  align: sceneAlignSchema,
  media: sceneMediaSchema.optional(),
  blocks: z.array(sceneBlockSchema).min(1).max(8),
});

export const videoSceneSchema = z.discriminatedUnion('type', [compositionSceneSchema]);

export const videoSpecSchema = z.object({
  schemaVersion: z.literal(3),
  videoConfig: videoConfigSchema,
  assets: z.array(assetSchema),
  scenes: z.array(videoSceneSchema).min(1),
});

export type RawVideoSpec = z.infer<typeof rawVideoSpecSchema>;
export type RawScene = z.infer<typeof rawSceneSchema>;
export type RawBlock = z.infer<typeof rawBlockSchema>;
export type VideoConfig = z.infer<typeof videoConfigSchema>;
export type VideoAsset = z.infer<typeof assetSchema>;
export type SceneMedia = z.infer<typeof sceneMediaSchema>;
export type HeadingBlock = z.infer<typeof headingBlockSchema>;
export type BodyBlock = z.infer<typeof bodyBlockSchema>;
export type ListBlock = z.infer<typeof listBlockSchema>;
export type StatBlock = z.infer<typeof statBlockSchema>;
export type QuoteBlock = z.infer<typeof quoteBlockSchema>;
export type CtaBlock = z.infer<typeof ctaBlockSchema>;
export type BadgeBlock = z.infer<typeof badgeBlockSchema>;
export type DividerBlock = z.infer<typeof dividerBlockSchema>;
export type SceneBlock = z.infer<typeof sceneBlockSchema>;
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
  assetSchema,
  sceneMediaSchema,
  headingBlockSchema,
  bodyBlockSchema,
  listBlockSchema,
  statBlockSchema,
  quoteBlockSchema,
  ctaBlockSchema,
  badgeBlockSchema,
  dividerBlockSchema,
  sceneBlockSchema,
  compositionSceneSchema,
  videoSceneSchema,
  videoSpecSchema,
};
