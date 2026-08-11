// Arduino Mega 2560 R3 visual source. Units: millimeters; origin: PCB bottom-center.
$fn = 32;

pcb = [101.6, 53.35, 1.6];
holes = [
  [-36.8, -24.18], [-36.8, 24.13], [15.2, -19.08],
  [15.2, 8.93], [45.7, -24.18], [39.4, 24.13]
];

module board() {
  difference() {
    linear_extrude(pcb[2]) square([pcb[0], pcb[1]], center = true);
    for (hole = holes)
      translate([hole[0], hole[1], -0.1]) cylinder(d = 3.2, h = pcb[2] + 0.2);
  }
}

color("#2e7d5b") board();
color("#b7b7b7") translate([-43.3, 15.5, 7.1]) cube([14, 12, 11], center = true);
color("#1a1a1a") translate([-43.3, -19, 7.1]) cube([14, 9, 11], center = true);
color("#181818") translate([0, 24.45, 5.85]) cube([80, 2.5, 8.5], center = true);
color("#181818") translate([6, -24.45, 5.85]) cube([70, 2.5, 8.5], center = true);
color("#222222") translate([5, 0, 2.6]) cube([12, 12, 2], center = true);
