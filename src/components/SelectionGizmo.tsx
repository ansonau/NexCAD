import { useEffect, useRef } from 'react';
import { TransformControls } from '@react-three/drei';
import { createPortal, useThree } from '@react-three/fiber';
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
  const scene = useThree((s) => s.scene);

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

  // TransformControls 疊加把手位置的視覺元件在建立時會把「世界座標」直接寫入自身區域的
  // local position；proxy 位在有旋轉的 CAD→three.js 座標群組內，若 TransformControls 也
  // 巢狀在同一個群組裡，該旋轉會被套用兩次，導致把手畫面位置與物體實際位置對不上。
  // 用 portal 把 TransformControls 傳送到場景根層級（無旋轉）即可讓視覺位置正確，
  // 同時 `object` 仍指向巢狀在旋轉群組內的 proxy，拖曳運算的父層旋轉修正不受影響。
  return (
    <>
      <object3D ref={proxyRef} />
      {createPortal(
        <TransformControls
          object={proxyRef}
          mode="translate"
          space="local"
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
        />,
        scene,
      )}
    </>
  );
}
