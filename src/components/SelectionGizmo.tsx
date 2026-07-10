import { useEffect, useRef } from 'react';
import { TransformControls } from '@react-three/drei';
import * as THREE from 'three';
import { findNode, useDocumentStore } from '../store/documentStore';

const snap = (v: number) => Math.round(v);

export function SelectionGizmo() {
  const selection = useDocumentStore((s) => s.selection);
  const doc = useDocumentStore((s) => s.doc);
  const beginDrag = useDocumentStore((s) => s.beginDrag);
  const updateTransient = useDocumentStore((s) => s.updateTransient);
  const proxyRef = useRef<THREE.Object3D>(null!);

  const selected = selection.length === 1 ? findNode(doc.nodes, selection[0]) : undefined;

  useEffect(() => {
    if (selected && proxyRef.current) {
      proxyRef.current.position.set(...selected.transform.position);
    }
  }, [selected]);

  if (!selected || selected.locked) return null;

  const commitPosition = () => {
    const p = proxyRef.current.position;
    updateTransient(selected.id, (n) => {
      n.transform.position = [snap(p.x), snap(p.y), snap(p.z)];
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
        onMouseDown={() => beginDrag()}
        onObjectChange={commitPosition}
      />
    </>
  );
}
