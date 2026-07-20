# Design: smart-car-complete（智能小車完臻化 Phase 1）

## Context

- 現行智能小車（`src/parts/presets.ts`，源自 archived change `2026-07-19-smart-car-preset`）：一鍵生成 6 個電子零件（hc-sr04 / uno / l298n / battery / 2×tt-motor，固定 XY、z=0）+ 1 塊 primitive 底盤盒（270×185×3 @ z=-3）+ 2 個 `car-wheel`（素圓柱輪胎）。生成後預設選取 6 個電子零件。
- 已確認的物理缺陷：① 底盤穿到地面下 3mm（佔 z∈[-3,0]），輪子最低點在 z=0＝底盤**頂面**高度，整台車物理上坐在底盤肚皮上、輪子懸空；② 馬達橫置（rotZ=90，長軸沿 Y），真實 TT 馬達軸永遠對不到兩側輪子；③ 無萬向輪，真車會向前翻；④ 輪子單色無輪轂；⑤ 只有一種寫死佈局。
- 外殼整合現況（探索結論）：`collectPartSnapshots`（`src/enclosure/actions.ts`）只收 `type==='part'` 節點——**primitive 底盤永遠進不了外殼流程**；外殼地板跟隨最低被選零件底面（`plan.ts` `partWorldBounds`），與世界 z=0 無關；支柱從地板長到零件孔平面（`topZ = pz + (hole.z ?? 0)`），z 高度全程被尊重（bounds / standoff / port / lid）；碰撞檢查僅 XY（corner-post vs part bbox、`findExpansion`）。
- 渲染管線現況：`evaluateForRender`（`src/geometry/evaluate.ts`）每節點回 1 個 `EvaluatedNode`；`NodeMeshPayload`（`src/geometry/protocol.ts`）= nodeId + role + positions + indices；Viewport 單一 `meshStandardMaterial`，part 固定 `#2e7d5b`、選取 `#2563eb`、hole `#ef4444`。**一節點一色**，無 per-block 顏色。
- 零件 schema 現況（`src/parts/schema.ts`）：block = shape/position/size/rotation?/label?；mountingHole = x/y/diameter/z?。`buildPartSolid`（`src/parts/partGeometry.ts`）全部 union 成單一 Solid 再鑽孔（孔恆沿 Z 軸）。
- 既有慣例：block 常數用 probe-based 驗證（`carWheel.test.ts`、`shellGeometry.test.ts`）；preset 佈局用 AABB 不相交測試把關（`presets.test.ts`）；匯出走 `evaluateForExport` 整份 union 成單一 Solid，不受渲染分段影響。

## Goals / Non-Goals

**Goals:**
- 2WD 佈局物理重排：輪子與萬向輪真正貼地 z=0、馬達軸對齊輪心、底盤抬到軸高、電子零件站上底盤頂
- 外觀細節：`car-wheel` 輪胎+輪轂雙色、`tt-motor` 補馬達罐與雙出軸、底盤圓角+真實孔位
- 底盤零件化（`car-chassis-2wd`，含安裝孔），外殼流程整合：生成小車後直接「產生外殼」得到地板落地的整車展示盒
- per-block 顏色管線（schema → partGeometry → evaluate/protocol → Viewport）
- preset 架構泛化（資料驅動 `CarPresetSpec`）+ 新增 4WD preset + 工具列 preset 選單

**Non-Goals:**
- 參數化對話框（自訂輪徑/軸距/輪距）→ Phase 2 另立規格
- 履帶車、其他車型；輪子轉動/物理模擬
- 外殼系統功能新增（沿用既有 screw/peg/hole 支柱邏輯，僅加 D3 的孔位旗標）
- 輪轂中心軸孔建模（mountingHoles 恆沿 Z 軸鑽，水平軸孔無法表達；軸端藏進輪轂凸台即足夠）
- 萬向輪鎖附孔（v1 萬向輪置於底盤下不建模鎖附）

## Decisions

### D1 — Z 軸架構（物理核心）

```
z=32.5 ── 輪心 = 馬達軸心（65mm 輪半徑）
z=20.5 ── 底盤頂面 = 馬達底面 = 電子零件底面
z=17.5 ── 底盤底面（板厚 3mm）
z=0    ── 地面：輪子、萬向輪貼地
```

- TT 馬達軸心定義在本體底面上 12mm（近似實物，零件庫本就宣告近似值）；馬達坐底盤頂 → 軸心 = 20.5+12 = 32.5 = 輪心 ✓
- 馬達改**縱向放置**（rotZ=0，長軸沿 X、雙軸朝 ±Y 兩側）——真實套件姿態，修正現行橫置軸對不到輪子的根因
- 萬向輪總高 17.5，恰好填滿地面到底盤底
- 電子零件 z 從 0 改 20.5，XY 沿用現佈局（hc-sr04 x=105 / uno x=40 / l298n x=-25 / battery x=-95）

