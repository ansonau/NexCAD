import { useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Grid, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { getGeometryClient } from '../geometry/client';
import type { NodeMeshPayload } from '../geometry/protocol';
import i18n from '../i18n';
import { findNode, useDocumentStore } from '../store/documentStore';
import { useToastStore } from '../store/toastStore';
import { SelectionGizmo } from './SelectionGizmo';

export function Viewport() {
  const doc = useDocumentStore((s) => s.doc);
  const selection = useDocumentStore((s) => s.selection);
  const setSelection = useDocumentStore((s) => s.setSelection);
  const [meshes, setMeshes] = useState<NodeMeshPayload[]>([]);

  useEffect(() => {
    const client = getGeometryClient();
    client.onMeshes = setMeshes;
    client.onError = (message) => {
      console.warn('geometry error:', message);
      useToastStore.getState().show(`${i18n.t('errors.geometry')}（${message}）`);
    };
  }, []);

  useEffect(() => {
    getGeometryClient().requestEvaluate(doc.nodes);
  }, [doc]);

  return (
    <Canvas
      className="touch-none"
      camera={{ position: [120, 100, 120], fov: 45, near: 0.1, far: 5000 }}
      onPointerMissed={() => setSelection([])}
    >
      <color attach="background" args={['#f7f8fa']} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[100, 200, 150]} intensity={1.2} />
      <Grid
        args={[500, 500]}
        cellSize={10}
        sectionSize={50}
        cellColor="#dde1e7"
        sectionColor="#c3c9d4"
        fadeDistance={600}
      />
      <group rotation={[-Math.PI / 2, 0, 0]}>
        {meshes.map((m) => (
          <SceneMesh
            key={m.nodeId}
            payload={m}
            selected={selection.includes(m.nodeId)}
            isPart={findNode(doc.nodes, m.nodeId)?.type === 'part'}
            onSelect={(shiftKey) => {
              if (shiftKey) {
                const current = useDocumentStore.getState().selection;
                setSelection(
                  current.includes(m.nodeId)
                    ? current.filter((id) => id !== m.nodeId)
                    : [...current, m.nodeId],
                );
              } else {
                setSelection([m.nodeId]);
              }
            }}
          />
        ))}
        <SelectionGizmo />
      </group>
      <OrbitControls
        makeDefault
        touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
      />
    </Canvas>
  );
}

function SceneMesh({
  payload,
  selected,
  isPart,
  onSelect,
}: {
  payload: NodeMeshPayload;
  selected: boolean;
  isPart: boolean;
  onSelect: (shiftKey: boolean) => void;
}) {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(payload.positions, 3));
    g.setIndex(new THREE.BufferAttribute(payload.indices, 1));
    g.computeVertexNormals();
    return g;
  }, [payload]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  const isHole = payload.role === 'hole';
  return (
    <mesh
      geometry={geometry}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(e.shiftKey);
      }}
    >
      <meshStandardMaterial
        color={isHole ? '#ef4444' : selected ? '#3b82f6' : isPart ? '#2e7d5b' : '#9db4d0'}
        transparent={isHole}
        opacity={isHole ? 0.45 : 1}
        roughness={0.6}
        metalness={0.05}
      />
    </mesh>
  );
}
