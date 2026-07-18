# Design: mounting-through-hole

## Context

零件安裝柱幾何在 `shellGeometry.ts`'s `buildShellSolid` 標準迴圈裡，依 `s.mountingStyle` 分支（`s.isCornerPost` 為 true 的項目走另一條完全獨立的角柱分支，不受影響）：
- `'peg'`：長實心柱到孔平面，柱頂再長一段定位圓柱插入零件孔。
- 其餘（現行 `'screw'`，之後預設仍是 `'screw'`）：長柱到至少 `pilotDepth` 高，柱頂鑽自攻導孔。

兩者都會 `union` 一根柱子。新選項 `'hole'` 不需要柱子，只需要在地板挖一個貫穿孔——比 `'peg'`/`'screw'` 都簡單，甚至不需要 `standoffHeight`/`standoffRadius` 這類柱體計算。

## Goals / Non-Goals

**Goals:**
- `MountingStyle` 三選一：`'screw'`（現行預設）、`'peg'`、新增 `'hole'`
- `'hole'`：地板貫穿孔，直徑 = `pilotDiameter(screwSize, 'through')`，不長柱、不自攻
- 只影響零件安裝柱（`isCornerPost` 非 true 的項目）

**Non-Goals:**
- 不改角柱（`isCornerPost`）邏輯、`screwEntry`/`screwLidProfile`
- 不做沉頭孔外露/藏入變化（`'hole'` 模式螺絲頭本來就外露在殼體外底面，無需選項）
- 貫穿孔直徑不開放為獨立參數（沿用既有 `pilotDiameter(screwSize,'through')` 慣例，同角柱通孔公式）

## Decisions

**D1 — `MountingStyle = 'screw' | 'peg' | 'hole'`。**
`src/types/document.ts` 型別擴充，純加值不改既有兩值語意。預設值不變（`DEFAULT_ENCLOSURE_PARAMS.mountingStyle: 'screw'`、`planStandoffs` 的 `mountingStyle` 參數預設 `'screw'`），無 backward-compat 疑慮（純新增列舉值，zod `z.enum(['screw','peg'])` 需同步擴充為三值，否則舊/新程式碼寫入 `'hole'` 會被既有 schema 拒絕）。

**D2 — `buildShellSolid` 新增 `'hole'` 分支。**
在既有 `if (s.mountingStyle === 'peg') {...} else {...}` 結構前面插入 `else if (s.mountingStyle === 'hole') {...}`（或改為三路 `if/else if/else`，`else` 落回現行 `'screw'` 行為，維持向後相容——任何未來新增的 mountingStyle 值若忘記處理，也會意外落入 `'screw'` 行為而非靜默無操作，這是目前 codebase 對「未知/預設值」的既有慣例，沿用不特立獨行）：
```ts
} else if (s.mountingStyle === 'hole') {
  // hole 模式：不長柱，只在零件安裝孔位置貫穿殼體地板挖一個螺絲淨空孔。
  // 螺絲全程不與殼體咬合（不自攻），直徑用通孔徑，同角柱通孔公式。
  const holeRadius = pilotDiameter(screwSize, 'through') / 2;
  const hole = kernel.transform(kernel.cylinder(holeRadius, wallThickness + 2), {
    position: [s.x, s.y, plan.floorZ - 1],
    ...noRotScale,
  });
  shell = kernel.difference(shell, hole);
} else {
  // 現行 'screw'（及任何未識別值皆落此，維持向後相容）...
}
```
孔的 Z 範圍：從 `plan.floorZ - 1`（外底面下方 1mm，overshoot 避免切面殘留）貫穿高度 `wallThickness + 2`（地板厚度 + 頭尾各 1mm overshoot），確保乾淨貫穿整片地板，不論零件孔平面 `topZ` 實際多高（`'hole'` 模式本無支柱銜接零件，孔只需貫穿地板本體，頂部略微進入內腔淨空即可，不需要對齊 `topZ`——這是與 `'screw'`/`'peg'` 的關鍵差異：那兩者的柱高需要頂到 `topZ` 才能接住零件孔，`'hole'` 沒有柱子，螺絲直接從殼外穿地板進入零件底部，不需要任何殼體結構延伸到 `topZ`）。
半徑用 `pilotDiameter(screwSize, 'through')`（螺絲淨空直徑），與角柱 `fromBase` 分支通孔公式一致，維持全案「通孔一律用 through 直徑」的既有慣例（D1 of screw-entry-direction 已建立此慣例）。

**D3 — UI：下拉加第三選項。**
`enclosure.mountingHole` i18n key（zh：「螺絲孔」，en: "Through hole"）。`EnclosurePanel.tsx`/`PropertyCard.tsx` 既有 `mountingStyle` `<select>` 加 `<option value="hole">`，wiring 沿用既有 pattern（無需改可見性條件，跟現行兩選項一樣「所有上蓋類型都顯示」，因為零件安裝柱在 open/slide/screw 三種上蓋都存在）。

## Risks / Trade-offs

- **無支柱意味零件完全靠螺絲鎖入自身結構固定**：殼體不提供任何定位/支撐，零件若沒有自己的固定結構（螺帽、牙套），這個選項就沒有實際鎖固效果——這是使用者明確要的取捨（零件自帶固定結構才用這個選項），不做偵測/警告（同 `peg` 模式的既有精神：使用者自行判斷零件是否適合該固定方式）。
- **貫穿孔恆用 through 直徑、無沉頭選項**：螺絲頭外露坐在殼體外底面。若使用者需要頭藏起來，應改用 `'screw'`/`corner-post` 的沉孔機制而非這個極簡選項——這正是三選項各自的定位差異，不強求 `'hole'` 也支援沉頭（YAGNI，未來要加再說）。
