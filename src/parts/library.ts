import { z } from 'zod';
import { partDefinitionSchema } from './schema';
import type { PartCategory, PartDefinition } from './schema';

export const PART_CATEGORIES: PartCategory[] = ['board', 'sensor', 'power', 'component'];

/**
 * 零件庫 v1。尺寸為近似值（常見公開規格），日後對照原廠 datasheet 修正。
 * 座標慣例見 schema.ts。零件英文名不翻譯（規格 §2）。
 */
const RAW_LIBRARY: z.input<typeof partDefinitionSchema>[] = [
  // ── 開發板 board ──────────────────────────────────────────────
  {
    id: 'arduino-uno',
    name: 'Arduino Uno R3',
    nameZh: 'Arduino Uno R3',
    category: 'board',
    body: {
      size: [68.6, 53.4, 1.6],
      blocks: [
        { shape: 'box', position: [-27, 15.5, 0], size: [16, 12, 11], label: 'USB-B' },
        { shape: 'box', position: [-27, -19, 0], size: [14, 9, 11], label: 'DC 電源' },
        { shape: 'box', position: [5, 24.5, 0], size: [50, 2.5, 8.5], label: '排針' },
        { shape: 'box', position: [2, -24.5, 0], size: [55, 2.5, 8.5], label: '排針' },
      ],
    },
    mountingHoles: [
      { x: -20.3, y: -24.2, diameter: 3.2 },
      { x: -19, y: 24, diameter: 3.2 },
      { x: 31.8, y: 8.8, diameter: 3.2 },
      { x: 31.8, y: -19.1, diameter: 3.2 },
    ],
    ports: [
      { face: 'west', shape: 'rect', x: 15.5, z: 0, w: 13, h: 12, label: 'USB' },
      { face: 'west', shape: 'rect', x: -19, z: 0, w: 10, h: 12, label: 'DC' },
    ],
    clearanceHeight: 15,
  },
  {
    id: 'arduino-nano',
    name: 'Arduino Nano',
    nameZh: 'Arduino Nano',
    category: 'board',
    body: {
      size: [43.2, 18, 1.6],
      blocks: [
        { shape: 'box', position: [-17.6, 0, 0], size: [8, 8, 4], label: 'Mini-USB' },
        { shape: 'box', position: [0, 7.6, 0], size: [38, 2.5, 8.5], label: '排針' },
        { shape: 'box', position: [0, -7.6, 0], size: [38, 2.5, 8.5], label: '排針' },
      ],
    },
    mountingHoles: [
      { x: -20.3, y: -7.6, diameter: 1.8 },
      { x: -20.3, y: 7.6, diameter: 1.8 },
      { x: 20.3, y: -7.6, diameter: 1.8 },
      { x: 20.3, y: 7.6, diameter: 1.8 },
    ],
    ports: [{ face: 'west', shape: 'rect', x: 0, z: 0, w: 9, h: 5, label: 'USB' }],
    clearanceHeight: 10,
  },
  {
    id: 'esp32-devkit',
    name: 'ESP32 DevKit V1',
    nameZh: 'ESP32 DevKit V1',
    category: 'board',
    body: {
      size: [51.5, 25.4, 1.6],
      blocks: [
        { shape: 'box', position: [7, 0, 0], size: [25.5, 18, 3.1], label: 'WiFi 模組' },
        { shape: 'box', position: [-23, 0, 0], size: [6, 8, 4], label: 'Micro-USB' },
        { shape: 'box', position: [0, 11.4, 0], size: [46, 2.5, 8.5], label: '排針' },
        { shape: 'box', position: [0, -11.4, 0], size: [46, 2.5, 8.5], label: '排針' },
      ],
    },
    mountingHoles: [
      { x: -23.5, y: -10.5, diameter: 3 },
      { x: -23.5, y: 10.5, diameter: 3 },
      { x: 23.5, y: -10.5, diameter: 3 },
      { x: 23.5, y: 10.5, diameter: 3 },
    ],
    ports: [{ face: 'west', shape: 'rect', x: 0, z: 0, w: 9, h: 5, label: 'USB' }],
    clearanceHeight: 9,
  },
  {
    id: 'raspberry-pi-4',
    name: 'Raspberry Pi 4B',
    nameZh: 'Raspberry Pi 4B',
    category: 'board',
    body: {
      size: [85, 56, 1.4],
      blocks: [
        { shape: 'box', position: [38, 18, 0], size: [21, 16, 13.5], label: '乙太網路' },
        { shape: 'box', position: [38, -2, 0], size: [17, 15, 16], label: 'USB' },
        { shape: 'box', position: [38, -20, 0], size: [17, 15, 16], label: 'USB' },
        { shape: 'box', position: [3.5, 23.5, 0], size: [51, 5, 8.5], label: 'GPIO' },
      ],
    },
    mountingHoles: [
      { x: -29, y: -24.5, diameter: 2.7 },
      { x: -29, y: 24.5, diameter: 2.7 },
      { x: 29, y: -24.5, diameter: 2.7 },
      { x: 29, y: 24.5, diameter: 2.7 },
    ],
    ports: [
      { face: 'south', shape: 'rect', x: -32, z: 0, w: 10, h: 4, label: 'USB-C' },
      { face: 'south', shape: 'rect', x: -18, z: 0, w: 8, h: 4, label: 'micro-HDMI' },
      { face: 'south', shape: 'rect', x: -4.5, z: 0, w: 8, h: 4, label: 'micro-HDMI' },
      { face: 'east', shape: 'rect', x: 18, z: 0, w: 17, h: 14, label: '乙太網路' },
      { face: 'east', shape: 'rect', x: -2, z: 0, w: 16, h: 17, label: 'USB' },
      { face: 'east', shape: 'rect', x: -20, z: 0, w: 16, h: 17, label: 'USB' },
    ],
    clearanceHeight: 20,
  },
  {
    id: 'raspberry-pi-zero-2',
    name: 'Raspberry Pi Zero 2 W',
    nameZh: 'Raspberry Pi Zero 2 W',
    category: 'board',
    body: {
      size: [65, 30, 1.4],
      blocks: [{ shape: 'box', position: [0, 11.5, 0], size: [51, 5, 3], label: 'GPIO' }],
    },
    mountingHoles: [
      { x: -29, y: -11.5, diameter: 2.75 },
      { x: -29, y: 11.5, diameter: 2.75 },
      { x: 29, y: -11.5, diameter: 2.75 },
      { x: 29, y: 11.5, diameter: 2.75 },
    ],
    ports: [
      { face: 'south', shape: 'rect', x: -20, z: 0, w: 12, h: 4, label: 'mini-HDMI' },
      { face: 'south', shape: 'rect', x: 4, z: 0, w: 8, h: 3, label: 'USB' },
      { face: 'south', shape: 'rect', x: 16, z: 0, w: 8, h: 3, label: 'USB' },
    ],
    clearanceHeight: 6,
  },
  {
    id: 'microbit-v2',
    name: 'micro:bit V2',
    nameZh: 'micro:bit V2',
    category: 'board',
    body: {
      size: [52, 42, 1.2],
      blocks: [
        { shape: 'box', position: [-18, 0, 0], size: [6, 6, 4], label: '按鈕 A' },
        { shape: 'box', position: [18, 0, 0], size: [6, 6, 4], label: '按鈕 B' },
      ],
    },
    mountingHoles: [
      { x: -21.6, y: -16.5, diameter: 4 },
      { x: 0, y: -16.5, diameter: 4 },
      { x: 21.6, y: -16.5, diameter: 4 },
    ],
    ports: [{ face: 'north', shape: 'rect', x: 0, z: 0, w: 9, h: 4, label: 'USB' }],
    clearanceHeight: 12,
  },
  // ── 感測器與顯示 sensor ────────────────────────────────────────
  {
    id: 'hc-sr04',
    name: 'HC-SR04',
    nameZh: 'HC-SR04 超音波感測器',
    category: 'sensor',
    body: {
      size: [45, 20, 1.2],
      blocks: [
        { shape: 'cylinder', position: [-13, 0, 0], size: [16, 16, 12], label: '發射' },
        { shape: 'cylinder', position: [13, 0, 0], size: [16, 16, 12], label: '接收' },
      ],
    },
    mountingHoles: [
      { x: -20.5, y: -7.5, diameter: 1.8 },
      { x: -20.5, y: 7.5, diameter: 1.8 },
      { x: 20.5, y: -7.5, diameter: 1.8 },
      { x: 20.5, y: 7.5, diameter: 1.8 },
    ],
    ports: [
      { face: 'top', shape: 'circle', x: -13, z: 0, w: 16.5, h: 16.5, label: '發射開孔' },
      { face: 'top', shape: 'circle', x: 13, z: 0, w: 16.5, h: 16.5, label: '接收開孔' },
    ],
    clearanceHeight: 13.2,
  },
  {
    id: 'oled-096',
    name: 'OLED 0.96" (SSD1306)',
    nameZh: 'OLED 0.96 吋顯示器',
    category: 'sensor',
    body: {
      size: [27, 27.5, 1.2],
      blocks: [
        { shape: 'box', position: [0, -1.5, 0], size: [26, 15, 1.6], label: '螢幕' },
        { shape: 'box', position: [0, 12, 0], size: [10, 2.5, 3], label: '排針' },
      ],
    },
    mountingHoles: [
      { x: -11.5, y: -11.75, diameter: 2 },
      { x: -11.5, y: 11.75, diameter: 2 },
      { x: 11.5, y: -11.75, diameter: 2 },
      { x: 11.5, y: 11.75, diameter: 2 },
    ],
    ports: [{ face: 'top', shape: 'rect', x: 0, z: -1.5, w: 26, h: 15, label: '螢幕視窗' }],
    clearanceHeight: 4,
  },
  {
    id: 'lcd1602',
    name: 'LCD1602 (I2C)',
    nameZh: 'LCD1602 液晶顯示器',
    category: 'sensor',
    body: {
      size: [80, 36, 1.6],
      blocks: [{ shape: 'box', position: [0, 0, 0], size: [71.5, 25.5, 7], label: '螢幕' }],
    },
    mountingHoles: [
      { x: -37.5, y: -15.5, diameter: 2.9 },
      { x: -37.5, y: 15.5, diameter: 2.9 },
      { x: 37.5, y: -15.5, diameter: 2.9 },
      { x: 37.5, y: 15.5, diameter: 2.9 },
    ],
    ports: [{ face: 'top', shape: 'rect', x: 0, z: 0, w: 72, h: 26, label: '螢幕視窗' }],
    clearanceHeight: 8.6,
  },
  {
    id: 'pir-hc-sr501',
    name: 'PIR HC-SR501',
    nameZh: 'PIR 人體感測器',
    category: 'sensor',
    body: {
      size: [32.5, 24, 1.6],
      blocks: [{ shape: 'cylinder', position: [0, 0, 0], size: [23, 23, 11.5], label: '感測罩' }],
    },
    mountingHoles: [
      { x: -14.25, y: 0, diameter: 2 },
      { x: 14.25, y: 0, diameter: 2 },
    ],
    ports: [{ face: 'top', shape: 'circle', x: 0, z: 0, w: 23.5, h: 23.5, label: '感測罩開孔' }],
    clearanceHeight: 13.1,
  },
  {
    id: 'dht22',
    name: 'DHT22',
    nameZh: 'DHT22 溫濕度感測器',
    category: 'sensor',
    body: { size: [15.1, 25.1, 7.7] },
    mountingHoles: [{ x: 0, y: 9.5, diameter: 3 }],
    ports: [{ face: 'top', shape: 'rect', x: 0, z: -2, w: 13, h: 18, label: '通風開孔' }],
    clearanceHeight: 7.7,
  },
  // ── 動力與電源 power ──────────────────────────────────────────
  {
    id: 'sg90',
    name: 'SG90',
    nameZh: 'SG90 伺服馬達',
    category: 'power',
    body: {
      size: [22.5, 11.8, 22.7],
      blocks: [
        { shape: 'box', position: [0, 0, -6.8], size: [32.2, 11.8, 2.5], label: '固定翼' },
        { shape: 'cylinder', position: [5.5, 0, 0], size: [4.6, 4.6, 3.2], label: '轉軸' },
      ],
    },
    mountingHoles: [
      { x: -13.85, y: 0, diameter: 2, z: 15.9 },
      { x: 13.85, y: 0, diameter: 2, z: 15.9 },
    ],
    ports: [{ face: 'top', shape: 'circle', x: 5.5, z: 0, w: 6, h: 6, label: '轉軸開孔' }],
    clearanceHeight: 26,
  },
  {
    id: 'mg996r',
    name: 'MG996R',
    nameZh: 'MG996R 伺服馬達',
    category: 'power',
    body: {
      size: [40.7, 19.7, 42.9],
      blocks: [
        { shape: 'box', position: [0, 0, -6.3], size: [54.5, 19.7, 2.5], label: '固定翼' },
        { shape: 'cylinder', position: [10.3, 0, 0], size: [6, 6, 4], label: '轉軸' },
      ],
    },
    mountingHoles: [
      { x: -24.5, y: -5, diameter: 4.5, z: 36.6 },
      { x: -24.5, y: 5, diameter: 4.5, z: 36.6 },
      { x: 24.5, y: -5, diameter: 4.5, z: 36.6 },
      { x: 24.5, y: 5, diameter: 4.5, z: 36.6 },
    ],
    ports: [{ face: 'top', shape: 'circle', x: 10.3, z: 0, w: 8, h: 8, label: '轉軸開孔' }],
    clearanceHeight: 46,
  },
  {
    id: 'tt-motor',
    name: 'TT Motor',
    nameZh: 'TT 減速馬達',
    category: 'power',
    // TT 馬達為側向安裝（水平軸），v1 不支援自動支柱；先提供外形供排位
    body: { size: [65, 22.5, 18.5] },
    clearanceHeight: 18.5,
  },
  {
    id: 'l298n',
    name: 'L298N',
    nameZh: 'L298N 馬達驅動板',
    category: 'power',
    body: {
      size: [43.5, 43.2, 1.6],
      blocks: [
        { shape: 'box', position: [10, 0, 0], size: [16, 23, 24], label: '散熱片' },
        { shape: 'box', position: [-18, 10, 0], size: [8, 20, 10], label: '端子' },
      ],
    },
    mountingHoles: [
      { x: -18.5, y: -18.4, diameter: 3.2 },
      { x: -18.5, y: 18.4, diameter: 3.2 },
      { x: 18.5, y: -18.4, diameter: 3.2 },
      { x: 18.5, y: 18.4, diameter: 3.2 },
    ],
    clearanceHeight: 25.6,
  },
  {
    id: 'battery-18650x2',
    name: '18650×2 Holder',
    nameZh: '18650 雙節電池盒',
    category: 'power',
    body: { size: [77.7, 40.2, 21.5] },
    mountingHoles: [
      { x: -29, y: 0, diameter: 3 },
      { x: 29, y: 0, diameter: 3 },
    ],
    clearanceHeight: 21.5,
  },
  {
    id: 'battery-9v',
    name: '9V Battery',
    nameZh: '9V 電池',
    category: 'power',
    body: { size: [48.5, 26.5, 17.5] },
    clearanceHeight: 17.5,
  },
  // ── 小型元件 component ────────────────────────────────────────
  {
    id: 'led-5mm',
    name: 'LED 5mm',
    nameZh: '5mm LED',
    category: 'component',
    body: {
      size: [5.8, 5.8, 1],
      blocks: [{ shape: 'cylinder', position: [0, 0, 0], size: [5, 5, 7.6], label: '燈體' }],
    },
    ports: [{ face: 'top', shape: 'circle', x: 0, z: 0, w: 5.2, h: 5.2, label: '燈孔' }],
    clearanceHeight: 8.6,
  },
  {
    id: 'push-button-12mm',
    name: 'Push Button 12mm',
    nameZh: '12mm 按鈕',
    category: 'component',
    body: {
      size: [12, 12, 6.5],
      blocks: [{ shape: 'cylinder', position: [0, 0, 0], size: [7, 7, 1], label: '按鈕' }],
    },
    ports: [{ face: 'top', shape: 'circle', x: 0, z: 0, w: 13, h: 13, label: '按鈕開孔' }],
    clearanceHeight: 7.5,
  },
  {
    id: 'buzzer-module',
    name: 'Buzzer Module',
    nameZh: '蜂鳴器模組',
    category: 'component',
    body: {
      size: [22, 12, 1.6],
      blocks: [{ shape: 'cylinder', position: [3.5, 0, 0], size: [12, 12, 9.7], label: '蜂鳴器' }],
    },
    mountingHoles: [{ x: -8.5, y: 0, diameter: 2 }],
    ports: [{ face: 'top', shape: 'circle', x: 3.5, z: 0, w: 3, h: 3, label: '發聲孔' }],
    clearanceHeight: 11.3,
  },
  {
    id: 'relay-1ch',
    name: 'Relay 1CH',
    nameZh: '1 路繼電器模組',
    category: 'component',
    body: {
      size: [50, 26, 1.6],
      blocks: [
        { shape: 'box', position: [5, 0, 0], size: [19, 15.5, 15.5], label: '繼電器' },
        { shape: 'box', position: [-19, 0, 0], size: [8, 20, 10], label: '端子' },
      ],
    },
    mountingHoles: [
      { x: -22.6, y: -9.5, diameter: 2.9 },
      { x: -22.6, y: 9.5, diameter: 2.9 },
      { x: 22.6, y: -9.5, diameter: 2.9 },
      { x: 22.6, y: 9.5, diameter: 2.9 },
    ],
    clearanceHeight: 17.1,
  },
  {
    id: 'breadboard-half',
    name: 'Breadboard 400',
    nameZh: '半尺寸麵包板（400 孔）',
    category: 'component',
    body: { size: [82.5, 54.5, 8.5] },
    clearanceHeight: 8.5,
  },
  {
    id: 'breadboard-full',
    name: 'Breadboard 830',
    nameZh: '全尺寸麵包板（830 孔）',
    category: 'component',
    body: { size: [165, 54.5, 8.5] },
    clearanceHeight: 8.5,
  },
];

export const PART_LIBRARY: PartDefinition[] = RAW_LIBRARY.map((p) =>
  partDefinitionSchema.parse(p),
);

const registry = new Map(PART_LIBRARY.map((p) => [p.id, p]));

export function getPartDefinition(id: string): PartDefinition | undefined {
  return registry.get(id);
}
