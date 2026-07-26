---
name: NexCAD
description: Parts-first enclosure CAD for makers and students
colors:
  canvas: "#eceff4"
  ink: "#0f172a"
  ink-secondary: "#475569"
  ink-muted: "#7c8aa0"
  accent: "#2563eb"
  accent-strong: "#1d4ed8"
  accent-soft: "#eef4ff"
  accent-line: "#c3d7fe"
  surface: "#ffffff"
  line: "rgb(15 23 42 / 0.08)"
  line-strong: "rgb(15 23 42 / 0.14)"
typography:
  body:
    fontFamily: "Inter, PingFang TC, Noto Sans TC, ui-sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "normal"
  label:
    fontFamily: "Inter, PingFang TC, Noto Sans TC, ui-sans-serif"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "normal"
  mono:
    fontFamily: "JetBrains Mono, ui-monospace"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "normal"
rounded:
  panel: "16px"
  control: "10px"
  badge: "4px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
components:
  panel-floating:
    backgroundColor: "rgb(255 255 255 / 0.85)"
    rounded: "{rounded.panel}"
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "#ffffff"
    rounded: "{rounded.control}"
    typography: "{typography.body}"
    padding: "0 14px"
    height: "36px"
  button-primary-hover:
    backgroundColor: "{colors.accent-strong}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.control}"
    padding: "0 14px"
    height: "36px"
  button-ghost-hover:
    backgroundColor: "rgb(15 23 42 / 0.05)"
    textColor: "{colors.ink}"
  button-icon:
    backgroundColor: "transparent"
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.control}"
    size: "36px"
  button-icon-active:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent}"
  field-input:
    backgroundColor: "rgb(255 255 255 / 0.80)"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "36px"
---

# Design System: NexCAD

## 1. Overview

**Creative North Star: "The Lab Notebook"**

NexCAD's interface is a digital lab notebook — structured, precise, and personal. Every panel floats like a tool in an organized workspace, every number sits in monospace as if written by hand. The design communicates that this is a serious instrument for real work, but one that belongs to a student at their desk, not an engineer on a factory floor.

Crisp and polished without being cold. The frosted panels and hairline borders create depth without weight; the single blue accent marks exactly one thing at a time — the current action, the selected object. Nothing competes. The canvas recedes into a cool slate gray so the 3D model and floating tools carry all attention.

The system explicitly rejects toy-like interfaces (oversized controls, childish colors, gamified interactions) and cold technical aesthetics (command-line looks, raw numeric UIs, engineering-data-sheet density). It lands in the productive middle: a precision tool that feels approachable.

**Key Characteristics:**
- Frosted floating panels with hairline borders and ambient shadow
- Single blue accent used sparingly for primary actions and selection
- Monospace numerals in dimension fields — the "lab notebook" signature
- Clean Inter body text with Chinese-language CJK fallbacks built in
- All whites, no warm tints — the canvas is cool slate, not cream

## 2. Colors

A restrained palette: cool slate canvas, white surfaces, slate ink scale, one precision blue accent.

