import { z } from 'zod';

export const partCategorySchema = z.enum(['board', 'sensor', 'power', 'component']);
export type PartCategory = z.infer<typeof partCategorySchema>;

const vec3Schema = z.tuple([z.number(), z.number(), z.number()]);

export const partBlockSchema = z.object({
  shape: z.enum(['box', 'cylinder']),
  /** box: 中心 xy + 底面 z；cylinder: 底面中心。z 自主體頂面起算（可為負） */
  position: vec3Schema,
  /** box: [寬x, 深y, 高z]；cylinder: [直徑, 直徑, 高] */
  size: vec3Schema,
  label: z.string().optional(),
});
export type PartBlock = z.infer<typeof partBlockSchema>;

export const mountingHoleSchema = z.object({
  x: z.number(),
  y: z.number(),
  diameter: z.number().positive(),
  /** 孔平面絕對高度；預設 0 = 主體底面 */
  z: z.number().optional(),
});
export type MountingHole = z.infer<typeof mountingHoleSchema>;

export const partPortSchema = z.object({
  face: z.enum(['north', 'south', 'east', 'west', 'top']),
  shape: z.enum(['rect', 'circle']),
  /** 沿該面的水平偏移（top 面時為板面 x 偏移） */
  x: z.number(),
  /** 接口底邊距主體頂面的高度（top 面時為板面 y 偏移） */
  z: z.number(),
  w: z.number().positive(),
  h: z.number().positive(),
  label: z.string().optional(),
});
export type PartPort = z.infer<typeof partPortSchema>;

export const partDefinitionSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  nameZh: z.string().min(1),
  category: partCategorySchema,
  body: z.object({
    /** 主體尺寸 [長x, 寬y, 厚z]，原點在底面中心 */
    size: vec3Schema,
    blocks: z.array(partBlockSchema).default([]),
  }),
  mountingHoles: z.array(mountingHoleSchema).default([]),
  ports: z.array(partPortSchema).default([]),
  /** 最高點（含元件），供外殼淨空與支柱計算（規格 §7） */
  clearanceHeight: z.number().positive(),
});
export type PartDefinition = z.infer<typeof partDefinitionSchema>;
