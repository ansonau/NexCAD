# NexCAD Object-first CAD Sidebar Design

日期：2026-07-24
狀態：已獲用戶批准

## 1. 摘要

NexCAD 左欄改為 **Object-first CAD Sidebar**：以場景物件管理為核心，讓界面更像專業 CAD / 圖層管理面板，而不是新手流程或零件商店。

已確認方向：

- 左欄第一優先：`Objects / Scene Tree`
- 零件加入：保留快速入口，但不長期佔滿左欄
- 工作工具：放在低優先級 accordion
- 流程提示：留在 viewport 左下角，不佔左欄

## 2. 設計目標

- 讓左欄第一眼像 CAD object/layer manager。
- 使用者不需要切 Tab 才看到場景物件。
- 保留加入零件、產生外殼、智能小車、螺絲工具入口。
- 減少目前 Tab + accordion 的層級感，避免「面板裡再藏面板」。
- 不改動 3D viewport、幾何生成、selection store、匯出流程。

## 3. 左欄資訊架構

左欄由上至下：

1. **Header / Quick Add**
   - 顯示簡短標題，例如 `Objects`
   - 提供 `Add Part` 快速入口
   - 點擊後展開 compact parts library，不在 header 長期顯示搜尋欄

2. **Objects**
   - 常駐顯示
   - 顯示所有 scene nodes
   - 保留 type label、名稱、選取、顯示/隱藏、刪除
   - 空專案時顯示專業空狀態與加入零件快捷入口

3. **Parts Library**
   - 預設 collapsed
   - 展開後顯示分類和搜尋
   - 不作為左欄主體長期佔用高度

4. **Tools**
   - accordion 區塊
   - 包含 `產生外殼`、`智能小車`、`螺絲工具`
   - 屬於次要操作，不搶 Objects 的主視覺位置

## 4. 行為設計

### 4.1 空專案

空專案時左欄仍以 Objects 為主，不顯示大片空白。

建議內容：

- 標題：`No objects yet` / `尚未加入任何物件`
- 說明：提示先加入零件或基本幾何
- 主操作：`Add Part`

### 4.2 加入零件

使用者可從左欄快速開啟 compact parts library：

- 點 `Add Part` 展開零件庫
- 搜尋 Arduino Nano 等常用零件
- 點零件後加入 scene，Objects 立即更新

加入零件應維持 1-2 次操作內完成。

### 4.3 管理物件

Objects 區應支援目前已有能力：

- 點擊選取物件
- shift-click 多選
- 顯示目前選取狀態
- 切換可見性
- 刪除物件
- group child indentation

這些能力是左欄的主功能，不應被 Tab 隱藏。

### 4.4 工作工具

`產生外殼`、`智能小車`、`螺絲工具` 保留在左欄，但降低視覺權重：

- 放在 Tools accordion
- 預設可收合
- 點擊後沿用現有 panel / dialog 行為

## 5. 視覺方向

視覺語氣維持 Clean Engineering，但比目前更偏 CAD 管理面板：

- 左欄減少大卡片堆疊
- 使用 flatter panel、細分隔線、較高列表密度
- Objects 列表是主體
- Parts / Tools 以次級區塊呈現
- 選取狀態使用現有藍色 accent
- 保留鍵盤 focus ring 和 hover feedback

不採用：

- 大型教學 wizard 佔用左欄
- 三個同等重量的大 Tab
- 260px 內再增加 icon rail
- 新 UI framework 或新 dependency

## 6. 響應式原則

桌面：

- 左欄固定為 object-first panel
- Objects 常駐
- Parts / Tools 可展開

窄畫面：

- 保留現有 overlay / drawer 模式
- 不強行塞入桌面版 object-first layout
- 確保加入零件、選取物件、產生外殼仍可操作

## 7. 非目標

本工程不包含：

- 完整自訂 sidebar layout
- 拖拉調整左欄區塊高度
- 新增圖層系統資料模型
- 重新設計右欄屬性面板
- 重寫 SceneTreePanel selection 行為
- 改動 geometry worker 或 STL export

## 8. 驗收標準

- 左欄第一眼看起來像 CAD object/layer manager。
- 不需要切 Tab 才能看到場景物件。
- 空專案左欄提供清楚的 Add Part 入口。
- 加入零件不超過 1-2 次操作。
- 產生外殼、智能小車、螺絲工具仍可從左欄找到。
- Project flow 保留在 viewport 左下角，不佔左欄。
- `npx tsc --noEmit` 通過。
- `npx vitest run src/i18n/resources.test.ts` 通過。
- `npx playwright test e2e/smoke.spec.ts` 通過。
