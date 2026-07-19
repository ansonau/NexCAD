# part-presets Delta Spec

## ADDED Requirements

### Requirement: 一鍵生成智能小車零件組合

Toolbar SHALL 提供「智能小車」按鈕，點擊一次即在場景中生成一組經典 Arduino 2WD 小車零件：Arduino Uno R3 ×1、L298N 馬達驅動板 ×1、TT 減速馬達 ×2、18650 雙節電池盒 ×1、HC-SR04 超音波感測器 ×1，全部取自現有零件庫定義。零件 SHALL 依預設車型佈局排位（車頭感測器、中段控制/驅動板、左右橫置馬達、車尾電池），俯視投影互不重疊。生成後全部零件 SHALL 處於選取狀態，且整組生成 SHALL 可由單次復原（undo）移除。

#### Scenario: 點擊按鈕生成整組零件並全選

- **WHEN** 使用者點擊 Toolbar 的「智能小車」按鈕
- **THEN** 場景新增 6 個零件節點（依預設佈局排位），selection 為這 6 個節點，使用者可直接按「產生外殼」以此組零件為範圍

#### Scenario: 佈局互不重疊

- **WHEN** 智能小車零件組生成
- **THEN** 任兩零件的俯視 AABB（含旋轉）不相交，零件間留有間隙

#### Scenario: 單次復原整組移除

- **WHEN** 生成後執行復原（undo）
- **THEN** 6 個零件一次全部移除，場景回到生成前狀態

#### Scenario: 零件名稱依介面語言

- **WHEN** 介面語言為中文／英文時生成
- **THEN** 節點名稱分別使用零件庫的 `nameZh`／`name`（與零件庫抽屜加零件行為一致）
