# enclosure-safety Specification

## Purpose

定義外殼（enclosure）生成過程中的碰撞安全機制：上蓋角柱如何自動避讓零件碰撞、生成後如何警告偵測到的碰撞、以及外殼與來源零件位置不同步時如何提示使用者。

## Requirements

### Requirement: 上蓋角柱自動避讓零件碰撞

外殼上蓋四角螺絲柱的位置 SHALL 在與零件 bounding box 重疊時，沿殼體邊緣搜尋鄰近無碰撞位置；搜尋範圍內找不到無碰撞位置時 SHALL 保留原位置並標記碰撞狀態，不得靜默生成互相穿插的幾何。

#### Scenario: 角柱與零件重疊時自動位移

- **WHEN** 預設角落位置與某零件 bounding box（含碰撞半徑緩衝）重疊
- **THEN** 系統沿該角落所屬邊緣搜尋，將角柱移至最近的無碰撞位置

#### Scenario: 搜尋範圍內無解時標記碰撞

- **WHEN** 角柱沿兩側邊緣搜尋至上限（`min(width, depth) / 4`）仍與零件重疊
- **THEN** 角柱保留原位置，該位置標記為碰撞

#### Scenario: 無碰撞情況不受影響

- **WHEN** 角柱預設位置未與任何零件重疊
- **THEN** 角柱位置維持不變，不觸發避讓搜尋

### Requirement: 外殼生成時警告角柱碰撞

外殼（screw 上蓋類型）生成或重新產生後，若任一角柱標記碰撞，系統 SHALL 顯示警告提示使用者調整零件位置或壁厚參數。

#### Scenario: 生成後偵測到碰撞

- **WHEN** `generateEnclosure` 或 `regenerateEnclosure` 執行後，角柱碰撞狀態為真
- **THEN** 顯示 toast 警告，說明螺絲柱與零件位置衝突

#### Scenario: 無碰撞不顯示警告

- **WHEN** 角柱皆無碰撞
- **THEN** 不顯示任何碰撞相關警告

### Requirement: 外殼與零件位置不同步時提示過期

選取外殼節點時，若其 `sourceParts` 快照的零件 transform 與目前 live part 節點的 transform 不一致，系統 SHALL 顯示過期提示，引導使用者重新產生。

#### Scenario: 零件移動後未重新產生

- **WHEN** 使用者選取一個外殼節點，其某個來源零件目前的 transform 與快照不同
- **THEN** 屬性面板顯示「零件位置已變更，外殼可能過期」提示

#### Scenario: 位置一致不顯示提示

- **WHEN** 所有來源零件的目前 transform 與快照一致
- **THEN** 不顯示過期提示
