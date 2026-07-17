# viewport-rendering delta

## ADDED Requirements

### Requirement: 場景 mesh 以 per-face 法線著色

3D 視窗渲染幾何核心輸出的 mesh 時，SHALL 以 per-face（flat）法線著色：每個三角形的三個頂點持有相同的面法線，不得與相鄰三角形共享被平均的頂點法線。

#### Scenario: 平坦面著色均勻

- **WHEN** 渲染一個含大面積平坦面的 CSG 實體（如外殼底座的頂面）
- **THEN** 該平坦面上所有片元的法線一致，面內無漸層或斑駁

#### Scenario: 銳邊兩側面著色獨立

- **WHEN** 渲染一個含 90° 稜邊的實體（如方塊）
- **THEN** 稜邊兩側的面各自以自身面法線著色，邊界清晰，無跨邊法線摻混

### Requirement: 幾何展開不影響互動與資源管理

per-face 法線的實作 SHALL 不改變 mesh 的可選取性（raycast 命中），且建構過程中產生的中間 geometry SHALL 被釋放（dispose），不遺留 GPU 資源。

#### Scenario: 點選展開後的 mesh

- **WHEN** 使用者點擊視窗中任一實體
- **THEN** 該實體被正確選取（與展開前行為一致）

#### Scenario: mesh 更新時無資源洩漏

- **WHEN** 文件重新求值使 mesh payload 更新（幾何被重建）
- **THEN** 舊 geometry 與建構期間的中間 geometry 均被 dispose
