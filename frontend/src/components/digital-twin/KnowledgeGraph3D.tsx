// VisionFlow-inspired 3D Knowledge Graph Visualization
// Renders the robot's knowledge, understanding, and cognitive architecture
// as an interactive 3D node graph with gem-like materials and bloom effects
import { useRef, useMemo, useCallback, Suspense } from 'react';
import { Canvas, useFrame, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Text, Billboard } from '@react-three/drei';
import * as THREE from 'three';

// ============================================
// TYPES
// ============================================

export interface KnowledgeNode {
  id: string;
  label: string;
  type: 'concept' | 'skill' | 'memory' | 'model' | 'sensor' | 'actuator' | 'policy' | 'agent' | 'doctrine' | 'data';
  domain: 'mother_core' | 'groot_n1' | 'defence' | 'legal' | 'robotics' | 'memory' | 'perception' | 'action';
  depth: number;
  authority: number; // 0-1, how central/important
  connections: number;
  status: 'active' | 'learning' | 'idle' | 'error';
  metadata?: Record<string, string>;
}

export interface KnowledgeEdge {
  id: string;
  source: string;
  target: string;
  type: 'semantic' | 'causal' | 'hierarchical' | 'dependency' | 'data_flow' | 'inference';
  weight: number;
}

export interface KnowledgeGraphData {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
}

// ============================================
// COLOR SYSTEM (VisionFlow-inspired)
// ============================================

const DOMAIN_COLORS: Record<string, string> = {
  mother_core: '#4FC3F7',    // Light blue - sovereign reasoning
  groot_n1: '#76b900',       // NVIDIA green - physical intelligence
  defence: '#EF5350',        // Red - defence doctrine
  legal: '#AA96DA',          // Purple - legal compliance
  robotics: '#4ECDC4',       // Teal - robotics control
  memory: '#FFD54F',         // Yellow - memory/knowledge
  perception: '#81C784',     // Green - sensor/perception
  action: '#FFB74D',         // Orange - actuation
};

const STATUS_EMISSIVE: Record<string, [number, number, number]> = {
  active: [0.1, 0.5, 0.3],
  learning: [0.3, 0.3, 0.6],
  idle: [0.1, 0.1, 0.15],
  error: [0.6, 0.1, 0.1],
};

const TYPE_SCALE: Record<string, number> = {
  concept: 1.0,
  skill: 1.2,
  memory: 0.8,
  model: 1.4,
  sensor: 0.9,
  actuator: 1.1,
  policy: 1.3,
  agent: 1.5,
  doctrine: 1.1,
  data: 0.7,
};

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b];
}

// ============================================
// 3D GEM NODE (VisionFlow-inspired diamond/gem material)
// ============================================

