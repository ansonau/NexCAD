# 杯頭螺絲（Socket Head Cap Screw）支援 設計文件

日期：2026-07-17
狀態：已與使用者確認設計，待實作計畫

## 背景與範圍

NexCAD 現有的螺絲相關功能（`src/enclosure/screws.ts`、`screwHoleNode.ts`、`lidGeometry.ts`）只涵蓋通孔、自攻導孔、沉頭窩口（countersink，圓錐窩）三種孔型，以及螺絲上蓋的平面通孔螺絲柱。使用者要新增「杯頭螺絲」（ISO 4762 內六角圓柱頭螺絲，Socket Head Cap Screw）支援，並將其設為螺絲工具的預設孔型；螺絲上蓋的螺絲柱通孔造型也要改為杯頭沉孔（螺絲頭嵌入柱內，不外露）。同時調整外殼壁厚預設值。

三項改動彼此獨立、可各自測試，合併在同一份 spec 因為都圍繞「杯頭螺絲」這一個規格資料的引入：

## §1 杯頭螺絲孔型（螺絲工具）

**資料表。** `src/enclosure/screws.ts` 的 `HoleStyle` 新增 `'socketHead'`；`ScrewHoleSpec` 新增 `socketHeadDiameter: number`（頭部直徑）與 `socketHeadDepth: number`（頭部高度，即沉孔深度）。`SCREW_TABLE` 四規格填入 ISO 4762 業界常見近似值（與現有 v1 近似值取捨一致）：

| 規格 | socketHeadDiameter | socketHeadDepth |
|---|---|---|
| M2 | 3.8 | 2.0 |
| M2.5 | 4.5 | 2.5 |
| M3 | 5.5 | 3.0 |
| M4 | 7.0 | 4.0 |

**幾何。** `createScrewHoleNode`（`screwHoleNode.ts`）新增 `'socketHead'` 分支：下方通孔（`throughDiameter`，供螺桿穿過）+ 上方圓柱沉孔（`socketHeadDiameter`/`socketHeadDepth`，供螺絲頭卡住）。結構仿現有 `countersink` 分支（`GroupNode` 包 pilot + sink 兩個 role='solid' 子節點），差別只在 sink 用 `cylinder` 而非 `cone`。

**UI。** `ScrewToolsMenu.tsx` 的 `STYLES` 陣列新增第四項 `{ value: 'socketHead', key: 'tools.socketHeadStyle' }`；`style` 的初始 `useState` 從 `'through'` 改為 `'socketHead'`（預設值）。

**i18n。** zh/en 的 `tools` 區塊新增 `socketHeadStyle` key。

## §2 螺絲上蓋杯頭沉孔

**現況。** `lidGeometry.ts` 的 `buildLidSolid`，`lidType === 'screw'` 時每個角柱（`POST_HEIGHT = 4mm`，從面板頂面向上凸出）中心貫穿一個固定直徑的平面通孔，螺絲鎖入後螺絲頭完全外露在柱子頂面之上。

**改動。** 柱子頂端（`z = panelZ + panelH + POST_HEIGHT`）向下挖一個圓柱沉孔：直徑 `socketHeadDiameter`、深度 `min(socketHeadDepth, POST_HEIGHT)`（clamp 避免大規格螺絲的沉孔深度貫穿柱子進入面板/殼體合模面）。沉孔與既有通孔共用同一根軸線，通孔本身的直徑/深度/範圍不變（仍全程貫穿柱子到唇邊底端）。

**測試。** 驗證：(a) 柱頂沉孔存在（柱頂正下方、沉孔深度範圍內的 probe box 為空）；(b) 通孔仍全程貫通（唇邊底端 probe 仍為空）；(c) M4 規格（`socketHeadDepth = POST_HEIGHT = 4`，clamp 邊界情況）沉孔不貫穿進柱子以下的唇邊/面板實心區域。

## §3 外殼壁厚預設值

`src/enclosure/plan.ts` 的 `DEFAULT_ENCLOSURE_PARAMS.wallThickness`：`2` → `3`。純數值改動，其餘欄位不變。若有既有測試 pin 舊預設值 2mm 的斷言，需同步更新為 3（不得放寬斷言精度）。

## 全域約束

- `src/enclosure/`（除 `actions.ts`）維持 worker-safe，不得 import store/zustand/react。
- i18n zh/en key 對等（`resources.test.ts` 強制）。
- 幾何測試沿用既有模式（體積/probe box 交集斷言，`ManifoldKernel` + `beforeAll(async () => await kernel.init())`）。
- 螺絲規格資料延續 v1「近似值取捨」慣例（已於專案記憶記錄），不需對照實際 datasheet 逐一校正。
