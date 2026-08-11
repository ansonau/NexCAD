# 尺寸圖零件批次重畫設計

## 目標

以 `3d_models/` 內的尺寸圖為主要尺寸來源，重畫四款現有零件並新增兩款零件。每款零件同步提供可協作的 OpenSCAD 來源、binary STL 高精度資產及 NexCAD 程式化碰撞模型，讓 viewport 外觀、外殼規劃、孔位和淨空高度使用一致的尺寸契約。

## 範圍

| 零件 | NexCAD ID | 狀態 | 尺寸圖 |
| --- | --- | --- | --- |
| Arduino Nano 3.0 | `arduino-nano` | 重畫 | `arduino-nano-3.0-dimension.jpeg` |
| Arduino Mega 2560 R3 | `arduino-mega-2560` | 新增 | `arduino-mega-2560-r3-dimension.jpeg` |
| 0.96 吋 I2C OLED | `oled-096` | 重畫 | `monochrome-0.96-oled-graphic-display-with-i2c-dimension.jpeg` |
| 1.3 吋 I2C OLED | `oled-13` | 新增 | `monochrome-1.3-oled-graphic-display-with-i2c-dimension.jpeg` |
| HC-SR04 | `hc-sr04` | 重畫 | `ultrasonic-ranging-sensor-hc-sr04-dimension.jpeg` |
| TT Motor | `tt-motor` | 重新驗證及保留精準版 | `tt-motor-dimension.jpeg` |

不新增其他零件，不製作 PCB 線路、文字絲印、焊點或內部電子結構。TT Motor 已有精準模型，本批只以根目錄尺寸圖重新驗證、必要時修正並重新生成，不重寫已符合契約的部分。

## 尺寸來源規則

1. 尺寸圖明確標示的外形、孔徑、孔距、元件中心距及高度為最高優先。
2. 圖中未標示的 PCB 厚度、排針高度、連接器高度及小型元件外形，沿用現有模型或常見模組尺寸。
3. 推定尺寸只影響辨識和淨空，不可改變圖紙標示的安裝介面。
4. 所有尺寸以毫米表示；每款零件使用 PCB 或主要殼體底面中心為原點，XY 為平面、正 Z 為高度。

## 關鍵尺寸契約

### Arduino Nano 3.0

- PCB：`43.18 × 17.77 mm`，程式化尺寸可保留一位小數。
- 四角孔：`Ø1.65 mm`。
- 長向孔中心距：`40.64 mm`。
- 短向孔中心距：`15.24 mm`。
- 高精度模型包含 PCB、兩排針腳、USB 連接器及主要晶片輪廓。

### Arduino Mega 2560 R3

- PCB：`101.60 × 53.35 mm`。
- 使用尺寸圖的板形、切角及可辨識安裝孔位置。
- 未完整標出的孔位以常見 Mega 2560 R3 版型補齊，並在 README 標示為推定值。
- 高精度模型包含 PCB、USB-B、DC 插座、排針區及主要連接器輪廓。

### 0.96 吋 I2C OLED

- PCB 約 `27.3 × 27.3 mm`。
- 顯示區約 `23.3 × 19.0 mm`。
- 左右孔中心距 `20.7 mm`；圖示孔為約 `3.5 mm` 長孔。
- 高精度模型包含 PCB、顯示面、四個安裝長孔及四針接頭。

### 1.3 吋 I2C OLED

- PCB：`35.40 × 33.50 mm`。
- 顯示有效區：`29.42 × 14.70 mm`。
- 四角孔：`Ø3.0 mm`；主要孔距依圖紙 `29.42 × 28.50 mm`。
- 側視總突出高度約 `11.30 mm`，其中 PCB 約 `1.20 mm`。
- 高精度模型包含 PCB、顯示面、四孔及四針接頭。

### HC-SR04

- PCB：`45 × 20 × 1.5 mm`。
- 兩換能器中心距：`26 mm`。
- 換能器外徑：`16 mm`；PCB 下方突出約 `12 mm`。
- 對角安裝孔：`Ø2 mm`；孔中心距約 `42 × 16.5 mm`。
- 高精度模型包含 PCB、兩個換能器、四針接頭及主要晶體輪廓。

