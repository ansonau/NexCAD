# Design: viewport-display-tools

## Context

`Viewport.tsx`：`Canvas` + `OrbitControls`（`makeDefault`）+ `SceneMesh` 列表（worker 回傳的 `NodeMeshPayload[]`，只含 visible 節點——`evaluate.ts` 已過濾 `!n.visible`）。場景包在 `rotation={[-Math.PI/2,0,0]}` 的 group 內（CAD Z-up 轉 three Y-up）。`SceneMesh` 材質已依 hole/selected/part 分色。

`NodeCommon` 已有 `visible`/`locked` 欄位、`.nexcad` 序列化已含、`updateNode` 已可改任意欄位——場景樹純缺 UI。drei 已內建 `GizmoHelper`/`GizmoViewcube`/`Edges`（`node_modules` 確認可用，無需新依賴）。

`App.tsx` 為 layout 入口（Toolbar、Viewport、PartsDrawer、PropertyCard 等浮動面板）。現有面板風格：圓角白卡浮動、`text-slate` 色系。

## Goals / Non-Goals

**Goals:**
- 場景樹面板：列節點（group 巢狀縮排）、點列選取（含 shift 多選跟 viewport 一致）、眼睛 toggle `visible`
- ViewCube：drei `GizmoHelper`+`GizmoViewcube`，點擊切換視角
- 外殼 X-ray toggle：enclosure mesh 半透明
- Wireframe toggle：全部 mesh 疊 `Edges`
- 顯示狀態 session-only（不進 document、不持久化）

**Non-Goals:**
- 場景樹拖曳排序/重新父子化、重新命名、鎖定 toggle（`locked` 欄位留給未來）
- X-ray/wireframe 狀態持久化到 `.nexcad`/IndexedDB
- ViewCube 開關選項（恆顯示）
- 正交投影切換、剖面（section plane）

## Decisions

**D1 — `src/store/viewStore.ts`：zustand，session-only。**
```ts
interface ViewState {
  shellXray: boolean;
  wireframe: boolean;
  toggleShellXray: () => void;
  toggleWireframe: () => void;
}
```
不持久化（重新整理歸零）。沿用 `toastStore` 的極簡 zustand 模式。附 `viewStore.test.ts` 單元測試（toggle 行為）。

**D2 — `SceneTreePanel.tsx`：左側浮動面板。**
- 列出 `doc.nodes`（group 的 `children` 遞迴縮排渲染）。每列：類型小標（primitive kind / part / enclosure base/lid / group）+ `name` + 眼睛按鈕。
- 點列 = `setSelection([id])`；shift+點 = toggle 加入/移出多選（複用 viewport 現有邏輯）。選中列高亮（`bg-blue-50` 類）。
- 眼睛按鈕 = `updateNode(id, n => { n.visible = !n.visible })`；隱藏節點列半透明顯示。`stopPropagation` 避免眼睛點擊觸發選取。
- 隱藏後 worker 重算自動把該 mesh 從 viewport 移除（`evaluate.ts` 既有過濾），零額外接線。**這就解決了「零件被外殼包住點不到」**：場景樹直接點選，或先隱藏外殼再操作零件。
- 面板恆顯示於左側（桌面）；沿用現有浮動卡片樣式。位置與 `ProjectsPanel`/工具列不衝突（左側目前空）。可收合（沿用 PartsDrawer 的收合模式）。

**D3 — ViewCube：drei `GizmoHelper` + `GizmoViewcube`。**
`Canvas` 內加：
```tsx
<GizmoHelper alignment="bottom-right" margin={[80, 80]}>
  <GizmoViewcube />
</GizmoHelper>
```
`OrbitControls` 已 `makeDefault`，`GizmoHelper` 自動接上（drei 慣例）。場景的 -90°X group 不影響——ViewCube 反映相機方位，點擊動相機不動場景。面標籤用預設英文（FRONT/TOP…；drei 支援自訂 label 但 i18n 中文貼面 YAGNI，不做）。

**D4 — X-ray：`SceneMesh` 材質分支。**
`Viewport` 讀 `useViewStore((s) => s.shellXray)`，傳 `xray: boolean` prop 給 enclosure 節點的 `SceneMesh`（`findNode(...).type === 'enclosure'`，已有同款 `isPart` 判斷可並列）。X-ray 時：`transparent opacity={0.35} depthWrite={false}`，顏色不變。hole 節點既有半透明邏輯優先（`isHole` 分支不動）。選取高亮色照常作用。

**D5 — Wireframe：drei `Edges` 疊加。**
`SceneMesh` 內 `wireframe` 開啟時在 `<mesh>` 內加 `<Edges threshold={30} color="#334155" />`（30° 折角閾值：平面三角剖分內部邊不畫、真稜線畫）。`Edges` 基於 `EdgesGeometry`，每次 geometry 變更自動重建（drei 處理）。效能：本專案 mesh 量級小（單一外殼+少量零件），可接受；若未來變慢再做 memo/開關降級（`ponytail:` 註解標記）。

**D6 — 顯示切換按鈕。**
Viewport 右上角（EN 切換鈕下方）浮動小按鈕組：X-ray、Wireframe 兩顆 toggle（active 時 `bg-slate-800 text-white` 反白）。i18n key `view.xray`（zh「外殼透視」）、`view.wireframe`（zh「稜線顯示」）、`view.sceneTree`（zh「場景物件」，面板標題）。放 `App.tsx` overlay 層（DOM 按鈕，不進 Canvas）。

## Risks / Trade-offs

- **X-ray 透明排序**：多個半透明 enclosure（base+lid）疊加時 three.js 透明排序可能閃爍；`depthWrite={false}` 緩解，殘餘 artifact 屬可接受視覺代價（檢視用途，非輸出）。
- **Edges 效能**：每 mesh 額外一份 EdgesGeometry；量級小可忽略，未來大場景再優化。
- **場景樹與 viewport 選取雙向同步**：兩邊都走同一個 `documentStore.selection`，天然同步，無額外狀態。
- **隱藏外殼後 stale 警告不受影響**：`visible` 只影響渲染/evaluate，`sourceParts` 快照比對照常運作。
- **ViewCube 貼面英文**：預設 FRONT/TOP 等英文貼面，與 UI 中文並存；自訂中文貼面留未來。
