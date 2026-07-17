# Proposal: part-mounting-style

## Why

目前零件固定方式**只有一種**：每個零件安裝孔下方長一根 standoff 螺絲柱，柱頂鑽自攻導孔，靠螺絲把零件鎖在殼體底。但很多 Maker 情境不想上螺絲——想要免螺絲快速定位/壓入（heat-set boss、免工具原型組裝）。使用者要求新增選項，可選「螺絲柱」或「圓柱定位柱」（實心圓柱插進零件安裝孔取代螺絲）。

## What Changes

- 新增 `EnclosureParams.mountingStyle?: 'screw' | 'peg'`（預設 `'screw'`，即現行行為，optional 向後相容）。
- `'screw'`：現行 standoff 柱 + 自攻導孔（不變）。
- `'peg'`：standoff 柱升到零件安裝孔平面後，柱頂再長一段**實心定位圓柱**插入零件安裝孔（直徑 = 孔徑 − 配合間隙，高度預設 4mm）；柱身不鑽導孔。
- `mountingStyle` **只影響零件安裝柱**（`planStandoffs`）；螺絲上蓋的四角鎖柱（`planCornerPosts`）維持螺絲不受影響（它們鎖上蓋，不是固定零件）。
- `EnclosurePanel` 進階區塊與 `PropertyCard` 外殼參數表新增下拉選項（zh/en i18n）。
- `.nexcad` schema 與 IndexedDB 讀取向後相容：舊專案無此欄位時視為 `'screw'`。

## Capabilities

### New Capabilities

- `enclosure-mounting`: 零件固定方式（螺絲柱 vs 圓柱定位柱）的選擇與幾何生成規則。

### Modified Capabilities

（無）

## Impact

- `src/types/document.ts`：`EnclosureParams` 加 `mountingStyle?`
- `src/persistence/nexcadFile.ts`：zod schema 加 optional 欄位
- `src/enclosure/plan.ts`：`StandoffPlan` 加圓柱定位柱所需欄位（孔徑）；`planStandoffs` 帶入 `mountingStyle` 與孔徑
- `src/enclosure/shellGeometry.ts`：依 `mountingStyle` 分支——peg 模式長實心定位柱不鑽導孔
- `src/enclosure/generate.ts`：`planStandoffs` 呼叫端傳入 `mountingStyle`
- `src/components/EnclosurePanel.tsx`、`src/components/PropertyCard.tsx`：新下拉 UI
- `src/i18n/zh.json`、`src/i18n/en.json`：新 label key
- 測試：`plan.test.ts`、`shellGeometry.test.ts`、`nexcadFile.test.ts`（backward-compat）
