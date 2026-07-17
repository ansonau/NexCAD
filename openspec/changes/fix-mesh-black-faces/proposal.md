# Proposal: fix-mesh-black-faces

## Why

使用者機器上模型出現「整面黑／破洞」——這是背面剔除（backface culling）的典型症狀：三角形 winding 呈 CW 時，預設 `FrontSide` material 直接剔除該面（破洞），或法線背對光源（整面黑）。manifold-3d 規格上保證輸出 CCW winding，且相同資料在另一環境渲染正常，代表 winding 異常只在特定 GPU/驅動組合下顯現（或由瀏覽器端 index/attribute 解讀差異引起），無法在開發環境穩定重現。渲染層應具備防禦性：CAD 檢視器不應因個別三角形方向性而出現破洞或黑面。

## What Changes

- `SceneMesh`（`src/components/Viewport.tsx`）的 `meshStandardMaterial` 加 `side={THREE.DoubleSide}`：雙面渲染，被判為背面的三角形照常著色，破洞與整面黑消失。
- 與 `fix-mesh-normal-shading`（另一個 change：toNonIndexed + per-face 法線）互補：該修正處理斑駁漸層（法線平均），本修正處理破洞/黑面（culling）。兩者都只動 `Viewport.tsx` 渲染層。

## Capabilities

### New Capabilities

（無）

### Modified Capabilities

- `viewport-rendering`：新增要求——場景 mesh SHALL 以雙面材質渲染，個別三角形的 winding 方向不得造成破洞或整面黑。（與 `fix-mesh-normal-shading` change 同一 capability，該 change 先立此規格，本 change 對其追加 requirement）

## Impact

- 受影響碼：`src/components/Viewport.tsx` 的 `meshStandardMaterial`（一行屬性）。
- 效能：DoubleSide 停用背面剔除，fragment 負載理論上升；本 app 場景三角形量（數萬）下無感，且 CAD 檢視器（含 three.js editor、各大 slicer 預覽）普遍預設雙面。
- 不影響：kernel/worker/匯出管線、選取 raycast（three.js raycast 預設就測雙面）。