### Primary
- **Precision Blue** (#2563eb / oklch(0.55 0.24 264)): The sole accent. Used on primary buttons, selected tree items, active tool states, and the 3D axes indicator. Appears on ≤10% of any given screen by surface area. Darkens slightly on hover to Ward Blue (#1d4ed8).

### Neutral
- **Slate Canvas** (#eceff4 / oklch(0.95 0.006 240)): The background behind the 3D viewport. Cool enough to feel precise, light enough to not compete.
- **Surface White** (#ffffff at 85% opacity on panels): All floating panels and dialogs sit on frosted white (85% opacity) over the canvas.
- **Ink** (#0f172a / oklch(0.25 0.02 260)): Primary body text. Dark slate, near-black but slightly blue-cooled.
- **Ink Secondary** (#475569 / oklch(0.42 0.02 255)): Secondary text, unselected labels, icon default states. At 4.5:1 on white.
- **Ink Muted** (#7c8aa0 / oklch(0.58 0.02 250)): Tertiary text, placeholder hints, disabled labels.
- **Hairline** (rgb(15 23 42 / 0.08)): Panel borders, dividers, field strokes. Barely visible — structure without weight.
- **Hairline Strong** (rgb(15 23 42 / 0.14)): Hovered field borders, stronger dividers.
- **Accent Soft** (#eef4ff): Selected item backgrounds, accent surface fills.

### Named Rules
**The One Blue Rule.** The precision blue accent is used on exactly one category of element at a time: primary action buttons and current selection. Its rarity is its power. If blue appears in two unrelated places on the same screen, one of them is wrong.

**The Cool Canvas Rule.** The canvas is always cool slate (#eceff4), never warm-tinted. Warm neutrals (cream, sand, parchment, beige, ivory; any near-white with chroma toward 40–100°) read as cozy and editorial — wrong register for a precision tool. If a neutral needs tinting, lean toward the accent's hue (oklch chroma 0.006 at 240–270°), never toward warm by default.

## 3. Typography

**Body Font:** Inter (with PingFang TC, Noto Sans TC, ui-sans-serif fallbacks)
**Mono Font:** JetBrains Mono (with ui-monospace fallback)

**Character:** Inter carries the "crisp & polished" personality — neutral, workmanlike, invisible in service of the task. JetBrains Mono in dimension fields is the lab notebook signature: numeric precision you can trust.

### Hierarchy
- **Title** (600, 13px, 1.3): Dialog titles, section headers in panels. The largest text in the system; no display or headline sizes exist because the UI serves tasks, not pages.
- **Body** (400, 13px, 1.4): All UI text — labels, button text, tree items, panel content. Small and dense; the product register default.
- **Label** (500, 11px, 1.4): Section labels, field labels, property card labels. Medium weight for hierarchy; uppercase tracking on structural labels (scene tree headers).
- **Mono** (400, 13px, 1.4, tabular-nums): Dimension inputs, numeric fields. JetBrains Mono with tabular numbers.

### Named Rules
**The Single Family Rule.** One sans-serif family (Inter) carries all UI text. No display/body pairing, no serif for headlines. If a second font appears, it's JetBrains Mono for dimension fields only — never a decorative face.

**The Density Default.** Body text is 13px by default. This is intentional: the tool is dense with information and the canvas is the star. Larger text would bloat panels and push content off-screen on iPad.

## 4. Elevation

Frosted structural shadows. The system uses two shadow layers that convey persistent depth, not reactive state. Panels float above the canvas; dialogs float above panels. Backdrop blur reinforces the frost effect, making the depth feel physical rather than decorative.

### Shadow Vocabulary
- **Panel Shadow** (`0 1px 2px rgba(15 23 42 / 0.05), 0 8px 24px -10px rgba(15 23 42 / 0.14)`): Toolbar, property card, scene tree panel, parts drawer — all persistent floating surfaces.
- **Pop Shadow** (`0 2px 6px rgba(15 23 42 / 0.06), 0 20px 48px -12px rgba(15 23 42 / 0.28)`): Dialogs, modals, dropdowns — temporary surfaces that demand attention.

### Named Rules
**The Frost-By-Default Rule.** Every floating surface uses `backdrop-filter: blur(16px)` with white at 85% opacity. The blur is structural, not decorative — it physically separates the panel from the canvas behind it. Panels without blur feel like they're pasted on; panels with blur feel like they belong in the workspace.

**The Two-Shadow Ceiling.** Only two shadow tokens exist: panel and pop. No ambient shadow, no hover glow, no decorative drop shadow. If something needs a third tier of depth, the hierarchy needs restructuring, not another shadow.

## 5. Components

### Buttons
- **Shape:** 10px border-radius on all buttons — softly rounded, deliberate but not pill-shaped.
- **Primary:** Precision Blue (#2563eb) background, white text, 36px height, 0 14px padding. Fills its role confidently. Hover darkens to #1d4ed8. Active presses scale down to 0.98. Disabled at 40% opacity.
- **Ghost:** Transparent background, Ink Secondary text. Hover gains a slate tint (rgb(15 23 42 / 0.05)) and shifts text to Ink. Same height and padding as primary.
- **Outline:** Transparent background with Hairline border, Ink Secondary text. Hover strengthens border to Hairline Strong and shifts text to Ink.
- **Icon:** 36×36px square, Ink Secondary color, 10px border-radius. Active state gets Accent Soft background and Precision Blue color. Hover gains slate tint.

### Panels
- **Shape:** 16px border-radius (rounded-2xl). Consistent across toolbar, property card, scene tree, parts drawer, dialogs.
- **Surface:** White at 85% opacity with `backdrop-filter: blur(16px)`. Hairline border. Panel Shadow.
- **Dialog variant:** Same surface treatment but with Pop Shadow for the "above everything" tier. Includes a 13px semibold title bar with close button.

### Inputs / Fields
- **Style:** 10px border-radius, white at 80% opacity background, Hairline border, 36px height. Monospace font for numeric fields (JetBrains Mono), sans-serif for text.
- **Focus:** Blue border (Accent Line), blue ring (2px, Accent at 25% opacity). No outline-offset.
- **Select:** Same shape and height as inputs. Uses native `<select>`; no custom dropdown chrome.

### Scene Tree
- **Selected item:** Accent Soft background, Precision Blue text, 2px Precision Blue left-edge indicator. 13px text, 10px item border-radius.
- **Unselected item:** Transparent, Ink Secondary text. Hover gains subtle slate tint.
- **Type badge:** 9px uppercase mono label in a rounded pill (slate bg, Ink Muted text) — marks whether the node is a part, primitive, or enclosure.
- **Visibility toggle:** Eye/EyeOff icon, Ink Muted, only visible on row hover.
- **Delete:** Red Trash2 icon, only visible on row hover (opacity 0 → 100 on group hover).

### Toolbar
- **Shape:** A single floating pill (16px radius, Panel Shadow) containing icon buttons separated by hairline dividers. Centered at the top of the viewport.
- **Icons:** 18px Lucide icons, 1.8px stroke. 36×36px hit area. Grouped by function: primitives → undo/redo/delete → enclosure/car/tools → export.

### Property Card
- **Shape:** 16px radius floating panel on the right edge. Shows selected node properties: name, role toggle (solid/hole), size dimensions, position coordinates.
- **Fields:** Label (11px, 500 weight) above each field. Mono numeric inputs with tabular numbers.

## 6. Do's and Don'ts

### Do:
- **Do** use Precision Blue (#2563eb) on exactly one element category per screen: primary buttons or current selection.
- **Do** keep body text at 13px; this is a tool, not a document.
- **Do** use JetBrains Mono with tabular numbers for all dimension and numeric fields.
- **Do** use frosted panels (white/85% + blur(16px)) for all floating surfaces.
- **Do** keep the canvas cool slate (#eceff4) — never tint toward warm.
- **Do** use the two-shadow system: panel shadow for persistent surfaces, pop shadow for temporary dialogs.
- **Do** prefer inline expansion and progressive disclosure over modals.

### Don't:
- **Don't** use border-left greater than 1px as a colored accent stripe on cards or list items.
- **Don't** use a second accent color. Blue is the only accent. If the interface needs a semantic color (error red, warning amber), those are state indicators — not accents.
- **Don't** use cream, sand, beige, ivory, parchment, or any warm-tinted near-white as a surface color. The canvas is cool slate.
- **Don't** use gradient text, glassmorphism as decoration, or large hero-metric templates. This is a tool, not a landing page.
- **Don't** make the interface feel toy-like — no oversized controls, no childish colors, no gamified interactions.
- **Don't** make the interface feel cold or technical — no command-line aesthetics, no raw numeric UIs, no engineering-data-sheet density.
- **Don't** use display fonts (sizes above clamp 6rem) or decorative typefaces anywhere. Inter + JetBrains Mono only.
- **Don't** add motion that doesn't convey state. No scroll-driven animations, no page-load choreography, no bounce or elastic easings. Transitions are 150–250ms with standard easing.
