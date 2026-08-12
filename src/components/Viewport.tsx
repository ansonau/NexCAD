import { useEffect, useMemo, useState } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { Edges, Grid, GizmoHelper, GizmoViewcube, Html, OrbitControls } from '@react-three/drei';
import { useTranslation } from 'react-i18next';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { getGeometryClient } from '../geometry/client';
import type { NodeMeshPayload } from '../geometry/protocol';
import { collectHoleWorldAnnotations, collectHoleWorldPositions } from '../geometry/holeSnap';
import type { HoleWorldAnnotation } from '../geometry/holeSnap';
import i18n from '../i18n';
import { HIGH_RES_MODELS } from '../parts/highResModels';
import { rehydrateCarChassisDefs } from '../parts/presets';
import { findNode, useDocumentStore } from '../store/documentStore';
import type { CarAnchorNode, PartNode } from '../types/document';
import { useToastStore } from '../store/toastStore';
import { useViewStore } from '../store/viewStore';
import type { DimensionMode } from '../store/viewStore';
import { SelectionGizmo } from './SelectionGizmo';

export function Viewport() {
  const { i18n: viewI18n } = useTranslation();
  const doc = useDocumentStore((s) => s.doc);
  const selection = useDocumentStore((s) => s.selection);
  const setSelection = useDocumentStore((s) => s.setSelection);
  const shellXray = useViewStore((s) => s.shellXray);
  const wireframe = useViewStore((s) => s.wireframe);
  const highResModels = useViewStore((s) => s.highResModels);
  const dimensionMode = useViewStore((s) => s.dimensionMode);
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

  const dimensionOverlays = useMemo(() => (
    buildDimensionOverlays(meshes, dimensionMode, dimensionMode === 'holes' ? collectHoleWorldPositions(doc.nodes) : [], dimensionMode === 'holeLabels' ? collectHoleWorldAnnotations(doc.nodes) : [], (id) => {
      const node = findNode(doc.nodes, id);
      return { visible: node?.visible !== false, type: node?.type, name: node?.name };
    })
  ), [meshes, doc.nodes, dimensionMode, viewI18n.language]);

  useEffect(() => {
    const client = getGeometryClient();
    client.onMeshes = setMeshes;
    client.onError = (message) => {
      console.warn('geometry error:', message);
      useToastStore.getState().show(`${i18n.t('errors.geometry')}（${message}）`);
    };
  }, []);

  useEffect(() => {
    // 動態底盤定義只存記憶體 registry，不隨文件存檔；任何 doc 變動（含開專案/
    // 匯入/初次啟動還原）求值前都先補註冊一次，否則 registry 剛載入是空的，
    // 底盤節點會因為查無定義而消失（見 rehydrateCarChassisDefs 註解）。
    rehydrateCarChassisDefs(doc.nodes);
    getGeometryClient().requestEvaluate(doc.nodes);
  }, [doc]);

  return (
    <Canvas
      className="touch-none"
      camera={{ position: [115, 115, 115], fov: 45, near: 0.1, far: 5000 }}
      gl={{ antialias: true }}
      dpr={[1, 2]}
      onPointerMissed={() => setSelection([])}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
      }}
    >
      <color attach="background" args={['#f3f7fb']} />
      <fog attach="fog" args={['#f3f7fb', 420, 900]} />
      <hemisphereLight args={['#ffffff', '#c7d3df', 0.85]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[120, 220, 160]} intensity={1.15} />
      <directionalLight position={[-120, 80, -140]} intensity={0.28} color="#d8e4f2" />
      <Grid
        args={[500, 500]}
        cellSize={10}
        cellThickness={0.45}
        sectionSize={50}
        sectionThickness={0.9}
        cellColor="#dce5ee"
        sectionColor="#b9c6d6"
        fadeDistance={560}
        fadeStrength={1.45}
        infiniteGrid
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
        {dimensionOverlays.map((overlay) => (
          <DimensionOverlay key={overlay.nodeId} overlay={overlay} />
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

type Vec3 = [number, number, number];

interface DimensionOverlayData {
  nodeId: string;
  lines: DimensionLineData[];
  labels?: DimensionLabelData[];
}

interface DimensionLineData {
  start: Vec3;
  end: Vec3;
  extensions: [Vec3, Vec3][];
  labelPosition: Vec3;
  text: string;
}

interface DimensionLabelData {
  center: Vec3;
  position: Vec3;
  diameter: string;
  kind: string;
  coords: Vec3;
}

function buildDimensionOverlays(
  meshes: NodeMeshPayload[],
  mode: DimensionMode,
  partHolePositions: Vec3[],
  partHoleAnnotations: HoleWorldAnnotation[],
  getNodeInfo: (nodeId: string) => { visible: boolean; type?: string; name?: string },
): DimensionOverlayData[] {
  if (mode === 'off') return [];
  const bounds = new Map<string, { min: Vec3; max: Vec3 }>();
  const holeNodeNames = new Map<string, string>();
  for (const mesh of meshes) {
    const nodeInfo = getNodeInfo(mesh.nodeId);
    if (!nodeInfo.visible || mesh.positions.length < 3) continue;
    if (mode === 'enclosure' && nodeInfo.type !== 'enclosure') continue;
    if (mode === 'parts' && (nodeInfo.type === 'enclosure' || mesh.role === 'hole')) continue;
    if (mode === 'holes' && mesh.role !== 'hole') continue;
    if (mode === 'holeLabels' && mesh.role !== 'hole') continue;
    const box = bounds.get(mesh.nodeId) ?? {
      min: [Infinity, Infinity, Infinity],
      max: [-Infinity, -Infinity, -Infinity],
    };
    for (let i = 0; i < mesh.positions.length; i += 3) {
      for (let axis = 0; axis < 3; axis += 1) {
        const value = mesh.positions[i + axis];
        if (value < box.min[axis]) box.min[axis] = value;
        if (value > box.max[axis]) box.max[axis] = value;
      }
    }
    bounds.set(mesh.nodeId, box);
    if (mesh.role === 'hole' && nodeInfo.name) holeNodeNames.set(mesh.nodeId, nodeInfo.name);
  }
  if (mode === 'holes') return buildHoleDistanceOverlay(bounds, partHolePositions);
  if (mode === 'holeLabels') return buildHoleLabelOverlay(bounds, holeNodeNames, partHoleAnnotations);
  return [...bounds.entries()].map(([nodeId, box]) => ({ nodeId, lines: buildDimensionLines(box) }));
}

function buildHoleDistanceOverlay(bounds: Map<string, { min: Vec3; max: Vec3 }>, partHolePositions: Vec3[]): DimensionOverlayData[] {
  const holes = [...bounds.entries()].map(([, box]) => ({
    center: vec3(
      (box.min[0] + box.max[0]) / 2,
      (box.min[1] + box.max[1]) / 2,
      (box.min[2] + box.max[2]) / 2,
    ),
  })).concat(partHolePositions.map((center) => ({ center })));
  const uniqueHoles = dedupePoints(holes.map((hole) => hole.center));
  if (uniqueHoles.length < 2) return [];
  const lines: DimensionLineData[] = [];
  for (let i = 0; i < uniqueHoles.length; i += 1) {
    for (let j = i + 1; j < uniqueHoles.length; j += 1) {
      const start = uniqueHoles[i];
      const end = uniqueHoles[j];
      const distance = lineLength(start, end);
      if (distance < 0.5) continue;
      lines.push({
        start,
        end,
        extensions: [],
        labelPosition: vec3((start[0] + end[0]) / 2, (start[1] + end[1]) / 2, (start[2] + end[2]) / 2 + 4),
        text: `${formatMm(distance)}mm`,
      });
    }
  }
  return [{ nodeId: 'hole-distances', lines }];
}

function buildHoleLabelOverlay(
  bounds: Map<string, { min: Vec3; max: Vec3 }>,
  holeNodeNames: Map<string, string>,
  partHoleAnnotations: HoleWorldAnnotation[],
): DimensionOverlayData[] {
  const explicit = [...bounds.entries()].map(([nodeId, box]) => {
    const center = vec3((box.min[0] + box.max[0]) / 2, (box.min[1] + box.max[1]) / 2, (box.min[2] + box.max[2]) / 2);
    const size = [box.max[0] - box.min[0], box.max[1] - box.min[1], box.max[2] - box.min[2]];
    return { center, diameter: Math.min(...size.filter((value) => value > 0.5)), kind: inferHoleKind(holeNodeNames.get(nodeId) ?? '') };
  });
  const labels = dedupeHoleLabels([...partHoleAnnotations, ...explicit]).map((hole) => ({
    center: hole.center,
    position: vec3(hole.center[0], hole.center[1], hole.center[2] + 6),
    diameter: `Ø${formatMm(hole.diameter)}`,
    kind: formatHoleKind(hole.kind),
    coords: hole.center,
  }));
  return labels.length ? [{ nodeId: 'hole-labels', lines: [], labels }] : [];
}

function inferHoleKind(name: string): HoleWorldAnnotation['kind'] {
  if (name.includes('杯頭')) return 'socketHead';
  if (name.includes('沉頭')) return 'countersink';
  return 'through';
}

function formatHoleKind(kind: HoleWorldAnnotation['kind']): string {
  if (kind === 'socketHead') return i18n.t('view.holeKindSocketHead');
  if (kind === 'countersink') return i18n.t('view.holeKindCountersink');
  return i18n.t('view.holeKindThrough');
}

function dedupeHoleLabels(holes: HoleWorldAnnotation[]): HoleWorldAnnotation[] {
  const seen = new Set<string>();
  return holes.filter((hole) => {
    const key = hole.center.map((value) => value.toFixed(3)).join(':');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dedupePoints(points: Vec3[]): Vec3[] {
  const seen = new Set<string>();
  return points.filter((point) => {
    const key = point.map((value) => value.toFixed(3)).join(':');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildDimensionLines(box: { min: Vec3; max: Vec3 }): DimensionLineData[] {
  const [minX, minY, minZ] = box.min;
  const [maxX, maxY, maxZ] = box.max;
  const size: Vec3 = [maxX - minX, maxY - minY, maxZ - minZ];
  const offset = Math.max(6, Math.max(...size) * 0.12);
  const labelLift = Math.max(2, offset * 0.18);
  const lines: DimensionLineData[] = [
    {
      start: vec3(minX, minY - offset, minZ),
      end: vec3(maxX, minY - offset, minZ),
      extensions: [[vec3(minX, minY, minZ), vec3(minX, minY - offset, minZ)], [vec3(maxX, minY, minZ), vec3(maxX, minY - offset, minZ)]],
      labelPosition: vec3((minX + maxX) / 2, minY - offset, minZ + labelLift),
      text: `${formatMm(size[0])}mm`,
    },
    {
      start: vec3(maxX + offset, minY, minZ),
      end: vec3(maxX + offset, maxY, minZ),
      extensions: [[vec3(maxX, minY, minZ), vec3(maxX + offset, minY, minZ)], [vec3(maxX, maxY, minZ), vec3(maxX + offset, maxY, minZ)]],
      labelPosition: vec3(maxX + offset, (minY + maxY) / 2, minZ + labelLift),
      text: `${formatMm(size[1])}mm`,
    },
    {
      start: vec3(maxX + offset, maxY + offset, minZ),
      end: vec3(maxX + offset, maxY + offset, maxZ),
      extensions: [[vec3(maxX, maxY, minZ), vec3(maxX + offset, maxY + offset, minZ)], [vec3(maxX, maxY, maxZ), vec3(maxX + offset, maxY + offset, maxZ)]],
      labelPosition: vec3(maxX + offset, maxY + offset, (minZ + maxZ) / 2),
      text: `${formatMm(size[2])}mm`,
    },
  ];
  return lines.filter((line) => lineLength(line.start, line.end) >= 0.5);
}

function vec3(x: number, y: number, z: number): Vec3 {
  return [x, y, z];
}

function formatMm(value: number): string {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}

function lineLength(start: Vec3, end: Vec3): number {
  return Math.hypot(end[0] - start[0], end[1] - start[1], end[2] - start[2]);
}

function DimensionOverlay({ overlay }: { overlay: DimensionOverlayData }) {
  return (
    <group>
      {overlay.lines.map((line, index) => (
        <DimensionLine key={index} line={line} />
      ))}
      {overlay.labels?.map((label, index) => (
        <HoleCallout key={index} label={label} />
      ))}
    </group>
  );
}

function DimensionLine({ line }: { line: DimensionLineData }) {
  const geometry = useMemo(() => {
    const points = [line.start, line.end, ...line.extensions.flat()].flat();
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    return g;
  }, [line]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const length = lineLength(line.start, line.end);
  const arrowSize = Math.min(4, Math.max(1.5, length * 0.08));
  return (
    <group>
      <lineSegments geometry={geometry} renderOrder={20}>
        <lineBasicMaterial color="#475569" depthTest={false} transparent opacity={0.78} />
      </lineSegments>
      <ArrowHead position={line.start} target={line.end} size={arrowSize} />
      <ArrowHead position={line.end} target={line.start} size={arrowSize} />
      <Html position={line.labelPosition} center distanceFactor={8} zIndexRange={[20, 0]}>
        <div className="pointer-events-none whitespace-nowrap rounded-xl bg-white/94 px-8 py-6 font-mono text-[280px] font-bold leading-none text-slate-800 shadow-sm ring-1 ring-slate-300/80">
          {line.text}
        </div>
      </Html>
    </group>
  );
}

function HoleCallout({ label }: { label: DimensionLabelData }) {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([...label.center, ...label.position], 3));
    return g;
  }, [label]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <group>
      <lineSegments geometry={geometry} renderOrder={22}>
        <lineBasicMaterial color="#2563eb" depthTest={false} transparent opacity={0.72} />
      </lineSegments>
      <mesh position={label.center} renderOrder={23}>
        <sphereGeometry args={[1.15, 16, 16]} />
        <meshBasicMaterial color="#2563eb" depthTest={false} />
      </mesh>
      <Html position={label.position} center distanceFactor={8} zIndexRange={[24, 0]}>
        <div className="pointer-events-none min-w-[900px] overflow-hidden rounded-3xl border-2 border-blue-200/80 bg-white/95 font-mono text-slate-800 shadow-[0_18px_46px_rgba(15,23,42,0.18)] backdrop-blur">
          <div className="flex items-center justify-between gap-10 border-b border-slate-200/80 bg-gradient-to-r from-blue-50 to-slate-50 px-10 py-7">
            <span className="text-[280px] font-black leading-none tracking-[-0.08em] text-blue-700">{label.diameter}</span>
            <span className="rounded-full border-2 border-blue-200 bg-white px-7 py-4 text-[72px] font-bold leading-none text-blue-700">{label.kind}</span>
          </div>
          <div className="grid gap-4 px-8 py-7 text-[104px] font-bold leading-none text-slate-600">
            {(['X', 'Y', 'Z'] as const).map((axis, index) => (
              <span key={axis} className="flex items-baseline justify-between gap-10 rounded-2xl bg-slate-100 px-7 py-5">
                <span className="text-slate-400">{axis}</span>
                <span>{formatMm(label.coords[index])}</span>
              </span>
            ))}
          </div>
        </div>
      </Html>
    </group>
  );
}

function ArrowHead({ position, target, size }: { position: Vec3; target: Vec3; size: number }) {
  const quaternion = useMemo(() => {
    const direction = new THREE.Vector3(target[0] - position[0], target[1] - position[1], target[2] - position[2]).normalize();
    return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
  }, [position, target]);

  return (
    <mesh position={position} quaternion={quaternion} renderOrder={21}>
      <coneGeometry args={[size * 0.42, size, 12]} />
      <meshBasicMaterial color="#475569" depthTest={false} transparent opacity={0.82} />
    </mesh>
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
              ? '#1f5eff'
              : (payload.color ?? (isPart ? '#2f8f5b' : '#a8b8ca'))
        }
        transparent={isHole || xray}
        opacity={isHole ? 0.45 : xray ? 0.35 : 1}
        depthWrite={isHole ? true : !xray}
        roughness={0.6}
        metalness={0.05}
        side={THREE.DoubleSide}
      />
      {wireframe && <Edges threshold={30} color="#3d4d63" />}
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
          color={selected ? '#1f5eff' : '#2f8f5b'}
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
        color={selected ? '#1f5eff' : '#5bb6cf'}
        transparent
        opacity={selected ? 0.28 : 0.16}
        roughness={0.5}
        metalness={0.02}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
      <Edges threshold={1} color={selected ? '#1647c7' : '#2d91ad'} />
    </mesh>
  );
}
