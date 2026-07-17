# Tasks: fix-mesh-normal-shading

## 1. 實作 flat shading 幾何建構

- [x] 1.1 修改 `src/components/Viewport.tsx` 的 `SceneMesh` `useMemo`：建 indexed geometry 後 `toNonIndexed()` 展開、`dispose()` 中間 geometry、對展開後 geometry 呼叫 `computeVertexNormals()` 並回傳（見 design.md D2 程式碼）
- [x] 1.2 確認 unmount cleanup（既有 `useEffect` dispose）作用於展開後的 geometry，無殘留

## 2. 驗證

- [x] 2.1 `npx vitest run && npx tsc --noEmit && npm run build` 全綠（本改動無單元測試面——渲染層無 kernel 測試慣例，以型別+建置守門）
- [x] 2.2 瀏覽器驗證（dev server port 5174）：放 Arduino Uno + 9V Battery（Y=57）→ 產生外殼（M3 螺絲上蓋、壁厚 3）→ 頂面/側面著色均勻無斑駁、稜邊銳利、杯頭沉孔邊緣清晰
- [x] 2.3 瀏覽器驗證互動：點選各實體確認選取正常（raycast 不受 toNonIndexed 影響）、拖曳 gizmo 移動零件後 mesh 更新無錯誤、Console 全程無錯誤
- [x] 2.4 `npm run test:e2e` 通過（冒煙流程不受渲染層改動影響）
