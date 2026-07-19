# Design: smart-car-preset

## Context

- 零件庫（`src/parts/library.ts`）已含全部所需零件：`arduino-uno`（68.6×53.4）、`l298n`（43.5×43.2）、`tt-motor`（65×22.5，無安裝孔，v1 僅供排位）、`battery-18650x2`（77.7×40.2）、`hc-sr04`（45×20）。
- `createPartNode(partId, name, overrides)`（`src/types/document.ts`）支援 `overrides.transform` 指定位置/旋轉；rotation 單位為**度**（`plan.ts` 以 `rotation[2] * DEG` 轉換）。
- `documentStore.addNodes(nodes)` 批次加入並自動全選（selection = 全部新節點），一次 undo 即可整組復原。
- Plan 4 起「產生外殼」以 selection 決定包含範圍——生成後全選正好讓下一步直接做小車外殼。
- Toolbar（`src/components/Toolbar.tsx`）已有 `IconButton` pattern（lucide icon + i18n title）。

## Goals / Non-Goals

**Goals:**
- 一鍵生成 6 個零件節點（1 uno、1 l298n、2 tt-motor、1 電池盒、1 hc-sr04），排成經典 2WD 車型佈局，互不重疊
- 生成後全選，銜接既有「產生外殼」selection 範圍流程
- preset 資料與 UI 分離（`src/parts/presets.ts` 純資料 + 一個組裝函式），日後可加第二個 preset

**Non-Goals:**
- 不自動生成外殼/車體底盤（使用者自己按「產生外殼」）
- 不新增零件定義、不建 GroupNode（`addNodes` 平鋪即可，分組是既有場景樹功能的事）
- 不做 preset 選單/對話框（只有一個 preset，直接一鍵；多 preset 時再做選單——YAGNI）
- 不處理輪子/車軸（零件庫無輪子零件，TT 馬達本體排位即足夠外殼規劃用）

## Decisions

**D1 — 新檔 `src/parts/presets.ts`：純資料 + 組裝函式。**

```ts
import { createPartNode } from '../types/document';
import { getPartDefinition } from './library';
import type { PartNode } from '../types/document';

/** 智能小車 preset：經典 Arduino 2WD 佈局（車頭朝 +X，全部貼地 z=0） */
export const SMART_CAR_PRESET: { partId: string; x: number; y: number; rotZ: number }[] = [
  { partId: 'hc-sr04', x: 105, y: 0, rotZ: 0 },          // 車頭感測器
  { partId: 'arduino-uno', x: 40, y: 0, rotZ: 0 },        // 中前控制板
  { partId: 'l298n', x: -25, y: 0, rotZ: 0 },             // 中後驅動板
  { partId: 'battery-18650x2', x: -95, y: 0, rotZ: 0 },   // 車尾電池
  { partId: 'tt-motor', x: -15, y: 55, rotZ: 90 },        // 左馬達（橫置）
  { partId: 'tt-motor', x: -15, y: -55, rotZ: 90 },       // 右馬達（橫置）
];

export function buildSmartCarNodes(lang: string): PartNode[] { ... }
```

`buildSmartCarNodes` 對每項查 `getPartDefinition`，用 `createPartNode(partId, lang === 'zh' ? def.nameZh : def.name, { transform: { position: [x, y, 0], rotation: [0, 0, rotZ], scale: [1, 1, 1] } })` 組節點（名稱語言判斷複刻 `PartsDrawer.tsx` 既有寫法）。查無零件時 throw——preset 資料與零件庫由同一 repo 管理，測試會擋住 id 打錯，不做 runtime 靜默跳過。

佈局間隙驗算（俯視 AABB，含旋轉後尺寸）：
- hc-sr04 x∈[82.5,127.5] vs uno x∈[5.7,74.3]：間隙 8.2mm
- uno vs l298n x∈[-46.75,-3.25]：間隙 8.95mm
- l298n vs battery x∈[-133.85,-56.15]：間隙 9.4mm
- tt-motor 旋轉 90° 後footprint 22.5(X)×65(Y)，x∈[-26.25,-3.75]、y∈[22.5,87.5]（左）：與 uno（y≤26.7 但 x≥5.7）x 不重疊；與 l298n（x 重疊但 y≤21.6）y 不重疊。無碰撞。

**D2 — Toolbar 按鈕。**

`Toolbar.tsx` 加一顆 `IconButton`（lucide `Car` icon），放在「產生外殼」按鈕旁（同屬「生成」類工具）。onClick：`addNodes(buildSmartCarNodes(i18n.language))`。不需 dialog、不需確認——`addNodes` 單次 mutate，一鍵 undo 可整組復原。

**D3 — i18n。**

`toolbar.smartCar`：zh「智能小車」、en「Smart Car」。按鈕 title 用之。

**D4 — 測試（`src/parts/presets.test.ts` 新檔）。**

- preset 每個 `partId` 都存在於 `PART_LIBRARY`（擋 id 打錯／未來零件改名）。
- `buildSmartCarNodes` 回傳 6 個 `type: 'part'` 節點，位置/旋轉與資料表一致。
- 佈局無重疊：對每對零件算旋轉後俯視 AABB（90° 倍數旋轉即交換 x/y 尺寸，複用簡單 min/max 比較），斷言兩兩不相交。此測試把 D1 的手算變成可執行防護，未來調佈局或零件庫尺寸變動時自動抓碰撞。

## Risks / Trade-offs

- **TT 馬達無安裝孔**：v1 零件定義註明側向安裝不支援自動支柱，「產生外殼」時馬達只貢獻外形空間、不長固定柱——與現況零件庫行為一致，非本 change 引入的限制。
- **佈局寫死**：座標是資料常數，使用者生成後可自行拖動微調；不做參數化佈局（YAGNI）。
- **單一 preset 直接掛按鈕**：第二個 preset 出現時按鈕要改成選單，屆時 `presets.ts` 資料結構已就緒，只動 UI。