### D2 — schema：`partBlockSchema` 加選填 `color`

```ts
color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
```

不填＝沿用節點預設色，全部現有零件零影響（向後相容）。零件檔案格式不變（def 是程式內資料，文件只存 partId）。

### D3 — schema：`mountingHoleSchema` 加選填 `standoff`

```ts
/** 預設 true。false＝孔照鑽穿零件幾何，但 planStandoffs 跳過不長支柱 */
standoff: z.boolean().optional(),
```

`planStandoffs`（`src/enclosure/plan.ts`）過濾 `hole.standoff !== false`。用途：底盤上 14 個電子零件鎖附孔不該長支柱（否則外殼地板長出 18 根柱）。向後相容（缺省＝現行行為）。

### D4 — `tt-motor` 細節化

- 主體維持齒輪箱 [65, 22.5, 18.5]
- 加馬達罐 block：Ø20×25 橫軸圓柱（軸沿 X），位於後段上方，頂部約 z=29
- 加雙出軸 blocks：Ø5.4×8 水平圓柱（軸沿 ±Y），軸心 x=+20、距本體底面 z=12，自 ±Y 面各伸出 8mm（雙軸版為真實在售型號，且讓左右馬達同站位、佈局對稱）
- `clearanceHeight` 18.5 → 29
- 仍無 mountingHoles（坐底盤頂，與現況一致；外殼不為馬達長柱）
- block 常數依專案慣例 probe-verified（測試斷言軸心高度/伸出量/罐頂高）

### D5 — `car-wheel` 雙色 + 輪轂

- 輪胎 block：沿用現有 Ø65×27 水平圓柱（觸地/直徑/胎寬斷言不變），加 `color: '#2b2d30'`（近黑橡膠）
- 新增輪轂 block：Ø30×29 水平圓柱、同軸，兩側各凸出輪胎 1mm，`color: '#c8ccd2'`（淺灰）
- 本體 [10,27,1] 輪轂座維持（原點錨，幾乎全被蓋住）；`clearanceHeight: 65` 不變；mountingHoles 維持空（軸孔不建模，見 Non-Goals）
- 輪子節點放 z=0 貼地不變；新位置對齊馬達軸（見 D9）

### D6 — 新零件 `ball-caster-16`（category: component）

- 主體 [14,14,9]（滾珠近似直立圓柱）；blocks：珠座 Ø18×5（z 9..14）+ 安裝板 [26,26,3.5]（z 14..17.5）
- 總高 17.5＝地面到底盤底 ✓；`clearanceHeight: 17.5`
- 無 mountingHoles（v1 不建模鎖附）、無 ports
- name: "Ball Caster 16mm" / nameZh: "16mm 萬向滾珠"

### D7 — 新零件 `car-chassis-2wd`（category: component），取代 primitive 底盤盒

- 270×185×3 圓角板（r=10）：schema 的 `body` 加選填 `cornerRadius: z.number().nonnegative().optional()`，`buildPartSolid` 改用 `kernel.roundedBox(l, w, t, cornerRadius ?? 0)`（kernel 介面本就有 roundedBox，cornerRadius<=0 時等同 box——全部現有零件零影響）。比「本體+邊條+角圓柱 blocks」的拼裝更簡潔，AABB 不變
- mountingHoles：
  - **4 個角落孔** Ø3 @ (±125,±82.5)，`standoff` 缺省（true）——外殼支柱自地板頂到底盤底面，螺絲穿孔鎖進支柱，三種 mountingStyle 皆物理成立
  - **14 個電子零件孔**（uno 4 + l298n 4 + hc-sr04 4 + battery 2），`standoff: false`，孔徑比照各零件 def（3.2/3.2/1.8/3）。孔位換算規則：chassis-local = 電子件世界 XY − 底盤節點 XY；實作由程式從 preset 佈局＋各 def 的 mountingHoles 算出寫死數值，並由**交叉對照測試**斷言一致（佈局漂移自動抓）
- `clearanceHeight: 3`（自身板厚；外殼蓋高由輪子 65 主導，見 D10）
- name: "2WD Car Chassis" / nameZh: "2WD 小車底盤"
- 4WD 的電子零件 XY 與 2WD 完全相同（D9），**兩款共用此底盤**，無第二個底盤 def
- 舊 `buildChassisAndWheels` 的 primitive 底盤盒移除

