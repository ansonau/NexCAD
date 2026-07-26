# part-presets Delta Specification

## ADDED Requirements

### Requirement: CarConfigParams type for runtime chassis configuration

The system SHALL define a `CarConfigParams` interface with fields for chassis shape, length, width, thickness, drive type, wheel size, and caster inclusion.

#### Scenario: All fields present

- **WHEN** CarConfigParams is constructed
- **THEN** it contains `shape` ('rounded-rect' | 'rect' | 'ellipse'), `length` (number), `width` (number), `thickness` (number), `drive` ('2wd' | '4wd'), `wheelSize` (number), and `includeCaster` (boolean)

#### Scenario: Default config matches existing 2WD preset

- **WHEN** default CarConfigParams are used
- **THEN** shape is 'rounded-rect', length is 270, width is 185, thickness is 3, drive is '2wd', wheelSize is 65, includeCaster is true

### Requirement: Default CarConfigParams constant

The system SHALL export a `DEFAULT_CAR_CONFIG` constant with sensible default values.

#### Scenario: Constant is immutable reference

- **WHEN** `DEFAULT_CAR_CONFIG` is imported
- **THEN** it provides a complete CarConfigParams object that can be spread into useState initial state

### Requirement: Dynamic chassis PartDefinition generation

The `buildCarNodes` function SHALL accept a `CarConfigParams` parameter and dynamically construct a chassis `PartDefinition` from the config, instead of using a static `chassisPartId`.

#### Scenario: Rounded rectangle chassis

- **WHEN** config shape is 'rounded-rect'
- **THEN** the generated chassis PartDefinition has `body: { size: [length, width, thickness], cornerRadius: min(length, width) * 0.037 }`

#### Scenario: Sharp rectangle chassis

- **WHEN** config shape is 'rect'
- **THEN** the generated chassis PartDefinition has `body: { size: [length, width, thickness], cornerRadius: 0 }`

#### Scenario: Ellipse chassis

- **WHEN** config shape is 'ellipse'
- **THEN** the generated chassis PartDefinition has `body: { size: [length, width, thickness], cornerRadius: min(length, width) / 2 }`

#### Scenario: Chassis mounting holes adapt to dimensions

- **WHEN** chassis dimensions change from defaults
- **THEN** the 4 corner standoff holes reposition to `±(length/2 - 10), ±(width/2 - 10)` while electronics mounting holes maintain their relative positions from the existing preset

#### Scenario: Chassis Z position adapts to thickness

- **WHEN** chassis thickness is changed
- **THEN** the chassis Z position is `CHASSIS_TOP_Z - thickness` (e.g., 20.5 - thickness) so the top surface remains at the same height

### Requirement: buildCarNodes accepts CarConfigParams

The `buildCarNodes` function signature SHALL change to `buildCarNodes(spec: CarPresetSpec, config: CarConfigParams, lang: string)`.

#### Scenario: Config overrides chassis dimensions

- **WHEN** `buildCarNodes` is called with `config.length = 300`
- **THEN** the generated chassis node has a 300mm length plate

#### Scenario: Drive type selects preset internally

- **WHEN** `buildCarNodes` is called with `config.drive = '4wd'`
- **THEN** the `SMART_CAR_4WD` electronics layout is used internally, regardless of the `spec` parameter

### Requirement: Electronics layout adapts to chassis length

When chassis length differs from the default 270mm, rear-positioned electronics (battery, rear motors) SHALL shift proportionally to maintain relative positioning within the chassis footprint.

#### Scenario: Longer chassis shifts rear components back

- **WHEN** chassis length is 350mm (80mm longer than default)
- **THEN** battery and rear motor X positions increase by approximately 48mm to maintain proportional layout

#### Scenario: Shorter chassis shifts rear components forward

- **WHEN** chassis length is 200mm (70mm shorter than default)
- **THEN** battery and rear motor X positions decrease proportionally while staying within chassis bounds

#### Scenario: Front sensor position fixed

- **WHEN** chassis length changes
- **THEN** the front ultrasonic sensor (hc-sr04) stays at a fixed offset from the front edge

## MODIFIED Requirements

### Requirement: 一鍵生成智能小車零件組合

Toolbar SHALL 提供「智能小車」按鈕，點擊後打開 `CarConfigPanel` 配置對話框，使用者設定底盤形狀、尺寸、厚度、驅動類型、輪子尺寸、萬向輪開關後，點擊「生成」在場景中生成一組經典 Arduino 小車零件：Arduino Uno R3 ×1、L298N 馬達驅動板 ×1、TT 減速馬達 ×2（2WD）或 ×4（4WD）、18650 雙節電池盒 ×1、HC-SR04 超音波感測器 ×1（全部取自現有零件庫定義），另加一塊依使用者參數生成的底盤板與對應數量的車輪（`car-wheel` 零件）。零件 SHALL 依所選驅動類型佈局排位（車頭感測器、中段控制/驅動板、馬達、車尾電池、輪子在馬達軸端），俯視投影互不重疊。生成後 SHALL 只有底盤、輪子、萬向輪（如有）處於選取狀態（即「貼地結構組」），以便直接進行「產生外殼」。整組節點 SHALL 可由單次復原（undo）移除。

#### Scenario: 打開面板後設定參數並生成

- **WHEN** 使用者點擊 Toolbar 的「智能小車」按鈕，在面板中設定參數後點擊「生成」
- **THEN** 場景新增對應數量的節點（依驅動類型與萬向輪開關決定），selection 為貼地結構組（底盤 + 輪子 + 萬向輪如有），使用者可直接按「產生外殼」

#### Scenario: 佈局互不重疊

- **WHEN** 智能小車零件組生成（任何有效參數組合）
- **THEN** 所有電子零件與馬達的俯視 AABB（含旋轉）不相交，零件間留有間隙

#### Scenario: 單次復原整組移除

- **WHEN** 生成後執行復原（undo）
- **THEN** 所有節點一次全部移除，場景回到生成前狀態

#### Scenario: 零件名稱依介面語言

- **WHEN** 介面語言為中文／英文時生成
- **THEN** 節點名稱分別使用零件庫的 `nameZh`／`name`（與零件庫抽屜加零件行為一致）

#### Scenario: 車輪視覺站立且觸地

- **WHEN** 車輪零件（`car-wheel`）生成幾何
- **THEN** 輪子的圓形剖面軸向為水平（非垂直），輪子最低點觸及世界 z=0（誤差 0.5mm 內）

#### Scenario: 底盤尺寸反映使用者參數

- **WHEN** 使用者在面板中設定底盤長度 300mm、寬度 200mm、厚度 4mm 後生成
- **THEN** 底盤幾何為 300×200×4mm 的板狀物，形狀依所選形狀參數（圓角矩形／矩形／橢圓形）
