# Proposal: enclosure-collision-safety

## Why

使用者回報產生的外殼出現兩種問題（截圖確認）：零件本體「爆出」殼體邊緣，以及螺絲上蓋的四角柱直接「破進」零件本體。追查後確認是兩個獨立根因，皆非缺少可調參數：

1. **支柱重疊零件（真 bug）**：`planCornerPosts`（`src/enclosure/plan.ts:140-161`）純粹依殼體外形內縮計算四角柱座標，完全不知道零件實際位置，可能把柱子直接放在零件本體佔用的空間裡。
2. **零件爆出殼體（陳舊資料，非幾何 bug）**：使用者確認是「產生外殼後又手動拖動零件位置，未點重新產生」——`sourceParts`（`src/enclosure/actions.ts:59-62`）快照的零件位置與目前 live 位置不同步，殼體幾何本身是對的，只是顯示的是舊零件位置下算出的結果。

## What Changes

- `planCornerPosts` 新增碰撞避讓：算出預設角落位置後，若與任一零件 bounding box（含支柱半徑緩衝）重疊，沿該角落所屬的殼體邊緣搜尋鄰近無碰撞位置；搜尋範圍內找不到就保留原位置並標記碰撞。
- `generateEnclosure`/`regenerateEnclosure` 產生後回傳碰撞結果，UI 以 toast 警告使用者「螺絲柱與零件位置衝突，建議調整零件位置或壁厚」。
- `PropertyCard` 選取外殼節點時，比對 `sourceParts` 快照 transform 與目前 live part transform；不一致時顯示「零件位置已變更，外殼可能過期」提示，引導使用者按重新產生。

## Capabilities

### New Capabilities

- `enclosure-safety`：外殼生成/重新產生時的安全性檢查——支柱與零件碰撞偵測與避讓、外殼與零件位置陳舊偵測。

### Modified Capabilities

（無——`enclosure-safety` 為全新 capability，不修改既有 spec）

## Impact

- 受影響碼：
  - `src/enclosure/plan.ts`（`planCornerPosts` 簽名擴充，新增碰撞避讓邏輯）
  - `src/enclosure/generate.ts` / `src/enclosure/actions.ts`（把碰撞結果往上傳遞給呼叫端）
  - `src/components/EnclosurePanel.tsx`、`src/components/PropertyCard.tsx`（顯示碰撞/過期警告）
  - `src/i18n/zh.json`、`src/i18n/en.json`（新增警告文案）
- 不影響：`shellGeometry.ts`/`lidGeometry.ts` 的實際幾何建構邏輯（柱子半徑/沉孔計算不變，只有柱子 XY 位置來源改變）、匯出管線、既有測試中未涉及碰撞情境的案例。
- 風險：搜尋演算法若邊界條件沒收斂好，可能讓柱子跑到不符合外觀預期的位置；design.md 會明確定義搜尋範圍上限與回退規則。
