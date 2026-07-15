import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { regenerateEnclosure } from '../enclosure/actions';
import { findNode, useDocumentStore } from '../store/documentStore';
import type { PrimitiveNode, SceneNode } from '../types/document';

const PARAM_LABELS: Record<string, string> = {
  width: 'property.width',
  depth: 'property.depth',
  height: 'property.height',
  radius: 'property.radius',
  radiusBottom: 'property.radiusBottom',
  radiusTop: 'property.radiusTop',
};

const AXIS_LABELS = ['X', 'Y', 'Z'] as const;

export function PropertyCard() {
  const { t } = useTranslation();
  const selection = useDocumentStore((s) => s.selection);
  const doc = useDocumentStore((s) => s.doc);
  const updateNode = useDocumentStore((s) => s.updateNode);

  const node = selection.length === 1 ? findNode(doc.nodes, selection[0]) : undefined;
  if (!node) return null;

  return (
    <div className="absolute right-4 top-20 w-64 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-lg backdrop-blur">
      <input
        className="mb-3 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm font-medium text-slate-800"
        value={node.name}
        onChange={(e) => updateNode(node.id, (n) => void (n.name = e.target.value))}
        aria-label={t('property.name')}
      />
      <RoleToggle node={node} onChange={(role) => updateNode(node.id, (n) => void (n.role = role))} />
      {node.type === 'primitive' && <ParamFields node={node} updateNode={updateNode} />}
      {node.type === 'enclosure' && (
        <button
          onClick={() => regenerateEnclosure(node.id)}
          className="mb-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-100"
        >
          <RefreshCw size={16} />
          {t('enclosure.regenerate')}
        </button>
      )}
      <p className="mb-1 mt-3 text-xs text-slate-400">{t('property.position')}</p>
      <div className="grid grid-cols-3 gap-2">
        {AXIS_LABELS.map((axis, i) => (
          <NumberField
            key={axis}
            label={axis}
            value={node.transform.position[i]}
            onChange={(v) =>
              updateNode(node.id, (n) => void (n.transform.position[i] = v))
            }
          />
        ))}
      </div>
    </div>
  );
}

function RoleToggle({
  node,
  onChange,
}: {
  node: SceneNode;
  onChange: (role: 'solid' | 'hole') => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="mb-3 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
      {(['solid', 'hole'] as const).map((role) => (
        <button
          key={role}
          onClick={() => onChange(role)}
          aria-pressed={node.role === role}
          className={`rounded-lg py-1.5 text-sm ${
            node.role === role ? 'bg-white font-medium text-slate-800 shadow-sm' : 'text-slate-500'
          }`}
        >
          {role === 'solid' ? t('property.solid') : t('property.hole')}
        </button>
      ))}
    </div>
  );
}

function ParamFields({
  node,
  updateNode,
}: {
  node: PrimitiveNode;
  updateNode: (id: string, fn: (n: SceneNode) => void) => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      <p className="mb-1 text-xs text-slate-400">{t('property.size')}</p>
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(node.params).map(([key, value]) => (
          <NumberField
            key={key}
            label={t(PARAM_LABELS[key] ?? key)}
            value={value}
            min={key === 'radiusTop' ? 0 : 0.1}
            onChange={(v) =>
              updateNode(node.id, (n) => {
                if (n.type === 'primitive') n.params[key] = v;
              })
            }
          />
        ))}
      </div>
    </>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <label className="block">
      <span className="text-xs text-slate-400">{label}</span>
      <input
        type="number"
        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-800"
        value={draft ?? value}
        min={min}
        step={1}
        onFocus={() => setDraft(String(value))}
        onBlur={() => setDraft(null)}
        onChange={(e) => {
          setDraft(e.target.value);
          const v = Number.parseFloat(e.target.value);
          if (!Number.isNaN(v) && (min === undefined || v >= min)) onChange(v);
        }}
      />
    </label>
  );
}
