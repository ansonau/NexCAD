# enclosure-lid Specification

## Purpose

定義螺絲上蓋（screw lid）的平面蓋外觀選擇：杯頭外露的薄蓋，或杯頭埋入的厚蓋。只影響螺絲上蓋，不影響滑蓋、開放式上蓋或殼體底座的螺絲接收柱。

## Requirements

### Requirement: 螺絲上蓋為平面蓋，杯頭可選外露或藏入

螺絲上蓋（`lidType === 'screw'`）SHALL 產生平整蓋面（不含凸起圓柱），並提供 `screwLidProfile` 選項選擇杯頭處理：`'flatExposed'`（薄平面蓋，螺絲杯頭外露於蓋面）或 `'flatRecessed'`（厚平面蓋，杯頭完全埋入面板內）。未設定時 SHALL 視為 `'flatRecessed'`。此選項 SHALL 只影響螺絲上蓋，不影響滑蓋、開放式上蓋或殼體底座的螺絲接收柱。

#### Scenario: 外露樣式產生薄平面蓋只挖通孔

- **WHEN** `screwLidProfile` 為 `'flatExposed'`
- **THEN** 上蓋為厚度等於壁厚的平整面板，四角只挖螺絲通孔，蓋頂面無沉孔、無凸起圓柱，杯頭外露坐於蓋面

#### Scenario: 藏入樣式產生厚平面蓋埋入杯頭

- **WHEN** `screwLidProfile` 為 `'flatRecessed'` 或未設定
- **THEN** 上蓋為加厚平整面板（足以容納杯頭沉孔與底floor），四角從蓋頂挖沉孔使杯頭完全埋入面板內、通孔貫穿到底，蓋頂面平整無凸起圓柱

#### Scenario: 樣式不影響滑蓋與開放式上蓋

- **WHEN** `lidType` 為 `'slide'` 或 `'open'`
- **THEN** 上蓋幾何不受 `screwLidProfile` 影響

#### Scenario: 舊專案無欄位時視為藏入

- **WHEN** 載入的 `.nexcad` 檔或 IndexedDB 專案的 `EnclosureParams` 無 `screwLidProfile` 欄位
- **THEN** 行為等同 `screwLidProfile: 'flatRecessed'`
