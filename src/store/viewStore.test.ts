import { beforeEach, describe, expect, it } from 'vitest';
import { useViewStore } from './viewStore';

beforeEach(() => {
  useViewStore.setState({ shellXray: false, wireframe: false, highResModels: false, dimensionMode: 'off', gizmoMode: 'translate' });
});

describe('viewStore', () => {
  it('初始狀態皆為 false', () => {
    expect(useViewStore.getState().shellXray).toBe(false);
    expect(useViewStore.getState().wireframe).toBe(false);
    expect(useViewStore.getState().dimensionMode).toBe('off');
    expect(useViewStore.getState().gizmoMode).toBe('translate');
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

  it('toggleHighResModels 每次呼叫翻轉布林值', () => {
    useViewStore.getState().toggleHighResModels();
    expect(useViewStore.getState().highResModels).toBe(true);
    useViewStore.getState().toggleHighResModels();
    expect(useViewStore.getState().highResModels).toBe(false);
  });

  it('setDimensionMode 切換尺寸顯示模式', () => {
    useViewStore.getState().setDimensionMode('enclosure');
    expect(useViewStore.getState().dimensionMode).toBe('enclosure');
    useViewStore.getState().setDimensionMode('parts');
    expect(useViewStore.getState().dimensionMode).toBe('parts');
    useViewStore.getState().setDimensionMode('holes');
    expect(useViewStore.getState().dimensionMode).toBe('holes');
    useViewStore.getState().setDimensionMode('holeLabels');
    expect(useViewStore.getState().dimensionMode).toBe('holeLabels');
    useViewStore.getState().setDimensionMode('off');
    expect(useViewStore.getState().dimensionMode).toBe('off');
  });

  it('兩個 toggle 互不影響', () => {
    useViewStore.getState().toggleShellXray();
    expect(useViewStore.getState().shellXray).toBe(true);
    expect(useViewStore.getState().wireframe).toBe(false);

    useViewStore.getState().toggleWireframe();
    expect(useViewStore.getState().shellXray).toBe(true);
    expect(useViewStore.getState().wireframe).toBe(true);
  });

  it('setGizmoMode 切換 move/rotate 模式', () => {
    useViewStore.getState().setGizmoMode('rotate');
    expect(useViewStore.getState().gizmoMode).toBe('rotate');
    useViewStore.getState().setGizmoMode('translate');
    expect(useViewStore.getState().gizmoMode).toBe('translate');
  });
});
