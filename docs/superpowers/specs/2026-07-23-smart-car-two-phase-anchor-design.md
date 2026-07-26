# Smart Car 兩階段生成：Preset 錨點法設計

## 摘要

將「生成智能小車」從目前的單鍵產生全部零件，改成兩階段流程：

1. **Phase 1：放置電子零件**。用家在 `CarConfigPanel` 選好 preset、長寬形狀後，只產生電子零件（UNO、L298N、電池、馬達、超音波等），並附帶一個可視、可拖曳、可旋轉的 `CarAnchorNode`。
2. **Phase 2：生成底盤**。用家調整電子零件與錨點位置後，透過選中錨點並按「生成底盤」，系統根據**錨點 frame** 與電子零件實際位置動態產生底盤、車輪、萬向輪。

錨點可反覆選取與重生成，每次會覆蓋舊的底盤/貼地輪組。

---

## 背景與動機

目前 `buildCarNodes()` 會一次產生電子零件 + 底盤 + 車輪，且底盤安裝孔是根據 preset 的預設位置計算。用家若有以下需求會遇到限制：

- 想先擺放電子零件，確認空間後再決定底盤確切位置與大小。
- 希望底盤孔位能反映調整後的電子零件位置。
- 不想一次產生太多節點，分批降低認知負荷。

兩階段流程讓用家把「布局」與「底盤生成」解耦。

---

## 設計決策

| 問題 | 決定 | 理由 |
|------|------|------|
| Phase 1 產生什麼？ | 只產生電子零件 | 車輪/萬向輪依附底盤，等 Phase 2 一起產生。 |
| Phase 2 產生什麼？ | 底盤 + 車輪 + 萬向輪 | 維持原 preset 的完整性。 |
| 底盤定位方式 | Preset 錨點法 | 用獨立可視節點表示底盤中心與方向，兼顧控制力與自動化。 |
| 錨點資料模型 | 新增 `CarAnchorNode` 類型 | 語義清楚，不會被誤認為實體零件或外殼節點。 |
| 電子零件旋轉限制 | 只允許 Z 軸旋轉 | 與底盤平面一致，孔位計算保持二維，避免 X/Y 旋轉導致孔垂直性問題。 |
| 孔位超出處理 | 生成前檢查，超出就 toast 警告並不生成 | 避免沉默產生無效孔位。 |
| 重複生成 | 覆蓋舊底盤/輪組 | 流程最靈活，可反覆調整。 |

---

## 資料模型

### 新增 `CarAnchorNode`

```ts
export interface CarAnchorNode extends NodeCommon {
  type: 'car-anchor';
  config: CarConfigParams;
  presetId: 'smart-car-2wd' | 'smart-car-4wd';
  /** Phase 1 產生的電子零件 nodeId，用於追蹤參與孔位計算的零件 */
  electronicsIds: string[];
  /** Phase 2 產生的底盤與貼地輪組 nodeId；存在時再次生成會先刪除舊節點 */
  generatedNodeIds?: string[];
}
```

`SceneNode` union 擴展：

```ts
export type SceneNode = PrimitiveNode | GroupNode | PartNode | EnclosureNode | CarAnchorNode;
```

### 拆分 `buildCarNodes`

現有 `buildCarNodes()`  monolith 拆成兩個獨立函式：

```ts
// Phase 1：產生錨點 + 電子零件
export function buildCarAnchorAndElectronics(
  config: CarConfigParams,
  lang: string,
): { anchor: CarAnchorNode; electronics: PartNode[]; defaultSelection: string[] };

// Phase 2：根據錨點與場景中零件產生底盤 + 輪組
export function buildCarChassisAndGround(
  anchor: CarAnchorNode,
  sceneNodes: SceneNode[], // 當前 document.nodes，用來查找 electronicsIds 對應的零件
  lang: string,
): { nodes: SceneNode[]; defaultSelection: string[]; warnings: string[] };
```

---

## Phase 1：放置電子零件

### 流程

