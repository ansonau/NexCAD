# Design: flat-screw-lid

## Context

`lidGeometry.ts` 的 `buildLidSolid` 螺絲上蓋分支目前為每個角柱位置做：凸柱（`cylinder(postRadius, POST_HEIGHT=4)` 在 `panelZ+panelH` 之上）→ union → 螺絲通孔 difference → 柱頂杯頭沉孔 difference。從外看是四個凸出圓柱塊。面板本身 `panelH = wallThickness` 已是平的，凸柱才是「不平」的來源。

殼體底座那側（`shellGeometry.ts` 經 `generate.ts` 用 `planCornerPosts` 加進 standoffs）是螺絲**接收柱**，負責螺牙咬合，與上蓋是兩個獨立件、合模面對接。本變更**只動上蓋**，底座接收柱不變。

`planCornerPosts(plan, screwSize, parts)` 提供四角螺絲的 XY 位置（inset = `cornerRadius + 3`）。平面蓋的通孔／沉孔就打在這些 XY。

## Goals / Non-Goals

**Goals:**
- 移除凸柱，螺絲上蓋改平整蓋面
- `flatExposed`：薄蓋、杯頭外露（只通孔）
- `flatRecessed`：厚蓋、杯頭完全埋入面板（沉孔）
- 只影響 screw 上蓋；slide/open 與殼體底座接收柱不變
- 舊專案向後相容（無欄位 → `flatRecessed`）

**Non-Goals:**
- 不保留凸柱設計（使用者明確要移除）
- 沉入餘量／沉孔間隙不開放為使用者參數（合理常數，未來要再加）
- 不改滑蓋、開放式、殼體底座、碰撞/擴殼邏輯

## Decisions

**D1 — `EnclosureParams.screwLidProfile?: 'flatExposed' | 'flatRecessed'`，zod `.optional()`，讀取端 `?? 'flatRecessed'`。**
`DEFAULT_ENCLOSURE_PARAMS` 明確帶 `screwLidProfile: 'flatRecessed'`（延續現行杯頭藏起語意）。舊 `.nexcad`/IndexedDB 無欄位 → `flatRecessed`。新 `ScrewLidProfile` 型別由 `document.ts` 匯出。沿用 `mountingStyle`/`reserveCornerSpace` 同款 optional backward-compat 先例。

**D2 — `flatExposed`（薄平面蓋，杯頭外露）幾何。**
面板 `panelH = params.wallThickness`（維持現行薄面板）。每個角柱 XY 打**通孔**：`cylinder(throughRadius, 全深)`，從面板頂上方 1mm（`panelZ + panelH + 1`）貫穿到唇邊底下（`panelZ - LIP_HEIGHT - 1`），`throughRadius = pilotDiameter(screwSize,'through')/2`。無沉孔——杯頭直接坐在蓋頂面外露。

**D3 — `flatRecessed`（厚平面蓋，杯頭藏入）幾何。**
面板加厚 `panelH = spec.socketHeadDepth + SINK_MARGIN + params.wallThickness`（沉孔深 + 沉入餘量 + 底floor）。每個角柱 XY：
- 沉孔：`boreDepth = spec.socketHeadDepth + SINK_MARGIN`，從蓋頂面（`panelZ + panelH`）向下挖 `cylinder(boreRadius, boreDepth + 1)`（+1 讓開口乾淨），杯頭完全埋入面板、頂面下方 `SINK_MARGIN` 處。
- 通孔：同 D2，`throughRadius` 全深貫穿。
- `boreRadius = max(throughRadius, min(spec.socketHeadDiameter/2 + HEAD_CLEARANCE, inset − MIN_SIDE_WALL))`。其中 `inset = plan.cornerRadius + 3`（複刻 `planCornerPosts` 的 inset 公式，即角柱心到殼體外緣的軸向距離）。夾制原因：小 `cornerRadius` + 大螺絲（如 `cornerRadius=0` + M4，inset=3、頭半徑 3.7）下，未夾制的沉孔會breach蓋子側邊；夾在 `inset − MIN_SIDE_WALL` 保留最小側壁。此夾制觸發時杯頭只能部分沉入（可接受的降級，非預設案例：預設 `cornerRadius=3` → inset=6，M4 沉孔半徑 4 < 6−1=5，不觸發）。
常數：`SINK_MARGIN = 0.5`、`HEAD_CLEARANCE = 0.3`、`MIN_SIDE_WALL = 1`，皆加 `ponytail:` 註解。

**D4 — 移除凸柱程式碼。**
刪 `POST_HEIGHT` 常數、凸柱 `union`、柱頂沉孔（含既有 `boreRadius` clamp 邏輯——移到 D3 的平面版）。`buildLidSolid` 螺絲分支改為：面板 union 唇邊後，依 `params.screwLidProfile ?? 'flatRecessed'` 分 D2/D3 兩路。`lidGeometry.test.ts` 既有「螺絲柱凸出面板」「柱頂杯頭沉孔」等斷言改寫為平面蓋斷言（薄蓋通孔存在、厚蓋沉孔埋頭、蓋頂面平整無凸出）。

**D5 — UI：`screwLidProfile` 下拉，僅 `lidType === 'screw'` 顯示。**
`EnclosurePanel` 進階區塊與 `PropertyCard` 外殼參數表各加一個 `<select>`（`flatExposed`/`flatRecessed`），僅螺絲上蓋顯示（slide/open 無此概念）。i18n key `enclosure.screwLidProfile`（zh：「螺絲上蓋樣式」）、`enclosure.lidFlatExposed`（「平面蓋・杯頭外露」）、`enclosure.lidFlatRecessed`（「平面蓋・杯頭藏入」）；en 對應。`PropertyCard` 變更即觸發既有 `regenerateEnclosure`。

**D6 — 與其他參數的互動不變。**
`planShell` 擴殼、`reserveCornerSpace`、`mountingStyle`、底座 `planCornerPosts` 接收柱皆不受影響——本變更只改上蓋面板厚度與四角孔型，不動 XY 佈局或殼體底座。上蓋加厚（`flatRecessed`）只改上蓋自身高度，不影響殼體開口貼合（面板底 `panelZ` 與唇邊不變，加厚往上長）。

## Risks / Trade-offs

- **移除凸柱是破壞性外觀變更**：舊螺絲上蓋專案重新產生後外觀從凸柱變平面蓋；預設 `flatRecessed` 保留「杯頭藏起」語意，屬預期。
- **`flatRecessed` 蓋子偏厚**：M4 面板 = 4.3+0.5+3 = 7.8mm。這正是「厚厚的平面蓋」本意；要薄可選 `flatExposed`。
- **沉孔 breach 側邊的極端案例**：小 `cornerRadius` + 大螺絲，沉孔半徑被 `inset − MIN_SIDE_WALL` 夾制、杯頭只部分沉入。預設參數不觸發，同 Plan 5 沉孔 clamp 的既有降級模式。
- **新 capability `enclosure-lid`**：上蓋外觀本無 spec capability，此為第一個；archive 時建立主 spec。取代 Plan 5 凸柱沉孔外觀（plan 文件非 OpenSpec spec，無 delta 衝突）。
