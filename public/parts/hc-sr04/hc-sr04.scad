// HC-SR04 (HC-SR04 超音波感測器) visual source for NexCAD.
// Units: millimeters. Origin: part bottom-center, matching src/parts/library.ts.
// This generated baseline is intentionally simple; refine it with measured details before exporting STL.

$fn = 32;

module rounded_box(size, r = 0.8) {
  hull() {
    for (x = [-size[0] / 2 + r, size[0] / 2 - r])
      for (y = [-size[1] / 2 + r, size[1] / 2 - r]) {
        translate([x, y, r]) sphere(r = r);
        translate([x, y, size[2] - r]) sphere(r = r);
      }
  }
}

color("#2e7d5b") rounded_box([45, 20, 1.2], min(1.2, min(45, 20) / 8));
