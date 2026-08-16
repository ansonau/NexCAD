import { useState } from 'react';
import { CaretDown, CaretUp, Cursor, ArrowsOutCardinal, ArrowsClockwise, ArrowsCounterClockwise, SlidersHorizontal } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { regenerateEnclosure } from '../enclosure/actions';
import { regenerateBracket } from '../bracket/actions';
import { buildCarChassisAndGround } from '../parts/presets';
import type { CarChassisShape, CarConfigParams } from '../parts/presets';
import { findNode, useDocumentStore } from '../store/documentStore';
import { useToastStore } from '../store/toastStore';
import type {
  BracketNode,
  BracketParams,
  CarAnchorNode,
  EnclosureNode,
  EnclosureParams,
  NexcadDocument,
  PrimitiveNode,
  SceneNode,
} from '../types/document';
import { FieldLabel, OutlineButton, Seg, StepperField, fieldClass, panelClass } from './ui';
import { BracketStyleSelector } from './BracketStyleDiagram';

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
  const updateCarAnchorRigid = useDocumentStore((s) => s.updateCarAnchorRigid);

  const node = selection.length === 1 ? findNode(doc.nodes, selection[0]) : undefined;
  // 移動/旋轉錨點要連動拖著它的電子零件一起走（它們是獨立 PartNode，只靠
  // electronicsIds 名義關聯，不是子節點），不然改完錨點位置電子零件留在原地，
  // 底盤孔位對照全部跑掉（見 documentStore.ts 的 applyCarAnchorRigidMove）。
  const updateTransform =
    node?.type === 'car-anchor'
      ? (fn: (n: SceneNode) => void) => updateCarAnchorRigid(node.id, fn as (a: CarAnchorNode) => void)
      : (fn: (n: SceneNode) => void) => updateNode(node!.id, fn);
  return (
    <div className={`pointer-events-auto max-h-full w-full animate-pop-in overflow-y-auto p-3 ${panelClass}`}>
      {!node ? (
        <div className="flex min-h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-slate-900/[0.018] px-4 py-8 text-center">
          <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-accent-soft text-accent">
            <Cursor size={18} weight="regular" />
          </span>
          <p className="text-[13px] font-semibold text-ink-2">{t('property.selectHint')}</p>
        </div>
      ) : (
        <>
          <PropertySection title={t('property.name')}>
            <input
              className={`${fieldClass} font-semibold`}
              value={node.name}
              onChange={(e) => updateNode(node.id, (n) => void (n.name = e.target.value))}
              aria-label={t('property.name')}
            />
            <RoleToggle node={node} onChange={(role) => updateNode(node.id, (n) => void (n.role = role))} />
          </PropertySection>

          {node.type === 'primitive' && (
            <PropertySection title={t('property.size')} icon={<SlidersHorizontal size={14} />}>
              <ParamFields node={node} updateNode={updateNode} />
            </PropertySection>
          )}
          {node.type === 'enclosure' && (
            <PropertySection title={t('enclosure.params')} icon={<SlidersHorizontal size={14} />}>
              {isEnclosureStale(node, doc) && (
                <p className="mb-2 flex items-start gap-1.5 rounded-lg border border-amber-200/70 bg-amber-50 px-2 py-1.5 text-[11px] leading-snug text-amber-800">
                  <ArrowsClockwise size={13} className="mt-px shrink-0" />
                  {t('enclosure.staleWarning')}
                </p>
              )}
              <OutlineButton onClick={() => regenerateEnclosure(node.id)} className="mb-1 w-full">
                <ArrowsClockwise size={14} />
                {t('enclosure.regenerate')}
              </OutlineButton>
              <EnclosureParamFields node={node} />
            </PropertySection>
          )}
          {node.type === 'bracket' && (
            <PropertySection title={t('bracket.params')} icon={<SlidersHorizontal size={14} />}>
              <BracketParamFields node={node} />
            </PropertySection>
          )}
          {node.type === 'car-anchor' && (
            <PropertySection title={t('toolbar.smartCar')} icon={<SlidersHorizontal size={14} />}>
              <CarAnchorFields node={node} />
            </PropertySection>
          )}

          <PropertySection title={t('property.position')} icon={<ArrowsOutCardinal size={14} />}>
            <div className="grid grid-cols-3 gap-1.5">
              {AXIS_LABELS.map((axis, i) => (
                <StepperField
                  key={axis}
                  label={axis}
                  value={node.transform.position[i]}
                  step={0.5}
                  onChange={(v) =>
                    updateTransform((n) => void (n.transform.position[i] = v))
                  }
                />
              ))}
            </div>
          </PropertySection>

          <PropertySection title={t('property.rotation')} icon={<ArrowsCounterClockwise size={14} />}>
            <div className="grid grid-cols-3 gap-1.5">
              {AXIS_LABELS.map((axis, i) => (
                node.type === 'car-anchor' && axis !== 'Z' ? null : (
                  <StepperField
                    key={axis}
                    label={axis}
                    value={node.transform.rotation[i]}
                    step={5}
                    onChange={(v) =>
                      updateTransform((n) => void (n.transform.rotation[i] = v))
                    }
                  />
                )
              ))}
            </div>
          </PropertySection>
        </>
      )}
    </div>
  );
}

