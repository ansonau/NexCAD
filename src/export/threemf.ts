import type { MeshData } from '../geometry/kernel';
import { writeZipStored } from './zip';

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>
</Types>`;

const RELS = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rel0" Target="/3D/3dmodel.model" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>
</Relationships>`;

function buildModelXml(mesh: MeshData): string {
  const vertexCount = mesh.positions.length / 3;
  const vertices: string[] = new Array(vertexCount);
  for (let i = 0; i < vertexCount; i++) {
    const x = mesh.positions[i * 3];
    const y = mesh.positions[i * 3 + 1];
    const z = mesh.positions[i * 3 + 2];
    vertices[i] = `<vertex x="${x}" y="${y}" z="${z}"/>`;
  }
  const triCount = mesh.indices.length / 3;
  const triangles: string[] = new Array(triCount);
  for (let i = 0; i < triCount; i++) {
    const a = mesh.indices[i * 3];
    const b = mesh.indices[i * 3 + 1];
    const c = mesh.indices[i * 3 + 2];
    triangles[i] = `<triangle v1="${a}" v2="${b}" v3="${c}"/>`;
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
<resources>
<object id="1" type="model">
<mesh>
<vertices>
${vertices.join('\n')}
</vertices>
<triangles>
${triangles.join('\n')}
</triangles>
</mesh>
</object>
</resources>
<build>
<item objectid="1"/>
</build>
</model>`;
}

/** 產生最小可用的 3MF（ZIP + 核心 XML），可被 PrusaSlicer/Bambu Studio/Cura 讀取 */
export function writeThreeMf(mesh: MeshData): ArrayBuffer {
  const encoder = new TextEncoder();
  return writeZipStored([
    { name: '[Content_Types].xml', data: encoder.encode(CONTENT_TYPES) },
    { name: '_rels/.rels', data: encoder.encode(RELS) },
    { name: '3D/3dmodel.model', data: encoder.encode(buildModelXml(mesh)) },
  ]);
}
