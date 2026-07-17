# Proposal: corner-post-shell-expansion

## Why

`enclosure-collision-safety` 引入的角柱避讓演算法在預設參數下有嚴重副作用：角柱錨點 inset（cornerRadius+3=6mm）與零件角到殼體外緣的距離（margin+wall=6mm）恰好相等，柱心正好落在零件 bounding box 角上，因此**預設 Arduino Uno 案例的四支角柱全部判定碰撞**並被向外推 ~5mm——柱體（半徑 ~4.7mm）凸出殼外 ~3.7mm，上蓋與底座四角出現外凸圓筒/喇叭腳，盒子不再是使用者期待的「正常長方形」。幾何上牆到零件的 6mm 間隙塞不下 9.4mm 直徑的柱子，搬柱子位置無解。

## What Changes

- **BREAKING（幾何輸出）**：螺絲上蓋類型預設**自動加大外殼**——`planShell` 為四個角柱保留空間（長寬各約 +7mm），柱體完全在殼內、不與零件重疊、盒子維持長方形。
- 移除角柱向外推的避讓搜尋（D2 演算法整段刪除）：柱子永遠在角落標準位置（inset = cornerRadius+3），不再位移。
- 新增 `EnclosureParams.reserveCornerSpace?: boolean`（預設 `true`）：進階選項可關閉自動加大；關閉時柱子維持角落原位（舊行為），僅在**嚴重重疊**（柱心進入零件 bounding box 內部）時顯示既有碰撞警告 toast，輕微邊角相切不警告。
- `EnclosurePanel` 進階區塊與 `PropertyCard` 外殼參數表新增該選項的 checkbox（zh/en i18n）。
- `.nexcad` schema 與 IndexedDB 讀取需 backward-compat：舊專案無此欄位時視為 `true`。

## Capabilities

### New Capabilities

（無）

### Modified Capabilities

- `enclosure-safety`: 「上蓋角柱自動避讓零件碰撞」requirement 整個被替換——避讓策略從「位移柱子」改為「擴大殼體保留空間」；碰撞警告觸發條件從「搜尋失敗」改為「關閉保留空間且柱心進入零件範圍」。

## Impact

- `src/enclosure/plan.ts`：`planShell` 加入角柱空間保留計算；`planCornerPosts` 移除搜尋演算法、改為固定位置 + 嚴重重疊偵測；`StandoffPlan.collided` 語意變更
- `src/enclosure/actions.ts`：碰撞警告條件跟隨 `reserveCornerSpace`
- `src/types/document.ts`：`EnclosureParams` 新欄位 + zod backward-compat
- `src/components/EnclosurePanel.tsx`、`src/components/PropertyCard.tsx`：新選項 UI
- `src/i18n/zh.json`、`src/i18n/en.json`：新 label key
- 測試：`plan.test.ts` 避讓相關測試改寫、`actions.test.ts` 警告條件更新、`nexcadFile.test.ts` backward-compat 回歸
