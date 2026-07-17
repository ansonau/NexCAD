# Design: fix-mesh-normal-shading

## Context

`src/components/Viewport.tsx` 的 `SceneMesh` 目前這樣建幾何（第 90-96 行）：

```ts
const g = new THREE.BufferGeometry();
g.setAttribute('position', new THREE.BufferAttribute(payload.positions, 3));
g.setIndex(new THREE.BufferAttribute(payload.indices, 1));
g.computeVertexNormals();
```

`payload` 來自 worker 的 `manifoldKernel.toMesh()`，即 manifold-3d `getMesh()` 的原始輸出。manifold 的 mesh 是拓撲合併過的：一個立方體角落頂點被三個互相垂直的面共用。`computeVertexNormals()` 對共享頂點把所有相鄰面的法線相加後正規化，結果銳邊兩側面的法線互相摻混——平坦面不再有均勻法線，出現大片漸層斑駁（使用者回報的「破破爛爛」）。artifact 的視覺嚴重度依 GPU 精度、視角、光照角度而異，因此不同機器觀感差異大。

## Goals / Non-Goals

**Goals:**
- 平坦面著色均勻、90° 稜邊視覺銳利（flat shading，per-face 法線）。
- 只動渲染層；worker、kernel、匯出管線、測試全部不碰。

**Non-Goals:**
- 不做 crease-angle 混合著色（依角度決定 smooth/flat）——本 app 全是 CSG 稜角實體，全面 flat 即正確，YAGNI。
- 不改 `MeshData` 介面或 worker 傳輸格式。
- 不處理曲面（圓柱側面）的分段可見性——48 段圓柱 flat shading 後每段可見稜線，屬 CAD 檢視慣例可接受（SEGMENTS=48 已夠細）。

## Decisions

**D1：`toNonIndexed()` + `computeVertexNormals()`，而非 `flatShading: true` material flag。**

兩者視覺效果等價（three.js 的 `flatShading` 在 fragment 階段用螢幕空間導數算 per-face 法線）。選 `toNonIndexed()` 因為：(a) 幾何離線算好法線，不依賴 shader derivative 的精度（低階 GPU 上 `flatShading` 的 dFdx/dFdy 有精度差異，而本 bug 恰好是「不同機器觀感不同」，要選確定性最高的方案）；(b) `flatShading` 對既有共享頂點 geometry 仍上傳被平均污染的 normal attribute（雖不使用），留一個 material 開關依賴。缺點是頂點記憶體約 ×3，本 app 規模下無感。

替代案 `flatShading: true`（一行改動）被否決：理由如上 (a)——確定性優先。

**D2：在 `useMemo` 內展開，直接對 indexed geometry 呼叫 `toNonIndexed()` 後丟棄原 geometry。**

```ts
const indexed = new THREE.BufferGeometry();
indexed.setAttribute('position', new THREE.BufferAttribute(payload.positions, 3));
indexed.setIndex(new THREE.BufferAttribute(payload.indices, 1));
const g = indexed.toNonIndexed();
indexed.dispose();
g.computeVertexNormals();
return g;
```

`toNonIndexed()` 回傳新 geometry；原 indexed geometry 立即 `dispose()` 免 GPU 資源洩漏。既有的 unmount cleanup（`useEffect` dispose）照舊作用在展開後的 geometry 上。

## Risks / Trade-offs

- [頂點數 ×3，GPU 上傳量增加] → 外殼級模型 ~7k 三角形 = 21k 頂點 ≈ 250KB position+normal，遠低於任何現代 GPU 壓力線；不做任何預優化。
- [`toNonIndexed()` 之後 raycast/選取行為改變？] → three.js raycast 對 non-indexed geometry 完全支援（逐三角形測試不依賴 index）；行為不變。
- [圓柱側面出現分段稜線] → SEGMENTS=48 下每段 7.5°，視覺上接近平滑；若未來嫌明顯，屬後續 crease-angle 功能，非本修正回歸。

## Open Questions

（無）
