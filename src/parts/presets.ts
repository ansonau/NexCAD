import { createPartNode } from '../types/document';
import { getPartDefinition } from './library';
import type { PartNode } from '../types/document';

/** 智能小車 preset：經典 Arduino 2WD 佈局（車頭朝 +X，全部貼地 z=0） */
export const SMART_CAR_PRESET: { partId: string; x: number; y: number; rotZ: number }[] = [
  { partId: 'hc-sr04', x: 105, y: 0, rotZ: 0 }, // 車頭感測器
  { partId: 'arduino-uno', x: 40, y: 0, rotZ: 0 }, // 中前控制板
  { partId: 'l298n', x: -25, y: 0, rotZ: 0 }, // 中後驅動板
  { partId: 'battery-18650x2', x: -95, y: 0, rotZ: 0 }, // 車尾電池
  { partId: 'tt-motor', x: -15, y: 55, rotZ: 90 }, // 左馬達（橫置）
  { partId: 'tt-motor', x: -15, y: -55, rotZ: 90 }, // 右馬達（橫置）
];

export function buildSmartCarNodes(lang: string): PartNode[] {
  return SMART_CAR_PRESET.map(({ partId, x, y, rotZ }) => {
    const def = getPartDefinition(partId);
    if (!def) throw new Error(`smart-car-preset: unknown part id "${partId}"`);
    const name = lang === 'zh' ? def.nameZh : def.name;
    return createPartNode(partId, name, {
      transform: { position: [x, y, 0], rotation: [0, 0, rotZ], scale: [1, 1, 1] },
    });
  });
}
