import { describe, expect, it } from 'vitest';
import { crc32 } from './crc32';
import { writeZipStored } from './zip';

function readU32(view: DataView, offset: number): number {
  return view.getUint32(offset, true);
}

describe('writeZipStored', () => {
  it('產生的檔案以本地檔頭簽章開頭', () => {
    const buf = writeZipStored([{ name: 'a.txt', data: new TextEncoder().encode('hello') }]);
    const view = new DataView(buf);
    expect(readU32(view, 0)).toBe(0x04034b50);
  });

  it('每個項目的 CRC32 與內容長度正確寫入本地檔頭', () => {
    const data = new TextEncoder().encode('hello world');
    const buf = writeZipStored([{ name: 'a.txt', data }]);
    const view = new DataView(buf);
    expect(readU32(view, 14)).toBe(crc32(data)); // CRC-32 欄位
    expect(readU32(view, 18)).toBe(data.length); // 壓縮後大小（STORED = 原始大小）
    expect(readU32(view, 22)).toBe(data.length); // 未壓縮大小
  });

  it('結尾含中央目錄結束記錄簽章', () => {
    const buf = writeZipStored([{ name: 'a.txt', data: new Uint8Array([1, 2, 3]) }]);
    const view = new DataView(buf);
    expect(readU32(view, buf.byteLength - 22)).toBe(0x06054b50);
  });

  it('多個項目都能寫入且檔案總長度合理（大於各項目資料總和）', () => {
    const entries = [
      { name: 'a.txt', data: new Uint8Array([1, 2, 3]) },
      { name: 'b/c.txt', data: new Uint8Array([4, 5]) },
    ];
    const buf = writeZipStored(entries);
    const totalData = entries.reduce((sum, e) => sum + e.data.length, 0);
    expect(buf.byteLength).toBeGreaterThan(totalData);
  });
});
