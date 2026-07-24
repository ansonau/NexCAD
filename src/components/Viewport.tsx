import { useEffect, useMemo, useState } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { Edges, Grid, GizmoHelper, GizmoViewcube, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { getGeometryClient } from '../geometry/client';
import type { NodeMeshPayload } from '../geometry/protocol';
import i18n from '../i18n';
import { HIGH_RES_MODELS } from '../parts/highResModels';
import { findNode, useDocumentStore } from '../store/documentStore';
import type { CarAnchorNode, PartNode } from '../types/document';
import { useToastStore } from '../store/toastStore';
import { useViewStore } from '../store/viewStore';
import { SelectionGizmo } from './SelectionGizmo';

export function Viewport() {
  const doc = useDocumentStore((s) => s.doc);
  const selection = useDocumentStore((s) => s.selection);
  const setSelection = useDocumentStore((s) => s.setSelection);
  const shellXray = useViewStore((s) => s.shellXray);
  const wireframe = useViewStore((s) => s.wireframe);
  const highResModels = useViewStore((s) => s.highResModels);
  const [meshes, setMeshes] = useState<NodeMeshPayload[]>([]);
  const carAnchors = doc.nodes.filter((n): n is CarAnchorNode => n.type === 'car-anchor' && n.visible);

  // 高清模型只換視覺：外殼規劃/碰撞/匯出仍全部走 worker 算出的程序化幾何
  // （meshes 不變）；這裡只是決定「畫面上」用哪個 nodeId 的哪組 mesh。
  const highResNodeIds = useMemo(() => {
    if (!highResModels) return new Map<string, typeof HIGH_RES_MODELS[string]>();
    const map = new Map<string, typeof HIGH_RES_MODELS[string]>();
    const seen = new Set<string>();
    for (const m of meshes) {
      if (seen.has(m.nodeId)) continue;
      seen.add(m.nodeId);
      const node = findNode(doc.nodes, m.nodeId);
      if (node?.type === 'part') {
        const model = HIGH_RES_MODELS[(node as PartNode).partId];
        if (model) map.set(m.nodeId, model);
      }
    }
    return map;
  }, [meshes, doc, highResModels]);

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
      camera={{ position: [115, 115, 115], fov: 45, near: 0.1, far: 5000 }}
      onPointerMissed={() => setSelection([])}
    >
      <color attach="background" args={['#eceff4']} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[100, 200, 150]} intensity={1.2} />
      <Grid
        args={[500, 500]}
        cellSize={10}
        sectionSize={50}
        cellColor="#d8dde5"
        sectionColor="#bcc5d2"
        fadeDistance={600}
      />
      <group rotation={[-Math.PI / 2, 0, 0]}>
        {meshes
          .filter((m) => !highResNodeIds.has(m.nodeId))
          .map((m, i) => (
            <SceneMesh
              key={`${m.nodeId}:${i}`}
              payload={m}
              selected={selection.includes(m.nodeId)}
              isPart={findNode(doc.nodes, m.nodeId)?.type === 'part'}
              xray={findNode(doc.nodes, m.nodeId)?.type === 'enclosure' && shellXray}
              wireframe={wireframe}
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
        {[...highResNodeIds.entries()].map(([nodeId, model]) => {
          const node = findNode(doc.nodes, nodeId) as PartNode | undefined;
          if (!node) return null;
          return (
            <HighResPartMesh
              key={nodeId}
              url={model.url}
              originOffset={model.originOffset}
              transform={node.transform}
              selected={selection.includes(nodeId)}
              wireframe={wireframe}
              onSelect={(shiftKey) => {
                if (shiftKey) {
                  const current = useDocumentStore.getState().selection;
                  setSelection(
                    current.includes(nodeId)
                      ? current.filter((id) => id !== nodeId)
                      : [...current, nodeId],
                  );
                } else {
                  setSelection([nodeId]);
                }
              }}
            />
          );
        })}
        {carAnchors.map((anchor) => (
          <CarAnchorMesh
            key={anchor.id}
            anchor={anchor}
            selected={selection.includes(anchor.id)}
            onSelect={(shiftKey) => {
              if (shiftKey) {
                const current = useDocumentStore.getState().selection;
                setSelection(
                  current.includes(anchor.id)
                    ? current.filter((id) => id !== anchor.id)
                    : [...current, anchor.id],
                );
              } else {
                setSelection([anchor.id]);
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
      <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
        <GizmoViewcube />
      </GizmoHelper>
    </Canvas>
  );
}

function SceneMesh({
  payload,
  selected,
  isPart,
  xray,
  wireframe,
  onSelect,
}: {
  payload: NodeMeshPayload;
  selected: boolean;
  isPart: boolean;
  xray: boolean;
  wireframe: boolean;
  onSelect: (shiftKey: boolean) => void;
}) {
  const geometry = useMemo(() => {
    const indexed = new THREE.BufferGeometry();
    indexed.setAttribute('position', new THREE.BufferAttribute(payload.positions, 3));
    indexed.setIndex(new THREE.BufferAttribute(payload.indices, 1));
    // manifold-3d 的 mesh 在稜邊共享頂點；用共享頂點算 vertex normal 會把
    // 90° 稜邊兩側的法線平均混在一起，平坦面出現漸層斑駁。展開成
    // non-indexed（每個三角形有自己的頂點）後再算法線，才是正確的 per-face
    // flat shading。
    const g = indexed.toNonIndexed();
    indexed.dispose();
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
        color={
          isHole
            ? '#ef4444'
            : selected
              ? '#2563eb'
              : (payload.color ?? (isPart ? '#2e7d5b' : '#9db4d0'))
        }
        transparent={isHole || xray}
        opacity={isHole ? 0.45 : xray ? 0.35 : 1}
        depthWrite={isHole ? true : !xray}
        roughness={0.6}
        metalness={0.05}
        side={THREE.DoubleSide}
      />
      {wireframe && <Edges threshold={30} color="#334155" />}
    </mesh>
  );
}

/**
 * 高清模型視覺覆蓋層：載入外部量測用 STL，套用節點 transform 顯示。
 * 純視覺——外殼規劃/碰撞/匯出完全不讀這裡，一律用 SceneMesh 那條路徑的
 * 程序化幾何（見 Viewport 內 highResNodeIds 的註解）。
 */
function HighResPartMesh({
  url,
  originOffset = [0, 0, 0],
  transform,
  selected,
  wireframe,
  onSelect,
}: {
  url: string;
  originOffset?: [number, number, number];
  transform: { position: [number, number, number]; rotation: [number, number, number]; scale: [number, number, number] };
  selected: boolean;
  wireframe: boolean;
  onSelect: (shiftKey: boolean) => void;
}) {
  const geometry = useLoader(STLLoader, url);
  const rotationRad: [number, number, number] = [
    (transform.rotation[0] * Math.PI) / 180,
    (transform.rotation[1] * Math.PI) / 180,
    (transform.rotation[2] * Math.PI) / 180,
  ];

  return (
    <group
      position={[
        transform.position[0],
        transform.position[1],
        transform.position[2],
      ]}
      rotation={rotationRad}
      scale={transform.scale}
    >
      <mesh
        geometry={geometry}
        position={originOffset}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(e.shiftKey);
      }}
      >
        <meshStandardMaterial
          color={selected ? '#2563eb' : '#2e7d5b'}
          roughness={0.6}
          metalness={0.05}
          side={THREE.DoubleSide}
        />
        {wireframe && <Edges threshold={30} color="#334155" />}
      </mesh>
    </group>
  );
}

function CarAnchorMesh({
  anchor,
  selected,
  onSelect,
}: {
  anchor: CarAnchorNode;
  selected: boolean;
  onSelect: (shiftKey: boolean) => void;
}) {
  const { length, width } = anchor.config;
  const [px, py, pz] = anchor.transform.position;
  const rotZ = (anchor.transform.rotation[2] * Math.PI) / 180;

  return (
    <mesh
      position={[px, py, pz + 0.5]}
      rotation={[0, 0, rotZ]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(e.shiftKey);
      }}
    >
      <boxGeometry args={[length, width, 1]} />
      <meshStandardMaterial
        color={selected ? '#2563eb' : '#38bdf8'}
        transparent
        opacity={selected ? 0.28 : 0.16}
        roughness={0.5}
        metalness={0.02}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
      <Edges threshold={1} color={selected ? '#1d4ed8' : '#0ea5e9'} />
    </mesh>
  );
}
