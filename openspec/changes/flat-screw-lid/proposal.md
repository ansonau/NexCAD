# Proposal: flat-screw-lid

## Why

現行螺絲上蓋是「四角凸起圓柱、杯頭沉孔藏在柱內」（`lidGeometry.ts` 的 `POST_HEIGHT=4` 凸柱）。從外觀看是四個凸出的圓柱塊，不是平整蓋面。使用者要平面蓋，並可選杯頭外露（薄蓋、免沉孔）或杯頭藏入（厚蓋、沉孔埋頭）。使用者決定**移除凸柱設計**，改為兩種平面蓋二選一。

## What Changes

- **BREAKING（幾何輸出）**：移除螺絲上蓋的四角凸起圓柱（`POST_HEIGHT`、凸柱 union、柱頂沉孔整段刪除）。螺絲上蓋改為平整蓋面。
- 新增 `EnclosureParams.screwLidProfile?: 'flatExposed' | 'flatRecessed'`（預設 `'flatRecessed'`——延續現行「杯頭藏起」語意，只是改成平面而非凸柱；optional 向後相容）。
- `'flatExposed'`（薄平面蓋，杯頭外露）：面板厚 = `wallThickness`，四角只挖螺絲通孔，杯頭直接外露坐在蓋面上。
- `'flatRecessed'`（厚平面蓋，杯頭藏入）：面板加厚 = `socketHeadDepth + 沉入餘量 + wallThickness`，四角從蓋頂挖沉孔把杯頭完全埋入面板內、通孔貫穿到底。
- 只影響 `lidType === 'screw'` 的上蓋；`slide`/`open` 上蓋不受影響。殼體底座的四角螺絲接收柱（`planCornerPosts` 於 `generate.ts` base 端）不變——仍負責螺牙咬合。
- `EnclosurePanel` 進階區塊與 `PropertyCard` 外殼參數表新增下拉（僅 screw 上蓋顯示，zh/en i18n）。
- `.nexcad` schema 與 IndexedDB 讀取向後相容：舊專案無此欄位時視為 `'flatRecessed'`。

## Capabilities

### New Capabilities

- `enclosure-lid`: 螺絲上蓋的平面蓋外觀（杯頭外露 / 杯頭藏入）選擇與幾何生成規則。

### Modified Capabilities

（無）

## Impact

- `src/types/document.ts`：`EnclosureParams` 加 `screwLidProfile?`，新 `ScrewLidProfile` 型別
- `src/persistence/nexcadFile.ts`：zod schema 加 optional 欄位
- `src/enclosure/plan.ts`：`DEFAULT_ENCLOSURE_PARAMS` 加 `screwLidProfile: 'flatRecessed'`
- `src/enclosure/lidGeometry.ts`：螺絲上蓋分支重寫——刪凸柱、依 profile 生成薄/厚平面蓋
- `src/enclosure/lidGeometry.test.ts`：更新測試（凸柱斷言改為平面蓋斷言）
- `src/components/EnclosurePanel.tsx`、`src/components/PropertyCard.tsx`：新下拉 UI
- `src/i18n/zh.json`、`src/i18n/en.json`：新 label key
- 註：此變更取代 Plan 5「螺絲上蓋杯頭沉孔（凸柱版）」的外觀，杯頭藏入語意由 `flatRecessed` 承載
