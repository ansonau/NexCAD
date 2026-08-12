import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPrimitive } from '../types/document';
import type { GeometryRequest, GeometryResponse } from './protocol';

class FakeWorker {
  static instances: FakeWorker[] = [];

  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent<GeometryResponse>) => void) | null = null;
  posted: GeometryRequest[] = [];

  constructor() {
    FakeWorker.instances.push(this);
  }

  postMessage(message: GeometryRequest): void {
    this.posted.push(message);
  }

  terminate(): void {}
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.resetModules();
  FakeWorker.instances = [];
});

describe('geometry worker recovery', () => {
  it('第四次連續崩潰後仍會延遲重啟並重送場景', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('Worker', FakeWorker);
    const { getGeometryClient } = await import('./client');
    getGeometryClient().requestEvaluate([createPrimitive('box')]);

    for (let i = 0; i < 4; i += 1) {
      FakeWorker.instances.at(-1)!.onerror?.(new Event('error'));
      await vi.runOnlyPendingTimersAsync();
    }

    expect(FakeWorker.instances).toHaveLength(5);
    expect(FakeWorker.instances.at(-1)!.posted).toHaveLength(1);
  });
});
