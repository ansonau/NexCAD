import { describe, expect, it } from 'vitest';
import { detectCapabilities } from './capabilities';

const fakeDoc = (ctx: unknown) =>
  ({ createElement: () => ({ getContext: () => ctx }) }) as unknown as Pick<Document, 'createElement'>;

describe('detectCapabilities', () => {
  it('WebGL2 context 存在時 webgl2 為 true', () => {
    expect(detectCapabilities(fakeDoc({})).webgl2).toBe(true);
  });

  it('getContext 回傳 null 時 webgl2 為 false', () => {
    expect(detectCapabilities(fakeDoc(null)).webgl2).toBe(false);
  });

  it('getContext 拋錯時 webgl2 為 false 且不會 throw', () => {
    const doc = {
      createElement: () => ({ getContext: () => { throw new Error('no gl'); } }),
    } as unknown as Pick<Document, 'createElement'>;
    expect(detectCapabilities(doc).webgl2).toBe(false);
  });

  it('Node 環境有 WebAssembly，wasm 為 true', () => {
    expect(detectCapabilities(fakeDoc({})).wasm).toBe(true);
  });
});
