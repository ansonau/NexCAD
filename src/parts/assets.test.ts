import { describe, expect, it } from 'vitest';
import { HIGH_RES_MODELS } from './highResModels';
import { PART_LIBRARY } from './library';

const sourceFiles = import.meta.glob('../../3d_models/source/**/*', {
  eager: true,
  import: 'default',
  query: '?url',
});

const publicFiles = import.meta.glob('../../public/parts/**/*', {
  eager: true,
  import: 'default',
  query: '?url',
});

const hasSource = (path: string) => path in sourceFiles;
const hasPublic = (path: string) => path in publicFiles;

describe('part visual assets', () => {
  it('每個零件都有可協作的 OpenSCAD source 和 README', () => {
    for (const part of PART_LIBRARY) {
      expect(hasSource(`../../3d_models/source/${part.id}/${part.id}.scad`), part.id).toBe(true);
      expect(hasSource(`../../3d_models/source/${part.id}/README.md`), part.id).toBe(true);
    }
  });

  it('high-res model URL 指向存在的 public STL', () => {
    for (const [partId, model] of Object.entries(HIGH_RES_MODELS)) {
      expect(hasPublic(`../../public${model.url}`), partId).toBe(true);
    }
  });
});
