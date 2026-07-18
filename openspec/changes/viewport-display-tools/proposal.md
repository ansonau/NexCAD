# Proposal: viewport-display-tools

## Why

Viewport 目前只有「軌道旋轉 + 點擊選取」：(1) 沒有場景樹/物件清單——零件被外殼包住後點不到（backlog 反覆遭遇的 UX 缺口，多次驗證都得用 open 上蓋繞路）；(2) 沒有視角快速切換（頂視/側視要手動轉）；(3) 外殼不透明，看不到裡面零件佈局；(4) 無稜線顯示，平面交界在同色下難以辨認。使用者要求一次補齊四項 Viewport/Display 功能。

## What Changes

- **場景樹面板**：側邊物件清單，列出所有節點（含 group 巢狀），每列可點擊選取（同步 viewport 選取）、眼睛圖示切換 `visible`。`visible`/`updateNode` 既有基礎已齊（evaluate/enclosure actions 都已過濾 invisible），純加 UI。解決「零件被外殼包住點不到」。
- **ViewCube 視角方塊**：viewport 角落方塊導航（drei 內建 `GizmoHelper` + `GizmoViewcube`），點面/邊/角快速切換視角。
- **外殼 X-ray 模式**：toggle 開啟後外殼節點（enclosure）改半透明渲染，零件維持不透明，不拆蓋即可檢視內部佈局。
- **Wireframe on Shade**：toggle 開啟後所有 mesh 疊加稜線（drei `Edges`），實體著色+邊線的 CAD 風格顯示。
- 新增 `useViewStore`（zustand，session-only 不持久化）：`shellXray`/`wireframe` 兩個 boolean。ViewCube 與場景樹恆顯示，無需開關（YAGNI）。
- Viewport 疊加顯示切換按鈕（X-ray、Wireframe），zh/en i18n。
- 文件 schema、worker、`.nexcad` 持久化零改動（`visible` 本就在 schema 與序列化內）。

## Capabilities

### New Capabilities

- `viewport-display`: 場景樹選取/顯示切換、ViewCube 視角導航、外殼 X-ray、稜線疊加等 viewport 顯示工具。

### Modified Capabilities

（無——`viewport-rendering` 的法線/雙面渲染 requirement 不受影響）

## Impact

- `src/store/viewStore.ts`（新）：`shellXray`/`wireframe` UI 狀態
- `src/components/SceneTreePanel.tsx`（新）：場景樹面板
- `src/components/Viewport.tsx`：ViewCube、X-ray 材質分支、Edges 疊加、顯示切換按鈕
- `src/App.tsx`（或對應 layout 檔）：掛入 SceneTreePanel
- `src/i18n/zh.json`、`src/i18n/en.json`：新 label key
- 測試：viewStore 單元測試；場景樹/viewport 為 UI 層，主要靠瀏覽器驗證（本專案慣例：R3F 元件無單元測試）