function GemNode({
  node,
  position,
  isSelected,
  isHighlighted,
  onClick,
}: {
  node: KnowledgeNode;
  position: [number, number, number];
  isSelected: boolean;
  isHighlighted: boolean;
  onClick: (id: string) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.PointLight>(null);

  const color = DOMAIN_COLORS[node.domain] || '#90A4AE';
  const [r, g, b] = hexToRgb(color);
  const emissive = STATUS_EMISSIVE[node.status] || STATUS_EMISSIVE.idle;
  const scale = (TYPE_SCALE[node.type] || 1.0) * (0.6 + node.authority * 0.8);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();

    // Breathing glow
    const breath = (Math.sin(t * 0.8 + position[0]) + 1) * 0.5;
    const baseIntensity = node.status === 'active' ? 0.15 : 0.05;
    (meshRef.current.material as THREE.MeshPhysicalMaterial).emissiveIntensity =
      baseIntensity + breath * 0.1;

    // Selection pulse
    if (isSelected) {
      const pulse = 1 + Math.sin(t * 3) * 0.12;
      meshRef.current.scale.setScalar(scale * pulse);
    }

    // Learning shimmer
    if (node.status === 'learning') {
      (meshRef.current.material as THREE.MeshPhysicalMaterial).iridescenceIOR =
        1.3 + Math.sin(t * 2) * 0.2;
    }

    // Knowledge ring rotation
    if (ringRef.current) {
      ringRef.current.rotation.z = t * 0.5;
      ringRef.current.rotation.x = Math.sin(t * 0.3 + position[1]) * 0.3;
    }

    // Glow light
    if (glowRef.current) {
      glowRef.current.intensity = isSelected ? 0.8 + breath * 0.4 : 0.15 + breath * 0.1;
    }
  });

  return (
    <group position={position}>
      {/* Main gem node */}
      <mesh
        ref={meshRef}
        scale={scale}
        onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onClick(node.id); }}
      >
        <dodecahedronGeometry args={[0.22, 1]} />
        <meshPhysicalMaterial
          color={new THREE.Color(r, g, b)}
          emissive={new THREE.Color(...emissive)}
          emissiveIntensity={0.1}
          metalness={0.1}
          roughness={0.15}
          clearcoat={1.0}
          clearcoatRoughness={0.02}
          ior={2.0}
          iridescence={node.status === 'active' ? 0.8 : 0.3}
          iridescenceIOR={1.3}
          transparent
          opacity={isHighlighted || isSelected ? 1.0 : 0.85}
        />
      </mesh>

      {/* Knowledge ring (for high-authority nodes) */}
      {node.authority > 0.5 && (
        <mesh ref={ringRef} scale={scale * 1.6}>
          <torusGeometry args={[0.22, 0.015, 8, 48]} />
          <meshPhysicalMaterial
            color={new THREE.Color(r, g, b)}
            emissive={new THREE.Color(r * 0.5, g * 0.5, b * 0.5)}
            emissiveIntensity={0.3}
            transparent
            opacity={0.4}
            metalness={0.3}
            roughness={0.1}
          />
        </mesh>
      )}

      {/* Point light glow */}
      <pointLight
        ref={glowRef}
        color={color}
        intensity={0.15}
        distance={3}
        decay={2}
      />

      {/* Label */}
      <Billboard follow lockX={false} lockY={false} lockZ={false}>
        <Text
          position={[0, scale * 0.35, 0]}
          fontSize={0.08}
          color={isSelected ? '#00FFFF' : '#B0BEC5'}
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.003}
          outlineColor="#000000"
        >
          {node.label}
        </Text>
      </Billboard>

      {/* Status indicator */}
      {node.status === 'active' && (
        <mesh position={[scale * 0.25, scale * 0.25, 0]} scale={0.04}>
          <sphereGeometry args={[1, 8, 8]} />
          <meshBasicMaterial color="#2ECC71" />
        </mesh>
      )}
      {node.status === 'error' && (
        <mesh position={[scale * 0.25, scale * 0.25, 0]} scale={0.04}>
          <sphereGeometry args={[1, 8, 8]} />
          <meshBasicMaterial color="#E74C3C" />
        </mesh>
      )}
    </group>
  );
}

// ============================================
// GLASS EDGE (VisionFlow-inspired transparent connections)
// ============================================

function GlassEdge({
  start,
  end,
  type,
  weight,
  isHighlighted,
}: {
  start: [number, number, number];
  end: [number, number, number];
  type: KnowledgeEdge['type'];
  weight: number;
  isHighlighted: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  const direction = useMemo(() => {
    const dir = new THREE.Vector3(end[0] - start[0], end[1] - start[1], end[2] - start[2]);
    return dir;
  }, [start, end]);

  const length = direction.length();
  const midpoint: [number, number, number] = [
    (start[0] + end[0]) / 2,
    (start[1] + end[1]) / 2,
    (start[2] + end[2]) / 2,
  ];

  const quaternion = useMemo(() => {
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
    return q;
  }, [direction]);

  const edgeColor = useMemo(() => {
    switch (type) {
      case 'semantic': return '#4FC3F7';
      case 'causal': return '#FF5722';
      case 'hierarchical': return '#AA96DA';
      case 'dependency': return '#FFD54F';
      case 'data_flow': return '#4ECDC4';
      case 'inference': return '#81C784';
      default: return '#90A4AE';
    }
  }, [type]);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    const pulse = 0.15 + Math.sin(t * 0.8 + length) * 0.08;
    (meshRef.current.material as THREE.MeshPhysicalMaterial).emissiveIntensity =
      isHighlighted ? 0.4 : pulse;
  });

  const thickness = (0.008 + weight * 0.012) * (isHighlighted ? 2 : 1);

  return (
    <mesh ref={meshRef} position={midpoint} quaternion={quaternion}>
      <cylinderGeometry args={[thickness, thickness, length, 6]} />
      <meshPhysicalMaterial
        color={edgeColor}
        emissive={edgeColor}
        emissiveIntensity={0.15}
        transparent
        opacity={isHighlighted ? 0.6 : 0.25}
        metalness={0.1}
        roughness={0.3}
        ior={1.5}
        depthWrite={false}
      />
    </mesh>
  );
}

