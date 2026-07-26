import { TriangleAlert } from 'lucide-react';
import { useToastStore } from '../store/toastStore';

export function ToastStack() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  if (toasts.length === 0) return null;
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="absolute bottom-16 left-1/2 z-[60] flex -translate-x-1/2 flex-col items-center gap-2"
    >
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => dismiss(t.id)}
          className="flex max-w-[min(480px,80vw)] animate-toast-in cursor-pointer items-start gap-2 rounded-xl border border-amber-200/70 bg-amber-50/95 px-3.5 py-2 text-left text-[13px] leading-snug text-amber-900 shadow-pop transition-colors duration-150 hover:bg-amber-100/95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          <TriangleAlert size={15} className="mt-px shrink-0 text-amber-600" />
          {t.message}
        </button>
      ))}
    </div>
  );
}
