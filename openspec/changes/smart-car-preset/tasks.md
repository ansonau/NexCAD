# Tasks: smart-car-preset

## 1. Preset 資料 + 組裝函式

- [x] 1.1 新檔 `src/parts/presets.ts`：`SMART_CAR_PRESET` 資料表（design.md D1 的 6 筆座標）+ `buildSmartCarNodes(lang)` 組裝函式（查 `getPartDefinition`、`createPartNode` 帶 transform，查無 id 時 throw）
- [x] 1.2 新檔 `src/parts/presets.test.ts`：(a) 每個 partId 存在於 `PART_LIBRARY`；(b) `buildSmartCarNodes` 回傳 6 個 part 節點且位置/旋轉正確；(c) 兩兩俯視 AABB（90° 旋轉交換寬深）不相交

## 2. UI

- [ ] 2.1 i18n：`toolbar.smartCar`（zh「智能小車」/ en「Smart Car」）
- [ ] 2.2 `src/components/Toolbar.tsx`：新增 lucide `Car` IconButton（「產生外殼」旁），onClick `addNodes(buildSmartCarNodes(i18n.language))`

## 3. 驗證

- [ ] 3.1 `npx vitest run && npx tsc --noEmit && npm run build` 全綠
- [ ] 3.2 瀏覽器驗證：點按鈕生成 6 零件、佈局正確無重疊、全選狀態；接著按「產生外殼」能以此組零件生成外殼
- [ ] 3.3 瀏覽器驗證：單次 undo 整組移除；zh/en 切換後生成名稱正確
- [ ] 3.4 `npm run test:e2e` 通過；Console 全程無錯誤
