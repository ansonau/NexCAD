import { useState } from 'react';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PART_CATEGORIES, PART_LIBRARY } from '../parts/library';
import type { PartCategory, PartDefinition } from '../parts/schema';
import { useDocumentStore } from '../store/documentStore';
import { createPartNode } from '../types/document';

export function PartsDrawer() {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<PartCategory>('board');
  const [query, setQuery] = useState('');
  const addNode = useDocumentStore((s) => s.addNode);

  const q = query.trim().toLowerCase();
  const parts = PART_LIBRARY.filter((p) =>
    q ? `${p.name} ${p.nameZh}`.toLowerCase().includes(q) : p.category === category,
  );

  const addPart = (part: PartDefinition) => {
    addNode(createPartNode(part.id, i18n.language === 'zh' ? part.nameZh : part.name));
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="absolute bottom-4 left-1/2 flex h-11 -translate-x-1/2 items-center gap-2 rounded-2xl border border-slate-200 bg-white/90 px-4 text-sm font-medium text-slate-700 shadow-lg backdrop-blur hover:bg-slate-100"
      >
        <ChevronUp size={16} />
        {t('drawer.title')}
      </button>
    );
  }

  return (
    <div className="absolute inset-x-0 bottom-0 z-40 rounded-t-2xl border-t border-slate-200 bg-white/95 shadow-2xl backdrop-blur">
      <div className="flex items-center gap-2 overflow-x-auto px-4 pt-3">
        {PART_CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => {
              setCategory(c);
              setQuery('');
            }}
            aria-pressed={category === c && q === ''}
            className={`h-11 shrink-0 rounded-lg px-3 text-sm ${
              category === c && q === ''
                ? 'bg-slate-800 font-medium text-white'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {t(`drawer.${c}`)}
          </button>
        ))}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 px-2">
            <Search size={14} className="text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('drawer.search')}
              className="h-11 w-32 bg-transparent text-sm text-slate-700 outline-none"
            />
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label={t('drawer.close')}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
          >
            <ChevronDown size={18} />
          </button>
        </div>
      </div>
      <div className="grid max-h-56 grid-cols-2 gap-2 overflow-y-auto p-4 sm:grid-cols-3 md:grid-cols-4">
        {parts.map((p) => (
          <button
            key={p.id}
            onClick={() => addPart(p)}
            className="rounded-xl border border-slate-200 bg-white p-3 text-left hover:border-slate-300 hover:bg-slate-50 active:scale-95"
          >
            <p className="text-sm font-medium text-slate-800">
              {i18n.language === 'zh' ? p.nameZh : p.name}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {p.body.size[0]} × {p.body.size[1]} mm
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
