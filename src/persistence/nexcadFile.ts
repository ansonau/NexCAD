import { z } from 'zod';
import type { GroupNode, NexcadDocument, SceneNode } from '../types/document';

const vec3Schema = z.tuple([z.number(), z.number(), z.number()]);

const nodeCommonShape = {
  id: z.string(),
  name: z.string(),
  role: z.enum(['solid', 'hole']),
  transform: z.object({
    position: vec3Schema,
    rotation: vec3Schema,
    scale: vec3Schema,
  }),
  visible: z.boolean(),
  locked: z.boolean(),
};

const primitiveNodeSchema = z.object({
  ...nodeCommonShape,
  type: z.literal('primitive'),
  kind: z.enum(['box', 'cylinder', 'sphere', 'cone']),
  // zod v4 的 record 需要明確的 key schema
  params: z.record(z.string(), z.number()),
});

const partNodeSchema = z.object({
  ...nodeCommonShape,
  type: z.literal('part'),
  partId: z.string(),
});

const groupNodeSchema: z.ZodType<GroupNode> = z.lazy(() =>
  z.object({
    ...nodeCommonShape,
    type: z.literal('group'),
    children: z.array(sceneNodeSchema),
  }),
);

const enclosureNodeSchema = z.object({
  ...nodeCommonShape,
  type: z.literal('enclosure'),
  part: z.enum(['base', 'lid']),
  params: z
    .object({
      wallThickness: z.number(),
      clearanceMargin: z.number(),
      cornerRadius: z.number(),
      lidType: z.enum(['screw', 'slide', 'open']),
      screwSize: z.enum(['M2', 'M2.5', 'M3', 'M4']),
      standoffWallPadding: z.number().optional(),
      pilotDepthOverride: z.number().positive().optional(),
      reserveCornerSpace: z.boolean().optional(),
      mountingStyle: z.enum(['screw', 'peg', 'hole']).optional(),
      screwLidProfile: z.enum(['flatExposed', 'flatRecessed']).optional(),
      screwEntry: z.enum(['fromLid', 'fromBase']).optional(),
      lidDisplayCutout: z.boolean().optional(),
    })
    .transform((p) => ({ ...p, standoffWallPadding: p.standoffWallPadding ?? p.wallThickness })),
  sourceParts: z.array(
    z.object({
      nodeId: z.string(),
      partId: z.string(),
      transform: z.object({
        position: vec3Schema,
        rotation: vec3Schema,
        scale: vec3Schema,
      }),
    }),
  ),
});

const bracketNodeSchema = z.object({
  ...nodeCommonShape,
  type: z.literal('bracket'),
  params: z.object({
    style: z.enum(['base', 'l', 'u']).optional(),
    baseThickness: z.number(),
    baseDepth: z.number().optional(),
    baseExpand: z.number().optional(),
    baseMargin: z.number(),
    cornerRadius: z.number(),
    screwSize: z.enum(['M2', 'M2.5', 'M3', 'M4']),
    mountingStyle: z.enum(['screw', 'peg', 'hole']).optional(),
    baseHoles: z.boolean().optional(),
    baseHoleCount: z.union([z.literal(2), z.literal(4)]).optional(),
    baseHoleAxis: z.enum(['long', 'short']).optional(),
    baseHoleCountersink: z.boolean().optional(),
    baseHoleScrewSize: z.enum(['M2', 'M2.5', 'M3', 'M4']).optional(),
    baseHoleInset: z.number().optional(),
    baseHoleSpacing: z.number().optional(),
    wallHeight: z.number().optional(),
    wallThickness: z.number().optional(),
    wallClearance: z.number().optional(),
    wallDepth: z.number().optional(),
  }),
  sourceParts: z.array(
    z.object({
      nodeId: z.string(),
      partId: z.string(),
      transform: z.object({
        position: vec3Schema,
        rotation: vec3Schema,
        scale: vec3Schema,
      }),
    }),
  ),
});

const carAnchorNodeSchema = z.object({
  ...nodeCommonShape,
  type: z.literal('car-anchor'),
  config: z.object({
    shape: z.enum(['rounded-rect', 'rect', 'ellipse']),
    length: z.number(),
    width: z.number(),
    thickness: z.number(),
    drive: z.enum(['2wd', '4wd']),
    wheelSize: z.number(),
    includeCaster: z.boolean(),
  }),
  presetId: z.enum(['smart-car-2wd', 'smart-car-4wd']),
  electronicsIds: z.array(z.string()),
  generatedNodeIds: z.array(z.string()).optional(),
});

const sceneNodeSchema: z.ZodType<SceneNode> = z.lazy(() =>
  z.union([primitiveNodeSchema, partNodeSchema, groupNodeSchema, enclosureNodeSchema, bracketNodeSchema, carAnchorNodeSchema]),
);

const documentSchema = z.object({
  version: z.literal(1),
  name: z.string(),
  units: z.literal('mm'),
  nodes: z.array(sceneNodeSchema),
});

export function serializeNexcadFile(doc: NexcadDocument): string {
  return JSON.stringify(doc, null, 2);
}

/** 解析 .nexcad 專案檔；格式錯誤時拋出例外 */
export function parseNexcadFile(text: string): NexcadDocument {
  return documentSchema.parse(JSON.parse(text));
}
