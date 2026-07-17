# Design: fix-mesh-black-faces

## Context

`src/components/Viewport.tsx` 的 `meshStandardMaterial` 未指定 `side`，取 three.js 預設 `FrontSide`——CW winding 的三角形被剔除。使用者機器出現整面黑/破洞而開發環境正常，症狀只在部分 GPU/驅動下顯現。manifold 規格保證 CCW，但渲染層不該把正確性押在上游保證＋所有硬體行為一致上。

## Goals / Non-Goals

**Goals:**
- 任何 winding 方向的三角形都被渲染（無破洞）、被著色（無整面黑）。
- 一行改動，零架構變化。

**Non-Goals:**
- 不追查使用者機器上 winding 為何被判 CW（無法遠端重現；DoubleSide 後即使真有 CW 三角形也無症狀）。
- 不改 kernel 輸出或加 winding 修正 pass（防禦點放渲染層即可，YAGNI）。

## Decisions

**D1：`side={THREE.DoubleSide}` 而非在 JS 端偵測/翻轉 winding。**

翻轉 winding 需要逐三角形算 signed volume 或依賴法線一致性檢查，複雜且要對 manifold 每次輸出跑一遍；DoubleSide 是渲染層一行、GPU 原生支援、CAD 檢視器業界慣例（slicer 預覽皆雙面）。效能差異在本 app 規模不可量測。

**D2：與 `fix-mesh-normal-shading` 疊加。**

兩個 change 都動 `Viewport.tsx` 的 `SceneMesh`：該 change 動 geometry 建構（法線），本 change 動 material（side）。互不衝突，實作時同檔相鄰改動。

## Risks / Trade-offs

- [DoubleSide 令內腔面在破洞視角下可見，視覺上「看進殼裡」] → 這正是期望行為：破洞處原本顯示背景（更怪），雙面後顯示內壁，符合實體感。
- [背光面照度仍低（黑面殘留）] → `computeVertexNormals` 在 non-indexed geometry 上（另一 change）產生正確 per-face 法線；DoubleSide 材質對背面自動翻法線（three.js 內建 `gl_FrontFacing` 處理），黑面消失。

## Open Questions

（無）
