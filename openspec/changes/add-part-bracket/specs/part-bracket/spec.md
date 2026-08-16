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

支架 SHALL 在來源零件的本地座標計算：底座＝零件本體俯視尺寸向外擴張 `baseMargin`、厚度 `baseThickness`、四邊圓角 `cornerRadius`，再套用來源零件的 transform 放到世界座標（`BracketNode.transform` 恆為 identity）。因此零件任意旋轉（含繞 X/Y 軸立起）時支架仍貼合零件。當來源零件的位置或旋轉改變後，支架 SHALL 顯示過期提示並可重新產生。

#### Scenario: 底座包住零件俯視範圍

- **WHEN** 為一個平放的零件建立支架
- **THEN** 底座在 XY 平面的範圍等於零件本體俯視範圍向外擴張 `baseMargin`，厚度等於 `baseThickness`

#### Scenario: 零件旋轉後支架貼合零件

- **WHEN** 來源零件繞 X 或 Y 軸旋轉（零件立起）後建立支架
- **THEN** 支架仍以零件本地座標生成並隨零件旋轉，底座與固定柱正確對齊零件安裝孔（不懸空、不產生異常長柱）

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

當 `baseHoles` 為 true（預設）時，支架底座 SHALL 在四角生成貫穿底座的鎖附孔。鎖附孔 SHALL 落在零件本體外側的鎖附帶（`baseMargin`）內，使螺絲孔不被零件本體遮住。鎖附孔螺絲規格 SHALL 可由 `baseHoleScrewSize` 指定（未設定時沿用 `screwSize`），孔距底座邊緣的內縮量 SHALL 可由 `baseHoleInset` 指定（未設定時用 `baseMargin/2`）。此規格適用於底座型、L 型與 U 型三種樣式。當 `baseHoles` 為 false 時 SHALL 不生成鎖附孔。

#### Scenario: 預設生成四角鎖附孔且位於零件外側

- **WHEN** `baseHoles` 為 true 或未設定
- **THEN** 底座四角各有一個貫穿鎖附孔，且孔心位於零件本體俯視範圍之外

#### Scenario: 鎖附孔螺絲規格可獨立指定

- **WHEN** `baseHoleScrewSize` 已設定
- **THEN** 底座鎖附孔孔徑依 `baseHoleScrewSize` 的通孔徑決定，不影響零件固定柱的 `screwSize`

#### Scenario: 鎖附孔內縮量可調整

- **WHEN** `baseHoleInset` 已設定
- **THEN** 底座鎖附孔孔心距底座邊緣的距離為 `baseHoleInset`

#### Scenario: 關閉鎖附孔

- **WHEN** `baseHoles` 為 false
- **THEN** 底座不生成任何鎖附孔

### Requirement: 零件四周定位擋牆

支架 SHALL 支援在零件四周生成定位擋牆（`wallHeight` > 0 時）：擋牆為包住零件本體俯視輪廓的環形牆，高度 `wallHeight`、壁厚 `wallThickness`、與零件本體間隙 `wallClearance`，自底座頂面（零件底面）向上生成。擋牆外緣 SHALL 不超出底座範圍。此功能 SHALL 讓無安裝孔的零件也能被支架固定。

#### Scenario: 開啟擋牆生成環形定位牆

- **WHEN** `wallHeight` 大於 0
- **THEN** 底座上生成包住零件本體輪廓的環形擋牆，其內緣與零件本體保持 `wallClearance` 間隙、壁厚 `wallThickness`、高度 `wallHeight`

#### Scenario: 擋牆預設關閉

- **WHEN** `wallHeight` 為 0 或未設定
- **THEN** 不生成任何擋牆（僅底座與固定柱/鎖附孔）

#### Scenario: 無安裝孔的零件以擋牆固定

- **WHEN** 選取的零件沒有任何安裝孔，且使用者開啟擋牆
- **THEN** 支架仍可固定零件（擋牆包住零件），且設定面板顯示「此零件沒有安裝孔」的提示

### Requirement: 支架樣式可選底座型、L 型立式與 U 型抱箍

支架 SHALL 提供 `style` 選項：`'base'`（底座型，零件平放於底座）、`'l'`（L 型立式：垂直背板 + 水平底座，零件直立鎖在背板、感測面朝前）、`'u'`（U 型抱箍：兩片側牆 + 底座，零件直立夾在中間、感測面朝前露出）。未設定時 SHALL 視為 `'base'`。支架 SHALL 一律在零件本地座標生成並套用零件 transform（依零件目前朝向）。

#### Scenario: L 型支架讓零件直立感測朝前

- **WHEN** 使用者將零件旋轉為直立（感測面朝前）並以 `style: 'l'` 建立支架
- **THEN** 生成垂直背板（零件安裝孔對應的鎖附孔）＋水平底座（含底座鎖附孔），零件直立鎖在背板上

#### Scenario: U 型抱箍夾住零件

- **WHEN** 使用者以 `style: 'u'` 建立支架
- **THEN** 生成兩片側牆＋底座，零件直立夾在兩側牆之間，感測面朝前露出

#### Scenario: 未設定樣式時為底座型

- **WHEN** `style` 未設定
- **THEN** 行為等同 `style: 'base'`

#### Scenario: 自動轉直立（L/U 型）

- **WHEN** 使用者以 L 型或 U 型建立支架，且零件平放（rx=ry=0）並勾選「自動把零件轉直立」
- **THEN** 零件繞 Y 軸轉 90°（感測面朝前 +X、保留原本 Z 軸面內旋轉），支架依轉後朝向生成；已傾斜的零件則保持不動

### Requirement: 支架不與零件本體相交

支架 SHALL 依零件真實包覆盒（含突出 block）計算 L 型／U 型的外形尺寸，使底座、側牆與垂直背板不與零件的突出 block 相交。對抬高安裝孔（`z > 0`），底座型的固定柱 SHALL 收窄其半徑以避免伸入零件本體。

#### Scenario: 抬高孔固定柱不與本體重疊

- **WHEN** 零件安裝孔位於本體邊緣外側且高度抬高（如 SG90 的耳片孔）
- **THEN** 固定柱半徑被收窄到不與零件本體相交

#### Scenario: 突出 block 不被 L/U 型支架相交

- **WHEN** 零件具有突出本體輪廓的 block（如 Raspberry Pi 的乙太網路/USB 接頭）
- **THEN** L 型／U 型支架以零件真實包覆盒定尺寸，不與突出 block 相交

### Requirement: 支架節點可序列化與匯入

`bracket` 節點 SHALL 可序列化至 `.nexcad` 檔，且載入時可完整還原其 `params` 與 `sourceParts`。舊版專案檔不包含 `bracket` 節點時 SHALL 仍可正常解析。

#### Scenario: 往返序列化

- **WHEN** 一個含 `bracket` 節點的文件被匯出為 `.nexcad` 後再匯入
- **THEN** 支架節點與其參數、來源零件快照完整還原

#### Scenario: 舊檔仍可解析

- **WHEN** 載入不包含 `bracket` 節點的舊版專案檔
- **THEN** 檔案解析成功，其餘節點不受影響