// ============================================
// FORCE-DIRECTED LAYOUT (client-side physics)
// ============================================

function computeLayout(data: KnowledgeGraphData): Map<string, [number, number, number]> {
  const positions = new Map<string, [number, number, number]>();
  const nodeCount = data.nodes.length;

  // Initial positions: spherical distribution by domain
  const domainAngles: Record<string, number> = {};
  const domains = [...new Set(data.nodes.map(n => n.domain))];
  domains.forEach((d, i) => { domainAngles[d] = (i / domains.length) * Math.PI * 2; });

  data.nodes.forEach((node) => {
    const angle = domainAngles[node.domain] + (Math.random() - 0.5) * 0.8;
    const radius = 2 + node.depth * 1.5 + (Math.random() - 0.5) * 1.0;
    const height = (node.depth - 2) * 1.2 + (Math.random() - 0.5) * 0.8;
    positions.set(node.id, [
      Math.cos(angle) * radius,
      height,
      Math.sin(angle) * radius,
    ]);
  });

  // Simple force-directed iterations
  for (let iter = 0; iter < 80; iter++) {
    const forces = new Map<string, [number, number, number]>();
    data.nodes.forEach(n => forces.set(n.id, [0, 0, 0]));

    // Repulsion between all nodes
    for (let i = 0; i < nodeCount; i++) {
      for (let j = i + 1; j < nodeCount; j++) {
        const a = data.nodes[i];
        const b = data.nodes[j];
        const pa = positions.get(a.id)!;
        const pb = positions.get(b.id)!;
        const dx = pa[0] - pb[0];
        const dy = pa[1] - pb[1];
        const dz = pa[2] - pb[2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.01;
        const repulsion = 0.8 / (dist * dist);
        const fx = (dx / dist) * repulsion;
        const fy = (dy / dist) * repulsion;
        const fz = (dz / dist) * repulsion;
        forces.get(a.id)![0] += fx;
        forces.get(a.id)![1] += fy;
        forces.get(a.id)![2] += fz;
        forces.get(b.id)![0] -= fx;
        forces.get(b.id)![1] -= fy;
        forces.get(b.id)![2] -= fz;
      }
    }

    // Attraction along edges
    data.edges.forEach(edge => {
      const pa = positions.get(edge.source);
      const pb = positions.get(edge.target);
      if (!pa || !pb) return;
      const dx = pb[0] - pa[0];
      const dy = pb[1] - pa[1];
      const dz = pb[2] - pa[2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.01;
      const attraction = dist * 0.05 * edge.weight;
      const fx = (dx / dist) * attraction;
      const fy = (dy / dist) * attraction;
      const fz = (dz / dist) * attraction;
      forces.get(edge.source)![0] += fx;
      forces.get(edge.source)![1] += fy;
      forces.get(edge.source)![2] += fz;
      forces.get(edge.target)![0] -= fx;
      forces.get(edge.target)![1] -= fy;
      forces.get(edge.target)![2] -= fz;
    });

    // Domain clustering force
    data.nodes.forEach(node => {
      const angle = domainAngles[node.domain];
      const targetX = Math.cos(angle) * 3;
      const targetZ = Math.sin(angle) * 3;
      const pos = positions.get(node.id)!;
      forces.get(node.id)![0] += (targetX - pos[0]) * 0.02;
      forces.get(node.id)![2] += (targetZ - pos[2]) * 0.02;
    });

    // Apply forces with damping
    const damping = 0.85 - iter * 0.005;
    data.nodes.forEach(node => {
      const pos = positions.get(node.id)!;
      const force = forces.get(node.id)!;
      pos[0] += force[0] * damping;
      pos[1] += force[1] * damping;
      pos[2] += force[2] * damping;
    });
  }

  return positions;
}

// ============================================
// KNOWLEDGE GRAPH SCENE
// ============================================

function KnowledgeGraphScene({
  data,
  selectedNodeId,
  onNodeSelect,
}: {
  data: KnowledgeGraphData;
  selectedNodeId: string | null;
  onNodeSelect: (id: string | null) => void;
}) {
  const positions = useMemo(() => computeLayout(data), [data]);

  // Find highlighted edges (connected to selected node)
  const highlightedEdges = useMemo(() => {
    if (!selectedNodeId) return new Set<string>();
    return new Set(
      data.edges
        .filter(e => e.source === selectedNodeId || e.target === selectedNodeId)
        .map(e => e.id)
    );
  }, [data.edges, selectedNodeId]);

  // Find highlighted nodes (connected to selected)
  const highlightedNodes = useMemo(() => {
    if (!selectedNodeId) return new Set<string>();
    const connected = new Set<string>();
    connected.add(selectedNodeId);
    data.edges.forEach(e => {
      if (e.source === selectedNodeId) connected.add(e.target);
      if (e.target === selectedNodeId) connected.add(e.source);
    });
    return connected;
  }, [data.edges, selectedNodeId]);

  const handleClick = useCallback((id: string) => {
    onNodeSelect(selectedNodeId === id ? null : id);
  }, [selectedNodeId, onNodeSelect]);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <directionalLight position={[10, 15, 10]} intensity={0.8} />
      <pointLight position={[-8, 8, -8]} intensity={0.4} color="#4FC3F7" />
      <pointLight position={[8, -3, 8]} intensity={0.3} color="#76b900" />
      <pointLight position={[0, 10, 0]} intensity={0.2} color="#AA96DA" />

      {/* Background fog */}
      <fog attach="fog" args={['#000022', 8, 30]} />

      {/* Edges */}
      {data.edges.map(edge => {
        const startPos = positions.get(edge.source);
        const endPos = positions.get(edge.target);
        if (!startPos || !endPos) return null;
        return (
          <GlassEdge
            key={edge.id}
            start={startPos}
            end={endPos}
            type={edge.type}
            weight={edge.weight}
            isHighlighted={highlightedEdges.has(edge.id)}
          />
        );
      })}

      {/* Nodes */}
      {data.nodes.map(node => {
        const pos = positions.get(node.id);
        if (!pos) return null;
        return (
          <GemNode
            key={node.id}
            node={node}
            position={pos}
            isSelected={selectedNodeId === node.id}
            isHighlighted={highlightedNodes.has(node.id)}
            onClick={handleClick}
          />
        );
      })}

      {/* Domain labels (floating) */}
      {[...new Set(data.nodes.map(n => n.domain))].map(domain => {
        const domainNodes = data.nodes.filter(n => n.domain === domain);
        const avgX = domainNodes.reduce((s, n) => s + (positions.get(n.id)?.[0] || 0), 0) / domainNodes.length;
        const avgZ = domainNodes.reduce((s, n) => s + (positions.get(n.id)?.[2] || 0), 0) / domainNodes.length;
        return (
          <Billboard key={domain} position={[avgX, 4.5, avgZ]} follow>
            <Text
              fontSize={0.18}
              color={DOMAIN_COLORS[domain] || '#90A4AE'}
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.005}
              outlineColor="#000000"
            >
              {domain.replace(/_/g, ' ').toUpperCase()}
            </Text>
          </Billboard>
        );
      })}

      {/* Grid floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -4, 0]}>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#000022" transparent opacity={0.3} />
      </mesh>

      {/* Controls */}
      <OrbitControls
        enablePan
        enableZoom
        enableRotate
        autoRotate
        autoRotateSpeed={0.3}
        minDistance={2}
        maxDistance={25}
        makeDefault
      />
    </>
  );
}

// ============================================
// EXPORTED COMPONENT
// ============================================

export function KnowledgeGraph3D({
  data,
  selectedNodeId,
  onNodeSelect,
}: {
  data: KnowledgeGraphData;
  selectedNodeId: string | null;
  onNodeSelect: (id: string | null) => void;
}) {
  return (
    <div className="w-full h-full bg-[#000022] rounded-lg overflow-hidden">
      <Canvas
        camera={{ position: [6, 5, 6], fov: 55 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.setClearColor('#000022');
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.2;
        }}
      >
        <Suspense fallback={null}>
          <KnowledgeGraphScene
            data={data}
            selectedNodeId={selectedNodeId}
            onNodeSelect={onNodeSelect}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
