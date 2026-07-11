import { useEffect, useRef } from 'react';
import { TransformControls } from '@react-three/drei';
import * as THREE from 'three';
import { collectHoleWorldPositions, snapToHoles } from '../geometry/holeSnap';
import { findNode, useDocumentStore } from '../store/documentStore';
import type { Vec3 } from '../types/document';

const snap = (v: number) => Math.round(v);

export function SelectionGizmo() {
  const selection = useDocumentStore((s) => s.selection);
  const doc = useDocumentStore((s) => s.doc);
  const beginDrag = useDocumentStore((s) => s.beginDrag);
  const updateTransient = useDocumentStore((s) => s.updateTransient);
  const proxyRef = useRef<THREE.Object3D>(null!);
  const holesRef = useRef<Vec3[]>([]);

  const selected = selection.length === 1 ? findNode(doc.nodes, selection[0]) : undefined;

  useEffect(() => {
    if (selected && proxyRef.current) {
      proxyRef.current.position.set(...selected.transform.position);
    }
  }, [selected]);

  if (!selected || selected.locked) return null;

  const commitPosition = () => {
    const p = proxyRef.current.position;
    const snapped = snapToHoles([snap(p.x), snap(p.y), snap(p.z)], holesRef.current);
    updateTransient(selected.id, (n) => {
      n.transform.position = snapped;
    });
  };

  return (
    <>
      <object3D ref={proxyRef} />
      <TransformControls
        object={proxyRef}
        mode="translate"
        translationSnap={1}
        size={0.8}
        onMouseDown={() => {
          holesRef.current = collectHoleWorldPositions(
            useDocumentStore.getState().doc.nodes,
            selected.id,
          );
          beginDrag();
        }}
        onObjectChange={commitPosition}
      />
    </>
  );
}
