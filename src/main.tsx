import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { detectCapabilities } from './capabilities';
import './i18n';
import './index.css';

const caps = detectCapabilities();
const root = createRoot(document.getElementById('root')!);

if (!caps.webgl2 || !caps.wasm) {
  const missing = [!caps.webgl2 && 'WebGL2', !caps.wasm && 'WebAssembly']
    .filter(Boolean)
    .join('、');
  root.render(
    <div style={{ maxWidth: 480, margin: '20vh auto', padding: 24, fontFamily: 'system-ui', color: '#334155' }}>
      <h1 style={{ fontSize: 20, marginBottom: 12 }}>NexCAD 無法在這個瀏覽器執行</h1>
      <p style={{ marginBottom: 8 }}>缺少必要功能：{missing}。請改用最新版本的 Safari、Chrome 或 Edge。</p>
      <p style={{ color: '#64748b' }}>
        NexCAD can&apos;t run in this browser (missing: {missing}). Please use a recent version of
        Safari, Chrome, or Edge.
      </p>
    </div>,
  );
} else {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
