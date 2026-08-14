## Context

NexCAD 已有「外殼」與「智能小車」等由來源零件驅動的生成式節點。外殼（`EnclosureNode`）以 `sourceParts` 快照來源零件，並在 worker 端以世界座標純函式計算幾何；零件移動後由屬性卡提示「過期」並可重新產生。支架（bracket）本質上是一塊「沒有牆壁與上蓋的外殼底座」：底座平板 + 對齊零件安裝孔的固定柱。因此最自然的做法是沿用外殼的架構與數學工具，而非另起一套。

## Goals / Non-Goals

**Goals:**
- 在工作工具列提供「支架」入口，選取零件後產生 `BracketNode`。
- 底座平板依來源零件的世界座標俯視包覆盒自動計算尺寸，並含四角鎖附孔。
- 每個來源零件安裝孔對應一支固定柱，固定方式沿用外殼的 `mountingStyle` 語意。
- 支架以世界座標計算（節點本身為 identity transform），零件移動後可重新產生並提示過期。
- `bracket` 節點可序列化至 `.nexcad` 並可匯入還原。
- 以單元測試與 UI smoke 涵蓋核心行為。

**Non-Goals:**
- 不做 L 型立式支架、U 型抱箍、卡扣夾持等不同形式（本變更只做「底座 + 固定柱」）。
- 不新增相依套件、不改動外殼現行行為、不做自動偵測「零件已鎖到支架上」的碰撞檢查。
- 不支援零件本體與底座之間的間隙（lift）參數；零件直接坐在底座上（需要時日後再加）。

## Decisions

- 新增節點類型 `bracket`，而非一次生成一堆 primitive。
  - Rationale: 支架需要跟隨零件移動、可重新產生、可編輯參數，與 `enclosure`／`car-anchor` 一致。
  - Alternative considered: 生成 primitive 節點。Rejected 因為無法再編輯參數或重新產生。

- 幾何沿用外殼的數學工具（`partWorldBounds`、`rotatePoint`、`planStandoffs`、`pilotDiameter`）。
  - Rationale: 支架固定柱與外殼支柱是同一種結構，共用可避免兩套算法 drift（與 `computeChassisDefinition` 的共用理由相同）。
  - Alternative considered: 重寫定位/包覆盒計算。Rejected 因為重複且易出錯。

- 支架以零件本地座標計算，再套用來源零件的 transform；`BracketNode.transform` 恆為 identity。
  - Rationale: 在本地座標生成（底座於零件底面下方、固定柱對齊本地安裝孔）後套用 transform，任意旋轉（含繞 X/Y 軸立起）都正確貼合零件；節點本身維持 identity 與外殼一致。
  - Alternative considered: 以零件世界包覆盒（AABB）計算。Rejected 因為零件繞 X/Y 軸旋轉時，AABB 底座會懸空、固定柱高度異常。

- 產生範圍限「選取的零件」，未選取零件時不動作並提示。
  - Rationale: 使用者明確要求「為選擇中的零件建立支架」。與外殼「選取優先、否則全部」不同，支架不應意外為全部零件各建一個。
  - Alternative considered: 未選取時為全部可見零件建立。Rejected 因為語意模糊、容易產生意料之外的節點。

- 底座四角鎖附孔預設開啟，可由 `baseHoles` 關閉。
  - Rationale: 支架的用途是把零件鎖到其他表面上，四角鎖附孔是最通用的固定方式；提供開關讓使用者可改以雙面膠或其他固定方式。

## Risks / Trade-offs

- 使用者可能期望 L 型或抱箍等不同支架形式 → 面板名稱與規格明示「底座 + 固定柱」，日後再以 `bracketStyle` 擴充。
- 零件本體懸空（例如馬達輸出軸不落地）時，固定柱高度會由安裝孔位置決定，可能過長 → 沿用外殼支柱行為，不另做裁切；日後再加 lift/裁切邏輯。
- 多個零件同時選取時固定柱可能互相交疊 → 沿用外殼語意（逐孔長柱），不在此變更處理干涉。

## Migration

- `BracketNode` 為新增類型，舊專案不含此節點，載入時無需遷移；`.nexcad` schema 加入 `bracket` 分支後，舊檔仍可正常解析（union 新增成員不影響既有成員）。
