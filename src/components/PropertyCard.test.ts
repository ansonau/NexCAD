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

    replaceCarAnchorGeneratedNodes(doc, anchor.id, [newChassis, wheel]);

    expect(doc.nodes.map((node) => node.id)).toEqual([anchor.id, 'keep-me', 'new-chassis', 'new-wheel']);
    expect(anchor.generatedNodeIds).toEqual(['new-chassis', 'new-wheel']);
  });

  it('uses the latest anchor generated ids from the document', () => {
    const staleAnchor = createCarAnchorNode(DEFAULT_CAR_CONFIG, 'smart-car-2wd', [], {
      generatedNodeIds: ['first-chassis'],
    });
    const liveAnchor = { ...staleAnchor, generatedNodeIds: ['second-chassis'] };
    const firstChassis = createPrimitive('box', { id: 'first-chassis', name: 'first chassis' });
    const secondChassis = createPrimitive('box', { id: 'second-chassis', name: 'second chassis' });
    const newChassis = createPrimitive('box', { id: 'third-chassis', name: 'third chassis' });
    const doc = { ...emptyDocument(), nodes: [liveAnchor, firstChassis, secondChassis] };

    replaceCarAnchorGeneratedNodes(doc, staleAnchor.id, [newChassis]);

    expect(doc.nodes.map((node) => node.id)).toEqual([liveAnchor.id, 'first-chassis', 'third-chassis']);
    expect(liveAnchor.generatedNodeIds).toEqual(['third-chassis']);
  });
});
