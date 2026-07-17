# Tasks: part-mounting-style

## 1. types：mountingStyle 欄位與 backward-compat

- [x] 1.1 `src/types/document.ts`：加 `MountingStyle = 'screw' | 'peg'` 型別並匯出，`EnclosureParams` 加 `mountingStyle?: MountingStyle`
- [x] 1.2 `src/enclosure/plan.ts`：`DEFAULT_ENCLOSURE_PARAMS` 加 `mountingStyle: 'screw'`
- [x] 1.3 `src/persistence/nexcadFile.ts`：enclosure params zod schema 加 `mountingStyle: z.enum(['screw','peg']).optional()`
- [x] 1.4 回歸測試：`src/persistence/nexcadFile.test.ts` 驗證無 `mountingStyle` 的舊 `.nexcad` 內容可正常解析（沿用 `reserveCornerSpace` backward-compat 測試模式）

## 2. plan.ts：standoff 帶入 mountingStyle 與孔徑

- [x] 2.1 `StandoffPlan` 加 `mountingStyle?: MountingStyle` 與 `holeDiameter?: number`
- [x] 2.2 `planStandoffs` 簽名加 `mountingStyle: MountingStyle = 'screw'`，每個 standoff 寫入 `mountingStyle` 與 `hole.diameter`（`planCornerPosts` 不加，角柱恆螺絲）
- [x] 2.3 測試：`src/enclosure/plan.test.ts` 驗證 `'peg'` 時 standoff 帶 `mountingStyle: 'peg'` 與正確 `holeDiameter`；`'screw'`/未設定時維持現行欄位

## 3. shellGeometry.ts：peg 幾何分支

- [ ] 3.1 加常數 `PEG_CLEARANCE = 0.2`、`PEG_HEIGHT = 4`（含 `ponytail:` 可調註解）
- [ ] 3.2 `buildShellSolid` 依 standoff `mountingStyle` 分支：`'peg'` 長實心柱到 `topZ`（不鑽導孔），柱頂向上長定位圓柱（直徑 `max(holeDiameter - PEG_CLEARANCE, 0.5)`、高 `PEG_HEIGHT`）；`'screw'`/未設定維持現行導孔行為
- [ ] 3.3 測試：`src/enclosure/shellGeometry.test.ts` 驗證 peg 模式柱頂實心（無導孔）且孔平面上方有定位圓柱體積；螺絲模式維持有導孔

## 4. generate.ts + UI

- [ ] 4.1 `src/enclosure/generate.ts`：`planStandoffs` 呼叫傳入 `node.params.mountingStyle`
- [ ] 4.2 i18n：`enclosure.mountingStyle` / `enclosure.mountingScrew` / `enclosure.mountingPeg`（zh/en）
- [ ] 4.3 `src/components/EnclosurePanel.tsx` 進階區塊加 `mountingStyle` 下拉
- [ ] 4.4 `src/components/PropertyCard.tsx` 外殼參數表加 `mountingStyle` 下拉，變更觸發既有 `regenerateEnclosure`

## 5. 驗證

- [ ] 5.1 `npx vitest run && npx tsc --noEmit && npm run build` 全綠
- [ ] 5.2 瀏覽器驗證：預設（螺絲）產生外殼，安裝柱有導孔（現行不變）
- [ ] 5.3 瀏覽器驗證：切 `peg` 重新產生，安裝柱頂為實心定位圓柱、無導孔；上蓋角柱仍為螺絲
- [ ] 5.4 `npm run test:e2e` 通過；Console 全程無錯誤
