# Design: screw-entry-direction

## Context

現行螺絲上蓋鎖固（`lidType === 'screw'`）只有一種方向：
- **上蓋角柱**（`lidGeometry.ts` 的 `buildLidSolid` 螺絲分支）：通孔（`throughRadius`，貫穿面板+唇邊）+ 依 `screwLidProfile` 決定的杯頭沉孔（`flatExposed` 無沉孔／`flatRecessed` 有，且面板因此加厚至 `socketHeadDepth+SINK_MARGIN+wallThickness`）。
- **底座角柱**（`shellGeometry.ts` 的 `buildShellSolid`，經 `plan.ts` 的 `planCornerPosts` 提供角柱清單、與零件安裝柱 `planStandoffs` 合併後一起傳入）：自攻導孔（`pilotDiameter(screwSize,'selfTap')`，只鑽 `pilotDepth`=6mm 深的盲孔，供螺牙咬合）。

螺絲從上蓋鑽入、穿過面板+唇邊，跨過合模面後咬進底座角柱的自攻盲孔。使用者要求新增反向選項：螺絲改從殼子底部鑽入，杯頭沉孔在底座，上蓋角柱改為自攻盲孔。

`buildShellSolid` 目前把 `planStandoffs`（零件安裝柱）與 `planCornerPosts`（上蓋鎖點角柱）的結果**合併成同一個 `StandoffPlan[]` 陣列**傳入，兩者目前用 `mountingStyle`欄位是否為 `undefined` 間接區分（`planCornerPosts` 從不設定它）。這個間接判斷不夠明確，本次需要一個顯式標記。

## Goals / Non-Goals

**Goals:**
- 新增 `EnclosureParams.screwEntry?: 'fromLid' | 'fromBase'`（預設 `'fromLid'`，即現行行為）
- `'fromBase'`：上蓋角柱↔底座角柱的通孔/沉孔/自攻導孔角色**整個對調**
- `fromBase` + `screwLidProfile: 'flatRecessed'`：底板整體加厚以容納沉孔（比照現行上蓋加厚公式），上蓋維持薄板不變
- 只影響上蓋鎖點角柱；零件安裝柱（`mountingStyle`）、滑蓋、開放式上蓋不受影響
- 沉孔相關常數（`SINK_MARGIN`/`HEAD_CLEARANCE`/`MIN_SIDE_WALL`）與 clamp 公式抽成共用函式，供上蓋、底座兩側共用，避免兩份公式各自維護、日後drift
- 舊專案向後相容（無欄位 → `'fromLid'`）

**Non-Goals:**
- 不做「上蓋沉孔 + 底座也沉孔」的雙面沉孔（螺絲只有一個頭，只在一側沉）
- 不改變零件安裝柱（`mountingStyle: 'screw' | 'peg'`）的行為
- 不改變 `reserveCornerSpace` 擴殼邏輯（角柱 XY 位置不變，只變 Z 方向的孔型）
- 底板加厚沿用「整片加厚、外底面維持平整」原則（不做局部凸塊/凹陷），呼應先前 `corner-post-shell-expansion`／`flat-screw-lid` 已確立的「外觀不留意外凸出」共識

## Decisions

**D1 — `EnclosureParams.screwEntry?: 'fromLid' | 'fromBase'`，zod `.optional()`，讀取端 `?? 'fromLid'`。**
`DEFAULT_ENCLOSURE_PARAMS` 明確帶 `screwEntry: 'fromLid'`。新 `ScrewEntry` 型別由 `document.ts` 匯出，沿用 `mountingStyle`/`screwLidProfile` 同款 optional backward-compat 先例。`screwLidProfile` 語意微調：文件註解改為「螺絲進入面（上蓋或底座，依 `screwEntry` 決定）的杯頭外露/藏入樣式」，型別與 key 名稱不變（避免破壞性 rename）。

