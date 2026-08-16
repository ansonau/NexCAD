import { CheckCircle, Circle, Path } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { useDocumentStore } from '../store/documentStore';
import type { SceneNode } from '../types/document';

export type GuidedWorkbenchStep = 'addParts' | 'enclosure' | 'check';

const STEP_KEYS: { id: GuidedWorkbenchStep; label: string; hint: string }[] = [
  { id: 'addParts', label: 'view.workflowAddParts', hint: 'view.workflowAddPartsHint' },
  { id: 'enclosure', label: 'view.workflowEnclosure', hint: 'view.workflowEnclosureHint' },
  { id: 'check', label: 'view.workflowCheck', hint: 'view.workflowCheckHint' },
];

export function getGuidedWorkbenchStep(nodes: SceneNode[]): GuidedWorkbenchStep {
  if (nodes.length === 0) return 'addParts';
  if (!nodes.some((node) => node.type === 'enclosure')) return 'enclosure';
  return 'check';
}

export function ActionRail({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  const nodes = useDocumentStore((s) => s.doc.nodes);
  const activeStep = getGuidedWorkbenchStep(nodes);
  const activeIndex = STEP_KEYS.findIndex((step) => step.id === activeStep);

  if (compact) {
    return (
      <section className="rounded-2xl border border-line bg-white/72 p-3 shadow-panel">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent-soft text-accent">
            <Path size={16} weight="bold" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
              {t('view.workflow')}
            </p>
            <p className="truncate text-[13px] font-semibold text-ink-2">
              {t('view.nextStep', { step: t(STEP_KEYS[activeIndex]?.label ?? STEP_KEYS[0].label) })}
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-line bg-white/72 p-3 shadow-panel">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <Path size={16} weight="bold" />
        </span>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
            {t('view.workflow')}
          </p>
          <p className="text-[12px] font-medium text-ink-2">
            {t('view.nextStep', { step: t(STEP_KEYS[activeIndex]?.label ?? STEP_KEYS[0].label) })}
          </p>
        </div>
      </div>
      <ol className="space-y-2">
        {STEP_KEYS.map((step, index) => {
          const active = step.id === activeStep;
          const done = index < activeIndex;
          const Icon = done ? CheckCircle : Circle;
          return (
            <li
              key={step.id}
              className={`rounded-xl border px-3 py-2 transition-colors ${
                active
                  ? 'border-accent/35 bg-accent-soft text-accent'
                  : 'border-line bg-white/75 text-ink-2'
              }`}
            >
              <div className="flex items-start gap-2">
                <Icon size={15} className="mt-0.5 shrink-0" weight="bold" />
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold leading-tight">{index + 1}. {t(step.label)}</p>
                  <p className="mt-1 text-[11px] leading-snug text-ink-3">{t(step.hint)}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
