import { useToastStore } from '../store/toastStore';

export function ToastStack() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  if (toasts.length === 0) return null;
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="absolute bottom-20 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2"
    >
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => dismiss(t.id)}
          className="rounded-xl border border-amber-200 bg-amber-50/95 px-4 py-2 text-sm text-amber-800 shadow-lg backdrop-blur"
        >
          {t.message}
        </button>
      ))}
    </div>
  );
}