### D8 — per-block 顏色管線

- `partGeometry.ts` 新增 `buildPartColoredSegments(def, kernel): { solid: Solid; color?: string }[]`：無色 blocks 維持 union 進主體（段 0，無 color）；每個帶 `color` 的 block 獨立成段（不 union，避免共面 z-fight）。安裝孔對每段照鑽（Z 軸孔對水平段通常無交疊＝no-op，語義保持「孔穿透一切」）。`buildPartSolid` 改為「全部段再 union」供測試/匯出/bounds，行為不變
- `evaluate.ts`：渲染路徑對 part 節點改用分段（每段各自 transform、各自被同層 hole 減料），一節點可回多個 `EvaluatedNode`；`evaluateForExport` 不變（整份 union，段界消失）
- `protocol.ts`：`NodeMeshPayload` 加 `color?: string`
- `Viewport.tsx`：`SceneMesh` 材質色改為 `isHole ? 紅 : selected ? 藍 : (payload.color ?? (isPart ? '#2e7d5b' : '#9db4d0'))`；React key 改用 `nodeId + 陣列索引`（分段共享 nodeId）；wireframe/Edges、xray、點擊選取邏輯不變
- 舊存檔的 `car-wheel` 節點自動以新幾何+雙色渲染（def 是程式內資料）

### D9 — preset 架構泛化 + 兩款佈局

`presets.ts` 改為資料驅動：

```ts
export interface CarPresetSpec {
  id: string;
  i18nKey: string;                                  // toolbar 選單標籤
  electronics: { partId: string; x: number; y: number; z: number; rotZ: number }[];
  chassisPartId: string;
  wheels: { partId: string; x: number; y: number }[];   // 貼地 z=0
  caster?: { partId: string; x: number; y: number };    // 貼地 z=0
}
export function buildCarNodes(spec: CarPresetSpec, lang: string): {
  nodes: SceneNode[];
  defaultSelection: string[];                        // 底盤+輪+(萬向輪) 的 id
}
```

- **2WD**（10 節點）：電子件 6（hc-sr04(105,0) / uno(40,0) / l298n(-25,0) / battery(-95,0) / tt-motor×2 (-35,±81.25)，z 全 20.5、rotZ 全 0）+ 底盤 @ (-3,0,17.5) + 輪×2 @ (-15,±107.5,0) + 萬向輪 @ (95,0,0)
  - 馬達 (-35,±81.25)：本體 x∈[-67.5,-2.5]、y 貼齊底盤緣 92.5；軸心世界 (−15, ±92.5 面, 32.5)，軸端伸至 y=±100.5；輪轂內面 y=±93 → 軸插入輪轂 7.5mm ✓
  - 輪 y=±107.5：胎面與馬達面留 1.5mm 隙 ✓
- **4WD**（13 節點）：同款電子件同 XY 同 z（hc-sr04 / uno / l298n / battery 位置不變＝共用底盤孔位）+ tt-motor×4（前對 (45,±81.25)、後對 (-100,±81.25)，z=20.5）+ 底盤同位 + 輪×4 @ (65,±107.5) 與 (-80,±107.5)，無萬向輪
- 最終 XY 常數由 3D AABB 測試把關（見測試策略）；實作可微調，測試紅即調
- 查無零件 id 照舊 throw（現行慣例）

### D10 — 預設 selection 改為「貼地結構組」（⚠️ 行為變更）

- 舊行為：生成後選取 6 個電子零件。新行為：選取 **底盤+輪+(萬向輪)**（2WD 4 個、4WD 5 個），`defaultSelection` 由 builder 回傳
- 理由（外殼整合核心）：外殼地板跟隨最低被選件底面。選貼地組 → 地板落 z≈-3（貼地）、牆包全車（輪子主導 y=±120.5）、蓋高過輪頂 65、底盤 4 角孔各長一根支柱（地板→底盤底 17.5）鎖住底盤——一鍵得到物理自洽的整車展示盒；輪子恰好觸及外殼地板內面
- 反例：若選懸空的電子件（z=20.5），整個外殼浮在 z≈17.5、且電子件支柱會穿過底盤板——這是舊預設 selection 在新佈局下必然崩壞的原因，故變更是必要而非順便
- 使用者仍可手動改選任何集合（既有自由不變）；「只選電子件會得到浮空外殼」在規格明記為已知行為，不加警告 UI（YAGNI）

### D11 — Toolbar preset 選單 + i18n

