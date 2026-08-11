$fn = 32;

pcb = [35.4, 33.5, 1.2];
holes = [
  [-14.71, -14.25], [-14.71, 14.25],
  [14.71, -14.25], [14.71, 14.25]
];

module board() {
  difference() {
    translate([-pcb[0] / 2, -pcb[1] / 2, 0]) cube(pcb);
    for (hole = holes)
      translate([hole[0], hole[1], -0.1]) cylinder(d = 3, h = pcb[2] + 0.2);
  }
}

color("#2e7d5b") board();
color("#181818") translate([0, -3, pcb[2] + 0.8]) cube([29.42, 14.7, 1.6], center = true);
color("#181818") translate([0, 14.25, pcb[2] + 5.05]) cube([10, 2.5, 10.1], center = true);
