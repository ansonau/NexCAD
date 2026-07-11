import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { analyzeMesh, collectThinFeatures, MAX_PRINT_MM, type MeshStats } from '../export/analyze';
import { writeBinaryStl } from '../export/stl';
import { getGeometryClient } from '../geometry/client';
import type { MeshData } from '../geometry/kernel';
import { useDocumentStore } from '../store/documentStore';
import { useToastStore } from '../store/toastStore';

export function ExportDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [mesh, setMesh] = useState<MeshData | null>(null);
  const [stats, setStats] = useState<MeshStats | null>(null);

  // 開啟時只請求一次；onClose/t 為短生命週期擷取，勿加入依賴（會重複請求）
  useEffect(() => {
    const { doc } = useDocumentStore.getState();
    getGeometryClient()
      .requestExport(doc.nodes)
      .then((m) => {
        setMesh(m);
        setStats(analyzeMesh(m));
      })
      .catch((err: unknown) => {
        const message =
          err instanceof Error && err.message === 'EXPORT_EMPTY'
            ? t('errors.exportEmpty')
            : t('errors.exportFailed');
        useToastStore.getState().show(message);
        onClose();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const download = () => {
    if (!mesh) return;
    const { doc } = useDocumentStore.getState();
    const blob = new Blob([writeBinaryStl(mesh)], { type: 'model/stl' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.name}.stl`;
    a.click();
    URL.revokeObjectURL(url);
    onClose();
  };

  const doc = useDocumentStore.getState().doc;
  const thin = collectThinFeatures(doc.nodes);
  const tooLarge = stats ? stats.bbox.some((d) => d > MAX_PRINT_MM) : false;
  const warnings = [
    ...thin.map((name) => t('export.thinFeature', { name })),
    ...(tooLarge ? [t('export.tooLarge')] : []),
  ];
  const fmt = (v: number) => (Math.round(v * 10) / 10).toString();

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/30"
      onClick={onClose}
    >
      <div
        className="w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="mb-3 text-sm font-medium text-slate-800">{t('export.title')}</p>
        {stats && (
          <div className="mb-3 space-y-1 text-sm text-slate-600">
            <p>
              {t('export.dimensions')}：{fmt(stats.bbox[0])} × {fmt(stats.bbox[1])} ×{' '}
              {fmt(stats.bbox[2])} mm
            </p>
            <p>
              {t('export.triangles')}：{stats.triangles.toLocaleString()}
            </p>
          </div>
        )}
        {warnings.length > 0 && (
          <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="mb-1 text-xs font-medium text-amber-800">{t('export.warnings')}</p>
            {warnings.map((w) => (
              <p key={w} className="text-xs text-amber-700">
                {w}
              </p>
            ))}
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="h-11 rounded-xl px-4 text-sm text-slate-600 hover:bg-slate-100"
          >
            {t('export.cancel')}
          </button>
          <button
            onClick={download}
            disabled={!mesh}
            className="h-11 rounded-xl bg-slate-800 px-4 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-40"
          >
            {t('export.download')}
          </button>
        </div>
      </div>
    </div>
  );
}
