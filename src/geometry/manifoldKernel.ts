import Module from 'manifold-3d';
import type { CrossSection, Manifold, ManifoldToplevel } from 'manifold-3d';
import type { Transform } from '../types/document';
import type { GeometryKernel, MeshData, Solid } from './kernel';

interface MSolid extends Solid {
  m: Manifold;
}

const wrap = (m: Manifold): Solid => ({ __solid: true, m }) as MSolid;
const un = (s: Solid): Manifold => (s as MSolid).m;

/** 圓形分段數；越高越圓但 mesh 越大 */
const SEGMENTS = 48;

export class ManifoldKernel implements GeometryKernel {
  private wasm!: ManifoldToplevel;

  /** 自上次 releaseAll 以來建立的所有 WASM Manifold（arena 模式） */
  private allocated: Manifold[] = [];

  /** 自上次 releaseAll 以來建立的所有 WASM CrossSection（2D，獨立於 Manifold 的記憶體池） */
  private allocated2D: CrossSection[] = [];

  async init(): Promise<void> {
    this.wasm = await Module();
    this.wasm.setup();
  }

  private get M() {
    return this.wasm.Manifold;
  }

  /** 登記 WASM 物件，待 releaseAll 時統一 .delete() */
  private track(m: Manifold): Manifold {
    this.allocated.push(m);
    return m;
  }

  private track2D(c: CrossSection): CrossSection {
    this.allocated2D.push(c);
    return c;
  }

  box(width: number, depth: number, height: number): Solid {
    const cube = this.track(this.M.cube([width, depth, height]));
    return wrap(this.track(cube.translate([-width / 2, -depth / 2, 0])));
  }

  /** 底面中心原點，垂直邊圓角的長方體；cornerRadius<=0 時等同 box() */
  roundedBox(width: number, depth: number, height: number, cornerRadius: number): Solid {
    if (cornerRadius <= 0) return this.box(width, depth, height);
    const cx = width / 2 - cornerRadius;
    const cy = depth / 2 - cornerRadius;
    const CS = this.wasm.CrossSection;
    const corners = [
      this.track2D(this.track2D(CS.circle(cornerRadius, SEGMENTS)).translate([cx, cy])),
      this.track2D(this.track2D(CS.circle(cornerRadius, SEGMENTS)).translate([-cx, cy])),
      this.track2D(this.track2D(CS.circle(cornerRadius, SEGMENTS)).translate([-cx, -cy])),
      this.track2D(this.track2D(CS.circle(cornerRadius, SEGMENTS)).translate([cx, -cy])),
    ];
    const profile = this.track2D(CS.hull(corners));
    return wrap(this.track(profile.extrude(height)));
  }

  cylinder(radius: number, height: number): Solid {
    return wrap(this.track(this.M.cylinder(height, radius, radius, SEGMENTS)));
  }

  sphere(radius: number): Solid {
    const sphere = this.track(this.M.sphere(radius, SEGMENTS));
    return wrap(this.track(sphere.translate([0, 0, radius])));
  }

  cone(radiusBottom: number, radiusTop: number, height: number): Solid {
    return wrap(this.track(this.M.cylinder(height, radiusBottom, radiusTop, SEGMENTS)));
  }

  union(a: Solid, b: Solid): Solid {
    return wrap(this.track(un(a).add(un(b))));
  }

  difference(a: Solid, b: Solid): Solid {
    return wrap(this.track(un(a).subtract(un(b))));
  }

  transform(s: Solid, t: Transform): Solid {
    const scaled = this.track(un(s).scale(t.scale));
    const rotated = this.track(scaled.rotate(t.rotation));
    return wrap(this.track(rotated.translate(t.position)));
  }

  toMesh(s: Solid): MeshData {
    const mesh = un(s).getMesh();
    const { numProp, vertProperties } = mesh;
    let positions: Float32Array;
    if (numProp === 3) {
      positions = vertProperties;
    } else {
      const vertCount = vertProperties.length / numProp;
      positions = new Float32Array(vertCount * 3);
      for (let i = 0; i < vertCount; i++) {
        positions[i * 3] = vertProperties[i * numProp];
        positions[i * 3 + 1] = vertProperties[i * numProp + 1];
        positions[i * 3 + 2] = vertProperties[i * numProp + 2];
      }
    }
    return {
      positions,
      indices: mesh.triVerts,
    };
  }

  volume(s: Solid): number {
    return un(s).volume();
  }

  releaseAll(): void {
    for (const m of this.allocated) {
      m.delete();
    }
    this.allocated = [];
    for (const c of this.allocated2D) {
      c.delete();
    }
    this.allocated2D = [];
  }
}
