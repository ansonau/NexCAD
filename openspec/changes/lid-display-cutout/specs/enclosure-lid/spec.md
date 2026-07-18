# enclosure-lid Spec Delta

## ADDED Requirements

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