1. 用家開啟 `CarConfigPanel`，選擇 2WD/4WD、形狀、長寬、厚度、輪徑、是否萬向輪。
2. 按下「放置電子零件」。
3. 系統：
   - 依 preset 產生電子零件 `PartNode`。
   - 計算錨點初始位置：
     - `x = chassisCenterX(config.length)`
     - `y = 0`
     - `z = CHASSIS_TOP_Z - config.thickness`（與目前底盤 node 的底面高度一致）
   - 建立 `CarAnchorNode`，寫入 `config`、`presetId`、`electronicsIds`。
   - 回傳的 `defaultSelection` 只包含錨點，讓用家能直接拖曳錨點調整位置。

### UI 變更

- `CarConfigPanel` 主按鈕文案：
  - 中文：「放置電子零件」
  - 英文：Place Electronics
- 按鈕仍位於 panel 右下角。

---

## Phase 2：生成底盤

### 流程

1. 用家調整電子零件位置與 Z 軸旋轉，也調整錨點位置/旋轉。
2. 選中場景中的錨點，或在 scene tree 選中錨點。
3. 屬性面板顯示「生成底盤」按鈕。
4. 按下後執行：
   1. 讀取 `anchor.electronicsIds` 對應的零件；若已刪除則忽略。
   2. 反轉錨點 transform，把每個電子零件的安裝孔轉換到**錨點本體座標系**。
   3. 檢查所有 local hole 是否落在底盤 XY 範圍內（依 `anchor.config.length/width`）。
      - 若有超出：toast 警告「部分電子零件超出底盤範圍，請調整錨點大小或零件位置後再試。」，並**中止生成**。
   4. 產生底盤 `PartDefinition`，包含轉換後的孔位，並 `registerPartDefinition`。
   5. 產生底盤 `PartNode`，transform 等於錨點 transform。
   6. 依 preset 計算車輪/萬向輪的錨點 local offset，轉成世界位置後產生對應 `PartNode`。
   7. 若 `anchor.generatedNodeIds` 存在，先刪除舊節點（避免新舊底盤/輪組重疊或 ID 衝突）。
   8. 寫入新節點到 document，更新 `anchor.generatedNodeIds`。

`buildCarChassisAndGround` 的回傳型別為 `{ nodes: SceneNode[]; defaultSelection: string[]; warnings: string[] }`。`warnings` 收集需要 UI 顯示的訊息（例如「部分電子零件超出底盤範圍」）。若發生會導致無法生成的錯誤，回傳 `nodes: []` 並在 `warnings` 中說明原因。

### 屬性面板按鈕狀態

| 狀態 | 顯示 |
|------|------|
| 尚未生成 | 生成底盤 |
| 已生成 | 重新生成底盤 |
| 孔位超出 | 生成底盤（disabled）+ 紅色提示文字 |

---

## 孔位計算細節

給定電子零件 `part` 與錨點 `anchor`：

```
hole_local_in_part = (hx, hy, 0)
hole_world = Rz(part.rotation.z) * hole_local_in_part + part.position
hole_chassis_local = inverse_transform_of(anchor) * hole_world
```

因為限制電子零件只繞 Z 旋轉，旋轉部分用 2D matrix 即可：

```ts
const rad = rotZ * DEG;
const c = Math.cos(rad);
const s = Math.sin(rad);
const worldX = px + hx * c - hy * s;
const worldY = py + hx * s + hy * c;
const worldZ = pz; // 等於 CHASSIS_TOP_Z，與錨點同高
```

錨點 inverse transform 採用標準 3D homogeneous transform（錨點可任意位置與旋轉，但實務上只會繞 Z）。

### 底盤本體孔位差異

除了電子零件的安裝孔，底盤還需要自身四角固定孔。沿用現有 `buildChassisDefWithHoles` 的角落孔，與電子孔合併。

---

## 車輪與萬向輪位置

車輪位置不與電子零件位置連動，只跟錨點 frame 走。

### 計算方式

在 `CarPresetSpec` 中保留 `wheels` / `caster` 的**相對於底盤中心的 offset**。Phase 2 生成時：

```ts
for (const w of preset.wheels) {
  const local = [w.x, w.y, 0];
  const world = applyAnchorTransform(anchor.transform, local);
  createPartNode(w.partId, name, { transform: { position: world, rotation: [0,0,0], scale: [1,1,1] } });
}
```

