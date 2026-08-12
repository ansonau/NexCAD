// HC-SR04 visual source. Units: millimeters; origin: PCB bottom-center.

$fn = 32;

pcb = [45, 20, 1.5];
holes = [[-21, -8.25], [21, 8.25]];

module board() {
  difference() {
    translate([-pcb[0] / 2, -pcb[1] / 2, 0]) cube(pcb);
    for (hole = holes)
      translate([hole[0], hole[1], -0.1]) cylinder(d = 2, h = pcb[2] + 0.2);
  }
}

color("#2e7d5b") board();

for (x = [-13, 13])
  color("#b7b7b7") translate([x, 0, pcb[2]]) cylinder(d = 16, h = 12);

for (x = [-3.81 : 2.54 : 3.81])
  color("#d6a53a") translate([x, -6.5, pcb[2]]) cube([0.64, 0.64, 8], center = false);

color("#b7b7b7") translate([0, 6, pcb[2]]) cube([8, 3, 3], center = false);
