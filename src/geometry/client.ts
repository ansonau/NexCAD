import { GeometryClient } from './workerClient';

let client: GeometryClient | null = null;

// 連續立即崩潰次數的防護：若 worker 模組本身損壞、每次建立都立刻觸發 onerror，
// createWorker() 遞迴呼叫自身會無限重試（資源耗盡 / 呼叫堆疊持續增長）。
// 這個計數器只用時間窗口界定「連續」：若距離上一次崩潰已超過 RESET_WINDOW_MS，
// 視為新的崩潰序列並重新歸零，讓長時間執行過程中偶發、彼此相隔很久的崩潰
// 仍能各自正常自動重啟，只有短時間內密集崩潰（判斷為 worker 模組本身損壞）
// 才會停止重試。
const MAX_CONSECUTIVE_FAILURES = 3;
const RESET_WINDOW_MS = 30_000;
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
    if (consecutiveFailures > MAX_CONSECUTIVE_FAILURES) {
      console.error(
        `geometry worker crashed ${consecutiveFailures} times within ${RESET_WINDOW_MS}ms; giving up on auto-restart`,
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
    client = new GeometryClient(createWorker());
  }
  return client;
}
