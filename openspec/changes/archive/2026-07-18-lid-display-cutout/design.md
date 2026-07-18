# Design: lid-display-cutout

## Context

零件 schema 的 `PartPort` 支援 `face: 'top'`：此時 `x` 為板面 x 偏移、`z` 為板面 y 偏移（見 `schema.ts` 註解），`w`/`h` 為視窗在板面上的寬（x 向）/高（y 向）。OLED 0.96（26×15）與 LCD1602（72×26）都已定義「螢幕視窗」top port。`planPortCutouts`（`portProjection.ts`）只處理側面接口、`if (port.face === 'top') continue`。上蓋由 `buildLidSolid`（`lidGeometry.ts`）生成：平面面板（`flat-screw-lid` 之後無凸柱）+ 唇邊 + 四角螺絲孔；`buildLidSolid` 已接收 `parts`，開窗所需資料齊全。

## Goals / Non-Goals

**Goals:**
- 上蓋依零件 `top` face port 自動開矩形窗（貫穿面板+唇邊）
- `lidDisplayCutout` 選項（預設 true）可關閉
- 與側面接口投影同等限制：僅 90° 倍數旋轉、外接矩形、0.4mm 公差
- 舊專案向後相容（無欄位 → true）

**Non-Goals:**
- 手動開窗框（自訂位置/尺寸）——只用零件定義的 top port
- 圓形窗特殊處理（top port 皆 rect；`shape: 'circle'` 出現時仍以外接矩形挖，與側面接口全域限制一致）
- 窗邊斜角/壓框/透明件槽等進階特徵
- 殼體側牆投影、`open` 上蓋（無蓋面）不動

## Decisions

**D1 — `EnclosureParams.lidDisplayCutout?: boolean`，zod `.optional()`，讀取端 `!== false`。**
`DEFAULT_ENCLOSURE_PARAMS` 明確帶 `lidDisplayCutout: true`。預設開：顯示器裝殼的意義就是看得到螢幕；舊專案（無欄位）重新產生後顯示窗自動開出，屬預期改善（同 `reserveCornerSpace` 預設 true 的先例）。沿用 optional backward-compat 模式。

**D2 — `portProjection.ts` 新增 `planTopWindowCutouts(parts): TopWindowCutout[]`。**
`TopWindowCutout = { x: number; y: number; w: number; h: number }`（世界座標矩形中心+尺寸）。演算法複刻 `planPortCutouts` 的旋轉處理：`angle % 90 !== 0` 跳過；`cos`/`sin` 取整。視窗中心世界座標 = 零件位置 + 旋轉後的 `(port.x, port.z)`；尺寸 `worldW = |w·cos| + |h·sin|`、`worldH = |w·sin| + |h·cos|`（90°/270° 時 w/h 對調），各加 `TOLERANCE_MM × 2`（複用既有常數 0.4）。只收 `face === 'top'` 的 port。放 `portProjection.ts`（旋轉/公差邏輯同居一處），worker-safe 不變。

**D3 — `buildLidSolid` 末端挖窗。**
`params.lidDisplayCutout !== false` 時，對每個 `planTopWindowCutouts(parts)` 矩形挖 `kernel.box(w, h, cutH)`，Z 範圍貫穿整個上蓋：從 `panelZ - LIP_HEIGHT - 1` 到 `panelZ + panelH + 1`（含 flatRecessed 加厚面板與唇邊）。box 原點在底面中心，position = `[cx, cy, panelZ - LIP_HEIGHT - 1]`、高 `panelH + LIP_HEIGHT + 2`。screw 與 slide 上蓋皆適用（兩者都經 `buildLidSolid`；`open` 由呼叫端跳過不生成）。與四角螺絲孔/沉孔的交疊交給 CSG 自然處理（極端大窗+角落重疊屬使用者佈局責任，不阻擋不警告——同側面接口現行行為）。

**D4 — UI：checkbox 進 `EnclosurePanel` 進階區塊與 `PropertyCard`，`lidType !== 'open'` 顯示。**
i18n key `enclosure.lidDisplayCutout`（zh：「上蓋依螢幕視窗開孔」，en："Cut display windows in lid"）。`checked={params.lidDisplayCutout !== false}`，wiring 同 `reserveCornerSpace` checkbox 先例；`PropertyCard` 變更觸發既有 `regenerateEnclosure`。

**D5 — 殼體本體與側面接口投影零改動。**
`planPortCutouts`/`cutPorts`/`shellGeometry.ts`/`generate.ts` 的 shell 路徑不動。`generate.ts` 的 lid 路徑也不需改——`buildLidSolid` 已接收 `parts` 與 `params`，開窗完全內化。

## Risks / Trade-offs

- **預設 true 改變舊專案輸出**：含顯示器的舊專案重新產生後上蓋多出開窗。預期改善（顯示器本該可見），可用 checkbox 關回。
- **窗與螺絲沉孔重疊的極端佈局**：大螢幕（LCD1602 72×26）+ 小殼體時窗可能吃到角落沉孔區。不偵測不警告，CSG 照挖——同側面接口現行「使用者佈局責任」原則，未來要警告再加。
- **top port 目前皆矩形**：圓形 top port 出現時以外接矩形挖，全域限制既有條款已涵蓋。
- **顯示器高度 vs 上蓋位置**：OLED 螢幕頂約 z=2.8、LCD1602 約 8.6，上蓋面板底在 `inner.maxZ`（零件最高點 + margin 之上）——螢幕不會頂到窗，中間有 clearance 空隙；視窗只是「看得到」不是「貼合凸出」。凸出貼合槽屬 Non-Goal。
