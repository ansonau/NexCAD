import { describe, expect, it } from 'vitest';
import { DEFAULT_CAR_CONFIG } from '../parts/presets';
import { createCarAnchorNode, createPrimitive, emptyDocument } from '../types/document';
import { replaceCarAnchorGeneratedNodes } from './PropertyCard';

describe('replaceCarAnchorGeneratedNodes', () => {
  it('replaces stale generated nodes and records the new ids', () => {
    const anchor = createCarAnchorNode(DEFAULT_CAR_CONFIG, 'smart-car-2wd', [], {
      generatedNodeIds: ['old-chassis'],
    });
    const oldChassis = createPrimitive('box', { id: 'old-chassis', name: 'old chassis' });
    const unrelated = createPrimitive('box', { id: 'keep-me', name: 'keep me' });
    const newChassis = createPrimitive('box', { id: 'new-chassis', name: 'new chassis' });
    const wheel = createPrimitive('cylinder', { id: 'new-wheel', name: 'new wheel' });
    const doc = { ...emptyDocument(), nodes: [anchor, oldChassis, unrelated] };

    replaceCarAnchorGeneratedNodes(doc, anchor.id, anchor.generatedNodeIds, [newChassis, wheel]);

    expect(doc.nodes.map((node) => node.id)).toEqual([anchor.id, 'keep-me', 'new-chassis', 'new-wheel']);
    expect(anchor.generatedNodeIds).toEqual(['new-chassis', 'new-wheel']);
  });
});
