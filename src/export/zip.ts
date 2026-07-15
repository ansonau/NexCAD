import { crc32 } from './crc32';

export interface ZipEntry {
  name: string;
  data: Uint8Array;
}

const LOCAL_SIG = 0x04034b50;
const CENTRAL_SIG = 0x02014b50;
const EOCD_SIG = 0x06054b50;

/** 產生最小可用的 ZIP（STORED，不壓縮），供 3MF 等 OPC 格式使用 */
export function writeZipStored(entries: ZipEntry[]): ArrayBuffer {
  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const crc = crc32(entry.data);
    const localHeader = new DataView(new ArrayBuffer(30));
    localHeader.setUint32(0, LOCAL_SIG, true);
    localHeader.setUint16(4, 20, true); // version needed
    localHeader.setUint16(6, 0, true); // flags
    localHeader.setUint16(8, 0, true); // method = stored
    localHeader.setUint16(10, 0, true); // mod time
    localHeader.setUint16(12, 0, true); // mod date
    localHeader.setUint32(14, crc, true);
    localHeader.setUint32(18, entry.data.length, true);
    localHeader.setUint32(22, entry.data.length, true);
    localHeader.setUint16(26, nameBytes.length, true);
    localHeader.setUint16(28, 0, true); // extra length

    const localOffset = offset;
    parts.push(new Uint8Array(localHeader.buffer), nameBytes, entry.data);
    offset += 30 + nameBytes.length + entry.data.length;

    const central = new DataView(new ArrayBuffer(46));
    central.setUint32(0, CENTRAL_SIG, true);
    central.setUint16(4, 20, true); // version made by
    central.setUint16(6, 20, true); // version needed
    central.setUint16(8, 0, true); // flags
    central.setUint16(10, 0, true); // method
    central.setUint16(12, 0, true); // mod time
    central.setUint16(14, 0, true); // mod date
    central.setUint32(16, crc, true);
    central.setUint32(20, entry.data.length, true);
    central.setUint32(24, entry.data.length, true);
    central.setUint16(28, nameBytes.length, true);
    central.setUint16(30, 0, true); // extra length
    central.setUint16(32, 0, true); // comment length
    central.setUint16(34, 0, true); // disk number
    central.setUint16(36, 0, true); // internal attrs
    central.setUint32(38, 0, true); // external attrs
    central.setUint32(42, localOffset, true);
    centralParts.push(new Uint8Array(central.buffer), nameBytes);
  }

  const centralStart = offset;
  let centralSize = 0;
  for (const p of centralParts) centralSize += p.length;

  const eocd = new DataView(new ArrayBuffer(22));
  eocd.setUint32(0, EOCD_SIG, true);
  eocd.setUint16(4, 0, true); // disk number
  eocd.setUint16(6, 0, true); // central dir start disk
  eocd.setUint16(8, entries.length, true);
  eocd.setUint16(10, entries.length, true);
  eocd.setUint32(12, centralSize, true);
  eocd.setUint32(16, centralStart, true);
  eocd.setUint16(20, 0, true); // comment length

  const all = [...parts, ...centralParts, new Uint8Array(eocd.buffer)];
  const totalSize = all.reduce((sum, a) => sum + a.length, 0);
  const out = new Uint8Array(totalSize);
  let pos = 0;
  for (const a of all) {
    out.set(a, pos);
    pos += a.length;
  }
  return out.buffer;
}
