# Proposal: fix-mesh-normal-shading

## Why

使用者回報場景內所有模型外觀「破破爛爛」（平面上出現斑駁漸層、邊緣髒污感），且 reload／新專案／清快取／無痕模式都無法消除。診斷指向 `Viewport.tsx` 的法線生成方式：manifold-3d 的 `getMesh()` 回傳「頂點跨面共享」的 indexed mesh（同一頂點被相鄰的垂直面與水平面共用），而目前程式對它直接呼叫 `BufferGeometry.computeVertexNormals()`——該函數把共享頂點的法線做平均，導致 90° 銳邊兩側的法線被摻混，平坦面出現整片漸層污漬般的 smooth-shading artifact。嚴重程度依 GPU／視角／光照而異，因此在不同機器上觀感差異大，但根因是同一個：CAD 稜角模型不能用共享頂點平均法線來著色。

## What Changes

- 修改 `SceneMesh`（`src/components/Viewport.tsx`）的幾何建構：indexed mesh 先 `toNonIndexed()` 展開（每個三角形擁有獨立頂點），再 `computeVertexNormals()`，得到 per-face 法線（flat shading），平面純平、稜角銳利。
- 不改 worker／kernel 層——`manifoldKernel.toMesh()` 的輸出格式維持不變（positions + indices），STL/3MF 匯出管線不受影響。
- 記憶體代價：非索引展開後頂點數 = 三角形數 × 3（原本共享頂點約省 50-80%），對本 app 的 mesh 規模（數千至數萬三角形）可忽略。

## Capabilities

### New Capabilities

（無——這是渲染品質修正，不新增能力）

### Modified Capabilities

- `viewport-rendering`：場景 mesh 的著色要求從「未定義（隱含 smooth shading）」改為「CAD 稜角模型必須以 per-face 法線呈現：平坦面著色均勻、銳邊清晰，不得出現跨銳邊的法線平均漸層」。（`openspec/specs/` 目前為空，此為首次為該行為立規格）

## Impact

- 受影響碼：`src/components/Viewport.tsx` 的 `SceneMesh` component（`useMemo` 幾何建構區塊，約 6 行）。
- 不影響：`src/geometry/`（kernel/worker/評估管線）、匯出管線（STL/3MF 用的是 `MeshData` 原始資料，非 three.js geometry）、選取／raycast（`toNonIndexed` 後的 mesh 照常可被 raycast）。
- 風險：頂點數增加使 GPU 上傳量變大；以現有模型規模（外殼 ~7k 三角形）微不足道。
