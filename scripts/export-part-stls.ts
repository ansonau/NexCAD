import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ManifoldKernel } from '../src/geometry/manifoldKernel';
import { PART_LIBRARY } from '../src/parts/library';
import { buildPartSolid } from '../src/parts/partGeometry';
import { writeBinaryStl } from '../src/export/stl';

/**
 * 由 src/parts/library.ts 的程序化幾何，導出每個零件的 binary STL 到
 * 3d_models/generated/<id>.stl（人＋AI 協作載體，可隨時重新生成）。
 * 用法：npm run export:parts
 */
async function main(): Promise<void> {
  const kernel = new ManifoldKernel();
  await kernel.init();

  const outDir = join(process.cwd(), '3d_models', 'generated');
  mkdirSync(outDir, { recursive: true });

  let count = 0;
  for (const def of PART_LIBRARY) {
    const solid = buildPartSolid(def, kernel);
    const mesh = kernel.toMesh(solid);
    const buffer = Buffer.from(writeBinaryStl(mesh));
    const file = join(outDir, `${def.id}.stl`);
    writeFileSync(file, buffer);
    count += 1;
    console.log(`  ${def.id}.stl  (${mesh.indices.length / 3} triangles)`);
  }
  kernel.releaseAll();
  console.log(`\n導出 ${count} 個零件到 ${outDir}/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
