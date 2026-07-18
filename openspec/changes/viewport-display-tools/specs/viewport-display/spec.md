# viewport-display Spec Delta

## ADDED Requirements

### Requirement: 場景樹面板選取與顯示切換

系統 SHALL 提供場景樹面板，列出文件內所有節點（群組子節點以巢狀縮排呈現）。點擊列 SHALL 選取該節點（與 viewport 選取同步、支援 shift 多選）；每列 SHALL 提供顯示切換（眼睛）按鈕，切換節點的 `visible` 狀態，隱藏的節點 SHALL 不參與 viewport 渲染與外殼生成（沿用既有 visible 過濾），且在場景樹中以半透明樣式呈現。

#### Scenario: 點擊場景樹列選取節點

- **WHEN** 使用者點擊場景樹中某節點列
- **THEN** 該節點成為目前選取（viewport 高亮、屬性面板顯示其內容），與直接在 viewport 點擊 mesh 效果一致

#### Scenario: 隱藏外殼以選取被包住的零件

- **WHEN** 零件被外殼完全包住無法在 viewport 點擊，使用者在場景樹點擊外殼的眼睛按鈕
- **THEN** 外殼從 viewport 消失，零件可直接點擊；再次點擊眼睛恢復顯示

#### Scenario: 隱藏節點不參與外殼生成

- **WHEN** 節點被切換為隱藏後執行外殼生成
- **THEN** 該節點不納入外殼包含範圍（沿用既有 visible 過濾行為）

### Requirement: ViewCube 視角導航

Viewport SHALL 顯示 ViewCube 視角方塊；點擊其面/邊/角 SHALL 將相機切換至對應方位，且不改變場景內容。

#### Scenario: 點擊面切換至正交方位視角

- **WHEN** 使用者點擊 ViewCube 的某個面（如頂面）
- **THEN** 相機轉至該正對方位（如頂視），場景節點與選取狀態不變

### Requirement: 外殼 X-ray 顯示模式

系統 SHALL 提供外殼 X-ray 切換：開啟時外殼節點（enclosure）以半透明材質渲染、其他節點維持原樣，使内部零件佈局可見；關閉時恢復不透明。此狀態 SHALL 為 session-only（不寫入文件、不持久化）。

#### Scenario: 開啟 X-ray 檢視內部零件

- **WHEN** 使用者開啟外殼 X-ray
- **THEN** 外殼變半透明、內部零件可見且仍可透過場景樹選取；零件與孔節點的既有顯示樣式不變

#### Scenario: X-ray 不影響匯出與文件

- **WHEN** X-ray 開啟狀態下匯出或儲存專案
- **THEN** 匯出幾何與文件內容與 X-ray 關閉時完全相同

### Requirement: 稜線疊加顯示模式

系統 SHALL 提供 Wireframe on Shade 切換：開啟時所有 mesh 疊加稜線（依折角閾值只描真實稜邊，不描平面內部三角剖分線），實體著色維持。此狀態 SHALL 為 session-only。

#### Scenario: 開啟稜線疊加

- **WHEN** 使用者開啟稜線顯示
- **THEN** 每個 mesh 的稜邊以線條描出、面著色不變；關閉後線條消失
