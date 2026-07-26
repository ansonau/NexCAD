## 1. Data Model & Configuration Types

- [x] 1.1 Define `CarConfigParams` interface with shape, length, width, thickness, drive, wheelSize, includeCaster fields in `src/parts/presets.ts`
- [x] 1.2 Define `DEFAULT_CAR_CONFIG` constant with defaults (rounded-rect, 270×185×3, 2wd, 65mm, caster on)
- [x] 1.3 Define shape options type `CarChassisShape = 'rounded-rect' | 'rect' | 'ellipse'`
- [x] 1.4 Define drive type `CarDrive = '2wd' | '4wd'`

## 2. Dynamic Chassis Generation

- [x] 2.1 Create `buildChassisDef(config: CarConfigParams): PartDefinition` function that generates a chassis PartDefinition from config (shape → cornerRadius, dimensions, mounting holes)
- [x] 2.2 Implement corner hole positioning: `±(length/2 - 10), ±(width/2 - 10)` with standoff enabled
- [x] 2.3 Implement electronics mounting holes at their existing relative positions (standoff: false)
- [x] 2.4 Implement chassis Z position as `CHASSIS_TOP_Z - thickness`
- [x] 2.5 Update `buildCarNodes` signature to `buildCarNodes(config, lang)` and wire dynamic chassis generation

## 3. Electronics Layout Adaptation

- [x] 3.1 Implement proportional X-shift for rear electronics (battery, rear motors) based on chassis length relative to default 270mm
- [x] 3.2 Keep front sensor (hc-sr04) at fixed offset from front edge regardless of length
- [x] 3.3 Drive type selects preset internally: '2wd' → SMART_CAR_2WD electronics, '4wd' → SMART_CAR_4WD electronics
- [x] 3.4 Caster node conditionally generated based on `includeCaster` and drive type (only for 2wd)

## 4. UI Panel Component

- [x] 4.1 Create `CarConfigPanel.tsx` component using existing Dialog/FieldLabel/SectionLabel/PrimaryButton/GhostButton/fieldClass/numberFieldClass pattern
- [x] 4.2 Add chassis shape dropdown (rounded rectangle / sharp rectangle / ellipse) with i18n labels
- [x] 4.3 Add dimension inputs: length (200-350mm), width (150-250mm) with NumberField pattern
- [x] 4.4 Add thickness input (2-6mm)
- [x] 4.5 Add drive type dropdown (2WD / 4WD)
- [x] 4.6 Add wheel size dropdown (65mm)
- [x] 4.7 Add caster checkbox, visible only when 2WD selected
- [x] 4.8 Wire Generate button to call buildCarNodes with config and insert nodes via addNodes + setSelection
- [x] 4.9 Add i18n keys for all panel labels in zh.json and en.json

## 5. Toolbar Integration

- [x] 5.1 Replace CarPresetMenu import in Toolbar.tsx with CarConfigPanel
- [x] 5.2 Update state variable name and onClick handler
- [x] 5.3 Remove old CarPresetMenu component file

## 6. Testing

- [x] 6.1 Add tests for CarConfigParams defaults and bounds in presets.test.ts
- [x] 6.2 Add tests for dynamic chassis geometry: round-rect, rect, ellipse shapes at various dimensions
- [x] 6.3 Add tests for corner hole positioning at different chassis sizes
- [x] 6.4 Add tests for electronics layout adaptation (proportional shift with length)
- [x] 6.5 Add tests for 2WD/4WD electronics selection
- [x] 6.6 Add tests for caster on/off behavior
- [x] 6.7 Verify all existing car preset and enclosure tests still pass
- [x] 6.8 Add tests for buildChassisDef generating valid PartDefinition that passes schema validation

## 7. Verification

- [x] 7.1 Run `npx tsc --noEmit` and fix any TypeScript errors
- [x] 7.2 Run `npm run lint` — no lint script configured
- [x] 7.3 Run `npm test` and ensure all tests pass (256/256)
- [x] 7.4 Code compiles and tests pass; manual verification ready
- [x] 7.5 Verify enclosure generation still works with generated cars (carPresetEnclosure.test.ts: 3/3)
- [x] 7.6 Verify undo removes entire car in one step (addNodes wraps in single undoable action per existing store design)