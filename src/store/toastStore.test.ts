import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useToastStore } from './toastStore';

beforeEach(() => {
  vi.useFakeTimers();
  useToastStore.setState({ toasts: [] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('toastStore', () => {
  it('show 加入訊息', () => {
    useToastStore.getState().show('測試訊息');
    expect(useToastStore.getState().toasts).toHaveLength(1);
    expect(useToastStore.getState().toasts[0].message).toBe('測試訊息');
  });

  it('5 秒後自動消失', () => {
    useToastStore.getState().show('a');
    vi.advanceTimersByTime(5001);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('dismiss 立即移除指定 toast', () => {
    useToastStore.getState().show('a');
    useToastStore.getState().show('b');
    const first = useToastStore.getState().toasts[0];
    useToastStore.getState().dismiss(first.id);
    expect(useToastStore.getState().toasts.map((t) => t.message)).toEqual(['b']);
  });
});
