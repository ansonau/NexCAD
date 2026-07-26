// TT Motor visual source for NexCAD.
// Units: millimeters. Origin: part bottom-center, matching src/parts/library.ts.
// This model is visual/reference geometry only; mounting holes and enclosure logic stay in library.ts.

$fn = 48;

module rounded_box(size, r = 1.2) {
  hull() {
    for (x = [-size[0] / 2 + r, size[0] / 2 - r])
      for (y = [-size[1] / 2 + r, size[1] / 2 - r])
        translate([x, y, r]) sphere(r = r);
    for (x = [-size[0] / 2 + r, size[0] / 2 - r])
      for (y = [-size[1] / 2 + r, size[1] / 2 - r])
        translate([x, y, size[2] - r]) sphere(r = r);
  }
}

module shaft(y) {
  translate([9.5, y, 11]) rotate([90, 0, 0]) cylinder(d = 5, h = 9, center = true);
}

module tt_motor() {
  color("#f6c343") rounded_box([37, 18, 22], 1.5);
  color("#d8dde5") translate([-18.5, 0, 11]) rotate([0, 90, 0]) cylinder(d = 22, h = 33, center = true);
  color("#c8ced8") shaft(20);
  color("#c8ced8") shaft(-20);

  // Bottom mounting holes, visual only.
  color("#374151") for (x = [-9.25, 9.25]) translate([x, 0, 0.15]) cylinder(d = 3, h = 0.4, center = true);
  color("#374151") translate([0, 0, 0.15]) cylinder(d = 1.95, h = 0.4, center = true);
}

tt_motor();
