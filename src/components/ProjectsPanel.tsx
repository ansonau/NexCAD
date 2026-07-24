import { useEffect, useRef, useState } from 'react';
import { FolderOpen, Plus, Trash2, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  deleteProject,
  listProjects,
  saveProject,
  type ProjectRecord,
} from '../persistence/db';
import { parseNexcadFile, serializeNexcadFile } from '../persistence/nexcadFile';
import { getPartDefinition } from '../parts/library';
import { useDocumentStore } from '../store/documentStore';
import { useProjectStore } from '../store/projectStore';
import { useToastStore } from '../store/toastStore';
import { emptyDocument, newId } from '../types/document';
import type { SceneNode } from '../types/document';
import { Dialog, GhostButton, IconButton, panelClass } from './ui';

function loadDocIntoStore(doc: ProjectRecord['doc'], id: string): void {
  useDocumentStore.setState({
    doc: structuredClone(doc),
    selection: [],
    past: [],
    future: [],
    dragBase: null,
  });
  useProjectStore.getState().setProjectId(id);
}

async function persistCurrent(): Promise<void> {
  const id = useProjectStore.getState().projectId;
  if (!id) return;
  const doc = useDocumentStore.getState().doc;
  await saveProject({ id, name: doc.name, updatedAt: Date.now(), doc });
}

export function ProjectsPanel() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const currentId = useProjectStore((s) => s.projectId);
  const docName = useDocumentStore((s) => s.doc.name);
  const mutate = useDocumentStore((s) => s.mutate);

  useEffect(() => {
    if (open) void listProjects().then(setProjects);
  }, [open]);

  const openProject = async (record: ProjectRecord) => {
    await persistCurrent();
    loadDocIntoStore(record.doc, record.id);
    setOpen(false);
  };

  const newProject = async () => {
    await persistCurrent();
    const id = newId();
    const doc = emptyDocument(t('projects.untitled'));
    loadDocIntoStore(doc, id);
    await saveProject({ id, name: doc.name, updatedAt: Date.now(), doc });
    setOpen(false);
  };

  const removeProject = async (record: ProjectRecord) => {
    if (!window.confirm(t('projects.deleteConfirm', { name: record.name }))) return;
    await deleteProject(record.id);
    if (record.id === currentId) {
      const id = newId();
      const doc = emptyDocument(t('projects.untitled'));
      loadDocIntoStore(doc, id);
      await saveProject({ id, name: doc.name, updatedAt: Date.now(), doc });
    }
    setProjects(await listProjects());
  };

  const exportFile = () => {
    const doc = useDocumentStore.getState().doc;
    const blob = new Blob([serializeNexcadFile(doc)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.name}.nexcad`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importFile = async (file: File) => {
    try {
      const doc = parseNexcadFile(await file.text());
      const missing = new Set<string>();
      const scan = (nodes: SceneNode[]) => {
        for (const n of nodes) {
          if (n.type === 'part' && !getPartDefinition(n.partId)) missing.add(n.partId);
          if (n.type === 'group') scan(n.children);
        }
      };
      scan(doc.nodes);
      if (missing.size > 0) {
        useToastStore.getState().show(t('projects.unknownParts', { ids: [...missing].join(', ') }));
      }
      await persistCurrent();
      const id = newId();
      loadDocIntoStore(doc, id);
      await saveProject({ id, name: doc.name, updatedAt: Date.now(), doc });
      setOpen(false);
    } catch {
      useToastStore.getState().show(t('projects.importFailed'));
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <div className={`flex p-0.5 ${panelClass}`}>
          <IconButton title={t('projects.title')} onClick={() => setOpen(true)}>
            <FolderOpen size={18} strokeWidth={1.8} />
          </IconButton>
        </div>
        <div className={`flex h-9 items-center px-2.5 ${panelClass}`}>
          <input
            value={docName}
            onChange={(e) => mutate('rename', (d) => void (d.name = e.target.value))}
            aria-label={t('projects.title')}
            className="w-40 bg-transparent text-[13px] font-medium text-ink outline-none placeholder:text-ink-3"
          />
        </div>
      </div>
      {open && (
        <Dialog title={t('projects.title')} onClose={() => setOpen(false)} width="w-96">
          <div className="mb-3 flex items-center gap-1.5">
            <IconButton title={t('projects.new')} onClick={() => void newProject()}>
              <Plus size={18} strokeWidth={1.8} />
            </IconButton>
            <IconButton title={t('projects.import')} onClick={() => fileRef.current?.click()}>
              <Upload size={18} strokeWidth={1.8} />
            </IconButton>
            <GhostButton onClick={exportFile} className="ml-auto h-8 px-2.5 text-[12px]">
              {t('projects.exportFile')}
            </GhostButton>
          </div>
          {projects.length === 0 && (
            <p className="py-8 text-center text-[13px] text-ink-3">{t('projects.empty')}</p>
          )}
          <div className="space-y-1">
            {projects.map((p) => (
              <div
                key={p.id}
                className={`group flex items-center justify-between rounded-xl border px-3 py-2 transition-colors duration-150 ${
                  p.id === currentId
                    ? 'border-accent-line bg-accent-soft'
                    : 'border-line hover:border-line-strong hover:bg-slate-900/[0.03]'
                }`}
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-ink">{p.name}</p>
                  <p className="mt-0.5 font-mono text-[11px] tabular-nums text-ink-3">
                    {new Date(p.updatedAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <GhostButton onClick={() => void openProject(p)} className="h-8 px-2.5 text-[12px]">
                    {t('projects.open')}
                  </GhostButton>
                  <button
                    onClick={() => void removeProject(p)}
                    aria-label={t('projects.delete')}
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-ink-3 transition-colors duration-150 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".nexcad,application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void importFile(file);
              e.target.value = '';
            }}
          />
        </Dialog>
      )}
    </>
  );
}
