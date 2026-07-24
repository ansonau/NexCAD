import { useState } from 'react';
import { Box, ChevronDown, ChevronUp, Circle, Cone, Cylinder, Search } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PART_CATEGORIES, PART_LIBRARY } from '../parts/library';
import type { PartCategory, PartDefinition } from '../parts/schema';
import { useDocumentStore } from '../store/documentStore';
import { createPartNode, createPrimitive } from '../types/document';
import type { PrimitiveKind } from '../types/document';
import { IconButton, panelClass } from './ui';

type DrawerCategory = PartCategory | 'basicShapes';

const PRIMITIVES: { kind: PrimitiveKind; label: string; icon: LucideIcon }[] = [
  { kind: 'box', label: 'toolbar.box', icon: Box },
  { kind: 'cylinder', label: 'toolbar.cylinder', icon: Cylinder },
  { kind: 'sphere', label: 'toolbar.sphere', icon: Circle },
  { kind: 'cone', label: 'toolbar.cone', icon: Cone },
];

export function PartsDrawer({
  docked = false,
  showTitle = true,
  compact = false,
}: {
  docked?: boolean;
  showTitle?: boolean;
  compact?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<DrawerCategory>('board');
  const [query, setQuery] = useState('');
  const addNode = useDocumentStore((s) => s.addNode);

  const q = query.trim().toLowerCase();
  const parts = PART_LIBRARY.filter((p) =>
    q ? `${p.name} ${p.nameZh}`.toLowerCase().includes(q) : category !== 'basicShapes' && p.category === category,
  );

  const addPart = (part: PartDefinition) => {
    addNode(createPartNode(part.id, i18n.language === 'zh' ? part.nameZh : part.name));
  };

  const addPrimitive = (kind: PrimitiveKind) => {
    addNode(createPrimitive(kind));
    if (!docked) setOpen(false);
  };

  const content = (
    <>
      <div className={docked ? 'flex flex-col gap-2 px-3 pb-2 pt-3' : 'flex items-center gap-1.5 overflow-x-auto px-4 pb-2 pt-2.5'}>
        <div className="flex gap-1.5 overflow-x-auto">
          {[...PART_CATEGORIES, 'basicShapes' as const].map((c) => (
            <button
              key={c}
              onClick={() => {
                setCategory(c);
                setQuery('');
              }}
              aria-pressed={category === c && q === ''}
              className={`h-8 shrink-0 cursor-pointer rounded-[10px] px-3 text-[12px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
                category === c && q === ''
                  ? 'bg-accent text-white shadow-sm'
                  : 'bg-slate-900/[0.05] text-ink-2 hover:bg-slate-900/[0.09] hover:text-ink'
              }`}
            >
              {t(`drawer.${c}`)}
            </button>
          ))}
        </div>
        <div className={docked ? 'flex shrink-0 items-center gap-1.5' : 'ml-auto flex shrink-0 items-center gap-1.5'}>
          <div className="flex h-8 min-w-0 flex-1 items-center gap-1.5 rounded-[10px] border border-line bg-white/80 px-2.5 transition-colors duration-150 focus-within:border-accent-line focus-within:ring-2 focus-within:ring-accent/25">
            <Search size={13} className="shrink-0 text-ink-3" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('drawer.search')}
              aria-label={t('drawer.search')}
              className="min-w-0 flex-1 bg-transparent text-[12px] text-ink outline-none placeholder:text-ink-3"
            />
          </div>
          {!docked && (
            <IconButton
              title={t('drawer.close')}
              onClick={() => setOpen(false)}
              className="h-8 w-8 rounded-full"
            >
              <ChevronDown size={16} />
            </IconButton>
          )}
        </div>
      </div>
      {category !== 'basicShapes' && parts.length === 0 && (
        <p className="p-6 text-center text-[13px] text-ink-3">{t('drawer.noResults')}</p>
      )}
      {!q && category === 'basicShapes' ? (
        <div className={docked ? 'px-3 pb-3' : 'px-4 pb-4'}>
          <div className={docked ? 'grid grid-cols-2 gap-2' : 'grid grid-cols-2 gap-2 sm:grid-cols-4'}>
            {PRIMITIVES.map(({ kind, label, icon: Icon }) => (
              <button
                key={kind}
                type="button"
                onClick={() => addPrimitive(kind)}
                className="group flex cursor-pointer items-center gap-2 rounded-xl border border-line bg-white/70 p-3 text-left transition-colors duration-150 hover:border-accent-line hover:bg-accent-soft/50 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900/[0.05] text-ink-2 group-hover:text-accent">
                  <Icon size={16} strokeWidth={1.8} />
                </span>
                <span className="text-[13px] font-medium text-ink group-hover:text-accent-strong">
                  {t(label)}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className={`${docked ? `${compact ? 'max-h-40' : 'max-h-48'} grid-cols-1 px-3 pb-3` : 'max-h-60 grid-cols-2 px-4 pb-4 sm:grid-cols-3 md:grid-cols-4'} grid gap-2 overflow-y-auto`}>
          {parts.map((p) => (
            <button
              key={p.id}
              onClick={() => addPart(p)}
              className="group cursor-pointer rounded-xl border border-line bg-white/70 p-3 text-left transition-colors duration-150 hover:border-accent-line hover:bg-accent-soft/50 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              <p className="text-[13px] font-medium text-ink group-hover:text-accent-strong">
                {i18n.language === 'zh' ? p.nameZh : p.name}
              </p>
              <p className="mt-1 font-mono text-[11px] tabular-nums text-ink-3">
                {p.body.size[0]} × {p.body.size[1]} mm
              </p>
            </button>
          ))}
        </div>
      )}
    </>
  );

  if (docked) {
    return (
      <section className={`${compact ? 'max-h-72' : 'max-h-[42vh]'} flex min-h-0 flex-col rounded-xl border border-line bg-white/72 shadow-sm`}>
        {showTitle && (
          <div className="border-b border-line px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
            {t('drawer.title')}
          </div>
        )}
        {content}
      </section>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={`absolute bottom-3 left-1/2 flex h-9 -translate-x-1/2 cursor-pointer items-center gap-2 px-3.5 text-[13px] font-medium text-ink-2 transition-colors duration-150 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${panelClass}`}
      >
        <ChevronUp size={16} strokeWidth={1.8} />
        {t('drawer.title')}
      </button>
    );
  }

  return (
    <div className="absolute inset-x-0 bottom-0 z-50 animate-toast-in rounded-t-2xl border-t border-line bg-white/92 shadow-pop backdrop-blur-xl">
      <div className="mx-auto mt-2 h-1 w-9 rounded-full bg-slate-900/10" />
      {content}
    </div>
  );
}
