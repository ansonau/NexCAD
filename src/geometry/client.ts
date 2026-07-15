import { GeometryClient } from './workerClient';

let client: GeometryClient | null = null;

function createWorker(): Worker {
  const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
  worker.onerror = () => {
    worker.terminate();
    const fresh = createWorker();
    client?.replaceWorker(fresh);
  };
  return worker;
}

export function getGeometryClient(): GeometryClient {
  if (!client) {
    client = new GeometryClient(createWorker());
  }
  return client;
}
