import type { BracketStyle, MountingStyle } from '../types/document';

const bracket = { fill: '#e2e8f0', stroke: '#94a3b8', strokeWidth: 1.5 };
const part = { fill: '#bfdbfe', stroke: '#3b82f6', strokeWidth: 1.5 };
const metal = { fill: '#64748b', stroke: '#475569', strokeWidth: 1.5 };
const hole = { fill: '#ffffff', stroke: '#64748b', strokeWidth: 1.5 };

/** 三種支架樣式的示意圖（側視） */
export function BracketStyleDiagram({ style }: { style: BracketStyle }) {
  if (style === 'base') {
    return (
      <svg viewBox="0 0 64 40" className="h-11 w-full" aria-hidden>
        <rect x="18" y="11" width="28" height="8" rx="1.5" {...part} />
        <rect x="6" y="23" width="52" height="5" rx="1.5" {...bracket} />
        <rect x="12" y="28" width="4" height="8" rx="1" {...bracket} />
        <rect x="48" y="28" width="4" height="8" rx="1" {...bracket} />
      </svg>
    );
  }
  if (style === 'l') {
    return (
      <svg viewBox="0 0 64 40" className="h-11 w-full" aria-hidden>
        <path d="M10 6 h6 v26 h34 v5 H10 z" {...bracket} />
        <rect x="20" y="11" width="7" height="21" rx="1" {...part} />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 64 40" className="h-11 w-full" aria-hidden>
      <rect x="8" y="6" width="5" height="30" rx="1.5" {...bracket} />
      <rect x="51" y="6" width="5" height="30" rx="1.5" {...bracket} />
      <rect x="8" y="32" width="48" height="5" rx="1.5" {...bracket} />
      <rect x="24" y="13" width="16" height="19" rx="1" {...part} />
    </svg>
  );
}

/** 樣式選擇器：示意圖 + 標籤 */
export function BracketStyleSelector({
  value,
  onChange,
  labels,
}: {
  value: BracketStyle;
  onChange: (v: BracketStyle) => void;
  labels: Record<BracketStyle, string>;
}) {
  const styles: BracketStyle[] = ['base', 'l', 'u'];
  return (
    <div className="grid grid-cols-3 gap-2">
      {styles.map((s) => {
        const active = value === s;
        return (
          <button
            key={s}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(s)}
            className={`flex flex-col items-center gap-1 rounded-2xl border p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
              active ? 'border-accent bg-accent-soft shadow-sm' : 'border-line bg-white hover:border-accent/50'
            }`}
          >
            <BracketStyleDiagram style={s} />
            <span className={`text-[12px] font-semibold ${active ? 'text-accent' : 'text-ink-2'}`}>{labels[s]}</span>
          </button>
        );
      })}
    </div>
  );
}

/** 零件固定方式示意圖（側視剖面） */
export function MountingStyleDiagram({ style }: { style: MountingStyle }) {
  if (style === 'screw') {
    return (
      <svg viewBox="0 0 32 40" className="h-11 w-full" aria-hidden>
        <rect x="8" y="13" width="16" height="19" rx="2" {...bracket} />
        <rect x="14" y="7" width="4" height="26" {...metal} />
        <rect x="8" y="8" width="6" height="5" rx="1" {...part} />
        <rect x="18" y="8" width="6" height="5" rx="1" {...part} />
        <rect x="11" y="3" width="10" height="4" rx="1" {...metal} />
      </svg>
    );
  }
  if (style === 'peg') {
    return (
      <svg viewBox="0 0 32 40" className="h-11 w-full" aria-hidden>
        <rect x="8" y="14" width="16" height="18" rx="2" {...bracket} />
        <rect x="13" y="6" width="6" height="10" {...metal} />
        <rect x="8" y="8" width="6" height="5" rx="1" {...part} />
        <rect x="18" y="8" width="6" height="5" rx="1" {...part} />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 32 40" className="h-11 w-full" aria-hidden>
      <rect x="8" y="8" width="6" height="5" rx="1" {...part} />
      <rect x="18" y="8" width="6" height="5" rx="1" {...part} />
      <rect x="8" y="14" width="6" height="8" rx="1" {...bracket} />
      <rect x="18" y="14" width="6" height="8" rx="1" {...bracket} />
      <rect x="14" y="14" width="4" height="14" {...metal} />
      <rect x="11" y="28" width="10" height="4" rx="1" {...metal} />
    </svg>
  );
}

/** 零件固定方式選擇器 */
export function MountingStyleSelector({
  value,
  onChange,
  labels,
}: {
  value: MountingStyle;
  onChange: (v: MountingStyle) => void;
  labels: Record<MountingStyle, string>;
}) {
  const styles: MountingStyle[] = ['screw', 'peg', 'hole'];
  return (
    <div className="grid grid-cols-3 gap-2">
      {styles.map((s) => {
        const active = value === s;
        return (
          <button
            key={s}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(s)}
            className={`flex flex-col items-center gap-1 rounded-2xl border p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
              active ? 'border-accent bg-accent-soft shadow-sm' : 'border-line bg-white hover:border-accent/50'
            }`}
          >
            <MountingStyleDiagram style={s} />
            <span className={`text-[12px] font-semibold ${active ? 'text-accent' : 'text-ink-2'}`}>{labels[s]}</span>
          </button>
        );
      })}
    </div>
  );
}

/** 鎖附孔數量示意圖（俯視） */
export function HoleCountDiagram({ count }: { count: 2 | 4 }) {
  return (
    <svg viewBox="0 0 40 40" className="h-10 w-full" aria-hidden>
      <rect x="3" y="3" width="34" height="34" rx="5" {...bracket} />
      {count === 2 ? (
        <>
          <circle cx="11" cy="20" r="3" {...hole} />
          <circle cx="29" cy="20" r="3" {...hole} />
        </>
      ) : (
        <>
          <circle cx="12" cy="12" r="3" {...hole} />
          <circle cx="28" cy="12" r="3" {...hole} />
          <circle cx="12" cy="28" r="3" {...hole} />
          <circle cx="28" cy="28" r="3" {...hole} />
        </>
      )}
    </svg>
  );
}

/** 鎖附孔數量選擇器 */
export function HoleCountSelector({
  value,
  onChange,
  labels,
}: {
  value: 2 | 4;
  onChange: (v: 2 | 4) => void;
  labels: Record<2 | 4, string>;
}) {
  const counts: (2 | 4)[] = [2, 4];
  return (
    <div className="grid grid-cols-2 gap-2">
      {counts.map((c) => {
        const active = value === c;
        return (
          <button
            key={c}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(c)}
            className={`flex flex-col items-center gap-1 rounded-2xl border p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
              active ? 'border-accent bg-accent-soft shadow-sm' : 'border-line bg-white hover:border-accent/50'
            }`}
          >
            <HoleCountDiagram count={c} />
            <span className={`text-[12px] font-semibold ${active ? 'text-accent' : 'text-ink-2'}`}>{labels[c]}</span>
          </button>
        );
      })}
    </div>
  );
}
