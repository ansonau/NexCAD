import { GeometryClient } from './workerClient';

let client: GeometryClient | null = null;

// 連續立即崩潰次數的防護：若 worker 模組本身損壞、每次建立都立刻觸發 onerror，
// createWorker() 遞迴呼叫自身會無限重試（資源耗盡 / 呼叫堆疊持續增長）。
// 這個計數器只在單次「連續崩潰」序列中累加；只要曾經成功建立過一個沒有立即
// 崩潰的 worker（下一次從 getGeometryClient() 重新進入的呼叫），就會被重置。
const MAX_CONSECUTIVE_FAILURES = 3;
let consecutiveFailures = 0;

function createWorker(): Worker {
  const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
  worker.onerror = () => {
    worker.terminate();
    consecutiveFailures += 1;
    if (consecutiveFailures > MAX_CONSECUTIVE_FAILURES) {
      console.error(
        `geometry worker crashed ${consecutiveFailures} times in a row; giving up on auto-restart`,
      );
      return;
    }
    const fresh = createWorker();
    client?.replaceWorker(fresh);
  };
  return worker;
}

export function getGeometryClient(): GeometryClient {
  if (!client) {
    consecutiveFailures = 0;
    client = new GeometryClient(createWorker());
  }
  return client;
}