- Car 按鈕改為開小選單（沿用 `ScrewToolsMenu` 的 popup pattern），列兩款 preset 的 i18n 名稱，點即生成：`addNodes(nodes)` + `setSelection(defaultSelection)`（單次 mutate + 覆寫選取，一次 undo 整組復原，同現行語義）
- i18n 新鍵：`toolbar.smartCar2wd`（智能小車 2WD / Smart Car 2WD）、`toolbar.smartCar4wd`（智能小車 4WD / Smart Car 4WD）；`toolbar.smartCar` 保留作按鈕 title
- 底盤與萬向輪是零件庫正式零件，自然出現在 PartsDrawer「component」分類

## 測試策略

1. `presets.test.ts` 重寫：
   - 兩款 spec 的 partId 皆存在於 PART_LIBRARY；節點數（10 / 13）；位置/旋轉/z 與資料表一致；`defaultSelection`＝貼地組 id
   - **3D AABB 兩兩不相交測試**（由現行 2D 版升級，嚴格不等式——貼面接觸合法：電子件/馬達貼底盤頂、萬向輪頂貼底盤底皆應通過）
2. 底盤孔位交叉對照測試：2WD 每個電子件的 def mountingHoles 經佈局平移後，必須在 `car-chassis-2wd` 的 `standoff:false` 孔中找到同徑同位孔（雙向 drift 都抓）
3. `carWheel.test.ts` 更新：貼地/Ø65/胎寬 27 三斷言保留；新增分段測試（3 段：本體無色、輪胎 #2b2d30、輪轂 #c8ccd2；輪轂胎外各凸 1mm）
4. 新增 `ballCaster.test.ts`：總高 17.5、最低點觸地 z≈0
5. 新增 `ttMotor.test.ts`：probe 斷言軸心距本體底面 12mm、軸自 ±Y 面伸出、罐頂 ≈29（clearanceHeight 一致）
6. `partGeometry` 分段測試：uno → 1 段無色；wheel → 3 段且顏色歸屬正確；`buildPartSolid` 整體 union 行為不變
7. schema 測試：`color` 接受合法 hex、拒絕非法字串；`standoff` 缺省/顯式 false 解析；`cornerRadius` 缺省/拒絕負值
7b. `library.test.ts` 的 clearanceHeight 全域檢查改為 **rotation-aware**：旋轉 90° 的圓柱 block 其垂直延伸 = 半徑（`size[0]/2`）而非柱長（`size[2]`）——現行天真公式會把 TT 馬達罐誤算成 44mm 高（實際罐頂 29mm）；車輪輪胎在新公式下恰為 65mm 不變。保護意圖（clearanceHeight ≥ 實際最高點）不變
8. 外殼整合測試（plan 層）：對 2WD `defaultSelection` 跑 `planShell`+`planStandoffs`——斷言 `outer.minZ = −wallThickness`（預設參數 3mm 下即 −3，地板內面貼地 z=0，沿用 `plan.test.ts` 既有寫法）、支柱恰好 4 根（角孔）且 topZ=17.5、無 corner-post 碰撞旗標；另驗證 `standoff:false` 孔被跳過
9. `evaluate.test.ts`：含色零件 → 多 payload 且帶 color；hole 對每段都減料
10. e2e（`e2e/smoke.spec.ts`）：檢查是否點擊小車按鈕/數節點，如有則同步新節點數與選單互動
11. 全量 `npm test` 保持綠；`npm run build`（tsc）通過

## Risks / Trade-offs

- **預設 selection 行為破壞**：舊版選 6 電子件直接銜接外殼的流程在新佈局下物理不成立（浮空外殼），改選貼地組是必要修正；已在 D10 明記
- **舊存檔渲染變化**：舊文件的 `car-wheel`/tt-motor 節點以新幾何渲染、舊 preset 生成的懸空佈局不會自動遷移——零件庫本就宣告近似值、文件只存 partId+transform，可接受
- **有色段不 union**：段與主體交疊處非水密；渲染/匯出走現行 mesh 流程（匯出最終 union/合併）無實際影響
- **馬達無安裝孔**（坐底盤頂不上柱）與 **mountingStyle:'hole' 對懸空件只穿地板** 皆為沿用現況的已知限制，非本 change 引入
- **碰撞檢查僅 XY**：外殼 corner-post 與輪子的潛在誤報由整合測試（斷言無碰撞旗標）把關
- **3D AABB 測試只保證軸對齊包盒不碰撞**：圓柱實體間隙可能更小；輪/馬達間隙已留 1.5mm，足夠
- 後續（非本規格範圍）：Phase 2 參數化對話框；如團隊走 OpenSpec 主規格同步流程，實作完成後可另立 change 同步 part-presets / part-library 主規格
