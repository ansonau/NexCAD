import { GeometryClient } from './workerClient';

let client: GeometryClient | null = null;

// 短暫斷線時持續恢復，但用退避避免 worker 模組損壞時高速重啟。
const RESET_WINDOW_MS = 30_000;
const BASE_RETRY_MS = 250;
const MAX_RETRY_MS = 4_000;
let consecutiveFailures = 0;
let lastFailureAt = 0;

function createWorker(): Worker {
  const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
  worker.onerror = () => {
    worker.terminate();
    const now = Date.now();
    if (now - lastFailureAt > RESET_WINDOW_MS) {
      consecutiveFailures = 0;
    }
    lastFailureAt = now;
    consecutiveFailures += 1;
    const retryMs = Math.min(BASE_RETRY_MS * (2 ** (consecutiveFailures - 1)), MAX_RETRY_MS);
    setTimeout(() => {
      const fresh = createWorker();
      client?.replaceWorker(fresh);
    }, retryMs);
  };
  return worker;
}

export function getGeometryClient(): GeometryClient {
  if (!client) {
    client = new GeometryClient(createWorker());
  }
  return client;
}
