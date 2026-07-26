## ADDED Requirements

### Requirement: Viewport dimension display dropdown
系統 SHALL 在 viewport display toolbar 提供「尺寸顯示」dropdown button。dropdown SHALL 提供「顯示外殼」、「顯示零件尺寸」與「顯示孔與孔的距離」三個 session-only 模式；關閉或未選模式時 SHALL 隱藏尺寸標註。此狀態 SHALL 不寫入文件、不持久化，且 SHALL NOT 改變匯出幾何或文件內容。

#### Scenario: 顯示外殼尺寸
- **WHEN** 使用者在「尺寸顯示」dropdown 選擇「顯示外殼」
- **THEN** viewport 中可見外殼物件顯示尺寸線、箭頭與尺寸長度標籤，標籤使用 mm 單位

#### Scenario: 顯示零件尺寸
- **WHEN** 使用者在「尺寸顯示」dropdown 選擇「顯示零件尺寸」
- **THEN** viewport 中可見零件與一般實體物件顯示尺寸線、箭頭與尺寸長度標籤，標籤使用 mm 單位

#### Scenario: 顯示孔與孔的距離
- **WHEN** 使用者在「尺寸顯示」dropdown 選擇「顯示孔與孔的距離」
- **THEN** viewport 中可見孔位之間顯示距離線、箭頭與距離標籤，標籤使用 mm 單位

#### Scenario: 關閉尺寸顯示
- **WHEN** 使用者再次選取目前的尺寸模式或未選任何尺寸模式
- **THEN** viewport 不顯示任何尺寸線、箭頭或尺寸長度標籤

#### Scenario: 隱藏物件不顯示尺寸
- **WHEN** 某場景物件被切換為隱藏且「尺寸顯示」開啟
- **THEN** 該隱藏物件不顯示尺寸線或尺寸標籤

#### Scenario: 尺寸顯示不影響匯出與文件
- **WHEN** 「尺寸顯示」開啟時匯出或儲存專案
- **THEN** 匯出幾何與文件內容與「尺寸顯示」關閉時相同