**D2 — `StandoffPlan` 加 `isCornerPost?: boolean`；`planCornerPosts` 明確設為 `true`，`planStandoffs` 不設定（維持 `undefined`）。**
取代目前「`mountingStyle` 是否為 `undefined`」的間接判斷，讓 `buildShellSolid` 能明確識別哪些 standoff 是上蓋鎖點角柱（會受 `screwEntry` 影響）、哪些是零件安裝柱（恆不受影響）。

**D3 — 抽出共用沉孔函式 `src/enclosure/counterbore.ts`。**
把 `lidGeometry.ts` 現有的 `SINK_MARGIN=0.5`、`HEAD_CLEARANCE=0.3`、`MIN_SIDE_WALL=1` 常數，與沉孔半徑 clamp 公式抽成：
```ts
export const SINK_MARGIN = 0.5;
export const HEAD_CLEARANCE = 0.3;
export const MIN_SIDE_WALL = 1;

/** 杯頭沉孔半徑：依螺絲規格與角柱 inset（cornerRadius+3）夾制，避免 breach 側壁 */
export function counterboreRadius(screwSize: ScrewSize, cornerRadius: number, throughRadius: number): number {
  const spec = SCREW_TABLE[screwSize];
  const inset = cornerRadius + 3;
  return Math.max(throughRadius, Math.min(spec.socketHeadDiameter / 2 + HEAD_CLEARANCE, inset - MIN_SIDE_WALL));
}

/** 沉孔深度：杯頭高度 + 埋入餘量 */
export function counterboreDepth(screwSize: ScrewSize): number {
  return SCREW_TABLE[screwSize].socketHeadDepth + SINK_MARGIN;
}
```
`lidGeometry.ts` 改為呼叫這兩個函式（取代原本內聯計算，行為不變——這是純重構，既有 `lidGeometry.test.ts` 案例應原樣通過，作為重構安全網）。`shellGeometry.ts` 的 `fromBase` 分支呼叫同一組函式，兩側公式保證一致。

**D4 — `buildLidSolid` 螺絲分支依 `screwEntry` 二選一。**
`isFlatRecessed`（決定上蓋面板是否加厚）的判斷加上 `&& params.screwEntry !== 'fromBase'`——`fromBase` 模式下上蓋**永遠不加厚**（`panelH = wallThickness`），因為杯頭不在上蓋。角柱迴圈內：
- `screwEntry !== 'fromBase'`（現行）：通孔 + （`isFlatRecessed` 時）沉孔，邏輯不變（改呼叫 D3 共用函式）。
- `screwEntry === 'fromBase'`（新）：上蓋角柱改為**自攻盲孔**，從唇邊底面（`panelZ - LIP_HEIGHT`，殼體合模面）向上鑽 `pilotDiameter(screwSize,'selfTap')` 直徑、`PILOT_DEPTH`（沿用 `plan.ts` 的 `PILOT_DEPTH=6`，經 `EnclosureParams.pilotDepthOverride` 可覆寫——`planCornerPosts` 已支援此參數，直接沿用其回傳的 `pilotDepth` 欄位）深的盲孔：`pilotTop = (panelZ - LIP_HEIGHT) + p.pilotDepth`，`position: [p.x, p.y, panelZ - LIP_HEIGHT]`，`height: p.pilotDepth`。深度上限 clamp 在面板實際厚度內（`Math.min(p.pilotDepth, panelH + LIP_HEIGHT - 1)`），避免超薄面板時鑽穿頂面外皮（比照底座既有 `pilotBottom = max(topZ - pilotDepth, inner.minZ)` 的「不鑽穿外皮」原則，此處鏡像為「不鑽穿頂皮」）。

