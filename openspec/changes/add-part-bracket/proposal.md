## Why

NexCAD 目前能為零件產生外殼，但使用者想把零件固定在牆面、框架或另一塊板件上時（例如把超音波感測器、伺服馬達鎖在機器人結構上），沒有任何工具可以生成專用的固定支架。使用者只能徒手堆疊基本形狀，既不精準也容易出錯。加入「支架」工具後，選取零件即可一鍵生成對齊零件安裝孔的固定支架，符合「零件優先、自動生成」的產品定位。

## What Changes

- 在工作工具列新增「支架」入口，開啟支架設定面板。
- 選取一個或多個零件後，產生一個新的 `bracket` 節點：由底座平板（含四角鎖附孔）與對應零件安裝孔的固定柱組成。
- 支架固定柱沿用外殼的 `mountingStyle`（螺絲柱／定位柱／螺絲孔）語意，讓固定方式與外殼一致。
- 支架以來源零件的世界座標為基準計算幾何，零件移動或旋轉後可重新產生（沿用外殼的過期提示與重新產生模式）。
- `bracket` 節點可序列化至 `.nexcad` 檔並可匯入還原。

## Capabilities

### New Capabilities

- `part-bracket`: 定義支架節點、支架幾何、支架產生/重新產生行為，以及支架設定面板。

### Modified Capabilities

- `enclosure-mounting`: 支架固定柱沿用其 `mountingStyle`（`screw`／`peg`／`hole`）語意，但不更動外殼本身的現行行為。

## Impact

- Affected UI: 工作工具列、新的支架設定面板、屬性卡（支架參數編輯）、場景樹（`bracket` 型別標籤）。
- Affected state: 文件資料模型新增 `BracketNode` 與 `BracketParams`；文件 store 的 selection 導向動作。
- Affected geometry: 新增 `src/bracket/` 幾何模組，並在求值路徑 `src/geometry/evaluate.ts` 加 `bracket` 分支。
- Affected persistence: `.nexcad` 檔 schema 加入 `bracket` 節點。
- Affected tests: 支架 plan/generate/actions 單元測試、.nexcad 往返測試、工作工具列 UI smoke。
- No new runtime dependencies are expected.
