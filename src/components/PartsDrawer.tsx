import { useState } from 'react';
import {
  BatteryCharging,
  Box,
  ChevronDown,
  ChevronUp,
  Circle,
  CircuitBoard,
  Cone,
  Cylinder,
  Package,
  Radar,
  Search,
  Shapes,
} from 'lucide-react';
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

const CATEGORY_ICONS: Record<DrawerCategory, LucideIcon> = {
  board: CircuitBoard,
  sensor: Radar,
  power: BatteryCharging,
  component: Package,
  basicShapes: Shapes,
};

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
      <section className={`${compact ? 'max-h-72' : 'flex-1'} flex min-h-0 flex-col rounded-2xl border border-line bg-white/86 shadow-sm`}>
        {showTitle && (
          <div className="border-b border-line px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
            {t('drawer.title')}
          </div>
        )}
        <div className="flex h-10 shrink-0 items-center gap-1.5 border-b border-line px-3">
          <Search size={13} className="shrink-0 text-ink-3" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('drawer.search')}
            aria-label={t('drawer.search')}
            className="min-w-0 flex-1 bg-transparent text-[12px] text-ink outline-none placeholder:text-ink-3"
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {q ? (
            parts.length === 0 ? (
              <p className="p-6 text-center text-[13px] text-ink-3">{t('drawer.noResults')}</p>
            ) : (
              <div className="grid grid-cols-1 gap-2">
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
            )
          ) : (
            <div className="divide-y divide-line">
              {[...PART_CATEGORIES, 'basicShapes' as const].map((c) => {
                const active = category === c;
                const CategoryIcon = CATEGORY_ICONS[c];
                const categoryParts = PART_LIBRARY.filter((p) => p.category === c);
                const count = c === 'basicShapes' ? PRIMITIVES.length : categoryParts.length;
                return (
                  <div key={c} className="py-1 first:pt-0 last:pb-0">
                    <button
                      type="button"
                      onClick={() => setCategory(c)}
                      aria-expanded={active}
                      className={`flex h-9 w-full cursor-pointer items-center justify-between rounded-xl px-3 text-left text-[12px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
                        active ? 'bg-accent-soft text-accent' : 'text-ink-2 hover:bg-slate-900/[0.035] hover:text-ink'
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <CategoryIcon size={14} strokeWidth={1.8} className={active ? 'text-accent' : 'text-ink-3'} />
                        <span className="min-w-0 truncate">{t(`drawer.${c}`)}</span>
                      </span>
                      <span className="ml-2 flex shrink-0 items-center gap-1.5">
                        <span className="font-mono text-[10px] font-medium tabular-nums text-ink-3">{count}</span>
                        <ChevronDown size={14} className={`transition-transform ${active ? 'rotate-180' : ''}`} />
                      </span>
                    </button>
                    {active && (
                      c === 'basicShapes' ? (
                        <div className="grid grid-cols-1 gap-1 py-1.5 pl-2">
                          {PRIMITIVES.map(({ kind, label, icon: Icon }) => (
                            <button
                              key={kind}
                              type="button"
                              onClick={() => addPrimitive(kind)}
                              className="group flex cursor-pointer items-center gap-2 rounded-xl px-2 py-1.5 text-left transition-colors duration-150 hover:bg-white active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                            >
                              <Icon size={15} strokeWidth={1.8} className="text-ink-3 group-hover:text-accent" />
                              <span className="text-[12px] font-medium text-ink group-hover:text-accent-strong">
                                {t(label)}
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-1 py-1.5 pl-2">
                          {categoryParts.map((p) => (
                            <button
                              key={p.id}
                              onClick={() => addPart(p)}
                              className="group cursor-pointer rounded-xl px-2 py-1.5 text-left transition-colors duration-150 hover:bg-white active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                            >
                              <p className="text-[12px] font-medium text-ink group-hover:text-accent-strong">
                                {i18n.language === 'zh' ? p.nameZh : p.name}
                              </p>
                              <p className="mt-0.5 font-mono text-[10px] tabular-nums text-ink-3">
                                {p.body.size[0]} × {p.body.size[1]} mm
                              </p>
                            </button>
                          ))}
                        </div>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
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
    <div className="absolute inset-x-0 bottom-0 z-50 animate-toast-in rounded-t-2xl border-t border-line bg-white/95 shadow-pop">
      <div className="mx-auto mt-2 h-1 w-9 rounded-full bg-slate-900/10" />
      {content}
    </div>
  );
}
