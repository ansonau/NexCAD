# Tasks: corner-post-shell-expansion

## 1. types：EnclosureParams 新欄位與 backward-compat

- [x] 1.1 `src/types/document.ts`：`EnclosureParams` 加 `reserveCornerSpace?: boolean`，zod schema `.optional()`
- [x] 1.2 `src/enclosure/plan.ts`：`DEFAULT_ENCLOSURE_PARAMS` 加 `reserveCornerSpace: true`
- [x] 1.3 回歸測試：`src/persistence/nexcadFile.test.ts` 驗證無此欄位的舊 `.nexcad` 內容可正常解析（沿用 Plan 4 `standoffWallPadding` backward-compat 測試模式）

## 2. plan.ts：擴殼取代位移避讓

- [ ] 2.1 寫失敗測試：預設參數（Uno 尺寸零件、M3）`planShell` 擴大後，`planCornerPosts` 四柱皆在角落標準位置、與零件 bbox 距離 ≥ collisionRadius、`collided` 皆 falsy（`src/enclosure/plan.test.ts`）
- [ ] 2.2 寫失敗測試：`reserveCornerSpace: false` 時 outer 尺寸與舊版一致（不擴大）、柱在標準位置、柱心恰在 bbox 角（邊界相切）時 `collided` falsy
- [ ] 2.3 寫失敗測試：`reserveCornerSpace: false` 且柱心嚴格在零件 bbox 內部時 `collided: true`；擴殼達 12mm 上限仍無解的極端案例同樣 `collided: true`
- [ ] 2.4 實作 `planShell` 擴殼迭代（design.md D1：0.5mm 步進、上限 12mm、僅 screw + reserveCornerSpace≠false、cornerRadius 以擴大後尺寸重新 clamp）
- [ ] 2.5 實作 `planCornerPosts` 簡化（design.md D2：刪除 `searchOffset`/方向/headroom 搜尋，固定 inset 位置，`collided` = 柱心嚴格入 bbox）；刪除既有位移避讓相關測試，跑全部測試至綠燈
- [ ] 2.6 確認 `generate.ts`/`lidGeometry.ts`/`actions.ts` 經 `planShell` 自動取得擴大後 plan，無需改動（D1）；`actions.test.ts` 既有碰撞測試依新語意調整極端參數

## 3. UI：reserveCornerSpace 選項

- [ ] 3.1 i18n key `enclosure.reserveCornerSpace`（zh/en）
- [ ] 3.2 `src/components/EnclosurePanel.tsx` 進階區塊加 checkbox（僅 `lidType === 'screw'` 顯示）
- [ ] 3.3 `src/components/PropertyCard.tsx` 外殼參數表加 checkbox（同上），變更觸發既有 `regenerateEnclosure`

## 4. 驗證

- [ ] 4.1 `npx vitest run && npx tsc --noEmit && npm run build` 全綠
- [ ] 4.2 瀏覽器驗證：預設參數產生外殼，確認長方形盒子、四柱在殼內、無外凸；量測盒子尺寸比舊版大 ~7mm
- [ ] 4.3 瀏覽器驗證：關閉選項後重新產生，盒子回舊尺寸、柱在角落、無警告 toast（邊界相切案例）
- [ ] 4.4 瀏覽器驗證：關閉選項且零件移到柱心位置，重新產生後顯示碰撞 toast
- [ ] 4.5 `npm run test:e2e` 通過；Console 全程無錯誤
