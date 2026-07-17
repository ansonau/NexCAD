# Design: corner-post-shell-expansion

## Context

`enclosure-collision-safety`（已 archive）為角柱加了向外推的避讓搜尋（舊 design.md D2）。實測發現預設參數下必觸發：角柱 inset（cornerRadius+3）與零件角到外緣距離（clearanceMargin+wallThickness）在預設值下同為 6mm，柱心正好壓在零件 bounding box 角上；避讓把柱子外推後柱體凸出殼外 ~3.7mm（final review 的 Minor finding，實際為預設必現）。根本幾何限制：牆到零件間隙 6mm < 柱徑 ~9.4mm，位移策略無解。使用者決策：預設改為「擴大殼體保留角柱空間」，並提供進階選項關閉（關閉時回舊行為＋只在嚴重重疊時警告）。

## Goals / Non-Goals

**Goals:**
- 螺絲上蓋預設產出「正常長方形盒子」：柱體完全在殼內、不與零件 bounding box 重疊
- 移除位移式避讓（柱子永遠在角落標準位置）
- `reserveCornerSpace` 選項（預設 true）可關閉自動加大
- 關閉時僅嚴重重疊（柱心進入零件 bbox 內部）警告，邊角相切不警告
- 舊 `.nexcad` / IndexedDB 專案 backward-compat（無欄位視為 true）

**Non-Goals:**
- 非對稱擴殼（只擴有碰撞的那一側）——一律四邊均勻擴，保持零件置中
- 逐柱獨立最佳化或非角落柱位
- 滑蓋/開放式上蓋（無角柱，不受影響）
- Z 軸空間保留

## Decisions

**D1 — 擴殼計算放在 `planShell` 內部，所有呼叫端自動一致。**
`planShell(parts, params)` 已接收全部所需輸入。當 `params.lidType === 'screw' && params.reserveCornerSpace !== false` 時，以迭代法找最小擴量 `e`（0.5mm 步進，上限 12mm）：對每個候選 `e`，算出擴大後的 outer 與四個角柱標準位置（inset = cornerRadius+3，cornerRadius 需以擴大後尺寸重新 clamp），檢查每支柱心到每個零件 XY bbox 的距離 ≥ collisionRadius（沿用既有 `circleOverlapsBounds` 與 D1 保守半徑公式 `pilotDiameter(through)/2 + max(wallThickness, standoffWallPadding)`）。找到即停；`e` 同時加到 inner 與 outer 的 X/Y 四邊（Z 不動）。`generate.ts`、`lidGeometry.ts`、`actions.ts` 皆經由 `planShell` 取得 plan，無需各自處理。預設 Arduino Uno + M3 案例：需 `e ≥ 4.7/√2 ≈ 3.33` → 迭代得 3.5mm，長寬各 +7mm。
（捨棄封閉式公式：多零件任意位置下每柱最近 bbox 不同，迭代 25 步 × 4 柱 × N 零件的純數學檢查成本可忽略，且直接重用碰撞測試函式，無公式與測試不同步風險。）

**D2 — `planCornerPosts` 刪除搜尋演算法，柱位固定。**
移除 `searchOffset`、方向/headroom 計算整段；柱子永遠在 `inset = cornerRadius+3` 的標準角落位置。`collided` 語意變更：柱心（點，非圓）**嚴格落入**任一零件 XY bbox 內部（`minX < x < maxX && minY < y < maxY`）時為 true。預設案例柱心恰在 bbox 角上（邊界）→ 不算內部 → 關閉保留空間時不誤報。開啟保留空間時，正常情況擴殼已保證無碰撞；迭代達 12mm 上限仍無解（零件塞滿整殼的極端案例）時柱子留在原位，`collided` 依同一嚴重重疊條件判定，警告 toast 照常觸發——安全網保留。

**D3 — `EnclosureParams.reserveCornerSpace?: boolean`，zod `.optional()`，預設 true。**
`DEFAULT_ENCLOSURE_PARAMS` 明確帶 `reserveCornerSpace: true`。讀取端（`planShell`、UI）以 `!== false` 判定，undefined（舊專案）等同 true。`.nexcad` zod schema 加 optional 欄位即向後相容；IndexedDB 舊資料同理（無需 migration，沿用 Plan 4 `standoffWallPadding` 的處理先例：首次編輯自動補上）。

**D4 — UI：checkbox 進 `EnclosurePanel` 進階區塊與 `PropertyCard` 外殼參數表。**
僅 `lidType === 'screw'` 時顯示（其他上蓋無角柱）。i18n key `enclosure.reserveCornerSpace`（zh：「自動加大外殼容納螺絲柱」/ en："Auto-expand shell to fit screw posts"）。`PropertyCard` 改動即觸發既有 `regenerateEnclosure` 流程，與其他參數欄位一致。

**D5 — `actions.ts` 的 `warnIfCornerPostsCollide` 邏輯不變。**
仍是 `posts.some(p => p.collided)` → toast。語意變更完全由 `planCornerPosts` 的新 `collided` 條件承載，store 層零改動（i18n 訊息沿用 `enclosure.collisionWarning`）。

## Risks / Trade-offs

- **盒子變大**（預設案例長寬各 +7mm）：使用者明確選擇的取捨；關閉選項可回舊尺寸。
- **既有專案重新產生後尺寸改變**：`reserveCornerSpace` 預設 true 對舊專案生效，重新產生的外殼會變大。屬預期行為（修 bug），PropertyCard 可關閉。
- **迭代上限 12mm**：超極端案例（零件塞滿整殼）擴不夠——柱子留原位＋警告，與現行安全網等價，不會更差。
- **`enclosure-safety` spec 的「自動避讓」requirement 被整個替換**：delta spec 用 MODIFIED 標記，archive 時同步主 spec。
