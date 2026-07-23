import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { regenerateEnclosure } from '../enclosure/actions';
import { buildCarChassisAndGround } from '../parts/presets';
import type { CarChassisShape, CarConfigParams } from '../parts/presets';
import { findNode, useDocumentStore } from '../store/documentStore';
import { useToastStore } from '../store/toastStore';
import type {
  CarAnchorNode,
  EnclosureNode,
  EnclosureParams,
  NexcadDocument,
  PrimitiveNode,
  SceneNode,
} from '../types/document';

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
        <>
          {isEnclosureStale(node, doc) && (
            <p className="mb-2 text-xs text-amber-700">{t('enclosure.staleWarning')}</p>
          )}
          <button
            onClick={() => regenerateEnclosure(node.id)}
            className="mb-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-100"
          >
            <RefreshCw size={16} />
            {t('enclosure.regenerate')}
          </button>
          <EnclosureParamFields node={node} />
        </>
      )}
      {node.type === 'car-anchor' && <CarAnchorFields node={node} />}
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

// 缺少對應 live part 節點的來源零件（已刪除）不計入過期判斷，交由既有重新產生流程處理
function isEnclosureStale(node: EnclosureNode, doc: NexcadDocument): boolean {
  return node.sourceParts.some((s) => {
    const live = findNode(doc.nodes, s.nodeId);
    if (!live || live.type !== 'part') return false;
    return (
      JSON.stringify(live.transform.position) !== JSON.stringify(s.transform.position) ||
      JSON.stringify(live.transform.rotation) !== JSON.stringify(s.transform.rotation)
    );
  });
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

function CarAnchorFields({ node }: { node: CarAnchorNode }) {
  const { t, i18n } = useTranslation();
  const updateNode = useDocumentStore((s) => s.updateNode);
  const doc = useDocumentStore((s) => s.doc);
  const [generating, setGenerating] = useState(false);

  const setConfig = <K extends keyof CarConfigParams>(key: K, value: CarConfigParams[K]) => {
    updateNode(node.id, (n) => {
      if (n.type === 'car-anchor') n.config = { ...n.config, [key]: value };
    });
  };

  const generate = () => {
    setGenerating(true);
    try {
      const result = buildCarChassisAndGround(node, doc.nodes, i18n.language);
      if (result.warnings.length > 0) {
        useToastStore.getState().show(t('car.holeOutOfBounds'));
        return;
      }

      const store = useDocumentStore.getState();
      const oldIds = new Set(node.generatedNodeIds);
      store.mutate('更新底盤', (d) => {
        d.nodes = d.nodes.filter((n) => !oldIds.has(n.id));
        const anchor = findNode(d.nodes, node.id);
        if (anchor?.type === 'car-anchor') {
          anchor.generatedNodeIds = result.nodes.map((n) => n.id);
        }
        d.nodes.push(...result.nodes);
      });
      store.setSelection(result.defaultSelection);
    } finally {
      setGenerating(false);
    }
  };

  const hasGenerated = (node.generatedNodeIds?.length ?? 0) > 0;

  return (
    <>
      <p className="mb-1 text-xs text-slate-400">{t('car.chassisShape')}</p>
      <select
        className="mb-3 h-11 w-full rounded-lg border border-slate-200 px-2 text-sm text-slate-800"
        value={node.config.shape}
        onChange={(e) => setConfig('shape', e.target.value as CarChassisShape)}
      >
        <option value="rounded-rect">{t('car.shapeRoundedRect')}</option>
        <option value="rect">{t('car.shapeRect')}</option>
        <option value="ellipse">{t('car.shapeEllipse')}</option>
      </select>
      <p className="mb-1 text-xs text-slate-400">{t('car.chassisDimensions')}</p>
      <div className="mb-3 grid grid-cols-3 gap-2">
        <NumberField label={t('car.length')} value={node.config.length} min={150} onChange={(v) => setConfig('length', v)} />
        <NumberField label={t('car.width')} value={node.config.width} min={120} onChange={(v) => setConfig('width', v)} />
        <NumberField label={t('car.thickness')} value={node.config.thickness} min={2} onChange={(v) => setConfig('thickness', v)} />
      </div>
      <p className="mb-3 text-xs text-slate-500">
        {t('car.driveType')}: {node.config.drive === '2wd' ? t('car.drive2wd') : t('car.drive4wd')}
      </p>
      <button
        onClick={generate}
        disabled={generating}
        className="mb-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-50"
      >
        {hasGenerated ? t('car.regenerateChassis') : t('car.generateChassis')}
      </button>
    </>
  );
}

function EnclosureParamFields({ node }: { node: EnclosureNode }) {
  const { t } = useTranslation();
  const updateNode = useDocumentStore((s) => s.updateNode);

  const setParam = <K extends keyof EnclosureParams>(key: K, value: EnclosureParams[K]) => {
    updateNode(node.id, (n) => {
      if (n.type === 'enclosure') n.params = { ...n.params, [key]: value };
    });
    regenerateEnclosure(node.id);
  };

  const p = node.params;
  return (
    <>
      <p className="mb-1 mt-3 text-xs text-slate-400">{t('enclosure.params')}</p>
      <div className="grid grid-cols-2 gap-2">
        <NumberField
          label={t('enclosure.wallThickness')}
          value={p.wallThickness}
          min={0.5}
          onChange={(v) => setParam('wallThickness', v)}
        />
        <NumberField
          label={t('enclosure.clearanceMargin')}
          value={p.clearanceMargin}
          min={0}
          onChange={(v) => setParam('clearanceMargin', v)}
        />
        <NumberField
          label={t('enclosure.cornerRadius')}
          value={p.cornerRadius}
          min={0}
          onChange={(v) => setParam('cornerRadius', v)}
        />
        <NumberField
          label={t('enclosure.standoffWallPadding')}
          value={p.standoffWallPadding}
          min={0.5}
          onChange={(v) => setParam('standoffWallPadding', v)}
        />
      </div>
      <label className="mt-2 block">
        <span className="text-xs text-slate-400">{t('enclosure.lidType')}</span>
        <select
          className="h-11 w-full rounded-lg border border-slate-200 px-2 text-sm text-slate-800"
          value={p.lidType}
          onChange={(e) => setParam('lidType', e.target.value as EnclosureParams['lidType'])}
        >
          <option value="screw">{t('enclosure.lidScrew')}</option>
          <option value="slide">{t('enclosure.lidSlide')}</option>
          <option value="open">{t('enclosure.lidOpen')}</option>
        </select>
      </label>
      <label className="mt-2 block">
        <span className="text-xs text-slate-400">{t('enclosure.screwSize')}</span>
        <select
          className="h-11 w-full rounded-lg border border-slate-200 px-2 text-sm text-slate-800"
          value={p.screwSize}
          onChange={(e) => setParam('screwSize', e.target.value as EnclosureParams['screwSize'])}
        >
          {(['M2', 'M2.5', 'M3', 'M4'] as const).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
      <label className="mt-2 block">
        <span className="text-xs text-slate-400">{t('enclosure.mountingStyle')}</span>
        <select
          className="h-11 w-full rounded-lg border border-slate-200 px-2 text-sm text-slate-800"
          value={p.mountingStyle ?? 'screw'}
          onChange={(e) =>
            setParam('mountingStyle', e.target.value as EnclosureParams['mountingStyle'])
          }
        >
          <option value="screw">{t('enclosure.mountingScrew')}</option>
          <option value="peg">{t('enclosure.mountingPeg')}</option>
          <option value="hole">{t('enclosure.mountingHole')}</option>
        </select>
      </label>
      {p.lidType === 'screw' && (
        <label className="mt-2 block">
          <span className="text-xs text-slate-400">{t('enclosure.screwLidProfile')}</span>
          <select
            className="h-11 w-full rounded-lg border border-slate-200 px-2 text-sm text-slate-800"
            value={p.screwLidProfile ?? 'flatRecessed'}
            onChange={(e) =>
              setParam('screwLidProfile', e.target.value as EnclosureParams['screwLidProfile'])
            }
          >
            <option value="flatExposed">{t('enclosure.lidFlatExposed')}</option>
            <option value="flatRecessed">{t('enclosure.lidFlatRecessed')}</option>
          </select>
        </label>
      )}
      {p.lidType === 'screw' && (
        <label className="mt-2 block">
          <span className="text-xs text-slate-400">{t('enclosure.screwEntry')}</span>
          <select
            className="h-11 w-full rounded-lg border border-slate-200 px-2 text-sm text-slate-800"
            value={p.screwEntry ?? 'fromLid'}
            onChange={(e) => setParam('screwEntry', e.target.value as EnclosureParams['screwEntry'])}
          >
            <option value="fromLid">{t('enclosure.screwEntryFromLid')}</option>
            <option value="fromBase">{t('enclosure.screwEntryFromBase')}</option>
          </select>
        </label>
      )}
      {p.lidType === 'screw' && (
        <label className="mt-2 flex items-center gap-2 text-xs text-slate-500">
          <input
            type="checkbox"
            checked={p.reserveCornerSpace !== false}
            onChange={(e) => setParam('reserveCornerSpace', e.target.checked)}
          />
          {t('enclosure.reserveCornerSpace')}
        </label>
      )}
      {p.lidType !== 'open' && (
        <label className="mt-2 flex items-center gap-2 text-xs text-slate-500">
          <input
            type="checkbox"
            checked={p.lidDisplayCutout !== false}
            onChange={(e) => setParam('lidDisplayCutout', e.target.checked)}
          />
          {t('enclosure.lidDisplayCutout')}
        </label>
      )}
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
