# part-presets Specification

## Purpose
TBD - created by archiving change smart-car-preset. Update Purpose after archive.
## Requirements
### Requirement: 一鍵生成智能小車零件組合

Toolbar SHALL 提供「智能小車」按鈕，點擊一次即在場景中生成一組經典 Arduino 2WD 小車零件：Arduino Uno R3 ×1、L298N 馬達驅動板 ×1、TT 減速馬達 ×2、18650 雙節電池盒 ×1、HC-SR04 超音波感測器 ×1（全部取自現有零件庫定義），另加一塊底盤板與 2 顆車輪（`car-wheel` 零件）。零件 SHALL 依預設車型佈局排位（車頭感測器、中段控制/驅動板、左右橫置馬達、車尾電池墊底盤、輪子在馬達軸端），俯視投影互不重疊。生成後 SHALL 只有 6 個電子零件處於選取狀態（底盤與輪子加入場景但不選取），且整組 9 個節點 SHALL 可由單次復原（undo）移除。

#### Scenario: 點擊按鈕生成整組零件，僅電子零件全選

- **WHEN** 使用者點擊 Toolbar 的「智能小車」按鈕
- **THEN** 場景新增 9 個節點（6 電子零件 + 1 底盤 + 2 輪子，依預設佈局排位），selection 為 6 個電子零件節點，使用者可直接按「產生外殼」以此 6 項為範圍（不含底盤/輪子）

#### Scenario: 佈局互不重疊

- **WHEN** 智能小車零件組生成
- **THEN** 6 個電子零件任兩者的俯視 AABB（含旋轉）不相交，零件間留有間隙

#### Scenario: 單次復原整組移除

- **WHEN** 生成後執行復原（undo）
- **THEN** 9 個節點一次全部移除，場景回到生成前狀態

#### Scenario: 零件名稱依介面語言

- **WHEN** 介面語言為中文／英文時生成
- **THEN** 節點名稱分別使用零件庫的 `nameZh`／`name`（與零件庫抽屜加零件行為一致）

#### Scenario: 車輪視覺站立且觸地

- **WHEN** 車輪零件（`car-wheel`）生成幾何
- **THEN** 輪子的圓形剖面軸向為水平（非垂直），輪子最低點觸及世界 z=0（誤差 0.5mm 內）

### Requirement: PartBlock 支援選填旋轉欄位

`partBlockSchema` SHALL 支援選填 `rotation`（度，`[x,y,z]`），未設定時 SHALL 等同 `[0,0,0]`（現行行為不變）。`buildPartSolid` 生成 block 幾何時 SHALL 套用此旋轉。

#### Scenario: 既有零件不受影響

- **WHEN** 既有零件定義的 block 沒有 `rotation` 欄位
- **THEN** 生成幾何與此變更前完全相同

