$fn = 32;

pcb = [27.3, 27.3, 1.2];
holes = [
  [-10.35, -11.65], [-10.35, 11.65],
  [10.35, -11.65], [10.35, 11.65]
];

module slot(length, diameter, height) {
  hull()
    for (x = [-length / 2 + diameter / 2, length / 2 - diameter / 2])
      translate([x, 0, 0]) cylinder(d = diameter, h = height, $fn = 32);
}

module board() {
  difference() {
    translate([-pcb[0] / 2, -pcb[1] / 2, 0]) cube(pcb);
    for (hole = holes)
      translate([hole[0], hole[1], -0.1]) slot(3.5, 2, pcb[2] + 0.2);
  }
}

color("#2e7d5b") board();
color("#181818") translate([0, -1.5, pcb[2] + 0.8]) cube([23.3, 19, 1.6], center = true);
color("#181818") translate([0, 11.5, pcb[2] + 1.25]) cube([10, 2.5, 2.5], center = true);
for (x = [-3.75, -1.25, 1.25, 3.75])
  color("#d6a53a") translate([x, 11.5, pcb[2] + 4.9]) cube([0.6, 0.6, 9.8], center = true);
