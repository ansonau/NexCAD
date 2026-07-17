# Design: enclosure-collision-safety

## Context

`planCornerPosts`（`src/enclosure/plan.ts:140-161`）純幾何計算，只依殼體 `outer` 邊界內縮 `cornerRadius + 3` 算四個角落座標，對零件位置一無所知。零件的角柱半徑在兩處分別計算——殼體本體用 `standoffRadius = pilotDiameter/2 + standoffWallPadding`（`shellGeometry.ts:46`），上蓋用 `postRadius = max(selfTapRadius, throughRadius) + wallThickness`（`lidGeometry.ts:49`）——兩者都以 `planCornerPosts` 回傳的同一組 (x,y) 為圓心。`plan.ts` 本身不知道這兩個半徑公式（它們是各自模組的內部細節）。

第二個問題（零件爆出殼體）已確認是操作面的陳舊資料，不是幾何計算錯誤：使用者移動零件後未點「重新產生」，`sourceParts` 快照與 live part transform 不同步。

## Goals / Non-Goals

**Goals:**
- 角柱與零件 bounding box 重疊時，自動沿殼體邊緣搜尋鄰近無碰撞位置。
- 搜尋範圍內找不到無碰撞位置時，明確警告使用者（不靜默失敗、不阻擋生成）。
- 外殼節點的零件快照與目前零件實際位置不同步時，在選取該節點時給出視覺提示。

**Non-Goals:**
- 不做通用 2D bin-packing 或任意角柱重新佈局——只做「原位置附近沿邊搜尋」，維持角柱在角落的視覺直覺。
- 不做零件實際渲染幾何（含接頭/USB 座等細節）的精確碰撞檢測——沿用既有 `partWorldBounds` 的簡化 AABB，這是既有 v1 已知取捨的延伸，非本次修正範圍。
- 不自動觸發 `regenerateEnclosure`——零件位置變更後是否重新產生仍由使用者決定，本次只加「提示」，不改變既有手動流程。

## Decisions

**D1：碰撞緩衝半徑用保守估計值，不精確重算兩處的半徑公式。**

`plan.ts` 用 `pilotDiameter(screwSize, 'through') / 2 + Math.max(wallThickness, standoffWallPadding)` 當碰撞測試的圓形半徑。這個值恆 ≥ `shellGeometry.ts`/`lidGeometry.ts` 實際使用的兩個半徑（因為 `selfTapDiameter < throughDiameter`，且 `wallThickness`/`standoffWallPadding` 兩者取較大者），寧可保守觸發避讓，不漏檢。避免 `plan.ts` 依賴另外兩個模組的實作細節、造成循環認知負擔。

**D2：避讓演算法——沿角落所屬兩邊各自線性搜尋，取偏移量較小者。**

每個角落屬於殼體的一條水平邊與一條垂直邊。對兩個方向各自嘗試：從原位置起，以 1mm 為步進，往「遠離殼體中心」的方向（即沿該邊向外側鄰近的角落延伸，但受另一角落的 inset 位置限制，不會與相鄰角柱互撞）搜尋，每一步用「圓心到零件 AABB 的最短距離 ≥ 碰撞半徑」判斷是否無碰撞。步進上限 `min(width, depth) / 4`（超過此範圍已不算「角落附近」，改用回退規則）。兩個方向都搜尋完後，若都找到解，取偏移量絕對值較小的；若只有一個方向有解，用該方向；若兩者都在上限內找不到，維持原位置並標記 `collided: true`。

替代方案「任意方向 2D 搜尋」被否決：複雜度高、且可能把柱子挪到視覺上不像「角落」的位置，違反 CAD 使用者對螺絲柱佈局的直覺預期。

**D3：`planCornerPosts` 簽名擴充，`StandoffPlan` 加可選 `collided` 欄位，不引入新回傳型別。**

```ts
export function planCornerPosts(
  plan: ShellPlan,
  screwSize: ScrewSize,
  parts: PartInstance[],
  pilotDepth: number = PILOT_DEPTH,
): StandoffPlan[]
```

`StandoffPlan` 新增 `collided?: boolean`（只有角柱會設定此欄位；`planStandoffs` 的安裝孔支柱不做此檢查，因為它們的位置本就緊貼零件自身安裝孔，語意上不存在「碰撞」）。呼叫端（`shellGeometry.ts`/`lidGeometry.ts`）只取用 `.x`/`.y`，無需改動內部邏輯。`parts` 參數插入 `screwSize` 之後、`pilotDepth` 之前——這是 breaking change，`generate.ts` 與既有測試（`plan.test.ts`、`shellGeometry.test.ts`、`lidGeometry.test.ts`）呼叫處都要補上 `parts` 引數。

**D4：碰撞警告在 store 層（`actions.ts`）單獨輕量重算，不改動 worker-safe 的 `generate.ts` 介面。**

`generateEnclosure`/`regenerateEnclosure` 在既有邏輯之後，額外呼叫一次 `planShell` + `planCornerPosts`（純 CPU 數學，不涉及 kernel/WASM，成本可忽略）取得 `collided` 狀態，若為真則 `useToastStore.getState().show(...)`。`generate.ts` 的 `buildEnclosureNodeSolid` 內部呼叫 `planCornerPosts` 時同樣要傳入 `parts`（讓實際幾何位置與碰撞判斷一致），但其 `Solid | null` 回傳型別不變——worker 端不負責 UI 警告，關注點分離。

替代方案「讓 `buildEnclosureNodeSolid` 回傳碰撞資訊、往上傳到 `evaluate.ts`/worker 訊息協定」被否決：牽動 worker postMessage 協定與 `NodeMeshPayload`，改動面過大，不成比例。

**D5：外殼過期提示——`PropertyCard` 顯示時比對 transform，不做全域訂閱。**

選取 `enclosure` 節點時，`PropertyCard` 對每個 `sourceParts[i]` 找到對應 live part node，比較 `transform.position`/`transform.rotation` 是否與快照一致；任一不一致就在既有「重新產生」按鈕上方顯示警告文字（非 toast，因為這是選取當下的持續狀態，toast 稍縱即逝不合適）。不訂閱 store 做主動全域掃描（YAGNI——使用者選取該節點時才需要知道，多零件、多外殼的場景下即時掃描是不必要的效能負擔）。

## Risks / Trade-offs

- [保守碰撞半徑可能觸發不必要的避讓（實際兩個模組算出的真實半徑更小）] → 可接受：避讓演算法失敗才回退警告，多觸發幾次避讓不影響最終幾何正確性，只是計算路徑多跑一點。
- [線性搜尋在極端案例下（零件填滿整條邊）找不到解] → 這正是設計目標：找不到就明確警告，不是靜默生成錯誤幾何。
- [`planCornerPosts` 簽名變動是 breaking change] → 影響範圍已在 proposal Impact 列出，屬呼叫端一次性更新，非執行期風險。

## Open Questions

（無）