### TT Motor

- 沿用已驗證契約：約 `69.9 × 37.0 × 22.4 mm` 整體包圍盒。
- 輸出軸 `Ø5.4 mm`，D 平面寬 `3.7 mm`，軸中心高約 `11.2 mm`。
- 側孔不登記為 Z 軸 `mountingHoles`。

## 模型架構

每款零件沿用現有單一流程：

1. `public/parts/<id>/<id>.scad` 是可編輯尺寸來源。
2. OpenSCAD 生成 `public/parts/<id>/<id>.stl`，使用 binary STL。
3. `src/parts/library.ts` 保存簡化碰撞幾何、安裝孔、端口及淨空高度。
4. `src/parts/highResModels.ts` 將全部六款零件映射到 STL。
5. viewport 的「高精度模型」只替換顯示；外殼生成、碰撞及匯出仍使用程式化模型。

不新增 CAD 依賴、不改造 STL loader，也不建立共用 OpenSCAD 函式庫。六個來源檔保持自包含，方便單檔修改和生成。

## 視覺細節

模型採平衡細節：保留會影響辨識、裝配或淨空的 PCB 輪廓、顯示面、插座、排針、換能器、馬達罐和輸出軸；省略絲印與微小表面元件。OpenSCAD 顏色只供來源預覽，現有 STL viewport 仍使用單一材質。

孔位必須是實際切除幾何，而不是表面圓片。長孔以膠囊形切除；排針和連接器可用簡化盒體或圓柱表示。

## 程式化碰撞模型

- 主體尺寸與 STL 使用同一原點和方向。
- `body.size` 表示 PCB 或主要殼體；`blocks` 只加入影響外殼淨空的主要元件。
- `mountingHoles` 只記錄沿 Z 軸穿過 PCB／底面的孔。
- `clearanceHeight` 覆蓋最高連接器、排針或顯示結構。
- 新增零件直接加入現有 `power`、`board` 或 `sensor` 分類，不新增分類。

## 資產與錯誤處理

- OpenSCAD 生成失敗時不保留半成品 STL。
- STL 必須通過 binary 結構檢查及有限數值包圍盒檢查。
- 高精度映射只在對應 STL 存在後加入，避免 loader 令 Canvas 進入錯誤狀態。
- 尺寸圖保留在 `3d_models/` 作為開發參考，不由 runtime 載入。

## 檔案變更

- 修改四個現有零件的 `.scad`、`README.md`，新增其 `.stl`。
- 新增 `public/parts/arduino-mega-2560/` 和 `public/parts/oled-13/` 的 `.scad`、`.stl`、`README.md`。
- 必要時重新生成 TT Motor STL，但保留其現有座標契約。
- 修改 `src/parts/library.ts`、`src/parts/highResModels.ts` 和相關測試。
- 為六款 STL 增加集中式包圍盒／binary 格式回歸測試，避免每款建立重複測試工具。

## 測試與驗證

遵循 TDD，先建立會對舊尺寸或缺少的新零件失敗的測試：

1. 零件庫包含六個目標 ID，分類及名稱正確。
2. 程式化包圍盒符合尺寸契約。
3. 孔徑和孔中心距符合圖紙容差。
4. `clearanceHeight` 不低於最高視覺元件。
5. 每個高精度 URL 指向存在的 binary STL。
6. 每個 STL 包圍盒與對應契約一致，頂點為有限數值。
7. TypeScript、完整 Vitest 套件及 production build 通過。
8. CAD Explorer 逐款檢查等角、頂面和側面視圖；只有外觀修復後才重拍。

## 驗收條件

- 六款零件能從 Parts 加入場景，程式化模式和高精度模式均可見。
- 新增的 Mega 2560 和 OLED 1.3 可被選取、移動、用於外殼規劃及 STL 匯出。
- 圖紙標示的外形、孔徑、孔距和主要元件位置符合契約。
- 高精度模型比現有基線更容易辨認，但不包含無裝配價值的微小細節。
- 所有 STL 可由現有 `STLLoader` 載入，不會令 viewport 空白。
