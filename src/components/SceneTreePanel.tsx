import { useState } from 'react';
import { ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDocumentStore } from '../store/documentStore';
import type { SceneNode } from '../types/document';

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

  return (
    <div>
      <div
        onClick={handleClick}
        role="button"
        style={{ paddingLeft: 8 + depth * 16 }}
        className={`flex items-center gap-2 rounded-lg py-1.5 pr-2 text-sm ${
          selected ? 'bg-blue-50 text-blue-900' : 'text-slate-700 hover:bg-slate-50'
        } ${node.visible === false ? 'opacity-50' : ''}`}
      >
        <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-slate-500">
          {typeLabel(node)}
        </span>
        <span className="truncate">{node.name}</span>
        <button
          onClick={toggleVisible}
          aria-label="toggle-visibility"
          className="ml-auto shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          {node.visible === false ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
      {children.map((child) => (
        <SceneTreeRow key={child.id} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

export function SceneTreePanel() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const nodes = useDocumentStore((s) => s.doc.nodes);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white/90 px-4 text-sm font-medium text-slate-700 shadow-lg backdrop-blur hover:bg-slate-100"
      >
        <ChevronDown size={16} />
        {t('view.sceneTree')}
      </button>
    );
  }

  return (
    <div className="flex max-h-[70vh] w-64 flex-col rounded-2xl border border-slate-200 bg-white/95 shadow-2xl backdrop-blur">
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
        <span className="text-sm font-medium text-slate-700">{t('view.sceneTree')}</span>
        <button
          onClick={() => setOpen(false)}
          aria-label={t('view.sceneTree')}
          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <ChevronUp size={16} />
        </button>
      </div>
      <div className="overflow-y-auto p-2">
        {nodes.length === 0 ? (
          <p className="px-2 py-1 text-sm text-slate-400">—</p>
        ) : (
          nodes.map((n) => <SceneTreeRow key={n.id} node={n} depth={0} />)
        )}
      </div>
    </div>
  );
}
