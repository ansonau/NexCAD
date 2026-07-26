# NexCAD Part Assets

Visual/reference sources for NexCAD parts.

Each folder may contain:

- `<part-id>.scad` — editable OpenSCAD source for human/AI collaboration.
- `<part-id>.stl` — optional calibrated high-resolution viewport model.
- `README.md` — coordinate contract, dimensions, and regeneration notes.

Rules:

- `src/parts/library.ts` remains the source of truth for dimensions, holes, ports, collision, and enclosure generation.
- OpenSCAD/STL files are visual/reference assets.
- Do not commit generated STL until the source has been checked against the library metadata and visual alignment in NexCAD.

Current parts:

- `arduino-uno` — Arduino Uno R3 / Arduino Uno R3
- `arduino-nano` — Arduino Nano / Arduino Nano
- `esp32-devkit` — ESP32 DevKit V1 / ESP32 DevKit V1
- `raspberry-pi-4` — Raspberry Pi 4B / Raspberry Pi 4B
- `raspberry-pi-zero-2` — Raspberry Pi Zero 2 W / Raspberry Pi Zero 2 W
- `microbit-v2` — micro:bit V2 / micro:bit V2
- `hc-sr04` — HC-SR04 / HC-SR04 超音波感測器
- `oled-096` — OLED 0.96" (SSD1306) / OLED 0.96 吋顯示器
- `lcd1602` — LCD1602 (I2C) / LCD1602 液晶顯示器
- `pir-hc-sr501` — PIR HC-SR501 / PIR 人體感測器
- `dht22` — DHT22 / DHT22 溫濕度感測器
- `sg90` — SG90 / SG90 伺服馬達
- `mg996r` — MG996R / MG996R 伺服馬達
- `tt-motor` — TT Motor / TT 減速馬達
- `l298n` — L298N / L298N 馬達驅動板
- `battery-18650x2` — 18650×2 Holder / 18650 雙節電池盒
- `battery-9v` — 9V Battery / 9V 電池
- `led-5mm` — LED 5mm / 5mm LED
- `push-button-12mm` — Push Button 12mm / 12mm 按鈕
- `buzzer-module` — Buzzer Module / 蜂鳴器模組
- `relay-1ch` — Relay 1CH / 1 路繼電器模組
- `breadboard-half` — Breadboard 400 / 半尺寸麵包板（400 孔）
- `breadboard-full` — Breadboard 830 / 全尺寸麵包板（830 孔）
- `car-wheel` — Wheel 65mm / 65mm 車輪
- `ball-caster-16` — Ball Caster 16mm / 16mm 萬向滾珠
- `car-chassis-2wd` — 2WD Car Chassis / 2WD 小車底盤
