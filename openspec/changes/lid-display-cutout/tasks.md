# Tasks: lid-display-cutout

## 1. types：lidDisplayCutout 欄位與 backward-compat

- [x] 1.1 `src/types/document.ts`：`EnclosureParams` 加 `lidDisplayCutout?: boolean`
- [x] 1.2 `src/enclosure/plan.ts`：`DEFAULT_ENCLOSURE_PARAMS` 加 `lidDisplayCutout: true`
- [x] 1.3 `src/persistence/nexcadFile.ts`：enclosure params zod schema 加 `lidDisplayCutout: z.boolean().optional()`
- [x] 1.4 回歸測試：`src/persistence/nexcadFile.test.ts` 驗證無 `lidDisplayCutout` 的舊 `.nexcad` 內容可正常解析（沿用 `screwLidProfile` backward-compat 測試模式）

## 2. portProjection.ts：planTopWindowCutouts

- [x] 2.1 新增 `TopWindowCutout` 型別與 `planTopWindowCutouts(parts)`（design.md D2：只收 top face、`angle % 90 !== 0` 跳過、旋轉後中心 = 零件位置 + 旋轉 `(port.x, port.z)`、`worldW/worldH` 依 cos/sin 對調、各加 `TOLERANCE_MM × 2`）
- [x] 2.2 測試：`src/enclosure/portProjection.test.ts`（若無此檔則建立；`holeProjection.test.ts` 為孔位投影非此檔）——0° 位置/尺寸正確、90° 旋轉 w/h 對調且中心跟著轉、非 90° 倍數跳過、無 top port 零件回傳空陣列、側面 port 不被收入

## 3. lidGeometry.ts：上蓋挖窗

- [x] 3.1 `buildLidSolid` 末端依 `params.lidDisplayCutout !== false` 對每個 `planTopWindowCutouts(parts)` 矩形挖貫穿孔（design.md D3：Z 從 `panelZ - LIP_HEIGHT - 1` 高 `panelH + LIP_HEIGHT + 2`）
- [x] 3.2 測試：`src/enclosure/lidGeometry.test.ts`——含 OLED top port 的零件開啟時窗位為空（探測窗中心）、關閉時同位置實心、slide 上蓋同樣開窗、screw 四角螺絲孔不受影響

## 4. UI：lidDisplayCutout 選項

- [x] 4.1 i18n：`enclosure.lidDisplayCutout`（zh/en）
- [x] 4.2 `src/components/EnclosurePanel.tsx` 進階區塊加 checkbox（`lidType !== 'open'` 顯示）
- [x] 4.3 `src/components/PropertyCard.tsx` 外殼參數表加 checkbox（同上），變更觸發既有 `regenerateEnclosure`

## 5. 驗證

- [ ] 5.1 `npx vitest run && npx tsc --noEmit && npm run build` 全綠
- [ ] 5.2 瀏覽器驗證：放 OLED 0.96 產生螺絲上蓋外殼，上蓋出現螢幕視窗開孔、位置對齊螢幕
- [ ] 5.3 瀏覽器驗證：關閉選項重新產生，開孔消失；重新開啟恢復
- [ ] 5.4 瀏覽器驗證：LCD1602 開窗、旋轉 90° 後重新產生窗跟著轉；無顯示器零件（如 Uno 單獨）上蓋無窗
- [ ] 5.5 `npm run test:e2e` 通過；Console 全程無錯誤
