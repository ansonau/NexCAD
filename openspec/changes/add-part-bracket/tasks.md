## 1. 資料模型

- [x] 1.1 在 `src/types/document.ts` 新增 `BracketParams` 介面（baseThickness、baseMargin、cornerRadius、screwSize、mountingStyle、baseHoles）與 `DEFAULT_BRACKET_PARAMS`。
- [x] 1.2 新增 `BracketNode` 介面（type: 'bracket'，params、sourceParts），加入 `SceneNode` union。
- [x] 1.3 新增 `createBracketNode(...)` factory（identity transform，name 依語言）。

## 2. 支架幾何模組（src/bracket/）

- [x] 2.1 新增 `plan.ts`：`planBracket(parts, params)` 依來源零件世界包覆盒計算底座範圍、floorZ、圓角，以及固定柱與底座鎖附孔位置（沿用 `partWorldBounds`/`planStandoffs`）。
- [x] 2.2 新增 `generate.ts`：`buildBracketNodeSolid(node, kernel)` 建構底座 + 固定柱 + 鎖附孔的 Solid；無來源零件時回傳 null。
- [x] 2.3 固定柱支援 `screw`（柱 + 導孔 + 入口）、`peg`（實心柱 + 定位柱）、`hole`（貫穿孔）三種模式，沿用 `shellGeometry` 的語意。

## 3. 求值與持久化

- [x] 3.1 在 `src/geometry/evaluate.ts` 的 `buildSolid` 加入 `bracket` 分支。
- [x] 3.2 在 `src/persistence/nexcadFile.ts` 新增 `bracketNodeSchema` 並加入 `sceneNodeSchema` union。

## 4. Actions

- [x] 4.1 新增 `src/bracket/actions.ts`：`generateBracket(params)`（選取零件 → 產生節點；未選取時 toast 提示）、`regenerateBracket(nodeId)`。

## 5. UI

- [x] 5.1 在 `WorkflowTools.tsx` 新增「支架」按鈕（lucide 圖示）並接上 panel state。
- [x] 5.2 新增 `BracketPanel.tsx`：底座厚度/邊距/圓角 stepper、螺絲規格與固定方式 select、底座鎖附孔 checkbox、範圍提示、產生按鈕。
- [x] 5.3 在 `PropertyCard.tsx` 新增 `bracket` 分支：過期提示 + 重新產生 + 參數欄位（沿用 enclosure 模式）。
- [x] 5.4 在 `SceneTreePanel.tsx` 的 `typeLabel` 加入 `bracket`。

## 6. 在地化

- [x] 6.1 新增 `bracket` 段落至 `src/i18n/zh.json`（繁中）。
- [x] 6.2 新增 `bracket` 段落至 `src/i18n/en.json`（英文）。

## 7. 驗證

- [x] 7.1 新增 `src/bracket/plan.test.ts`（底座尺寸、固定柱/鎖附孔位置）。
- [x] 7.2 新增 `src/bracket/generate.test.ts`（screw/peg/hole 三模式、體積 > 0）。
- [x] 7.3 新增 `src/bracket/actions.test.ts`（選取產生、重新產生、未選取不動作）。
- [x] 7.4 更新 `src/persistence/nexcadFile.test.ts`（bracket 節點往返）。
- [x] 7.5 新增/更新 UI smoke（工作工具列開啟支架面板）。
- [x] 7.6 執行 `npm run build` 與 `npm test` 確認通過。
