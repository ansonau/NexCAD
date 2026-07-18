# Proposal: lid-display-cutout

## Why

顯示器零件（OLED 0.96、LCD1602）的零件定義已有 `top` face「螢幕視窗」port（含位置與尺寸），但接口投影（`planPortCutouts`）明確跳過 `top` 面——顯示屏永遠被上蓋整片封死，裝在殼裡看不到。使用者要求新增選項：上蓋依顯示器零件的螢幕視窗自動開孔。

## What Changes

- 新增 `EnclosureParams.lidDisplayCutout?: boolean`（預設 `true`——顯示器裝殼就是要看得到螢幕；optional 向後相容，舊專案重新產生後顯示窗會自動開出，屬預期改善）。
- 開啟時：上蓋（screw/slide）在每個零件的 `top` face port 世界位置挖矩形開孔，貫穿面板與唇邊；尺寸加既有 0.4mm 公差、90° 旋轉時 w/h 對調；非 90° 倍數旋轉的零件跳過（與側面接口投影同限制）。
- 關閉時：維持現行行為（上蓋不開窗）。
- `open` 上蓋無蓋面，不適用。殼體側牆接口投影不變。
- `EnclosurePanel` 進階區塊與 `PropertyCard` 外殼參數表新增 checkbox（`lidType !== 'open'` 顯示，zh/en i18n）。
- `.nexcad` schema 與 IndexedDB 讀取向後相容：無欄位視為 `true`。

## Capabilities

### New Capabilities

（無）

### Modified Capabilities

- `enclosure-lid`: 新增「上蓋顯示屏開窗」requirement（既有平面蓋 requirement 不變）。

## Impact

- `src/types/document.ts`：`EnclosureParams` 加 `lidDisplayCutout?: boolean`
- `src/persistence/nexcadFile.ts`：zod schema 加 optional 欄位
- `src/enclosure/plan.ts`：`DEFAULT_ENCLOSURE_PARAMS` 加 `lidDisplayCutout: true`
- `src/enclosure/portProjection.ts`：新增 `planTopWindowCutouts(parts)`（top face port → 世界座標矩形，含旋轉/公差）
- `src/enclosure/lidGeometry.ts`：`buildLidSolid` 依選項對面板+唇邊挖窗
- `src/components/EnclosurePanel.tsx`、`src/components/PropertyCard.tsx`：checkbox UI
- `src/i18n/zh.json`、`src/i18n/en.json`：新 label key
- 測試：`portProjection.test.ts`（新函式）、`lidGeometry.test.ts`（開窗/關閉/旋轉案例）、`nexcadFile.test.ts`（backward-compat）
