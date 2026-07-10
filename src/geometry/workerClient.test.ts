import { describe, expect, it, vi } from 'vitest';
import { createPrimitive } from '../types/document';
import type { GeometryRequest, GeometryResponse } from './protocol';
import { GeometryClient, type WorkerLike } from './workerClient';

class FakeWorker implements WorkerLike {
  posted: GeometryRequest[] = [];
  onmessage: ((e: MessageEvent<GeometryResponse>) => void) | null = null;

  postMessage(message: GeometryRequest): void {
    this.posted.push(message);
  }

  respond(res: GeometryResponse): void {
    this.onmessage?.({ data: res } as MessageEvent<GeometryResponse>);
  }
}

const nodes = () => [createPrimitive('box')];

describe('GeometryClient', () => {
  it('合併連續的 evaluate 請求，只保留最新', () => {
    const worker = new FakeWorker();
    const client = new GeometryClient(worker);
    client.requestEvaluate(nodes());
    client.requestEvaluate(nodes());
    client.requestEvaluate(nodes());
    expect(worker.posted).toHaveLength(1);
    worker.respond({ id: worker.posted[0].id, ok: true, type: 'evaluate', meshes: [] });
    expect(worker.posted).toHaveLength(2);
    worker.respond({ id: worker.posted[1].id, ok: true, type: 'evaluate', meshes: [] });
    expect(worker.posted).toHaveLength(2);
  });

  it('evaluate 完成時呼叫 onMeshes', () => {
    const worker = new FakeWorker();
    const client = new GeometryClient(worker);
    const onMeshes = vi.fn();
    client.onMeshes = onMeshes;
    client.requestEvaluate(nodes());
    const payload = {
      nodeId: 'x',
      role: 'solid' as const,
      positions: new Float32Array(9),
      indices: new Uint32Array(3),
    };
    worker.respond({ id: worker.posted[0].id, ok: true, type: 'evaluate', meshes: [payload] });
    expect(onMeshes).toHaveBeenCalledWith([payload]);
  });

  it('export 回傳 promise 並以 mesh resolve', async () => {
    const worker = new FakeWorker();
    const client = new GeometryClient(worker);
    const promise = client.requestExport(nodes());
    worker.respond({
      id: worker.posted[0].id,
      ok: true,
      type: 'export',
      positions: new Float32Array(9),
      indices: new Uint32Array(3),
    });
    const mesh = await promise;
    expect(mesh.indices).toHaveLength(3);
  });

  it('export 錯誤時 reject', async () => {
    const worker = new FakeWorker();
    const client = new GeometryClient(worker);
    const promise = client.requestExport(nodes());
    worker.respond({ id: worker.posted[0].id, ok: false, error: '沒有可匯出的實體' });
    await expect(promise).rejects.toThrow('沒有可匯出的實體');
  });

  it('evaluate 錯誤時呼叫 onError 並繼續處理排隊中的請求', () => {
    const worker = new FakeWorker();
    const client = new GeometryClient(worker);
    const onError = vi.fn();
    client.onError = onError;
    client.requestEvaluate(nodes());
    client.requestEvaluate(nodes());
    worker.respond({ id: worker.posted[0].id, ok: false, error: 'boom' });
    expect(onError).toHaveBeenCalledWith('boom');
    expect(worker.posted).toHaveLength(2);
  });
});
