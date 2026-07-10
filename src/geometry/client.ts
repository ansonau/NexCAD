import { GeometryClient } from './workerClient';

let client: GeometryClient | null = null;

export function getGeometryClient(): GeometryClient {
  if (!client) {
    const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    client = new GeometryClient(worker);
  }
  return client;
}
