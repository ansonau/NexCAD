# Tasks: viewport-display-tools

## 1. viewStore + 顯示切換按鈕

- [x] 1.1 新增 `src/store/viewStore.ts`（design.md D1：`shellXray`/`wireframe` + toggle，沿用 toastStore 極簡模式）與 `src/store/viewStore.test.ts`（toggle 行為單元測試）
- [x] 1.2 i18n：`view.xray` / `view.wireframe` / `view.sceneTree`（zh/en）
- [x] 1.3 Viewport 右上角浮動 toggle 按鈕組（X-ray、Wireframe，active 反白；DOM overlay 不進 Canvas，掛在 `App.tsx` 層，design.md D6）

## 2. 場景樹面板

- [x] 2.1 新增 `src/components/SceneTreePanel.tsx`（design.md D2）：列出 `doc.nodes`（group 巢狀縮排）、每列類型標記+名稱+眼睛按鈕、點列選取（shift 多選同 viewport 邏輯）、選中列高亮、隱藏節點半透明、可收合
- [x] 2.2 眼睛按鈕接 `updateNode` toggle `visible`（`stopPropagation` 不觸發選取）；`App.tsx` 掛入面板（左側浮動）
- [x] 2.3 瀏覽器驗證場景樹核心情境：點列選取與 viewport 同步；隱藏外殼後被包住的零件可直接點擊；恢復顯示正常

## 3. Viewport 渲染：ViewCube + X-ray + Edges

- [ ] 3.1 `Viewport.tsx` 加 drei `GizmoHelper`+`GizmoViewcube`（bottom-right，design.md D3）
- [ ] 3.2 `SceneMesh` 加 `xray` prop（enclosure 節點 + `shellXray` 開啟時 `transparent opacity 0.35 depthWrite false`，hole 既有分支優先，design.md D4）
- [ ] 3.3 `SceneMesh` 加 wireframe 分支（drei `<Edges threshold={30}>`，design.md D5）
- [ ] 3.4 瀏覽器驗證：ViewCube 點面切換視角；X-ray 開關外殼透明/恢復、零件不受影響；Wireframe 開關稜線出現/消失、平面內部無雜線

## 4. 驗證

- [ ] 4.1 `npx vitest run && npx tsc --noEmit && npm run build` 全綠
- [ ] 4.2 瀏覽器綜合驗證：四功能同開（場景樹隱藏/顯示 + X-ray + Wireframe + ViewCube 切視角）互不干擾；選取高亮、hole 半透紅、stale 警告等既有行為不變
- [ ] 4.3 X-ray/Wireframe 開啟下匯出 STL 與存檔重開，幾何與文件內容不受影響（session-only 確認）
- [ ] 4.4 `npm run test:e2e` 通過；Console 全程無錯誤
