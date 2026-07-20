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
  /** 選填，度；預設 [0,0,0]（現行行為不變）。水平軸圓柱用（輪胎/輪轂/馬達罐/軸）。 */
  rotation: vec3Schema.optional(),
  /** 選填 #RRGGBB；設定後此 block 獨立成色段渲染（不併入主體 union） */
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  label: z.string().optional(),
});
export type PartBlock = z.infer<typeof partBlockSchema>;

export const mountingHoleSchema = z.object({
  x: z.number(),
  y: z.number(),
  diameter: z.number().positive(),
  /** 孔平面絕對高度；預設 0 = 主體底面 */
  z: z.number().optional(),
  /** 預設 true；false＝孔照鑽穿零件幾何，但 planStandoffs 不為它長支柱（底盤電子件鎖附孔用） */
  standoff: z.boolean().optional(),
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
    /** 垂直邊圓角半徑；缺省/0＝直角長方體（kernel.roundedBox，<=0 時等同 box） */
    cornerRadius: z.number().nonnegative().optional(),
    blocks: z.array(partBlockSchema).default([]),
  }),
  mountingHoles: z.array(mountingHoleSchema).default([]),
  ports: z.array(partPortSchema).default([]),
  /** 最高點（含元件），供外殼淨空與支柱計算（規格 §7） */
  clearanceHeight: z.number().positive(),
});
export type PartDefinition = z.infer<typeof partDefinitionSchema>;