目前 preset 中的 `wheels[].x` 是絕對世界座標（以預設長度 270 計算）。未來可考慮改為相對於錨點中心的 offset；若不改，則生成時需先減去原 preset 中心再套用到新錨點。本設計建議直接把 preset 資料改成**相對於錨點中心的 offset**，理由：

- 與錨點法語義一致。
- 避免不同長寬設定時還要額外縮放計算。
- 4WD 與 2WD 的輪距可以直接用相對偏移描述。

---

## 視覺呈現

### 錨點渲染

`Viewport` 針對 `type === 'car-anchor'` 繪製：

- 一個半透明底盤外框，尺寸 `length × width`，厚度忽略（扁平展示）。
- 輪廓線使用 `car-anchor` 專屬顏色（建議藍色或青色），與實體零件區分。
- 前端標示一個小箭頭，指出 +X 方向。
- 支援現有 gizmo：移動、Z 軸旋轉。

### Scene Tree

- `CarAnchorNode` 顯示為特殊圖示（例如錨點或 chassis 圖示）。
- 下方以折疊子項目列出 `electronicsIds` 對應的電子零件名稱，僅供識別，不實際改變父子關係。

---

## 錯誤處理與 warnings

| 情境 | 處理 |
|------|------|
| 電子零件被刪除 | 忽略該零件，繼續生成。 |
| 找不到 `CarAnchorNode` | 不執行 Phase 2；按鈕 disabled。 |
| 部分孔位超出底盤範圍 | Toast 警告，不生成。 |
| 所有電子零件都被刪除 | 可生成空底盤（僅角落孔）或 toast 提示。本設計採用「可生成空底盤」。 |
| 不再支援的 presetId | Fallback 到 `smart-car-2wd` 或報錯。 |

---

## 序列化與舊檔相容

- `CarAnchorNode` 需要加入 persistence layer 的 schema。
- 舊版檔案沒有 `type: 'car-anchor'`，繼續正常載入，只是不顯示兩階段按鈕。
- 舊版已生成的整車仍視為一般 `PartNode`，不影響現有功能。

---

## 測試策略

1. **單元測試** `parts/presets.ts`：
   - `buildCarAnchorAndElectronics` 回傳正確錨點與電子零件；`defaultSelection` 只包含錨點。
   - `buildCarChassisAndGround` 根據移動後的電子零件位置產生對應孔位。
   - 孔位超出時回傳 `warnings` 且 `nodes` 為空陣列。
2. **功能測試** `CarConfigPanel`：
   - Phase 1 按鈕只產生電子零件，不產生底盤/輪組。
3. **屬性面板測試**：
   - 選中 `CarAnchorNode` 時顯示「生成底盤」按鈕。

---

## 待實作時決定的細節

- `CarAnchorNode` 的確切 z 初始值：本設計使用 `CHASSIS_TOP_Z - config.thickness`，與目前底盤 node 的底面高度一致。
- 是否提供「從錨點重新同步電子零件列表」按鈕？若用家新增/刪除電子零件，可讓 anchor 自動更新 `electronicsIds`。本設計建議第一版不做，先假設用家只移動 preset 產生的零件。

---

## 相關檔案

- `src/types/document.ts`：新增 `CarAnchorNode`。
- `src/parts/presets.ts`：重構 `buildCarNodes`，新增 `buildCarAnchorAndElectronics` 與 `buildCarChassisAndGround`。
- `src/components/CarConfigPanel.tsx`：改為 Phase 1 入口，按鈕文案改為「放置電子零件」。
- `src/components/PropertyCard.tsx`：新增 `CarAnchorNode` 的屬性面板與「生成底盤」按鈕。
- `src/components/Viewport.tsx`：新增 `CarAnchorNode` 視覺渲染。
- `src/components/SceneTreePanel.tsx`：顯示 `CarAnchorNode` 及其下轄電子零件。
- `src/persistence/nexcadFile.ts`：序列化/反序列化 `CarAnchorNode`。
