# NexCAD 外殼生成器精修（Plan 4/6）設計文件

日期：2026-07-16
狀態：已與使用者確認設計，待實作計畫

## 背景與範圍

Plan 3 已完成外殼生成器 v1（`src/enclosure/`）。使用者選定三大優化方向共約 10 項特徵，拆為三份計畫：

- **Plan 4（本文件）**：基礎修正 + 參數彈性 — 5 項
- Plan 5：新外殼特徵（滑蓋真軌道、通風槽、顯示器開窗自動+手動）— 另立 spec
- Plan 6：進階幾何（非 90° 旋轉接口投影、匯出前 mesh 壁厚檢測）— 另立 spec

拆解理由：Plan 4 的「參數事後可改」會建立 params 編輯與重算機制，Plan 5 的新特徵全是新參數，先有機制再加特徵；Plan 6 兩項與前兩者細節互不依賴，工程最大，放最後。

## §1 接口開孔垂直位置修正

**問題。** `src/parts/schema.ts` 對 `port.z` 的註解為「自主體頂面起算的垂直偏移」，零件庫資料（如 Arduino USB 接口 `z: 0, h: 5`）符合「z = 接口底邊距頂面高度」的直覺——USB 連接器貼著 PCB 頂面。但 `planPortCutouts`（`src/enclosure/portProjection.ts`）計算 `v = pz + bodyT + port.z` 後，`cutPorts` 把 `v` 當作開孔**中心**使用（`position z = v - h/2`），導致開孔實際下移半個接口高度：接口高 5mm 時開孔中心落在 PCB 頂面，下半截挖在板子側面高度、上半截才對著連接器。

**語意定案。** `port.z` = 接口**底邊**距零件頂面的高度。此定義寫入 schema 註解。

**修正。** `planPortCutouts` 改為 `v = pz + bodyT + port.z + port.h / 2`（v 仍為開孔中心，僅來源修正）。`cutPorts` 不變。

**測試。** 以固定 fixture（已知 bodyT、port.z、port.h）驗證開孔布林後的實際 Z 範圍為 `[頂面+z − 公差, 頂面+z+h + 公差]`：對殼體在預期範圍內外各放 probe box 做交集體積斷言。若測試過程發現庫資料實際按「中心」語意填寫（與上述判讀相反），則以測試證據為準改採中心語意並修正註解，二擇一，不得兩者混用。

## §2 多選零件指定外殼範圍

**現況。** `generateEnclosure`（`src/enclosure/actions.ts`）一律收集文件中全部可見 part 節點。

**改動。** 生成時讀取 `selection`：

- 選取中含 ≥1 個 part 節點 → 只包含選取中的 part 節點（選取中的非 part 節點忽略）。
- 選取中無 part 節點（含空選取）→ 維持現行為，包含全部可見零件。

**UI。** `EnclosurePanel` 在產生按鈕上方顯示目前模式：「將包含選取的 N 個零件」或「將包含全部 N 個可見零件」，隨 selection 即時更新。

**不變。** `sourceParts` 快照機制與 `regenerateEnclosure` 邏輯照舊——重新產生時沿用該外殼節點記錄的零件清單，不重讀 selection。

## §3 支柱參數可調

**現況。** 支柱壁厚寫死為 `wallThickness`，自攻導孔深度寫死查 `SCREW_TABLE`。

**改動。** `EnclosureParams` 新增：

- `standoffWallPadding: number` — 支柱半徑 = 導孔半徑 + 此值。預設 = `wallThickness` 的現值（生成時代入，存入 params 後即固定）。
- `pilotDepthOverride?: number` — 有值時取代 `SCREW_TABLE` 的導孔深度；空值 = 查表（預設）。

**UI。** `EnclosurePanel` 新增「進階」摺疊區塊，兩個數字輸入欄。

**相容。** `.nexcad` schema（`src/persistence/nexcadFile.ts`）與既有 IndexedDB 資料：`standoffWallPadding` 給 zod `default`、`pilotDepthOverride` optional，舊檔案免遷移。`plan.ts` 的 `planStandoffs` / `planCornerPosts` 簽名改為接收這兩個值。

## §4 外殼參數事後可改

**現況。** 外殼節點的 params 生成後不可見不可改，只能刪掉重生。

**改動。** `PropertyCard` 對 `type === 'enclosure'` 節點顯示完整參數表單（欄位同 `EnclosurePanel`：壁厚、淨空邊距、圓角半徑、上蓋類型、螺絲規格，加上 §3 的進階欄位）。任一欄位變更即：

1. `updateNode(id, n => { n.params = 新值 })`（一步 undo）。
2. 呼叫既有 `regenerateEnclosure(id)` 重算幾何（其已負責刷新 sourceParts transforms）。

**獨立性。** base 與 lid 各自持有 params 副本，改其一不影響另一個。不做跨節點同步（保持簡單；使用者要一致就兩邊各改）。

**邊界。** `lidType` 從非 open 改成 open、或反向，只影響該節點自身的幾何重算（base 節點的 lidType 影響四角螺絲柱有無；lid 節點改 lidType 改變自身形態）。不自動新增或刪除另一個節點——生成時的 base/lid 配對只在 `generateEnclosure` 發生。

## §5 螺絲柱根部補強倒角

**目的。** 3D 列印時支柱根部是層間剝離高風險點，加 45° 倒角環分散應力。

**幾何。** 殼體內的圓形支柱（`buildShellSolid` 的 standoff 柱與四角螺絲柱）根部 union 一個圓錐台：底半徑 = 柱半徑 + `wallThickness`、頂半徑 = 柱半徑、高 = `wallThickness`，貼在柱根（殼底面或內腔底面）。補強寬固定用 `wallThickness`，不新增參數。

**限制。** 倒角環不得超出內腔 XY 範圍（貼牆的四角柱其倒角在牆側自然被牆吸收，union 無害）；不影響導孔（倒角只加體積不減）。

**測試。** 補強後總體積 > 補強前；倒角環頂面 Z = 柱根 Z + wallThickness；probe 驗證倒角環斜面存在（在斜面中點內側取樣為實心、外側為空）。

## 測試策略

全部遵循既有模式：kernel 幾何測試以體積與 probe box 交集斷言（參考 `shellGeometry.test.ts`）、store 邏輯以 zustand getState 直測、schema 以 round-trip 測試。§2/§4 的 UI 顯示邏輯以既有 i18n key-parity 測試涵蓋新增字串，互動流程留待手動瀏覽器驗證清單。

## 全域約束

- 所有幾何程式碼維持 worker-safe（`src/enclosure/` 不得 import store/zustand/react；`actions.ts` 除外）。
- i18n zh/en key 對等（`resources.test.ts` 強制）。
- `.nexcad` schema 變更必須有 round-trip 回歸測試（Plan 3 最終審查教訓：`SceneNode` union 任何成員變動都要同步 `nexcadFile.ts`）。
- 新參數一律向後相容（zod default / optional），不做資料遷移。
