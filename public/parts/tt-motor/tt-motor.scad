// TT Motor / yellow DC geared motor for NexCAD.
// Dimensions: 3d_models/high_res/tt-motor-dimension.jpeg
// Appearance: 3d_models/high_res/tt-motor.glb
// Units: mm. Origin: gearbox body centre in X/Y, bottom face at Z=0.
// Axes: motor length X, double output shaft Y, height Z.

$fn = 64;

axis_z = 11.2;

gearbox_x0 = -18.5;
gearbox_x1 = 18.5;
gearbox_w = 18.8;
gearbox_h = 22.3;
gearbox_r = 2.0;

can_x0 = -46.0;
can_x1 = -13.0;
can_d = 22.4;
end_cap_len = 2.0;

shaft_x = gearbox_x1 - 11.28;
shaft_d = 5.4;
shaft_span = 37.0;
shaft_flat = 3.7;
collar_d = 6.4;

side_hole_x = gearbox_x1 - 31.75;
side_hole_z = [2.5, 19.8];
side_hole_d = 3.0;

front_tab_x1 = 23.9;
front_tab_h = 6.0;
front_hole_d = 2.8;

module xz_profile(x0, x1, width, height, radius) {
  translate([0, width / 2, 0])
    rotate([90, 0, 0])
      linear_extrude(height = width)
        hull() {
          for (x = [x0 + radius, x1 - radius])
            for (z = [radius, height - radius])
              translate([x, z]) circle(r = radius);
        }
}

module y_cylinder(x, y0, z, diameter, length) {
  translate([x, y0, z]) rotate([90, 0, 0]) cylinder(d = diameter, h = length);
}

module gearbox() {
  difference() {
    union() {
      color("#f2c500") xz_profile(gearbox_x0, gearbox_x1, gearbox_w, gearbox_h, gearbox_r);
      color("#f2c500")
        translate([0, 0, axis_z - front_tab_h / 2])
          xz_profile(gearbox_x1 - 1, front_tab_x1, gearbox_w, front_tab_h, 1.2);
    }

    // Two real side holes and the front mounting-ear hole all run along Y.
    for (z = side_hole_z)
      y_cylinder(side_hole_x, gearbox_w, z, side_hole_d, gearbox_w * 2);
    y_cylinder((gearbox_x1 + front_tab_x1) / 2, gearbox_w, axis_z, front_hole_d, gearbox_w * 2);

    // Shallow case seams make the two moulded shell halves readable in STL.
    for (y = [-gearbox_w / 2 - 0.1, gearbox_w / 2 - 0.25])
      translate([-5.8, y, 0.8]) cube([0.45, 0.35, gearbox_h - 1.6]);
  }
}

module motor_can() {
  color("#cfd4da")
    translate([can_x0 + end_cap_len, 0, axis_z])
      rotate([0, 90, 0]) cylinder(d = can_d, h = can_x1 - can_x0 - end_cap_len);

  // Rear insulating cap with two ventilation slots.
  color("#252a31")
    difference() {
      translate([can_x0, 0, axis_z]) rotate([0, 90, 0]) cylinder(d = can_d, h = end_cap_len);
      for (z = [axis_z - 4.2, axis_z + 4.2])
        translate([can_x0 - 0.1, -2.4, z - 0.8]) cube([end_cap_len + 0.3, 4.8, 1.6]);
    }

  // Rear bearing boss remains inside the drawing envelope.
  color("#aeb6c0")
    translate([can_x0, 0, axis_z]) rotate([0, 90, 0]) cylinder(d = 5.0, h = 2.0);
}

module retaining_bracket() {
  color("#d9dde2") {
    for (s = [-1, 1])
      difference() {
        translate([-43.5, s * (can_d / 2 - 0.7) - (s < 0 ? 0.8 : 0), 2.4])
          cube([29.5, 0.8, 17.6]);
        translate([-31.5, s * (can_d / 2 - 0.9) - (s < 0 ? 1.2 : 0), 7.0])
          cube([10.5, 1.6, 8.4]);
      }
    translate([-44.2, -can_d / 2, 1.7]) cube([1.1, can_d, 19.0]);
  }
}

module terminals() {
  color("#a65b43")
    for (s = [-1, 1])
      translate([-35.5, s * 9.8 - (s < 0 ? 1.1 : 0), axis_z - 1.7])
        cube([3.0, 1.1, 3.4]);
}

module output_shaft() {
  color("#c8ced6")
    difference() {
      translate([shaft_x, 0, axis_z])
        rotate([90, 0, 0])
          translate([0, 0, -shaft_span / 2]) cylinder(d = shaft_d, h = shaft_span);
      // One flat leaves 3.7 mm from the opposite round side to the flat face.
      translate([shaft_x + shaft_flat - shaft_d / 2, -shaft_span, axis_z - shaft_d])
        cube([shaft_d, shaft_span * 2, shaft_d * 2]);
    }

  color("#b9c1ca")
    for (s = [-1, 1])
      y_cylinder(shaft_x, s * (gearbox_w / 2 + 1.1), axis_z, collar_d, 1.2);
}

module side_details() {
  // Screw heads sit beside the open mounting holes, matching the GLB layout.
  color("#aeb6c0")
    for (s = [-1, 1])
      for (z = side_hole_z)
        y_cylinder(side_hole_x + 3.3, s * (gearbox_w / 2 + 0.35), z, 3.2, 0.45);

  // Small moulded inspection bosses.
  color("#e2b900")
    for (s = [-1, 1])
      y_cylinder(-1.2, s * (gearbox_w / 2 + 0.25), axis_z, 4.2, 0.3);
}

module tt_motor() {
  union() {
    gearbox();
    motor_can();
    retaining_bracket();
    terminals();
    output_shaft();
    side_details();
  }
}

tt_motor();
