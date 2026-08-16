import { useState } from 'react';
import { AlignCenterHorizontal, BracketsSquare, Car, Package, Wrench } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { AlignToolsPanel } from './AlignToolsPanel';
import { BracketPanel } from './BracketPanel';
import { CarConfigPanel } from './CarConfigPanel';
import { EnclosurePanel } from './EnclosurePanel';
import { ScrewToolsMenu } from './ScrewToolsMenu';

const buttonClass =
  'flex w-full cursor-pointer items-center gap-2 rounded-xl border border-line bg-white/75 px-3 py-2.5 text-left text-[13px] font-semibold text-ink-2 transition-colors hover:border-accent-line hover:bg-accent-soft/50 hover:text-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40';

export function WorkflowTools({ showTitle = true, compact = false }: { showTitle?: boolean; compact?: boolean }) {
  const { t } = useTranslation();
  const [panel, setPanel] = useState<'enclosure' | 'car' | 'bracket' | 'screw' | 'align' | null>(null);

  return (
    <section className={`${compact ? 'rounded-xl shadow-sm' : 'rounded-2xl shadow-panel'} border border-line bg-white/72 p-2`}>
      {showTitle && (
        <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
          {t('view.workflowTools')}
        </p>
      )}
      <div className="space-y-1.5">
        <button
          type="button"
          title={t('enclosure.title')}
          aria-label={t('enclosure.title')}
          className={buttonClass}
          onClick={() => setPanel('enclosure')}
        >
          <Package size={16} weight="regular" />
          {t('enclosure.title')}
        </button>
        <button
          type="button"
          title={t('toolbar.smartCar')}
          aria-label={t('toolbar.smartCar')}
          className={buttonClass}
          onClick={() => setPanel('car')}
        >
          <Car size={16} weight="regular" />
          {t('toolbar.smartCar')}
        </button>
        <button
          type="button"
          title={t('bracket.title')}
          aria-label={t('bracket.title')}
          className={buttonClass}
          onClick={() => setPanel('bracket')}
        >
          <BracketsSquare size={16} weight="regular" />
          {t('bracket.title')}
        </button>
        <button
          type="button"
          title={t('tools.title')}
          aria-label={t('tools.title')}
          className={buttonClass}
          onClick={() => setPanel('screw')}
        >
          <Wrench size={16} weight="regular" />
          {t('tools.title')}
        </button>
        <button
          type="button"
          title={t('align.title')}
          aria-label={t('align.title')}
          className={`${buttonClass} ${panel === 'align' ? 'border-accent-line bg-accent-soft/60 text-accent-strong' : ''}`}
          onClick={() => setPanel(panel === 'align' ? null : 'align')}
        >
          <AlignCenterHorizontal size={16} weight="regular" />
          {t('align.title')}
        </button>
      </div>
      {panel === 'align' && (
        <div className="mt-2">
          <AlignToolsPanel onClose={() => setPanel(null)} />
        </div>
      )}
      {panel === 'enclosure' && <EnclosurePanel onClose={() => setPanel(null)} />}
      {panel === 'car' && <CarConfigPanel onClose={() => setPanel(null)} />}
      {panel === 'bracket' && <BracketPanel onClose={() => setPanel(null)} />}
      {panel === 'screw' && <ScrewToolsMenu onClose={() => setPanel(null)} />}
    </section>
  );
}
