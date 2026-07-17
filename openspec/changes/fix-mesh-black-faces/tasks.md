# Tasks: fix-mesh-black-faces

## 1. 實作雙面材質

- [x] 1.1 `src/components/Viewport.tsx` 的 `meshStandardMaterial` 加 `side={THREE.DoubleSide}`（`THREE` 已 import）

## 2. 驗證

- [x] 2.1 `npx vitest run && npx tsc --noEmit && npm run build` 全綠
- [x] 2.2 瀏覽器驗證（dev server port 5174）：產生外殼（含沉孔、開孔的複雜幾何）→ 旋轉各視角無破洞、無整面黑；從開孔看進內腔顯示內壁而非背景
- [x] 2.3 Console 全程無錯誤；`npm run test:e2e` 通過
