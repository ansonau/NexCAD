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
- 不自動生成「外殼」把電子零件包起來（使用者自己選取電子零件後按「產生外殼」——底盤/輪子刻意不參與這個選取範圍，見 D8）
- 不建 GroupNode（`addNodes` 平鋪即可，分組是既有場景樹功能的事）
- 不做 preset 選單/對話框（只有一個 preset，直接一鍵；多 preset 時再做選單——YAGNI）
- 不做真正的物理輪軸/懸吊機構，輪子只是靜態擺放的零件庫零件，不會轉動、不影響外殼幾何規劃

**Goals（追加，第二輪）：**
- 零件庫新增輪子零件，preset 在馬達軸端各放一顆，視覺上站立（轉軸水平）
- preset 加一塊底盤板（車體基座），電子零件與馬達視覺上「站」在底盤上
- 只有原本 6 個電子零件進入預設 selection（銜接「產生外殼」）；底盤與輪子加入場景但不被選取，避免使用者直接按「產生外殼」時把底盤/輪子的外形也框進殼體

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

**D5 — `partBlockSchema` 加選填 `rotation` 欄位（度，預設不轉）。**

現行 `PartBlock`（`src/parts/schema.ts`）的 block 只能沿垂直軸（Z）延伸圓柱/方塊——所有現有零件（伺服馬達轉軸、按鈕、蜂鳴器等）都是這種「站在板上朝上凸起」的造型。輪子需要水平軸圓柱（躺著滾動），現行 schema 無法表達。加一個選填欄位：

```ts
export const partBlockSchema = z.object({
  shape: z.enum(['box', 'cylinder']),
  position: vec3Schema,
  size: vec3Schema,
  /** 選填，度；預設 [0,0,0]（現行行為不變）。目前只有輪子用得到（水平軸圓柱）。 */
  rotation: vec3Schema.optional(),
  label: z.string().optional(),
});
```

`src/parts/partGeometry.ts` 的 `buildPartSolid`：block 的 `kernel.transform` 呼叫從固定 `noTransform.rotation`（`[0,0,0]`）改成 `block.rotation ?? [0, 0, 0]`。純向後相容——沒有 `rotation` 欄位的既有零件（全部）行為零改變。

**D6 — 新零件 `car-wheel`（65mm 車輪）。**

```ts
{
  id: 'car-wheel',
  name: 'Wheel 65mm',
  nameZh: '65mm 車輪',
  category: 'component',
  body: { size: [10, 27, 1] },  // 極薄小轂座，幾乎全被輪胎方塊蓋住
  mountingHoles: [],  // 摩擦套接軸心，非螺絲固定
  ports: [],
  clearanceHeight: 65,  // 輪子完整站立高度（直徑）
  ...
}
```
輪胎本體用一個 `rotation: [90, 0, 0]` 的 cylinder block 表達（`size: [65, 65, 27]`，即直徑 65、寬 27）。旋轉後圓柱的「高度軸」從垂直（Z）轉為水平（Y），視覺呈站立車輪。**確切的 block.position offset（把旋轉後的輪子底部準確頂到世界 z=0、寬度置中）需由實作者用 `buildPartSolid` 實際跑一次、量測結果找出正確平移量**（沿用本專案 probe-based 驗證慣例，見 `shellGeometry.test.ts`），design 只保證方向與大小、不保證精確到小數點的平移常數——測試斷言：(a) 輪子最低點觸地（z≈0，容許 0.5mm 誤差）、(b) XZ 剖面半徑≈32.5mm、(c) Y 方向寬度≈27mm。

**D7 — preset 加底盤板（`createPrimitive('box', ...)`，非零件庫零件）。**

底盤是單純的車體基座平板，不是可重用零件（不同 preset 的車體形狀不同，沒有「一種底盤零件」的抽象價值），用既有 primitive 機制產生：

```ts
createPrimitive('box', {
  name: '車體底盤',
  params: { width: 270, depth: 185, height: 3 },
  transform: { position: [-3, 0, -3], rotation: [0, 0, 0], scale: [1, 1, 1] },
})
```
尺寸涵蓋全部 6 個電子零件的俯視 bounding box（實際跨距 X∈[-133.85,127.5]、Y∈[-87.5,87.5]，各邊留 ~5mm 餘裕取整數 270×185）並置中；`position.z = -3` 讓底盤頂面貼齊世界 z=0（`kernel.box` 原點在底面中心，見 `manifoldKernel.ts`），電子零件維持 `z=0` 貼底盤頂面站立、不需改動既有 6 項資料。

輪子放在馬達軸端外側（沿用 D1 馬達位置：左馬達中心 y=55、footprint y∈[22.5,87.5]），車輪中心 `y = 87.5 + 15 = 102.5`（留 15mm 軸伸出間隙）、`x = -15`（對齊馬達 x）；右輪 y=-102.5 鏡像。

**D8 — preset 生成後 selection 只含原本 6 個電子零件（底盤/輪子加入但不選取）。**

`buildSmartCarNodes` 保持只回傳 6 個 `PartNode`（不變，Task Group 1 不用重跑）；新增 `buildChassisAndWheels()` 回傳底盤 + 2 輪共 3 個節點。Toolbar 的 onClick 改為：

```ts
const carParts = buildSmartCarNodes(i18n.language);
const extras = buildChassisAndWheels();
addNodes([...carParts, ...extras]);       // 9 個節點一次加入、一次 undo
setSelection(carParts.map((n) => n.id));  // 但只選取 6 個電子零件
```
`addNodes` 本身仍是單次 mutate（9 個節點一起 undo 復原），只是額外呼叫 `setSelection` 覆寫成原本 6 個——這樣使用者生成小車後直接按「產生外殼」，範圍還是原本 6 個電子零件（不含底盤/輪子），維持 Task Group 1-3 已驗證過的行為完全不變。底盤與輪子仍在場景裡、可在場景物件面板另外選取/微調。

## Risks / Trade-offs

- **TT 馬達無安裝孔**：v1 零件定義註明側向安裝不支援自動支柱，「產生外殼」時馬達只貢獻外形空間、不長固定柱——與現況零件庫行為一致，非本 change 引入的限制。
- **佈局寫死**：座標是資料常數，使用者生成後可自行拖動微調；不做參數化佈局（YAGNI）。
- **單一 preset 直接掛按鈕**：第二個 preset 出現時按鈕要改成選單，屆時 `presets.ts` 資料結構已就緒，只動 UI。
- **輪子不會轉動、不是真實可動關節**：純靜態零件庫零件，跟現行所有零件一樣沒有物理/動畫行為——如果之後要做真的可轉動輪子是完全不同範疇（動畫/物理引擎），YAGNI。
- **底盤與輪子預設不進 selection**：使用者若想連底盤一起做外殼（例如做一個完全包住小車的展示殼），需自己到場景物件面板手動加選——這是刻意的安全預設（避免把整台車框進殼體這種通常不是使用者想要的結果），非遺漏。
