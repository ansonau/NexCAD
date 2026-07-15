import { beforeAll, describe, expect, it } from 'vitest';
import { ManifoldKernel } from '../geometry/manifoldKernel';
import { writeThreeMf } from './threemf';

const kernel = new ManifoldKernel();

beforeAll(async () => {
  await kernel.init();
});

function extractStoredEntry(buf: ArrayBuffer, name: string): string {
  // 手動解析：STORED 項目資料緊跟在本地檔頭之後，檔名長度可從檔頭讀出
  const view = new DataView(buf);
  let offset = 0;
  while (offset < buf.byteLength && view.getUint32(offset, true) === 0x04034b50) {
    const compSize = view.getUint32(offset + 18, true);
    const nameLen = view.getUint16(offset + 26, true);
    const extraLen = view.getUint16(offset + 28, true);
    const nameBytes = new Uint8Array(buf, offset + 30, nameLen);
    const entryName = new TextDecoder().decode(nameBytes);
    const dataStart = offset + 30 + nameLen + extraLen;
    if (entryName === name) {
      return new TextDecoder().decode(new Uint8Array(buf, dataStart, compSize));
    }
    offset = dataStart + compSize;
  }
  throw new Error(`entry not found: ${name}`);
}

describe('writeThreeMf', () => {
  it('產生的 ZIP 含三個必要項目', () => {
    const mesh = kernel.toMesh(kernel.box(10, 10, 10));
    const buf = writeThreeMf(mesh);
    expect(() => extractStoredEntry(buf, '[Content_Types].xml')).not.toThrow();
    expect(() => extractStoredEntry(buf, '_rels/.rels')).not.toThrow();
    expect(() => extractStoredEntry(buf, '3D/3dmodel.model')).not.toThrow();
  });

  it('3dmodel.model 內的頂點與三角形數量與 mesh 相符', () => {
    const mesh = kernel.toMesh(kernel.box(10, 10, 10));
    const buf = writeThreeMf(mesh);
    const xml = extractStoredEntry(buf, '3D/3dmodel.model');
    const vertexCount = mesh.positions.length / 3;
    const triCount = mesh.indices.length / 3;
    expect((xml.match(/<vertex /g) ?? []).length).toBe(vertexCount);
    expect((xml.match(/<triangle /g) ?? []).length).toBe(triCount);
  });

  it('[Content_Types].xml 宣告 3mf model content type', () => {
    const mesh = kernel.toMesh(kernel.box(5, 5, 5));
    const buf = writeThreeMf(mesh);
    const xml = extractStoredEntry(buf, '[Content_Types].xml');
    expect(xml).toContain('3dmanufacturing-3dmodel');
  });
});
