# enclosure-mounting Delta Spec

## MODIFIED Requirements

### Requirement: 零件固定方式可選螺絲柱、圓柱定位柱或螺絲孔

外殼生成時，系統 SHALL 提供 `mountingStyle` 選項讓使用者選擇零件安裝柱的固定方式：`'screw'`（螺絲柱，含自攻導孔）、`'peg'`（實心圓柱定位柱，插入零件安裝孔取代螺絲）、或 `'hole'`（螺絲孔，地板貫穿孔，不長支柱、不自攻，螺絲從殼外穿地板直接鎖進零件本身的固定結構）。未設定時 SHALL 視為 `'screw'`。此選項 SHALL 只影響零件安裝柱，不影響螺絲上蓋的角落鎖柱。

#### Scenario: 預設或螺絲模式生成含導孔的螺絲柱

- **WHEN** `mountingStyle` 為 `'screw'` 或未設定
- **THEN** 每個零件安裝孔下方生成 standoff 柱並在柱頂鑽自攻導孔（現行行為不變）

#### Scenario: 圓柱模式生成實心定位柱

- **WHEN** `mountingStyle` 為 `'peg'`
- **THEN** 每個零件安裝孔下方生成實心 standoff 柱（柱身不鑽導孔），柱頂再向上長一段定位圓柱，直徑略小於零件安裝孔徑以可插入，高度為固定插入深度

#### Scenario: 螺絲孔模式只在地板貫穿孔，不長支柱

- **WHEN** `mountingStyle` 為 `'hole'`
- **THEN** 每個零件安裝孔對應的殼體地板位置貫穿一個通孔（直徑為螺絲淨空徑），不生成任何支柱結構

#### Scenario: 固定方式不影響上蓋角柱

- **WHEN** 上蓋類型為 `'screw'` 且 `mountingStyle` 為 `'peg'` 或 `'hole'`
- **THEN** 四角上蓋鎖柱仍為含導孔的螺絲柱，只有零件安裝柱改為對應的固定方式

#### Scenario: 舊專案無欄位時視為螺絲

- **WHEN** 載入的 `.nexcad` 檔或 IndexedDB 專案的 `EnclosureParams` 無 `mountingStyle` 欄位
- **THEN** 行為等同 `mountingStyle: 'screw'`
