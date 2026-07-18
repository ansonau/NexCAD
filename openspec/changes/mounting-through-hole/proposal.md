# Proposal: mounting-through-hole

## Why

「零件固定方式」目前只有兩種：`'screw'`（螺絲柱+自攻導孔）與 `'peg'`（實心定位圓柱）。使用者要求新增第三種：`'hole'`（螺絲孔）——地板在零件安裝孔位置直接開一個貫穿孔，不長支柱、不做自攻，螺絲從殼外穿過地板直接鎖進零件本身的螺帽/牙套（適合零件自帶固定結構、只需殼體讓螺絲通過的情況）。三選項並存供使用者挑選。

## What Changes

- `MountingStyle` 型別新增 `'hole'`，與現行 `'screw'`/`'peg'` 並列（三選一，非取代）。
- `'hole'` 模式：不長支柱、不 union 任何體積；只在零件安裝孔 XY 位置，貫穿殼體地板挖一個通孔，直徑採用 `pilotDiameter(screwSize, 'through')`（螺絲淨空直徑，非自攻——螺絲全程不與殼體本身咬合）。
- 只影響零件安裝柱（非角柱，`isCornerPost` 不為 true 的項目）；螺絲上蓋角柱、`peg`/現行 `screw` 模式不受影響。
- `EnclosurePanel` 與 `PropertyCard` 的「零件固定方式」下拉新增第三個選項，zh/en i18n。
- 型別新增為 union 擴充，非破壞性；預設值仍是 `'screw'`，向後相容不受影響（沒有新增 optional 欄位需求，`mountingStyle` 已是 optional）。

## Capabilities

### New Capabilities

（無）

### Modified Capabilities

- `enclosure-mounting`: 「零件固定方式可選螺絲柱或圓柱定位柱」requirement 擴充為三選一（加入 `'hole'`）。

## Impact

- `src/types/document.ts`：`MountingStyle` 加 `'hole'`
- `src/enclosure/shellGeometry.ts`：`buildShellSolid` 的 `mountingStyle` 分支新增 `'hole'` case（無支柱、只挖貫穿孔）
- `src/components/EnclosurePanel.tsx`、`src/components/PropertyCard.tsx`：下拉加第三選項
- `src/i18n/zh.json`、`src/i18n/en.json`：新 label key
- 測試：`shellGeometry.test.ts`（hole 模式無支柱體積、通孔貫穿地板）
