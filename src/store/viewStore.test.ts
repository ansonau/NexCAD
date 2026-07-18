import { beforeEach, describe, expect, it } from 'vitest';
import { useViewStore } from './viewStore';

beforeEach(() => {
  useViewStore.setState({ shellXray: false, wireframe: false });
});

describe('viewStore', () => {
  it('初始狀態皆為 false', () => {
    expect(useViewStore.getState().shellXray).toBe(false);
    expect(useViewStore.getState().wireframe).toBe(false);
  });

  it('toggleShellXray 每次呼叫翻轉布林值', () => {
    useViewStore.getState().toggleShellXray();
    expect(useViewStore.getState().shellXray).toBe(true);
    useViewStore.getState().toggleShellXray();
    expect(useViewStore.getState().shellXray).toBe(false);
  });

  it('toggleWireframe 每次呼叫翻轉布林值', () => {
    useViewStore.getState().toggleWireframe();
    expect(useViewStore.getState().wireframe).toBe(true);
    useViewStore.getState().toggleWireframe();
    expect(useViewStore.getState().wireframe).toBe(false);
  });

  it('兩個 toggle 互不影響', () => {
    useViewStore.getState().toggleShellXray();
    expect(useViewStore.getState().shellXray).toBe(true);
    expect(useViewStore.getState().wireframe).toBe(false);

    useViewStore.getState().toggleWireframe();
    expect(useViewStore.getState().shellXray).toBe(true);
    expect(useViewStore.getState().wireframe).toBe(true);
  });
});