**D5 — `buildShellSolid` 角柱分支依 `screwEntry` 二選一（只套用在 `s.isCornerPost === true` 的項目）。**
非角柱（零件安裝柱）維持現行 `mountingStyle` 分支完全不變。角柱項目：
- `screwEntry !== 'fromBase'`（現行）：自攻導孔，邏輯不變。
- `screwEntry === 'fromBase'`（新）：
  - 若 `isFlatRecessed`（`screwLidProfile ?? 'flatRecessed'` 為 `flatRecessed`）：底板整體加厚。`buildShellSolid` 內算 `floorExtra = counterboreDepth(screwSize)`，把 `outerSolid` 的 Z 範圍下緣往下延伸 `floorExtra`（`adjustedFloorZ = outer.minZ - floorExtra`，`outerSolid` 高度改為 `outer.maxZ - adjustedFloorZ`、position z 改為 `adjustedFloorZ`），**`cavitySolid`／`inner` 完全不動**（沉孔空間是「額外加在原本外底面之下的一層」，不吃掉內腔淨空）。若非 `flatRecessed`（`flatExposed`）：`floorExtra = 0`，底板厚度不變。
  - 角柱（corner-post）本體改為：柱體從 `adjustedFloorZ`（新的真實外底面）延伸到 `topZ`（= `inner.maxZ`，合模面），半徑仍是 `pilotDiameter(screwSize,'through')/2 + standoffWallPadding`（通孔半徑，非自攻半徑——柱子內部走的是通孔，比自攻孔粗）。
  - 通孔：從 `adjustedFloorZ - 1` 貫穿到 `topZ + 1`，半徑 `throughRadius = pilotDiameter(screwSize,'through')/2`。
  - 沉孔（僅 `isFlatRecessed`）：從外底面（`adjustedFloorZ`）向上挖 `counterboreDepth(screwSize)`，半徑 `counterboreRadius(screwSize, plan.cornerRadius, throughRadius)`，讓杯頭完全埋入加厚的底板內。
  - 非角柱項目（零件安裝柱）不受 `floorExtra` 影響——它們仍從**未調整**的 `plan.floorZ` 起算（`floorExtra` 只加在外底面以下、`plan.floorZ` 以上的新增區塊；`union` 後自然接合，零件柱與底板交界處無縫隙，見下方 Risks）。

**D6 — UI：`screwEntry` 下拉進 `EnclosurePanel` 進階區塊與 `PropertyCard`，僅 `lidType === 'screw'` 顯示。**
i18n key `enclosure.screwEntry`（zh：「螺絲鎖固方向」）、`enclosure.screwEntryFromLid`（「從上蓋鎖入」）、`enclosure.screwEntryFromBase`（「從底座鎖入」）；en 對應。`PropertyCard` 變更觸發既有 `regenerateEnclosure`。

## Risks / Trade-offs

- **底板加厚只發生在整片外底面**：`fromBase`+`flatRecessed` 時底板變厚（沉孔深度+餘量+壁厚，同上蓋 `flatRecessed` 的既有代價），但因加厚只往下延伸（不動 `inner`），內腔淨空完全不受影響——比上蓋加厚更「便宜」（上蓋加厚會讓整體高度增加且吃在腔體上方，底板加厚純粹是外部增高，使用者可接受的既有取捨模式）。
- **零件安裝柱與加厚後底板的接合面**：`floorExtra` 只加在 `plan.floorZ` 以下的新區塊，零件安裝柱（`planStandoffs`）仍從原本的 `plan.floorZ` 起算——union 後兩者在 `plan.floorZ` 處完全重疊銜接，無空隙、無需額外處理。
- **`counterboreRadius`/`counterboreDepth` 抽成共用函式是本次唯一的重構性變動**：`lidGeometry.ts` 呼叫端行為必須與抽出前逐位元組一致，靠既有 `lidGeometry.test.ts` 全數通過驗證，不新增行為。
- **上蓋自攻盲孔的深度 clamp**：極端薄面板（如 `flatExposed` + 極薄 `wallThickness`）時 `PILOT_DEPTH=6mm` 可能超過面板+唇邊總厚度，clamp 到可用深度內，螺牙咬合深度變淺（降級但不崩幾何），與現行底座自攻孔面對相同情境時的既有行為一致。
- **`screwLidProfile` 語意隨 `screwEntry` 改變所在面**，但選項名稱不變（`flatExposed`/`flatRecessed`）——文件與 UI label 需清楚傳達「這是進入面的樣式」而非「一定是上蓋」，避免使用者混淆。
