import { describe, expect, it } from 'vitest';
import zh from './zh.json';
import en from './en.json';

function flattenKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) =>
    typeof value === 'object' && value !== null
      ? flattenKeys(value as Record<string, unknown>, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );
}

describe('i18n resources', () => {
  it('zh 與 en 的 key 集合完全一致', () => {
    expect(flattenKeys(zh).sort()).toEqual(flattenKeys(en).sort());
  });

  it('沒有空字串翻譯', () => {
    const check = (obj: Record<string, unknown>) => {
      for (const value of Object.values(obj)) {
        if (typeof value === 'object' && value !== null) check(value as Record<string, unknown>);
        else expect(String(value).length).toBeGreaterThan(0);
      }
    };
    check(zh);
    check(en);
  });
});
