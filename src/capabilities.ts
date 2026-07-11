export interface Capabilities {
  webgl2: boolean;
  wasm: boolean;
}

/** 偵測執行環境是否支援 NexCAD 所需功能（規格 §12） */
export function detectCapabilities(
  doc: Pick<Document, 'createElement'> = document,
): Capabilities {
  let webgl2 = false;
  try {
    webgl2 = doc.createElement('canvas').getContext('webgl2') != null;
  } catch {
    webgl2 = false;
  }
  const wasm = typeof WebAssembly === 'object' && typeof WebAssembly.instantiate === 'function';
  return { webgl2, wasm };
}
