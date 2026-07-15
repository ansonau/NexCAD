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
    worker.respond({ id: worker.posted[0].id, ok: false, error: 'EXPORT_EMPTY' });
    await expect(promise).rejects.toThrow('EXPORT_EMPTY');
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

  it('replaceWorker 後重送最近一次 evaluate 請求', () => {
    const worker = new FakeWorker();
    const client = new GeometryClient(worker);
    client.requestEvaluate(nodes());
    worker.respond({ id: worker.posted[0].id, ok: true, type: 'evaluate', meshes: [] });

    const worker2 = new FakeWorker();
    client.replaceWorker(worker2);

    expect(worker2.posted).toHaveLength(1);
    expect(worker2.posted[0].type).toBe('evaluate');
  });

  it('replaceWorker 前沒有任何 evaluate 請求時不會送出多餘請求', () => {
    const worker = new FakeWorker();
    const client = new GeometryClient(worker);
    const worker2 = new FakeWorker();
    client.replaceWorker(worker2);
    expect(worker2.posted).toHaveLength(0);
  });

  it('replaceWorker 時讓所有進行中的 export promise reject', async () => {
    const worker = new FakeWorker();
    const client = new GeometryClient(worker);
    const promise = client.requestExport(nodes());
    const worker2 = new FakeWorker();
    client.replaceWorker(worker2);
    await expect(promise).rejects.toThrow('WORKER_RESTARTED');
  });

  it('replaceWorker 後新 worker 的訊息會被正確處理', () => {
    const worker = new FakeWorker();
    const client = new GeometryClient(worker);
    const onMeshes = vi.fn();
    client.onMeshes = onMeshes;
    const worker2 = new FakeWorker();
    client.replaceWorker(worker2);
    client.requestEvaluate(nodes());
    worker2.respond({ id: worker2.posted[0].id, ok: true, type: 'evaluate', meshes: [] });
    expect(onMeshes).toHaveBeenCalledWith([]);
  });

  it('replaceWorker 時排隊中的 pendingNodes 優先於進行中的 lastSentNodes，且不會兩者都送出', () => {
    const worker = new FakeWorker();
    const client = new GeometryClient(worker);
    const nodesA = nodes();
    const nodesB = nodes();

    // 第一次 evaluate 送出後尚未收到回應（evaluating 維持 true，lastSentNodes = nodesA）
    client.requestEvaluate(nodesA);
    expect(worker.posted).toHaveLength(1);

    // 仍在 evaluating 時又送出第二次，應排入 pendingNodes = nodesB，而不會立即送出
    client.requestEvaluate(nodesB);
    expect(worker.posted).toHaveLength(1);

    const worker2 = new FakeWorker();
    client.replaceWorker(worker2);

    expect(worker2.posted).toHaveLength(1);
    expect(worker2.posted[0].nodes).toBe(nodesB);
    expect(worker2.posted[0].nodes).not.toBe(nodesA);
  });
});
