# Tasks: flat-screw-lid

## 1. types：screwLidProfile 欄位與 backward-compat

- [x] 1.1 `src/types/document.ts`：加 `ScrewLidProfile = 'flatExposed' | 'flatRecessed'` 型別並匯出，`EnclosureParams` 加 `screwLidProfile?: ScrewLidProfile`
- [x] 1.2 `src/enclosure/plan.ts`：`DEFAULT_ENCLOSURE_PARAMS` 加 `screwLidProfile: 'flatRecessed'`
- [x] 1.3 `src/persistence/nexcadFile.ts`：enclosure params zod schema 加 `screwLidProfile: z.enum(['flatExposed','flatRecessed']).optional()`
- [x] 1.4 回歸測試：`src/persistence/nexcadFile.test.ts` 驗證無 `screwLidProfile` 的舊 `.nexcad` 內容可正常解析（沿用 `mountingStyle` backward-compat 測試模式）

## 2. lidGeometry.ts：移除凸柱、實作兩種平面蓋

- [x] 2.1 加常數 `SINK_MARGIN = 0.5`、`HEAD_CLEARANCE = 0.3`、`MIN_SIDE_WALL = 1`（含 `ponytail:` 註解）；刪 `POST_HEIGHT`
- [x] 2.2 重寫 `buildLidSolid` 螺絲分支：刪凸柱 union 與柱頂沉孔；依 `params.screwLidProfile ?? 'flatRecessed'` 分兩路（design.md D2/D3）
- [x] 2.3 `flatExposed`：`panelH = wallThickness`，四角只挖通孔（D2）
- [x] 2.4 `flatRecessed`：`panelH = socketHeadDepth + SINK_MARGIN + wallThickness`，四角挖沉孔（`boreRadius` 依 D3 夾制）+ 通孔
- [x] 2.5 更新 `src/enclosure/lidGeometry.test.ts`：既有凸柱/柱頂沉孔斷言改為平面蓋斷言——`flatExposed` 蓋頂通孔存在且無沉孔埋頭、`flatRecessed` 沉孔埋頭且面板加厚、兩者蓋頂面平整無凸出（探測 `panelZ+panelH` 上方應為空）

## 3. UI：screwLidProfile 選項

- [x] 3.1 i18n：`enclosure.screwLidProfile` / `enclosure.lidFlatExposed` / `enclosure.lidFlatRecessed`（zh/en）
- [x] 3.2 `src/components/EnclosurePanel.tsx` 進階區塊加 `screwLidProfile` 下拉（僅 `lidType === 'screw'` 顯示）
- [x] 3.3 `src/components/PropertyCard.tsx` 外殼參數表加 `screwLidProfile` 下拉（同上），變更觸發既有 `regenerateEnclosure`

## 4. 驗證

- [ ] 4.1 `npx vitest run && npx tsc --noEmit && npm run build` 全綠
- [ ] 4.2 瀏覽器驗證：預設（flatRecessed）螺絲上蓋產生，蓋面平整無凸柱、四角沉孔埋頭
- [ ] 4.3 瀏覽器驗證：切 flatExposed 重新產生，蓋面較薄、四角只有通孔、杯頭外露；上蓋與底座仍可對位
- [ ] 4.4 瀏覽器驗證：slide/open 上蓋不受影響；下拉僅 screw 上蓋顯示
- [ ] 4.5 `npm run test:e2e` 通過；Console 全程無錯誤
