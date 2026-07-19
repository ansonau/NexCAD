# Tasks: smart-car-preset

## 1. Preset 資料 + 組裝函式

- [x] 1.1 新檔 `src/parts/presets.ts`：`SMART_CAR_PRESET` 資料表（design.md D1 的 6 筆座標）+ `buildSmartCarNodes(lang)` 組裝函式（查 `getPartDefinition`、`createPartNode` 帶 transform，查無 id 時 throw）
- [x] 1.2 新檔 `src/parts/presets.test.ts`：(a) 每個 partId 存在於 `PART_LIBRARY`；(b) `buildSmartCarNodes` 回傳 6 個 part 節點且位置/旋轉正確；(c) 兩兩俯視 AABB（90° 旋轉交換寬深）不相交

## 2. UI

- [x] 2.1 i18n：`toolbar.smartCar`（zh「智能小車」/ en「Smart Car」）
- [x] 2.2 `src/components/Toolbar.tsx`：新增 lucide `Car` IconButton（「產生外殼」旁），onClick `addNodes(buildSmartCarNodes(i18n.language))`

## 3. 驗證（第一輪：僅電子零件排位）

- [x] 3.1 `npx vitest run && npx tsc --noEmit && npm run build` 全綠
- [x] 3.2 瀏覽器驗證：點按鈕生成 6 零件、佈局正確無重疊、全選狀態；接著按「產生外殼」能以此組零件生成外殼
- [x] 3.3 瀏覽器驗證：單次 undo 整組移除；zh/en 切換後生成名稱正確
- [x] 3.4 `npm run test:e2e` 通過；Console 全程無錯誤

## 4. 底盤與車輪（第二輪，使用者追加需求）

- [ ] 4.1 `src/parts/schema.ts`：`partBlockSchema` 新增選填 `rotation: vec3Schema.optional()`（design.md D5）
- [ ] 4.2 `src/parts/partGeometry.ts`：`buildPartSolid` 的 block 迴圈改用 `block.rotation ?? [0, 0, 0]`（取代固定 `noTransform.rotation`），既有零件行為不變
- [ ] 4.3 `src/parts/library.ts`：新增 `car-wheel` 零件（design.md D6：body 極薄轂座 + 一個 `rotation: [90,0,0]` 的 cylinder block 當輪胎，`size: [65, 65, 27]`）——**block.position 的精確平移量需實作者用 `buildPartSolid` 實測調整**，直到 4.4 的 probe 測試通過（觸地、半徑、寬度），非憑空硬編公式
- [ ] 4.4 `src/parts/library.test.ts` 或新檔：`car-wheel` 幾何 probe 測試——(a) 最低點 z≈0（容許 0.5mm）、(b) XZ 剖面半徑≈32.5mm、(c) Y 方向寬度≈27mm（沿用 `shellGeometry.test.ts` 的 probe-box 手法）
- [ ] 4.5 `src/parts/presets.ts`：新增 `buildChassisAndWheels()`（design.md D7，底盤 `createPrimitive('box', ...)` + 2 顆 `car-wheel` PartNode，位置見 D7）
- [ ] 4.6 `src/parts/presets.test.ts`：`buildChassisAndWheels` 回傳 3 個節點（1 primitive + 2 part），位置/尺寸與 D7 一致
- [ ] 4.7 `src/components/Toolbar.tsx`：onClick 改為 `addNodes([...carParts, ...extras])` 後 `setSelection(carParts.map(n => n.id))`（design.md D8，只選電子零件）

## 5. 最終驗證

- [ ] 5.1 `npx vitest run && npx tsc --noEmit && npm run build` 全綠
- [ ] 5.2 瀏覽器驗證：點按鈕生成 9 個節點（底盤+2輪子+6電子零件），僅 6 電子零件被選取；車輪視覺站立、觸地；底盤墊在零件下方
- [ ] 5.3 瀏覽器驗證：選取狀態下按「產生外殼」，範圍仍是 6 個電子零件（底盤/輪子未被框入）；單次 undo 移除全部 9 個節點
- [ ] 5.4 `npm run test:e2e` 通過；Console 全程無錯誤
