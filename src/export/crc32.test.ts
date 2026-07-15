import { describe, expect, it } from 'vitest';
import { crc32 } from './crc32';

describe('crc32', () => {
  it('空陣列的 CRC32 為 0', () => {
    expect(crc32(new Uint8Array(0))).toBe(0);
  });

  it('標準測試向量 "123456789" → 0xCBF43926', () => {
    const bytes = new TextEncoder().encode('123456789');
    expect(crc32(bytes)).toBe(0xcbf43926);
  });
});
