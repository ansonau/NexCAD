# Design: part-mounting-style

## Context

零件固定幾何全部在 `planStandoffs`（`plan.ts`）+ `buildShellSolid`（`shellGeometry.ts`）。現行流程：每個零件安裝孔 → 一個 `StandoffPlan`（`pilotDiameter = selfTapDiameter(screwSize)`、`pilotDepth`），`buildShellSolid` 長一根半徑 `pilotDiameter/2 + standoffWallPadding` 的柱到孔平面，再從柱頂鑽自攻導孔。零件靠螺絲穿過安裝孔攻進柱裡固定。

安裝孔 schema 有實際 `diameter`（`MountingHole.diameter`），但目前 standoff 完全忽略它、只用螺絲規格。peg 模式要用到這個真實孔徑。

## Goals / Non-Goals

**Goals:**
- 新增 `mountingStyle: 'screw' | 'peg'`，預設 `'screw'` 完全等同現行行為
- peg 模式：實心定位柱插入零件安裝孔取代螺絲，柱身不鑽導孔
- 只影響零件安裝柱，不動上蓋角柱（那是鎖上蓋的螺絲）
- 舊專案（`.nexcad`/IndexedDB）向後相容，無欄位視為 `'screw'`

**Non-Goals:**
- peg 直徑/高度/配合間隙不開放為使用者參數（用合理常數，未來要再加）
- 不做卡扣（snap-fit）、熱熔螺母座（heat-set boss 專屬倒角）等進階固定
- 不改上蓋角柱、不改接口投影、不改碰撞警告

## Decisions

**D1 — `EnclosureParams.mountingStyle?: 'screw' | 'peg'`，zod `.optional()`，讀取端 `?? 'screw'`。**
`DEFAULT_ENCLOSURE_PARAMS` 明確帶 `mountingStyle: 'screw'`。所有讀取點（`shellGeometry` 分支、UI）以 `?? 'screw'` 解讀 undefined，舊專案自動視為螺絲。沿用 `reserveCornerSpace` 同款 optional backward-compat 先例。

**D2 — `StandoffPlan` 加 `holeDiameter?: number`；peg 幾何用它算定位柱直徑。**
`planStandoffs` 把 `hole.diameter`（零件真實安裝孔徑）寫進每個 `StandoffPlan.holeDiameter`，並依 `mountingStyle` 決定語意。簽名加 `mountingStyle: MountingStyle = 'screw'` 參數。`planCornerPosts` 不加此欄位（角柱恆螺絲）。`mountingStyle` 型別從 `document.ts` 匯出（`MountingStyle`）。

**D3 — `buildShellSolid` 依 standoff 是否帶 peg 資訊分支。**
每根 standoff：
- 螺絲模式（現行）：長柱到 `standoffHeight`，柱頂鑽 `pilotDiameter` 自攻導孔（完全不變）。
- peg 模式：長**實心**柱到孔平面 `topZ`（`standoffHeight = topZ - floorZ`，無最低高度要求——沒有螺絲要攻牙，不像螺絲模式需保留 `pilotDepth` 餘量；`<= 0` 時整支柱連同定位柱一併跳過，不鑽導孔），再從 `topZ` 向上長一段定位圓柱：直徑 `pegDiameter = max(holeDiameter - PEG_CLEARANCE, 0.5)`、高度 `PEG_HEIGHT`。
判斷用 standoff 上的欄位（例如 `mountingStyle: MountingStyle` 直接放進 `StandoffPlan`），不從全域 params 傳第二條路徑，避免 `buildShellSolid` 簽名再長。
常數：`PEG_CLEARANCE = 0.2`（FDM 孔會縮，定位柱略小於孔徑求可插入的鬆配）、`PEG_HEIGHT = 4`（插入深度，夠定位又不易頂穿薄件）。皆加 `ponytail:` 註解標示可調上限，未來要開成參數再說。

**D4 — UI：`mountingStyle` 下拉進 `EnclosurePanel` 進階區塊與 `PropertyCard` 外殼參數表。**
兩個 `<select>`（螺絲柱 / 圓柱定位柱），值 `screw`/`peg`。i18n key `enclosure.mountingStyle`（zh：「零件固定方式」）、`enclosure.mountingScrew`（「螺絲柱」）、`enclosure.mountingPeg`（「圓柱定位柱」）；en 對應。與其他參數欄位同款 wiring（`PropertyCard` 變更即觸發 `regenerateEnclosure`）。不設 `lidType` 顯示條件——零件安裝柱在所有上蓋類型都存在（含 open/slide）。

**D5 — backward-compat：`.nexcad` zod optional、IndexedDB 無需 migration。**
`nexcadFile.ts` 的 enclosure params schema 加 `mountingStyle: z.enum(['screw','peg']).optional()`。舊資料首次編輯時 UI 顯示預設 `'screw'`（`?? 'screw'`），存檔即補上。沿用 Plan 4/`reserveCornerSpace` 先例，不寫 migration。

## Risks / Trade-offs

- **peg 不夾持零件**：定位柱只定位/鬆配，不像螺絲把零件壓死。屬預期取捨——使用者明確要「圓柱代替螺絲」，適用免螺絲原型/熱熔柱前置孔。文件（i18n label）用「定位柱」表達語意。
- **peg 尺寸寫死常數**：`PEG_CLEARANCE`/`PEG_HEIGHT` 不開放調整。多數安裝孔 φ2.5–3.5mm，0.2mm 間隙通用；不足再開參數（YAGNI）。
- **peg 頂穿薄件**：`PEG_HEIGHT=4mm` 對超薄安裝耳可能過長，但 3D 列印可自行剪短；不做每件孔深偵測（schema 無孔深資料）。
- **新 capability `enclosure-mounting`**：核心外殼生成本無 spec capability（早於 OpenSpec），此為第一個涵蓋固定機制的 spec，archive 時建立主 spec。
