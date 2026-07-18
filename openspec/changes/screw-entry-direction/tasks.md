# Tasks: screw-entry-direction

## 1. types：screwEntry 欄位、backward-compat、共用沉孔函式

- [x] 1.1 `src/types/document.ts`：加 `ScrewEntry = 'fromLid' | 'fromBase'` 型別並匯出，`EnclosureParams` 加 `screwEntry?: ScrewEntry`；`screwLidProfile` 註解更新為「螺絲進入面（依 screwEntry 決定）的杯頭樣式」
- [x] 1.2 `src/enclosure/plan.ts`：`DEFAULT_ENCLOSURE_PARAMS` 加 `screwEntry: 'fromLid'`；`StandoffPlan` 加 `isCornerPost?: boolean`；`planCornerPosts` 設定每個回傳項目 `isCornerPost: true`（`planStandoffs` 不變、不設定此欄位）
- [x] 1.3 `src/persistence/nexcadFile.ts`：enclosure params zod schema 加 `screwEntry: z.enum(['fromLid','fromBase']).optional()`
- [x] 1.4 回歸測試：`src/persistence/nexcadFile.test.ts` 驗證無 `screwEntry` 的舊 `.nexcad` 內容可正常解析（沿用既有 backward-compat 測試模式）；`src/enclosure/plan.test.ts` 驗證 `planCornerPosts` 回傳項目 `isCornerPost: true`、`planStandoffs` 回傳項目無此欄位（或為 falsy）
- [x] 1.5 新增 `src/enclosure/counterbore.ts`：抽出 `SINK_MARGIN`/`HEAD_CLEARANCE`/`MIN_SIDE_WALL` 常數與 `counterboreRadius(screwSize, cornerRadius, throughRadius)`/`counterboreDepth(screwSize)` 函式（design.md D3，公式與 `lidGeometry.ts` 現有內聯計算逐位元組一致）

## 2. lidGeometry.ts：改用共用函式 + fromBase 分支

- [x] 2.1 `lidGeometry.ts` 改呼叫 `counterbore.ts` 的函式取代原本內聯的沉孔半徑/深度計算（純重構，`lidGeometry.test.ts` 既有案例須全數維持通過，作為重構安全網）
- [x] 2.2 `isFlatRecessed` 判斷加 `&& params.screwEntry !== 'fromBase'`（fromBase 模式上蓋永不加厚）
- [x] 2.3 角柱迴圈依 `params.screwEntry` 分支：`fromLid`（現行，通孔+視情況沉孔，改呼叫共用函式）；`fromBase`（新，自攻盲孔：從 `panelZ - LIP_HEIGHT` 向上鑽 `pilotDiameter(screwSize,'selfTap')` 直徑、`p.pilotDepth` 深，深度 clamp 在面板+唇邊實際厚度內，design.md D4）
- [x] 2.4 測試：`src/enclosure/lidGeometry.test.ts`——`fromBase` 模式上蓋角柱為自攻盲孔（探測孔內為空、孔外實心）非通孔（探測面板頂面上方無穿透）、面板厚度維持 `wallThickness` 不因 `screwLidProfile` 加厚

## 3. shellGeometry.ts：fromBase 分支 + 底板加厚

- [ ] 3.1 `buildShellSolid` 依 `params.screwEntry === 'fromBase'` 且 `s.isCornerPost === true` 分支處理角柱（design.md D5）；非角柱（`isCornerPost` 非 true）維持現行 `mountingStyle` 邏輯完全不變
- [ ] 3.2 `fromBase` 模式：依 `screwLidProfile ?? 'flatRecessed'` 算 `floorExtra`（`flatRecessed` 用 `counterboreDepth(screwSize)`、`flatExposed` 為 0），把 `outerSolid` 的 Z 下緣往下延伸 `floorExtra`（`inner`/`cavitySolid` 不動）
- [ ] 3.3 `fromBase` 模式角柱：柱體從新底面延伸到 `topZ`（通孔半徑非自攻半徑）、通孔貫穿新底面到 `topZ` 之外、`flatRecessed` 時另從新底面向上挖沉孔（呼叫 `counterbore.ts` 共用函式）
- [ ] 3.4 測試：`src/enclosure/shellGeometry.test.ts`——`fromBase`+`flatRecessed` 時底板實測厚度等於 `counterboreDepth+wallThickness`、角柱沉孔埋頭、通孔貫穿；`fromBase`+`flatExposed` 時底板厚度不變、只有通孔無沉孔；零件安裝柱（非角柱）在 `fromBase` 模式下幾何不受影響（沿用既有測試案例，確認仍通過）

## 4. UI：screwEntry 選項

- [ ] 4.1 i18n：`enclosure.screwEntry` / `enclosure.screwEntryFromLid` / `enclosure.screwEntryFromBase`（zh/en）
- [ ] 4.2 `src/components/EnclosurePanel.tsx` 進階區塊加 `screwEntry` 下拉（僅 `lidType === 'screw'` 顯示，同 `screwLidProfile` 顯示條件）
- [ ] 4.3 `src/components/PropertyCard.tsx` 外殼參數表加 `screwEntry` 下拉（同上），變更觸發既有 `regenerateEnclosure`

## 5. 驗證

- [ ] 5.1 `npx vitest run && npx tsc --noEmit && npm run build` 全綠
- [ ] 5.2 瀏覽器驗證：預設（fromLid）行為與變更前一致（上蓋沉孔、底座自攻）
- [ ] 5.3 瀏覽器驗證：切 `fromBase` + `flatRecessed`，底座角柱可見沉孔痕跡、底板略厚，上蓋恢復薄板無沉孔；旋轉檢視底面確認無外凸
- [ ] 5.4 瀏覽器驗證：`fromBase` + `flatExposed`，底板厚度不變、只有通孔
- [ ] 5.5 `npm run test:e2e` 通過；Console 全程無錯誤
