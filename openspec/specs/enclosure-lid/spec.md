# enclosure-lid Specification

## Purpose

定義螺絲上蓋（screw lid）的平面蓋外觀選擇：杯頭外露的薄蓋，或杯頭埋入的厚蓋；並可選擇螺絲鎖固方向（從上蓋鎖入或從底座鎖入）。只影響螺絲上蓋的四角鎖點角柱，不影響滑蓋、開放式上蓋或殼體其餘幾何。另定義上蓋依零件螢幕視窗（`top` face 接口）開孔的能力，適用於螺絲蓋與滑蓋等各類上蓋生成。

## Requirements

### Requirement: 螺絲上蓋為平面蓋，杯頭可選外露或藏入

螺絲上蓋（`lidType === 'screw'`）SHALL 產生平整蓋面（不含凸起圓柱）。系統 SHALL 提供 `screwEntry` 選項決定螺絲鎖固方向：`'fromLid'`（螺絲從上蓋鎖入，預設）或 `'fromBase'`（螺絲從底座鎖入）。杯頭沉孔的外露/藏入樣式（`screwLidProfile`：`'flatExposed'` 或 `'flatRecessed'`，未設定時視為 `'flatRecessed'`）SHALL 套用在螺絲實際進入的那一面（`fromLid` 時為上蓋、`fromBase` 時為底座）；未進入螺絲的那一面 SHALL 只有自攻導孔盲孔（供螺牙咬合），不加厚、不開沉孔。此組選項 SHALL 只影響螺絲上蓋的四角鎖點角柱，不影響滑蓋、開放式上蓋、零件安裝柱或殼體其餘幾何。

#### Scenario: 從上蓋鎖入（預設）時外露樣式產生薄平面蓋只挖通孔

- **WHEN** `screwEntry` 為 `'fromLid'`（或未設定）且 `screwLidProfile` 為 `'flatExposed'`
- **THEN** 上蓋為厚度等於壁厚的平整面板，四角只挖螺絲通孔；底座角柱為自攻導孔盲孔

#### Scenario: 從上蓋鎖入時藏入樣式產生厚平面蓋埋入杯頭

- **WHEN** `screwEntry` 為 `'fromLid'`（或未設定）且 `screwLidProfile` 為 `'flatRecessed'`（或未設定）
- **THEN** 上蓋為加厚平整面板，四角挖沉孔使杯頭完全埋入面板內、通孔貫穿到底；底座角柱為自攻導孔盲孔

#### Scenario: 從底座鎖入時角柱通孔/沉孔與自攻盲孔互換

- **WHEN** `screwEntry` 為 `'fromBase'`
- **THEN** 底座四角角柱依 `screwLidProfile` 挖通孔（`flatExposed`）或通孔+沉孔（`flatRecessed`，底板整體加厚以容納），上蓋角柱改為自攻導孔盲孔，上蓋面板厚度維持壁厚不加厚

#### Scenario: 樣式不影響滑蓋與開放式上蓋

- **WHEN** `lidType` 為 `'slide'` 或 `'open'`
- **THEN** 上蓋幾何不受 `screwEntry`/`screwLidProfile` 影響

#### Scenario: 舊專案無 screwEntry 欄位時視為從上蓋鎖入

- **WHEN** 載入的 `.nexcad` 檔或 IndexedDB 專案的 `EnclosureParams` 無 `screwEntry` 欄位
- **THEN** 行為等同 `screwEntry: 'fromLid'`（現行行為）

### Requirement: 上蓋依螢幕視窗開孔

上蓋（screw/slide）生成時，系統 SHALL 提供 `lidDisplayCutout` 選項（未設定時視為開啟）：開啟時，對每個零件定義中 `face: 'top'` 的接口（螢幕視窗），在其世界位置於上蓋挖出貫穿面板與唇邊的矩形開孔，尺寸含裝配公差、零件 90° 倍數旋轉時寬高對調；非 90° 倍數旋轉的零件其視窗 SHALL 被跳過（與側面接口投影同限制）。關閉時上蓋 SHALL 不開窗。此選項 SHALL NOT 影響殼體側牆的接口投影。

#### Scenario: 顯示器零件的螢幕視窗開孔

- **WHEN** `lidDisplayCutout` 開啟（或未設定）且外殼包含帶 `top` face 接口的零件（如 OLED、LCD 顯示器）
- **THEN** 上蓋在該接口的世界位置挖出矩形開孔，貫穿面板與唇邊，尺寸為接口寬高加公差

#### Scenario: 零件旋轉 90° 時視窗寬高對調

- **WHEN** 帶 `top` face 接口的零件繞 Z 軸旋轉 90° 或 270°
- **THEN** 上蓋開孔位置隨零件旋轉、寬高對調

#### Scenario: 關閉選項時不開窗

- **WHEN** `lidDisplayCutout` 為 false
- **THEN** 上蓋不挖任何螢幕視窗開孔（維持整片蓋面）

#### Scenario: 舊專案無欄位時視為開啟

- **WHEN** 載入的 `.nexcad` 檔或 IndexedDB 專案的 `EnclosureParams` 無 `lidDisplayCutout` 欄位
- **THEN** 行為等同 `lidDisplayCutout: true`
