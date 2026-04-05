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

export const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const rawVideoConfigSchema = z
  .object({
    width: z.coerce.number().int().positive().optional(),
    height: z.coerce.number().int().positive().optional(),
    fps: z.coerce.number().int().positive().optional(),
  })
  .optional();

const rawTitleSceneSchema = z.object({
  type: z.literal('title').optional(),
  text: z.string().trim().min(1),
  duration: z.coerce.number().int().positive(),
  backgroundColor: z.string().trim().optional(),
  color: z.string().trim().optional(),
  textColor: z.string().trim().optional(),
  align: z.enum(['left', 'center', 'right']).optional(),
});

const rawBulletListSceneSchema = z.object({
  type: z.literal('bullet-list'),
  title: z.string().trim().min(1),
  items: z.array(z.string().trim()).min(1),
  duration: z.coerce.number().int().positive(),
  backgroundColor: z.string().trim().optional(),
  color: z.string().trim().optional(),
  textColor: z.string().trim().optional(),
  accentColor: z.string().trim().optional(),
  align: z.enum(['left', 'center']).optional(),
});

export const rawVideoSpecSchema = z.object({
  schemaVersion: z.coerce.number().int().positive().optional(),
  videoConfig: rawVideoConfigSchema,
  scenes: z.array(z.union([rawTitleSceneSchema, rawBulletListSceneSchema])).min(1),
});

export const videoConfigSchema = z.object({
  width: z.number().int().min(320).max(4096),
  height: z.number().int().min(320).max(4096),
  fps: z.number().int().min(1).max(120),
});

export const titleSceneSchema = z.object({
  type: z.literal('title'),
  text: z.string().trim().min(1).max(220),
  duration: z.number().int().min(1).max(3600),
  backgroundColor: z.string().regex(HEX_COLOR_PATTERN),
  textColor: z.string().regex(HEX_COLOR_PATTERN),
  align: z.enum(['left', 'center', 'right']),
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
});

export const videoSceneSchema = z.discriminatedUnion('type', [
  titleSceneSchema,
  bulletListSceneSchema,
]);

export const videoSpecSchema = z.object({
  schemaVersion: z.literal(1),
  videoConfig: videoConfigSchema,
  scenes: z.array(videoSceneSchema).min(1),
});

export type RawVideoSpec = z.infer<typeof rawVideoSpecSchema>;
export type VideoConfig = z.infer<typeof videoConfigSchema>;
export type TitleScene = z.infer<typeof titleSceneSchema>;
export type BulletListScene = z.infer<typeof bulletListSceneSchema>;
export type VideoScene = z.infer<typeof videoSceneSchema>;
export type VideoSpec = z.infer<typeof videoSpecSchema>;

export default {
  DEFAULT_VIDEO_CONFIG,
  DEFAULT_TITLE_SCENE,
  DEFAULT_BULLET_LIST_SCENE,
  HEX_COLOR_PATTERN,
  rawVideoSpecSchema,
  videoConfigSchema,
  titleSceneSchema,
  bulletListSceneSchema,
  videoSceneSchema,
  videoSpecSchema,
};
