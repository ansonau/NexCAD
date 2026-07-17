# enclosure-safety Specification

## Purpose

定義外殼（enclosure）生成過程中的碰撞安全機制：上蓋角柱如何透過殼體自動擴大保留空間避免與零件碰撞、生成後如何警告偵測到的碰撞、以及外殼與來源零件位置不同步時如何提示使用者。

## Requirements

### Requirement: 上蓋角柱空間保留

外殼（screw 上蓋類型）SHALL 預設自動擴大殼體，為四個角落標準位置（inset = cornerRadius+3）的螺絲柱保留空間，使柱體（含碰撞半徑緩衝）完全在殼內且不與任何零件 bounding box 重疊；殼體 SHALL 維持長方形外形，角柱位置 SHALL NOT 位移。使用者 SHALL 可透過 `reserveCornerSpace` 選項（預設開啟）關閉自動擴大；關閉時角柱維持角落標準位置，僅在柱心嚴格落入零件 bounding box 內部（嚴重重疊）時標記碰撞，邊界相切不標記。

#### Scenario: 預設參數產生正常長方形盒子

- **WHEN** 使用預設參數（`reserveCornerSpace` 未設定或為 true）對零件產生 screw 上蓋外殼
- **THEN** 殼體 X/Y 四邊均勻擴大至角柱與所有零件 bounding box 的距離 ≥ 碰撞半徑，角柱位於角落標準位置，柱體不凸出殼外

#### Scenario: 關閉空間保留時維持原尺寸

- **WHEN** `reserveCornerSpace` 為 false
- **THEN** 殼體尺寸不因角柱而擴大，角柱維持角落標準位置；柱心恰在零件 bounding box 邊界（相切）時不標記碰撞

#### Scenario: 擴大達上限仍無解時標記碰撞

- **WHEN** 擴殼迭代達上限（12mm）後任一角柱柱心仍嚴格落入某零件 bounding box 內部
- **THEN** 該角柱保留角落標準位置並標記碰撞，幾何照常生成（不阻擋）

#### Scenario: 舊專案缺少欄位視為開啟

- **WHEN** 載入的 `.nexcad` 檔或 IndexedDB 專案的 `EnclosureParams` 無 `reserveCornerSpace` 欄位
- **THEN** 行為等同 `reserveCornerSpace: true`

### Requirement: 外殼生成時警告角柱碰撞

外殼（screw 上蓋類型）生成或重新產生後，若任一角柱標記碰撞（依「上蓋角柱空間保留」requirement 的嚴重重疊條件），系統 SHALL 顯示警告提示使用者調整零件位置或壁厚參數。

#### Scenario: 生成後偵測到嚴重重疊

- **WHEN** `generateEnclosure` 或 `regenerateEnclosure` 執行後，任一角柱標記碰撞
- **THEN** 顯示 toast 警告，說明螺絲柱與零件位置衝突

#### Scenario: 無嚴重重疊不顯示警告

- **WHEN** 角柱皆未標記碰撞（含柱心與零件 bounding box 邊界相切的情況）
- **THEN** 不顯示任何碰撞相關警告

### Requirement: 外殼與零件位置不同步時提示過期

選取外殼節點時，若其 `sourceParts` 快照的零件 transform 與目前 live part 節點的 transform 不一致，系統 SHALL 顯示過期提示，引導使用者重新產生。

#### Scenario: 零件移動後未重新產生

- **WHEN** 使用者選取一個外殼節點，其某個來源零件目前的 transform 與快照不同
- **THEN** 屬性面板顯示「零件位置已變更，外殼可能過期」提示

#### Scenario: 位置一致不顯示提示

- **WHEN** 所有來源零件的目前 transform 與快照一致
- **THEN** 不顯示過期提示
