import { useState } from 'react';
import { ChevronUp, Eye, EyeOff, Group, ListTree, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDocumentStore } from '../store/documentStore';
import type { SceneNode } from '../types/document';
import { IconButton, panelClass } from './ui';

function typeLabel(node: SceneNode): string {
  switch (node.type) {
    case 'primitive':
      return node.kind;
    case 'part':
      return 'part';
    case 'group':
      return 'group';
    case 'enclosure':
      return `enclosure/${node.part}`;
    case 'car-anchor':
      return 'anchor';
    default:
      return '';
  }
}

function SceneTreeRow({ node, depth }: { node: SceneNode; depth: number }) {
  const selection = useDocumentStore((s) => s.selection);
  const selected = selection.includes(node.id);
  const children = node.type === 'group' ? node.children : [];

  const handleClick = (e: React.MouseEvent) => {
    if (e.shiftKey) {
      const current = useDocumentStore.getState().selection;
      useDocumentStore
        .getState()
        .setSelection(
          current.includes(node.id)
            ? current.filter((id) => id !== node.id)
            : [...current, node.id],
        );
    } else {
      useDocumentStore.getState().setSelection([node.id]);
    }
  };

  const toggleVisible = (e: React.MouseEvent) => {
    e.stopPropagation();
    useDocumentStore.getState().updateNode(node.id, (n) => {
      n.visible = !n.visible;
    });
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    const store = useDocumentStore.getState();
    store.setSelection([node.id]);
    store.removeSelected();
  };

  return (
    <div>
      <div
        className={`group flex items-center gap-2 rounded-lg pr-1.5 text-[13px] transition-colors duration-100 ${
          selected
            ? 'bg-accent-soft font-medium text-accent shadow-[inset_2px_0_0_0_var(--color-accent)]'
            : 'text-ink-2 hover:bg-slate-900/[0.04] hover:text-ink'
        } ${node.visible === false ? 'opacity-45' : ''}`}
      >
        <button
          type="button"
          onClick={handleClick}
          aria-label={`${node.name}, ${typeLabel(node)}`}
          style={{ paddingLeft: 8 + depth * 14 }}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 py-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          <span
            className={`shrink-0 rounded px-1 py-px font-mono text-[9px] font-medium uppercase tracking-wide ${
              selected ? 'bg-accent/10 text-accent' : 'bg-slate-900/[0.06] text-ink-3'
            }`}
          >
            {typeLabel(node)}
          </span>
          <span className="truncate">{node.name}</span>
        </button>
        <button
          type="button"
          onClick={toggleVisible}
          aria-label={node.visible === false ? `Show ${node.name}` : `Hide ${node.name}`}
          className="ml-auto flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-ink-3 transition-colors duration-100 hover:bg-slate-900/[0.06] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          {node.visible === false ? <EyeOff size={13} /> : <Eye size={13} />}
        </button>
        <button
          type="button"
          onClick={handleDelete}
          aria-label={`Delete ${node.name}`}
          className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-ink-3 transition-colors duration-100 hover:bg-red-500/10 hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40"
        >
          <Trash2 size={13} />
        </button>
      </div>
      {children.map((child) => (
        <SceneTreeRow key={child.id} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

export function SceneTreePanel({ docked = false, onAddPart }: { docked?: boolean; onAddPart?: () => void }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const nodes = useDocumentStore((s) => s.doc.nodes);
  const selection = useDocumentStore((s) => s.selection);
  const canGroup = selection.length >= 2;

  if (!docked && !open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={`flex h-9 cursor-pointer items-center gap-2 px-3 text-[13px] font-medium text-ink-2 transition-colors duration-150 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${panelClass}`}
      >
        <ListTree size={16} strokeWidth={1.8} />
        {t('view.sceneTree')}
      </button>
    );
  }

  return (
    <div className={docked ? 'flex h-full min-h-0 w-full flex-col' : `flex max-h-[60vh] w-60 animate-pop-in flex-col ${panelClass}`}>
      <div className="flex items-center justify-between gap-2 border-b border-line py-1.5 pl-3 pr-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
          {t('view.sceneTree')}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            title={t('view.group')}
            aria-label={t('view.group')}
            disabled={!canGroup}
            onClick={() => useDocumentStore.getState().groupSelected(t('view.group'))}
            className="flex h-7 cursor-pointer items-center gap-1 rounded-lg px-2 text-[11px] font-semibold text-ink-2 transition-colors hover:bg-slate-900/[0.05] hover:text-ink disabled:pointer-events-none disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            <Group size={13} strokeWidth={1.8} />
            {t('view.group')}
          </button>
          {!docked && (
            <IconButton title={t('view.sceneTree')} onClick={() => setOpen(false)} className="h-7 w-7">
              <ChevronUp size={15} />
            </IconButton>
          )}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
        {nodes.length === 0 ? (
          <div className="px-2 py-5 text-center">
            <p className="text-[12px] font-semibold text-ink-2">{t('view.sceneTreeEmpty')}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-3">{t('view.sidebarObjectsHint')}</p>
            {onAddPart && (
              <button
                type="button"
                onClick={onAddPart}
                className="mt-3 inline-flex h-8 cursor-pointer items-center justify-center rounded-lg bg-accent px-3 text-[12px] font-semibold text-white transition-colors hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                {t('view.addPart')}
              </button>
            )}
          </div>
        ) : (
          nodes.map((n) => <SceneTreeRow key={n.id} node={n} depth={0} />)
        )}
      </div>
    </div>
  );
}
