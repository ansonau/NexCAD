# Tasks: enclosure-collision-safety

## 1. plan.ts：角柱碰撞避讓演算法

- [ ] 1.1 `StandoffPlan` 加 `collided?: boolean` 欄位（`src/enclosure/plan.ts`）
- [ ] 1.2 寫失敗測試：角柱位置與零件 bounding box 重疊時，`planCornerPosts` 回傳位移後的無碰撞座標（`src/enclosure/plan.test.ts`）
- [ ] 1.3 寫失敗測試：搜尋範圍內找不到解時回傳原位置且 `collided: true`
- [ ] 1.4 寫失敗測試：無碰撞情況下位置與行為不變（既有測試需保持通過）
- [ ] 1.5 實作 `planCornerPosts` 新簽名（加 `parts: PartInstance[]` 參數）與 D1/D2 避讓演算法，跑上述測試至綠燈
- [ ] 1.6 更新所有呼叫端傳入 `parts`：`src/enclosure/generate.ts`、`src/enclosure/shellGeometry.test.ts`、`src/enclosure/lidGeometry.test.ts`（若這些測試檔直接呼叫 `planCornerPosts`）

## 2. store 層：碰撞警告

- [ ] 2.1 `src/enclosure/actions.ts` 的 `generateEnclosure`/`regenerateEnclosure` 加碰撞偵測（D4）：screw 上蓋類型時算一次 `planCornerPosts`，`collided` 為真則呼叫 `useToastStore`
- [ ] 2.2 i18n 新增 `enclosure.collisionWarning` key（zh/en，`src/i18n/zh.json`、`src/i18n/en.json`）
- [ ] 2.3 單元測試：`src/enclosure/actions.test.ts` 驗證碰撞情境觸發 toast、無碰撞不觸發

## 3. PropertyCard：外殼過期提示

- [ ] 3.1 `src/components/PropertyCard.tsx` 選取 enclosure 節點時，比對 `sourceParts` 快照 transform 與 live part transform
- [ ] 3.2 不一致時在「重新產生」按鈕上方顯示過期提示文字
- [ ] 3.3 i18n 新增 `enclosure.staleWarning` key（zh/en）

## 4. 驗證

- [ ] 4.1 `npx vitest run && npx tsc --noEmit && npm run build` 全綠
- [ ] 4.2 瀏覽器驗證：刻意把零件放在殼體角落附近產生外殼，確認角柱自動避開零件、無視覺重疊
- [ ] 4.3 瀏覽器驗證：零件塞滿整條邊緣（極端案例）確認顯示碰撞 toast，殼體仍正常生成（不阻擋）
- [ ] 4.4 瀏覽器驗證：產生外殼後拖動零件位置，選取外殼節點確認顯示過期提示；點「重新產生」後提示消失
- [ ] 4.5 `npm run test:e2e` 通過；Console 全程無錯誤
