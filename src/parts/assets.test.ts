import { describe, expect, it } from 'vitest';
import { HIGH_RES_MODELS } from './highResModels';
import { PART_LIBRARY } from './library';

const assetFiles = import.meta.glob('../../public/parts/**/*', {
  eager: true,
  import: 'default',
  query: '?url',
});

const hasAsset = (path: string) => path in assetFiles;

describe('part visual assets', () => {
  it('每個零件都有可協作的 OpenSCAD source 和 README', () => {
    for (const part of PART_LIBRARY) {
      expect(hasAsset(`../../public/parts/${part.id}/${part.id}.scad`), part.id).toBe(true);
      expect(hasAsset(`../../public/parts/${part.id}/README.md`), part.id).toBe(true);
    }
  });

  it('high-res model URL 指向存在的 public STL', () => {
    for (const [partId, model] of Object.entries(HIGH_RES_MODELS)) {
      expect(hasAsset(`../../public${model.url}`), partId).toBe(true);
    }
  });
});
