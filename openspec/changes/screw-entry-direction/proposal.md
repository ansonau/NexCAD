# Proposal: screw-entry-direction

## Why

「螺絲上蓋」目前只有一種鎖固方向：螺絲從上蓋進入（上蓋有通孔+杯頭沉孔），底座角柱是自攻導孔（咬合螺牙）。使用者要求新增選項，反過來讓螺絲從殼子底部進入（底座角柱有通孔+杯頭沉孔），改由上蓋角柱提供自攻導孔（咬合螺牙）。

## What Changes

- 新增 `EnclosureParams.screwEntry?: 'fromLid' | 'fromBase'`（預設 `'fromLid'`——現行行為，optional 向後相容）。
- `'fromLid'`（現行）：上蓋角柱 = 通孔 + 杯頭沉孔（依 `screwLidProfile` 決定外露/藏入）；底座角柱 = 自攻導孔（螺牙咬合）。
- `'fromBase'`（新）：**整個對調**——底座角柱 = 通孔 + 杯頭沉孔（依 `screwLidProfile` 決定外露/藏入，套用在底板而非上蓋）；上蓋角柱 = 純自攻導孔柱（不鑽杯頭沉孔、不加厚）。
- `fromBase` + 沉入樣式（`flatRecessed`）時，底板厚度**自動加厚**至可容納杯頭沉孔（比照現行上蓋 `flatRecessed` 的加厚公式），上蓋維持薄板不變（純自攻導孔柱不影響上蓋厚度）。
- 只影響 `lidType === 'screw'` 的角柱；滑蓋、開放式上蓋、零件安裝柱（`mountingStyle`）不受影響。
- `EnclosurePanel` 進階區塊與 `PropertyCard` 外殼參數表新增下拉（僅 screw 上蓋顯示，zh/en i18n）。
- `.nexcad` schema 與 IndexedDB 讀取向後相容：舊專案無此欄位時視為 `'fromLid'`。

## Capabilities

### New Capabilities

（無）

### Modified Capabilities

- `enclosure-lid`: 「螺絲上蓋為平面蓋，杯頭可選外露或藏入」requirement 擴充——外露/藏入樣式所在的面（上蓋或底座）改由 `screwEntry` 決定，而非恆為上蓋。

## Impact

- `src/types/document.ts`：`EnclosureParams` 加 `screwEntry?: ScrewEntry`，新 `ScrewEntry` 型別
- `src/persistence/nexcadFile.ts`：zod schema 加 optional 欄位
- `src/enclosure/plan.ts`：`DEFAULT_ENCLOSURE_PARAMS` 加 `screwEntry: 'fromLid'`；`planCornerPosts` 回傳資訊需標示角柱應為「導孔」或「通孔+沉孔」角色（由呼叫端依 `screwEntry` 決定套用到上蓋或底座）
- `src/enclosure/shellGeometry.ts`：`buildShellSolid` 的角柱分支依 `screwEntry` 決定底座角柱是自攻導孔（現行）還是通孔+沉孔（新，含 flatRecessed 加厚底板邏輯，複刻 `lidGeometry.ts` 現有公式）
- `src/enclosure/lidGeometry.ts`：`buildLidSolid` 的角柱分支依 `screwEntry` 決定上蓋角柱是通孔+沉孔（現行）還是純自攻導孔柱（新，不加厚上蓋）
- `src/enclosure/generate.ts`：無需改動（`buildShellSolid`/`buildLidSolid` 各自從 `node.params` 讀 `screwEntry`）
- `src/components/EnclosurePanel.tsx`、`src/components/PropertyCard.tsx`：新下拉 UI
- `src/i18n/zh.json`、`src/i18n/en.json`：新 label key
- 測試：`shellGeometry.test.ts`（底座通孔+沉孔案例）、`lidGeometry.test.ts`（上蓋純導孔案例）、`nexcadFile.test.ts`（backward-compat）
