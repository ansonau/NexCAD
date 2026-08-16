# 3D 模型來源與產出（`3d_models/`）

本資料夾是 NexCAD 所有 3D 模型的「來源與產出」統一存放處。

**核心原則**：把三種職責分開存放，避免混淆。

| 職責 | 說明 | 存放位置 |
|---|---|---|
| 來源參考 | 供人類／AI 對照驗證尺寸的 datasheet 圖 | `reference/` |
| 建模來源 | 手工建模的原始檔（OpenSCAD、原始 STL/GLB） | `source/<id>/` |
| 程序化產出 | 由 `src/parts/library.ts` 導出的 STL（可重新生成） | `generated/` |
| 執行期載入 | app 執行時真正載入的高清 STL（編譯產出） | `public/parts/<id>/`（不在本資料夾） |

## 目錄結構

```
3d_models/
├── README.md             # 本說明
├── reference/            # datasheet 尺寸參考圖 (JPEG)
│   ├── arduino-nano-3.0-dimension.jpeg
│   ├── ultrasonic-ranging-sensor-hc-sr04-dimension.jpeg
│   └── ...
├── source/               # 手工建模來源（一零件一資料夾）
│   ├── <id>/<id>.scad    # OpenSCAD 原始檔
│   ├── <id>/<id>.stl     # 原始/高清 STL（或 .glb）
│   └── <id>/README.md    # 建模筆記
└── generated/            # 程序化幾何導出（`npm run export:parts`）
    ├── <id>.stl
    └── ...
```

## 各資料夾用途

### `reference/`
- datasheet 的**尺寸參考圖**（JPEG）。
- 用途：人類與 AI 對照真實零件規格、驗證程序化幾何與高清模型是否正確。
- 此處僅為參考素材，**不會**被 app 載入。

### `source/<id>/`
- 每個零件**手工建模的來源檔**：OpenSCAD（`.scad`）、原始 STL、README 筆記。
- 用途：人類編輯模型、重新導出高清 STL。
- 關係：`source/<id>/` 產出的高清 STL，複製到 `public/parts/<id>/` 供 app 載入（來源與產出分離）。
- 備註：大型 `.glb` 檔（>100MB）已加入 `.gitignore`，保留在本機、不進 git。

### `generated/`
- 由 `src/parts/library.ts` 的**程序化幾何**自動導出的 STL（每個零件一個）。
- 用途：把程式碼定義的幾何變成可檢視、可量測、可與 datasheet 對照的實體檔案（人＋AI 協作載體）。
- 規矩：**不要手動編輯**；改了 `library.ts` 後重跑 `npm run export:parts` 重新生成。

## 相關位置（不在 `3d_models/` 內）

| 路徑 | 用途 |
|---|---|
| `public/parts/<id>/<id>.stl` | app 執行期載入的高清 STL（編譯產出，來源在 `3d_models/source/<id>/`） |
| `src/parts/library.ts` | **程序化幾何的真相來源**（外殼規劃、碰撞、匯出都以此為準） |
| `src/parts/highResModels.ts` | 高清模型對照表（URL 指向 `/parts/<id>/<id>.stl`） |

## 工作流程

1. **加/改零件**：編輯 `src/parts/library.ts` 的 `body`／`mountingHoles`／`ports`。
2. **導出程序化 STL**：`npm run export:parts` → 寫入 `generated/<id>.stl`。
3. **對照驗證**：用 render skill 快照 `generated/*.stl`，與 `reference/` 的 datasheet 圖比對。
4. **手工建模**（需要更高精度時）：在 `source/<id>/` 用 OpenSCAD 建模，產出 STL 複製到 `public/parts/<id>/`，並在 `highResModels.ts` 註冊。

## 版本控制

- `reference/`、`source/`、`generated/` 皆**納入 git**。
- `generated/` 為衍生檔（binary 難 diff），但可隨時由 `library.ts` 重新生成，因此以「可重新產生」取代「可人工 diff」。
