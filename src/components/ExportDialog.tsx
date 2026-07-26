import { useEffect, useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { analyzeMesh, collectThinFeatures, MAX_PRINT_MM, type MeshStats } from '../export/analyze';
import { writeBinaryStl } from '../export/stl';
import { writeThreeMf } from '../export/threemf';
import { getGeometryClient } from '../geometry/client';
import type { MeshData } from '../geometry/kernel';
import { useDocumentStore } from '../store/documentStore';
import { useToastStore } from '../store/toastStore';
import { Dialog, FieldLabel, GhostButton, PrimaryButton, fieldClass } from './ui';

export function ExportDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [mesh, setMesh] = useState<MeshData | null>(null);
  const [stats, setStats] = useState<MeshStats | null>(null);
  const [format, setFormat] = useState<'stl' | '3mf'>('stl');

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
    const buffer = format === 'stl' ? writeBinaryStl(mesh) : writeThreeMf(mesh);
    const mime = format === 'stl' ? 'model/stl' : 'model/3mf';
    const blob = new Blob([buffer], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.name}.${format}`;
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
    <Dialog title={t('export.title')} onClose={onClose}>
      <label className="mb-3 block">
        <FieldLabel>{t('export.format')}</FieldLabel>
        <select
          className={fieldClass}
          value={format}
          onChange={(e) => setFormat(e.target.value as 'stl' | '3mf')}
        >
          <option value="stl">STL</option>
          <option value="3mf">3MF</option>
        </select>
      </label>
      {stats && (
        <div className="mb-3 space-y-1 rounded-xl border border-line bg-slate-900/[0.03] px-3 py-2.5">
          <p className="flex items-baseline justify-between text-[12px] text-ink-2">
            <span>{t('export.dimensions')}</span>
            <span className="font-mono tabular-nums text-ink">
              {fmt(stats.bbox[0])} × {fmt(stats.bbox[1])} × {fmt(stats.bbox[2])} mm
            </span>
          </p>
          <p className="flex items-baseline justify-between text-[12px] text-ink-2">
            <span>{t('export.triangles')}</span>
            <span className="font-mono tabular-nums text-ink">
              {stats.triangles.toLocaleString()}
            </span>
          </p>
        </div>
      )}
      {warnings.length > 0 && (
        <div className="mb-3 rounded-xl border border-amber-200/70 bg-amber-50 p-3">
          <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-amber-800">
            <TriangleAlert size={13} />
            {t('export.warnings')}
          </p>
          {warnings.map((w) => (
            <p key={w} className="text-[11px] leading-relaxed text-amber-700">
              {w}
            </p>
          ))}
        </div>
      )}
      <div className="flex justify-end gap-1.5">
        <GhostButton onClick={onClose}>{t('export.cancel')}</GhostButton>
        <PrimaryButton onClick={download} disabled={!mesh}>
          {t('export.download', { format: format.toUpperCase() })}
        </PrimaryButton>
      </div>
    </Dialog>
  );
}
