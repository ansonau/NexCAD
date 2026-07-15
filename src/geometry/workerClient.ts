import type { SceneNode } from '../types/document';
import type { MeshData } from './kernel';
import type { GeometryRequest, GeometryResponse, NodeMeshPayload } from './protocol';

export interface WorkerLike {
  postMessage(message: GeometryRequest): void;
  onmessage: ((e: MessageEvent<GeometryResponse>) => void) | null;
}

interface PendingExport {
  resolve: (mesh: MeshData) => void;
  reject: (error: Error) => void;
}

export class GeometryClient {
  onMeshes: (meshes: NodeMeshPayload[]) => void = () => {};
  onError: (message: string) => void = () => {};

  private nextId = 1;
  private evaluating = false;
  private pendingNodes: SceneNode[] | null = null;
  private lastSentNodes: SceneNode[] | null = null;
  private exports = new Map<number, PendingExport>();

  constructor(private worker: WorkerLike) {
    worker.onmessage = (e) => this.handle(e.data);
  }

  requestEvaluate(nodes: SceneNode[]): void {
    if (this.evaluating) {
      this.pendingNodes = nodes;
      return;
    }
    this.evaluating = true;
    this.lastSentNodes = nodes;
    this.worker.postMessage({ id: this.nextId++, type: 'evaluate', nodes });
  }

  requestExport(nodes: SceneNode[]): Promise<MeshData> {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.exports.set(id, { resolve, reject });
      this.worker.postMessage({ id, type: 'export', nodes });
    });
  }

  /** Worker 崩潰時呼叫：換上新 worker，讓進行中的 export 失敗，並重送最近一次 evaluate 請求 */
  replaceWorker(worker: WorkerLike): void {
    for (const pending of this.exports.values()) {
      pending.reject(new Error('WORKER_RESTARTED'));
    }
    this.exports.clear();
    this.worker = worker;
    worker.onmessage = (e) => this.handle(e.data);
    this.evaluating = false;
    const nodes = this.pendingNodes ?? this.lastSentNodes;
    this.pendingNodes = null;
    this.lastSentNodes = null;
    if (nodes) this.requestEvaluate(nodes);
  }

  private handle(res: GeometryResponse): void {
    if (!res.ok) {
      const pendingExport = this.exports.get(res.id);
      if (pendingExport) {
        this.exports.delete(res.id);
        pendingExport.reject(new Error(res.error));
      } else {
        this.finishEvaluate();
        this.onError(res.error);
      }
      return;
    }
    if (res.type === 'evaluate') {
      this.finishEvaluate();
      this.onMeshes(res.meshes);
    } else {
      const pending = this.exports.get(res.id);
      if (pending) {
        this.exports.delete(res.id);
        pending.resolve({ positions: res.positions, indices: res.indices });
      }
    }
  }

  private finishEvaluate(): void {
    this.evaluating = false;
    if (this.pendingNodes) {
      const nodes = this.pendingNodes;
      this.pendingNodes = null;
      this.requestEvaluate(nodes);
    }
  }
}
