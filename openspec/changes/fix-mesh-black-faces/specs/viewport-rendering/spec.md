# viewport-rendering delta

## ADDED Requirements

### Requirement: 場景 mesh 以雙面材質渲染

3D 視窗渲染幾何核心輸出的 mesh 時，material SHALL 設定雙面渲染（`THREE.DoubleSide`），使個別三角形的 winding 方向不影響可見性與著色。

#### Scenario: CW winding 三角形不產生破洞

- **WHEN** mesh 中存在 winding 為 CW（順時針）的三角形
- **THEN** 該三角形照常渲染，表面無破洞

#### Scenario: 背面照常著色

- **WHEN** 三角形的面法線背對攝影機
- **THEN** 該面仍以正確光照著色（three.js 對背面自動翻轉法線），不呈現整面黑
