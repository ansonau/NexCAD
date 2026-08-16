// Arduino Nano 3.0 visual source. Units: millimeters; origin: bottom-center.
$fn = 32;

pcb = [43.18, 17.77, 1.6];
hole_d = 1.65;
hole_dx = 40.64;
hole_dy = 15.24;
header_h = 8.5;

module board() {
  difference() {
    linear_extrude(pcb[2]) square([pcb[0], pcb[1]], center = true);
    for (x = [-hole_dx / 2, hole_dx / 2])
      for (y = [-hole_dy / 2, hole_dy / 2])
        translate([x, y, -0.1]) cylinder(d = hole_d, h = pcb[2] + 0.2, $fn = 32);
  }
}

color("#2e7d5b") board();
color("#b7b7b7") translate([-17.59, 0, pcb[2] + 2]) cube([8, 8, 4], center = true);
color("#1a1a1a") translate([0, 0, pcb[2] + 0.65]) cube([7, 7, 1.3], center = true);

for (y = [-7.62, 7.62]) {
  color("#181818") translate([0, y, pcb[2] + header_h / 2]) cube([38, 2.5, header_h], center = true);
  for (x = [-17.78 : 2.54 : 17.78])
    color("#d6a53a") translate([x, y, pcb[2] + header_h / 2]) cube([0.6, 0.6, header_h], center = true);
}
