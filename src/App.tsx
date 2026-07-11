import { LanguageToggle } from './components/LanguageToggle';
import { PropertyCard } from './components/PropertyCard';
import { ToastStack } from './components/ToastStack';
import { Toolbar } from './components/Toolbar';
import { Viewport } from './components/Viewport';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

export default function App() {
  useKeyboardShortcuts();
  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-50">
      <Viewport />
      <Toolbar />
      <PropertyCard />
      <ToastStack />
      <div className="absolute right-4 top-4">
        <LanguageToggle />
      </div>
      <div className="absolute bottom-4 left-4 rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-sm font-medium text-slate-700 shadow-lg backdrop-blur">
        NexCAD
      </div>
    </div>
  );
}