function PropertySection({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-3 rounded-2xl border border-line bg-white/82 p-3 last:mb-0">
      <h3 className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-ink">
        {icon && <span className="text-ink-3">{icon}</span>}
        {title}
      </h3>
      {children}
    </section>
  );
}

export function replaceCarAnchorGeneratedNodes(
  doc: NexcadDocument,
  anchorId: string,
  generatedNodes: SceneNode[],
) {
  const anchor = findNode(doc.nodes, anchorId);
  const oldIds = new Set(anchor?.type === 'car-anchor' ? anchor.generatedNodeIds ?? [] : []);
  doc.nodes = doc.nodes.filter((n) => !oldIds.has(n.id));
  if (anchor?.type === 'car-anchor') {
    anchor.generatedNodeIds = generatedNodes.map((n) => n.id);
  }
  doc.nodes.push(...generatedNodes);
}

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
    <div className="mt-2 grid grid-cols-2 gap-0.5 rounded-xl bg-slate-900/[0.05] p-0.5">
      {(['solid', 'hole'] as const).map((role) => (
        <button
          key={role}
          onClick={() => onChange(role)}
          aria-pressed={node.role === role}
          className={`rounded-lg py-1.5 text-[13px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
            node.role === role
              ? 'bg-white text-ink shadow-sm'
              : 'text-ink-2 hover:text-ink'
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
    <div>
      <div className="grid grid-cols-2 gap-1.5">
        {Object.entries(node.params).map(([key, value]) => (
          <StepperField
            key={key}
            label={t(PARAM_LABELS[key] ?? key)}
            value={value}
            min={key === 'radiusTop' ? 0 : 0.1}
            step={key.startsWith('radius') ? 0.5 : 1}
            onChange={(v) =>
              updateNode(node.id, (n) => {
                if (n.type === 'primitive') n.params[key] = v;
              })
            }
          />
        ))}
      </div>
    </div>
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
      store.mutate('更新底盤', (d) => {
        replaceCarAnchorGeneratedNodes(d, node.id, result.nodes);
      });
      store.setSelection(result.defaultSelection);
    } finally {
      setGenerating(false);
    }
  };

  const hasGenerated = (node.generatedNodeIds?.length ?? 0) > 0;

  return (
    <>
      <div className="mb-3">
        <FieldLabel>{t('car.chassisShape')}</FieldLabel>
        <select
          className={fieldClass}
          value={node.config.shape}
          onChange={(e) => setConfig('shape', e.target.value as CarChassisShape)}
        >
          <option value="rounded-rect">{t('car.shapeRoundedRect')}</option>
          <option value="rect">{t('car.shapeRect')}</option>
          <option value="ellipse">{t('car.shapeEllipse')}</option>
        </select>
      </div>
      <div className="mb-3">
        <FieldLabel>{t('car.chassisDimensions')}</FieldLabel>
        <div className="grid grid-cols-3 gap-1.5">
          <StepperField label={t('car.lengthShort')} value={node.config.length} min={150} max={400} step={1} onChange={(v) => setConfig('length', v)} />
          <StepperField label={t('car.widthShort')} value={node.config.width} min={120} max={300} step={1} onChange={(v) => setConfig('width', v)} />
          <StepperField label={t('car.thicknessShort')} value={node.config.thickness} min={2} max={6} step={1} onChange={(v) => setConfig('thickness', v)} />
        </div>
      </div>
      <div className="mb-3 text-[11px] text-ink-3">
        {t('car.driveType')}: {node.config.drive === '2wd' ? t('car.drive2wd') : t('car.drive4wd')}
      </div>
      <OutlineButton onClick={generate} disabled={generating} className="w-full">
        {hasGenerated ? t('car.regenerateChassis') : t('car.generateChassis')}
      </OutlineButton>
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
      <div className="grid grid-cols-2 gap-1.5">
        <StepperField
          label={t('enclosure.wallThicknessShort')}
          value={p.wallThickness}
          min={0.5}
          step={0.5}
          onChange={(v) => setParam('wallThickness', v)}
        />
        <StepperField
          label={t('enclosure.clearanceMarginShort')}
          value={p.clearanceMargin}
          min={0}
          step={0.5}
          onChange={(v) => setParam('clearanceMargin', v)}
        />
        <StepperField
          label={t('enclosure.cornerRadiusShort')}
          value={p.cornerRadius}
          min={0}
          step={0.5}
          onChange={(v) => setParam('cornerRadius', v)}
        />
        <StepperField
          label={t('enclosure.standoffWallPadding')}
          value={p.standoffWallPadding}
          min={0.5}
          step={0.5}
          onChange={(v) => setParam('standoffWallPadding', v)}
        />
      </div>
      <label className="mt-2 block">
        <FieldLabel>{t('enclosure.lidType')}</FieldLabel>
        <select
          className={fieldClass}
          value={p.lidType}
          onChange={(e) => setParam('lidType', e.target.value as EnclosureParams['lidType'])}
        >
          <option value="screw">{t('enclosure.lidScrew')}</option>
          <option value="slide">{t('enclosure.lidSlide')}</option>
          <option value="open">{t('enclosure.lidOpen')}</option>
        </select>
      </label>
      <label className="mt-2 block">
        <FieldLabel>{t('enclosure.screwSize')}</FieldLabel>
        <select
          className={fieldClass}
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
        <FieldLabel>{t('enclosure.mountingStyle')}</FieldLabel>
        <select
          className={fieldClass}
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
          <FieldLabel>{t('enclosure.screwLidProfile')}</FieldLabel>
          <select
            className={fieldClass}
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
          <FieldLabel>{t('enclosure.screwEntry')}</FieldLabel>
          <select
            className={fieldClass}
            value={p.screwEntry ?? 'fromLid'}
            onChange={(e) => setParam('screwEntry', e.target.value as EnclosureParams['screwEntry'])}
          >
            <option value="fromLid">{t('enclosure.screwEntryFromLid')}</option>
            <option value="fromBase">{t('enclosure.screwEntryFromBase')}</option>
          </select>
        </label>
      )}
      {p.lidType === 'screw' && (
        <label className="mt-2 flex cursor-pointer items-center gap-2 text-[12px] text-ink-2">
          <input
            type="checkbox"
            className="h-3.5 w-3.5 rounded accent-blue-600"
            checked={p.reserveCornerSpace !== false}
            onChange={(e) => setParam('reserveCornerSpace', e.target.checked)}
          />
          {t('enclosure.reserveCornerSpace')}
        </label>
      )}
      {p.lidType !== 'open' && (
        <label className="mt-2 flex cursor-pointer items-center gap-2 text-[12px] text-ink-2">
          <input
            type="checkbox"
            className="h-3.5 w-3.5 rounded accent-blue-600"
            checked={p.lidDisplayCutout !== false}
            onChange={(e) => setParam('lidDisplayCutout', e.target.checked)}
          />
          {t('enclosure.lidDisplayCutout')}
        </label>
      )}
    </>
  );
}

function BracketParamFields({ node }: { node: BracketNode }) {
  const { t } = useTranslation();
  const updateNode = useDocumentStore((s) => s.updateNode);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const setParam = <K extends keyof BracketParams>(key: K, value: BracketParams[K]) => {
    updateNode(node.id, (n) => {
      if (n.type === 'bracket') n.params = { ...n.params, [key]: value };
    });
    regenerateBracket(node.id);
  };

  const p = node.params;
  const style = p.style ?? 'base';

  return (
    <>
      <label className="block">
        <FieldLabel>{t('bracket.style')}</FieldLabel>
        <BracketStyleSelector
          value={style}
          onChange={(v) => setParam('style', v)}
          labels={{ base: t('bracket.styleBase'), l: t('bracket.styleL'), u: t('bracket.styleU') }}
        />
      </label>

      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <StepperField
          label={t('bracket.baseThicknessShort')}
          value={p.baseThickness}
          min={0.5}
          step={0.5}
          onChange={(v) => setParam('baseThickness', v)}
        />
        {style === 'base' && (
          <StepperField
            label={t('bracket.baseExpandShort')}
            value={p.baseExpand ?? p.baseMargin}
            min={0}
            step={0.5}
            onChange={(v) => setParam('baseExpand', v)}
          />
        )}
        {style === 'l' && (
          <StepperField
            label={t('bracket.baseDepthShort')}
            value={p.baseDepth ?? p.baseMargin}
            min={0}
            step={1}
            onChange={(v) => setParam('baseDepth', v)}
          />
        )}
        {style === 'u' && (
          <StepperField
            label={t('bracket.baseMarginShort')}
            value={p.baseMargin}
            min={0}
            step={0.5}
            onChange={(v) => setParam('baseMargin', v)}
          />
        )}
      </div>

      {style === 'base' && (
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          <StepperField
            label={t('bracket.wallHeightShort')}
            value={p.wallHeight ?? 0}
            min={0}
            step={0.5}
            onChange={(v) => setParam('wallHeight', v)}
          />
          <StepperField
            label={t('bracket.wallThicknessShort')}
            value={p.wallThickness ?? 1.5}
            min={0.5}
            step={0.5}
            onChange={(v) => setParam('wallThickness', v)}
          />
          <StepperField
            label={t('bracket.wallClearanceShort')}
            value={p.wallClearance ?? 0.5}
            min={0}
            step={0.1}
            onChange={(v) => setParam('wallClearance', v)}
          />
        </div>
      )}
      {style === 'l' && (
        <>
          <div className="mt-2">
            <StepperField
              label={t('bracket.wallThicknessShort')}
              value={p.wallThickness ?? 1.5}
              min={0.5}
              step={0.5}
              onChange={(v) => setParam('wallThickness', v)}
            />
          </div>
          <label className="mt-2 block">
            <FieldLabel>{t('bracket.baseDirection')}</FieldLabel>
            <Seg
              options={[
                { value: 'back', label: t('bracket.baseDirectionBack') },
                { value: 'front', label: t('bracket.baseDirectionFront') },
                { value: 'both', label: t('bracket.baseDirectionBoth') },
              ]}
              value={p.baseDirection ?? 'back'}
              onChange={(v) => setParam('baseDirection', v)}
            />
          </label>
        </>
      )}
      {style === 'u' && (
        <>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            <StepperField
              label={t('bracket.wallHeightShort')}
              value={p.wallHeight ?? 0}
              min={0.5}
              step={0.5}
              onChange={(v) => setParam('wallHeight', v)}
            />
            <StepperField
              label={t('bracket.wallDepthShort')}
              value={p.wallDepth ?? 0}
              min={0}
              step={0.5}
              onChange={(v) => setParam('wallDepth', v)}
            />
            <StepperField
              label={t('bracket.wallThicknessShort')}
              value={p.wallThickness ?? 1.5}
              min={0.5}
              step={0.5}
              onChange={(v) => setParam('wallThickness', v)}
            />
          </div>
          <div className="mt-2">
            <StepperField
              label={t('bracket.wallClearanceShort')}
              value={p.wallClearance ?? 0.5}
              min={0}
              step={0.1}
              onChange={(v) => setParam('wallClearance', v)}
            />
          </div>
        </>
      )}

      {(style === 'base' || style === 'l') && (
        <>
          <label className="mt-2 block">
            <FieldLabel>{t('bracket.screwSize')}</FieldLabel>
            <select
              className={fieldClass}
              value={p.screwSize}
              onChange={(e) => setParam('screwSize', e.target.value as BracketParams['screwSize'])}
            >
              {(['M2', 'M2.5', 'M3', 'M4'] as const).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-2 block">
            <FieldLabel>{t('bracket.mountingStyle')}</FieldLabel>
            <select
              className={fieldClass}
              value={p.mountingStyle ?? 'screw'}
              onChange={(e) => setParam('mountingStyle', e.target.value as BracketParams['mountingStyle'])}
            >
              <option value="screw">{t('enclosure.mountingScrew')}</option>
              <option value="peg">{t('enclosure.mountingPeg')}</option>
              <option value="hole">{t('enclosure.mountingHole')}</option>
            </select>
          </label>
        </>
      )}

      <button
        type="button"
        onClick={() => setAdvancedOpen((o) => !o)}
        className="mt-2 flex h-9 w-full cursor-pointer items-center justify-between rounded-xl px-3 text-[12px] font-semibold text-ink-2 transition-colors hover:bg-slate-900/[0.035] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      >
        <span>{t('bracket.advanced')}</span>
        {advancedOpen ? <CaretUp size={14} /> : <CaretDown size={14} />}
      </button>
      {advancedOpen && (
        <div className="mt-2 space-y-2 rounded-xl border border-line bg-slate-900/[0.018] p-3">
          <div className="grid grid-cols-2 gap-1.5">
            <StepperField
              label={t('bracket.cornerRadiusShort')}
              value={p.cornerRadius}
              min={0}
              step={0.5}
              onChange={(v) => setParam('cornerRadius', v)}
            />
            {style === 'l' && (
              <StepperField
                label={t('bracket.baseMarginShort')}
                value={p.baseMargin}
                min={0}
                step={0.5}
                onChange={(v) => setParam('baseMargin', v)}
              />
            )}
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-[12px] text-ink-2">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 rounded accent-blue-600"
              checked={p.baseHoles !== false}
              onChange={(e) => setParam('baseHoles', e.target.checked)}
            />
            {t('bracket.baseHoles')}
          </label>
          {p.baseHoles !== false && (
            <>
              <label className="block">
                <FieldLabel>{t('bracket.baseHoleCount')}</FieldLabel>
                <Seg
                  options={[
                    { value: '2', label: t('bracket.baseHoleCount2') },
                    { value: '4', label: t('bracket.baseHoleCount4') },
                  ]}
                  value={String(p.baseHoleCount ?? 4) as '2' | '4'}
                  onChange={(v) => setParam('baseHoleCount', Number(v) as 2 | 4)}
                />
              </label>
              {(p.baseHoleCount ?? 4) === 2 && (
                <label className="block">
                  <FieldLabel>{t('bracket.baseHoleAxis')}</FieldLabel>
                  <Seg
                    options={[
                      { value: 'long', label: t('bracket.baseHoleAxisLong') },
                      { value: 'short', label: t('bracket.baseHoleAxisShort') },
                    ]}
                    value={p.baseHoleAxis ?? 'long'}
                    onChange={(v) => setParam('baseHoleAxis', v)}
                  />
                </label>
              )}
              <label className="block">
                <FieldLabel>{t('bracket.baseHoleScrewSize')}</FieldLabel>
                <select
                  className={fieldClass}
                  value={p.baseHoleScrewSize ?? p.screwSize}
                  onChange={(e) => setParam('baseHoleScrewSize', e.target.value as BracketParams['baseHoleScrewSize'])}
                >
                  {(['M2', 'M2.5', 'M3', 'M4'] as const).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <div>
                <StepperField
                  label={t('bracket.baseHoleSpacingShort')}
                  value={p.baseHoleSpacing ?? 0}
                  min={0}
                  step={1}
                  onChange={(v) => setParam('baseHoleSpacing', v)}
                />
              </div>
              <div>
                <StepperField
                  label={t('bracket.baseHoleInsetShort')}
                  value={p.baseHoleInset ?? p.baseMargin / 2}
                  min={0.5}
                  step={0.5}
                  onChange={(v) => setParam('baseHoleInset', v)}
                />
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-[12px] text-ink-2">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 rounded accent-blue-600"
                  checked={p.baseHoleCountersink === true}
                  onChange={(e) => setParam('baseHoleCountersink', e.target.checked)}
                />
                {t('bracket.baseHoleCountersink')}
              </label>
            </>
          )}
        </div>
      )}
    </>
  );
}
