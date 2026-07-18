# Tasks: mounting-through-hole

## 1. 型別 + shellGeometry 分支

- [x] 1.1 `src/types/document.ts`：`MountingStyle` 加 `'hole'`
- [x] 1.2 `src/persistence/nexcadFile.ts`：`mountingStyle` zod enum 同步加 `'hole'`（`z.enum(['screw','peg','hole'])`）
- [x] 1.3 `src/enclosure/shellGeometry.ts`：`buildShellSolid` 非角柱迴圈新增 `mountingStyle === 'hole'` 分支（design.md D2：不長柱，貫穿地板挖 `pilotDiameter(screwSize,'through')` 直徑的孔，Z 範圍 `plan.floorZ-1` 起、高 `wallThickness+2`）
- [x] 1.4 測試：`src/enclosure/shellGeometry.test.ts`——`hole` 模式體積增量僅為挖孔（無支柱體積增加，可與無 standoffs 基準比較體積不增反減或持平）、貫穿孔確實打穿地板（探測外底面與內腔地板間任一點皆為空）、孔徑等於 `pilotDiameter(screwSize,'through')`；`nexcadFile.test.ts` 驗證 `mountingStyle: 'hole'` 可正常序列化/解析（zod enum 擴充後的回歸）

## 2. UI

- [ ] 2.1 i18n：`enclosure.mountingHole`（zh/en）
- [ ] 2.2 `src/components/EnclosurePanel.tsx` 的 `mountingStyle` 下拉加第三個 `<option value="hole">`
- [ ] 2.3 `src/components/PropertyCard.tsx` 的 `mountingStyle` 下拉加第三個 `<option value="hole">`，變更觸發既有 `regenerateEnclosure`

## 3. 驗證

- [ ] 3.1 `npx vitest run && npx tsc --noEmit && npm run build` 全綠
- [ ] 3.2 瀏覽器驗證：切 `mountingStyle: 'hole'` 產生外殼，零件安裝孔位置無支柱、殼體地板可見貫穿孔；角柱與螺絲上蓋不受影響
- [ ] 3.3 瀏覽器驗證：`screw`/`peg` 兩個既有選項行為不變（回歸確認）
- [ ] 3.4 `npm run test:e2e` 通過；Console 全程無錯誤
