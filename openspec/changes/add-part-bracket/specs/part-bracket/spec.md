## ADDED Requirements

### Requirement: 工作工具列提供支架工具並為選取零件建立支架

系統 SHALL 在工作工具列提供「支架」入口，點擊開啟支架設定面板。使用者選取一個或多個零件後，可產生一個 `bracket` 節點：由底座平板與對應零件安裝孔的固定柱組成。未選取任何零件時 SHALL 不產生支架並顯示提示。

#### Scenario: 選取零件後產生支架

- **WHEN** 使用者選取一個或多個零件節點並執行「建立支架」
- **THEN** 場景新增一個 `bracket` 節點，其 `sourceParts` 記錄選取零件的快照，且新節點成為目前選取

#### Scenario: 未選取零件不產生支架

- **WHEN** 使用者未選取任何零件即執行「建立支架」
- **THEN** 不新增任何節點，並顯示提示要求先選取零件

### Requirement: 底座平板尺寸依來源零件自動計算

支架底座 SHALL 依來源零件在世界座標下的俯視包覆盒向外擴張 `baseMargin`，厚度為 `baseThickness`，四邊圓角為 `cornerRadius`。支架以世界座標計算，`BracketNode.transform` 恆為 identity。當來源零件的位置或旋轉改變後，支架 SHALL 顯示過期提示並可重新產生。

#### Scenario: 底座包住零件俯視範圍

- **WHEN** 為一個零件建立支架
- **THEN** 底座在 XY 平面的範圍等於零件世界包覆盒向外擴張 `baseMargin`，厚度等於 `baseThickness`

#### Scenario: 零件移動後支架可重新產生

- **WHEN** 來源零件的位置或旋轉已改變且支架節點被選取
- **THEN** 屬性卡顯示過期提示，使用者可重新產生使支架幾何對齊零件最新位置

### Requirement: 固定柱對應零件安裝孔

每個來源零件的安裝孔（`standoff !== false`）SHALL 在對應世界座標位置生成一支固定柱。固定柱的固定方式 SHALL 依 `mountingStyle` 決定：`'screw'` 生成含自攻導孔的螺絲柱、`'peg'` 生成實心柱與插入零件安裝孔的定位柱、`'hole'` 僅在底座上貫穿螺絲淨空孔而不長柱。未設定時 SHALL 視為 `'screw'`。

#### Scenario: 螺絲模式生成含導孔的固定柱

- **WHEN** `mountingStyle` 為 `'screw'` 或未設定
- **THEN** 每個零件安裝孔下方生成一支固定柱並在柱頂鑽自攻導孔

#### Scenario: 定位柱模式生成實心柱與定位柱

- **WHEN** `mountingStyle` 為 `'peg'`
- **THEN** 每個零件安裝孔下方生成實心固定柱，柱頂再長一段定位圓柱插入零件安裝孔

#### Scenario: 螺絲孔模式僅貫穿底座

- **WHEN** `mountingStyle` 為 `'hole'`
- **THEN** 每個零件安裝孔對應的底座位置貫穿一個螺絲淨空孔，不生成固定柱

### Requirement: 底座四角鎖附孔

當 `baseHoles` 為 true（預設）時，支架底座 SHALL 在四角生成貫穿底座的鎖附孔，孔徑依 `screwSize` 的通孔徑決定。當 `baseHoles` 為 false 時 SHALL 不生成鎖附孔。

#### Scenario: 預設生成四角鎖附孔

- **WHEN** `baseHoles` 為 true 或未設定
- **THEN** 底座四角各有一個貫穿鎖附孔

#### Scenario: 關閉鎖附孔

- **WHEN** `baseHoles` 為 false
- **THEN** 底座不生成任何鎖附孔

### Requirement: 支架節點可序列化與匯入

`bracket` 節點 SHALL 可序列化至 `.nexcad` 檔，且載入時可完整還原其 `params` 與 `sourceParts`。舊版專案檔不包含 `bracket` 節點時 SHALL 仍可正常解析。

#### Scenario: 往返序列化

- **WHEN** 一個含 `bracket` 節點的文件被匯出為 `.nexcad` 後再匯入
- **THEN** 支架節點與其參數、來源零件快照完整還原

#### Scenario: 舊檔仍可解析

- **WHEN** 載入不包含 `bracket` 節點的舊版專案檔
- **THEN** 檔案解析成功，其餘節點不受影響
