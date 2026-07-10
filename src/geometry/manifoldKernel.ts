import Module from 'manifold-3d';
import type { Manifold, ManifoldToplevel } from 'manifold-3d';
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

  async init(): Promise<void> {
    this.wasm = await Module();
    this.wasm.setup();
  }

  private get M() {
    return this.wasm.Manifold;
  }

  box(width: number, depth: number, height: number): Solid {
    return wrap(this.M.cube([width, depth, height]).translate([-width / 2, -depth / 2, 0]));
  }

  cylinder(radius: number, height: number): Solid {
    return wrap(this.M.cylinder(height, radius, radius, SEGMENTS));
  }

  sphere(radius: number): Solid {
    return wrap(this.M.sphere(radius, SEGMENTS).translate([0, 0, radius]));
  }

  cone(radiusBottom: number, radiusTop: number, height: number): Solid {
    return wrap(this.M.cylinder(height, radiusBottom, radiusTop, SEGMENTS));
  }

  union(a: Solid, b: Solid): Solid {
    return wrap(un(a).add(un(b)));
  }

  difference(a: Solid, b: Solid): Solid {
    return wrap(un(a).subtract(un(b)));
  }

  transform(s: Solid, t: Transform): Solid {
    return wrap(un(s).scale(t.scale).rotate(t.rotation).translate(t.position));
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
}
