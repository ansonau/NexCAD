import { evaluateForExport, evaluateForRender } from './evaluate';
import { ManifoldKernel } from './manifoldKernel';
import type { GeometryRequest, GeometryResponse } from './protocol';

const kernel = new ManifoldKernel();
const ready = kernel.init();

const post = (response: GeometryResponse, transfer: Transferable[] = []) =>
  (self as unknown as Worker).postMessage(response, transfer);

self.onmessage = async (e: MessageEvent<GeometryRequest>) => {
  const req = e.data;
  try {
    await ready;
    if (req.type === 'evaluate') {
      const meshes = evaluateForRender(req.nodes, kernel).map((entry) => ({
        nodeId: entry.nodeId,
        role: entry.role,
        positions: entry.mesh.positions,
        indices: entry.mesh.indices,
      }));
      post(
        { id: req.id, ok: true, type: 'evaluate', meshes },
        meshes.flatMap((m) => [m.positions.buffer, m.indices.buffer]),
      );
    } else {
      const solid = evaluateForExport(req.nodes, kernel);
      if (!solid) throw new Error('沒有可匯出的實體');
      const mesh = kernel.toMesh(solid);
      post(
        { id: req.id, ok: true, type: 'export', positions: mesh.positions, indices: mesh.indices },
        [mesh.positions.buffer, mesh.indices.buffer],
      );
    }
  } catch (err) {
    post({ id: req.id, ok: false, error: err instanceof Error ? err.message : String(err) });
  } finally {
    kernel.releaseAll();
  }
};
