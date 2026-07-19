# Proposal: smart-car-preset

## Why

Maker/學生做智能小車是最常見的入門專案，但要在 NexCAD 裡逐一從零件庫拉出 Arduino、馬達驅動板、馬達、電池、感測器再手動排位很繁瑣。一鍵預設組合能讓使用者秒速得到一套排好位的經典小車零件，接著直接走既有「產生外殼」流程做車體。

## What Changes

- Toolbar 新增「智能小車」按鈕（車子 icon），點擊一次即在場景中生成一組經典 Arduino 2WD 小車零件並全選。
- 零件組合（全部取自現有零件庫，**不新增零件定義**）：Arduino Uno R3 ×1、L298N 馬達驅動板 ×1、TT 減速馬達 ×2（旋轉 90° 橫置左右兩側）、18650 雙節電池盒 ×1、HC-SR04 超音波感測器 ×1。
- 預設排位為俯視「車型」佈局（前感測器、中控制板、側馬達、後電池），零件間留間隙互不重疊；使用者可再自行微調。
- 生成後全部零件自動選取（沿用 `addNodes` 既有行為），使用者可直接按「產生外殼」讓外殼只包含這組零件（Plan 4 既有 selection 範圍行為）。
- 新 i18n key（zh/en）。

## Capabilities

### New Capabilities

- `part-presets`: 一鍵生成預設零件組合（首個 preset：智能小車）。

### Modified Capabilities

（無）

## Impact

- `src/parts/presets.ts`（新檔）：智能小車 preset 定義（零件 id、位置、旋轉）
- `src/components/Toolbar.tsx`：新按鈕
- `src/i18n/zh.json`、`src/i18n/en.json`：新 label key
- 測試：preset 定義驗證（零件 id 皆存在於零件庫、佈局無重疊）
