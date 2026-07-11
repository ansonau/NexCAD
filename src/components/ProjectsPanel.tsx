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
import { useDocumentStore } from '../store/documentStore';
import { useProjectStore } from '../store/projectStore';
import { useToastStore } from '../store/toastStore';
import { emptyDocument, newId } from '../types/document';

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
      <div className="absolute left-4 top-4 flex items-center gap-2">
        <button
          onClick={() => setOpen(true)}
          aria-label={t('projects.title')}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white/90 text-slate-600 shadow-lg backdrop-blur hover:bg-slate-100"
        >
          <FolderOpen size={20} />
        </button>
        <input
          value={docName}
          onChange={(e) => mutate('rename', (d) => void (d.name = e.target.value))}
          aria-label={t('projects.title')}
          className="h-11 w-44 rounded-xl border border-slate-200 bg-white/90 px-3 text-sm font-medium text-slate-700 shadow-lg backdrop-blur"
        />
      </div>
      {open && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/30"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[70vh] w-96 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium text-slate-800">{t('projects.title')}</p>
              <div className="flex gap-1">
                <button
                  onClick={() => void newProject()}
                  title={t('projects.new')}
                  aria-label={t('projects.new')}
                  className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
                >
                  <Plus size={18} />
                </button>
                <button
                  onClick={() => fileRef.current?.click()}
                  title={t('projects.import')}
                  aria-label={t('projects.import')}
                  className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
                >
                  <Upload size={18} />
                </button>
                <button
                  onClick={exportFile}
                  className="h-11 rounded-lg px-2 text-sm text-slate-600 hover:bg-slate-100"
                >
                  {t('projects.exportFile')}
                </button>
              </div>
            </div>
            {projects.length === 0 && (
              <p className="py-6 text-center text-sm text-slate-400">{t('projects.empty')}</p>
            )}
            {projects.map((p) => (
              <div
                key={p.id}
                className={`mb-1 flex items-center justify-between rounded-xl border px-3 py-2 ${
                  p.id === currentId ? 'border-blue-200 bg-blue-50' : 'border-slate-100'
                }`}
              >
                <div>
                  <p className="text-sm text-slate-800">{p.name}</p>
                  <p className="text-xs text-slate-400">
                    {new Date(p.updatedAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => void openProject(p)}
                    className="h-11 rounded-lg px-2 text-sm text-slate-600 hover:bg-slate-100"
                  >
                    {t('projects.open')}
                  </button>
                  <button
                    onClick={() => void removeProject(p)}
                    aria-label={t('projects.delete')}
                    className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
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
          </div>
        </div>
      )}
    </>
  );
}
