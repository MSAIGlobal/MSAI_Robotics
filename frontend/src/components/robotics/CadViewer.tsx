// EXO-1 CAD Viewer - 3D humanoid skeleton visualization
'use client';
import { useRef, useEffect, useState, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { roboticsApi } from '../../lib/backend';
import { CadModel, JointSpec, SimulationState } from '../../lib/types';

interface Props {
  modelId?: string;
  simulationState?: SimulationState;
  showConstraints?: boolean;
}

// Joint visualization component
function Joint({
  spec,
  position,
  rotation,
  showLimits,
}: {
  spec: JointSpec;
  position: [number, number, number];
  rotation?: number;
  showLimits?: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (meshRef.current && rotation !== undefined) {
      meshRef.current.rotation.z = rotation;
    }
  });

  return (
    <group position={position}>
      {/* Joint sphere */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.03, 16, 16]} />
        <meshStandardMaterial
          color={spec.type === 'revolute' ? '#65e2ff' : '#ff6565'}
          emissive={spec.type === 'revolute' ? '#65e2ff' : '#ff6565'}
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Joint limits arc */}
      {showLimits && spec.min_angle !== undefined && spec.max_angle !== undefined && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry
            args={[0.05, 0.08, 32, 1, spec.min_angle, spec.max_angle - spec.min_angle]}
          />
          <meshBasicMaterial color="#65e2ff" transparent opacity={0.3} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

// Bone/Link visualization
function Bone({
  start,
  end,
}: {
  start: [number, number, number];
  end: [number, number, number];
}) {
  const direction = new THREE.Vector3(
    end[0] - start[0],
    end[1] - start[1],
    end[2] - start[2]
  );
  const length = direction.length();
  const position = new THREE.Vector3(
    (start[0] + end[0]) / 2,
    (start[1] + end[1]) / 2,
    (start[2] + end[2]) / 2
  );

  // Calculate rotation to align cylinder with direction
  const quaternion = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  quaternion.setFromUnitVectors(up, direction.clone().normalize());

  return (
    <mesh position={position} quaternion={quaternion}>
      <cylinderGeometry args={[0.015, 0.02, length, 8]} />
      <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.2} />
    </mesh>
  );
}

// EXO-1 Humanoid skeleton
function HumanoidSkeleton({
  jointAngles,
  showLimits,
}: {
  jointAngles?: Record<string, number>;
  showLimits?: boolean;
}) {
  // Define humanoid skeleton structure
  const joints: { name: string; position: [number, number, number]; spec: JointSpec }[] = [
    // Spine
    { name: 'pelvis', position: [0, 0.9, 0], spec: { name: 'pelvis', type: 'fixed', parent: 'root' } },
    { name: 'spine1', position: [0, 1.0, 0], spec: { name: 'spine1', type: 'revolute', parent: 'pelvis', min_angle: -0.3, max_angle: 0.3 } },
    { name: 'spine2', position: [0, 1.15, 0], spec: { name: 'spine2', type: 'revolute', parent: 'spine1', min_angle: -0.3, max_angle: 0.3 } },
    { name: 'neck', position: [0, 1.4, 0], spec: { name: 'neck', type: 'revolute', parent: 'spine2', min_angle: -0.5, max_angle: 0.5 } },
    { name: 'head', position: [0, 1.55, 0], spec: { name: 'head', type: 'revolute', parent: 'neck', min_angle: -0.3, max_angle: 0.3 } },

    // Left arm
    { name: 'l_shoulder', position: [-0.18, 1.35, 0], spec: { name: 'l_shoulder', type: 'revolute', parent: 'spine2', min_angle: -2.0, max_angle: 2.0, max_torque: 80 } },
    { name: 'l_elbow', position: [-0.18, 1.05, 0], spec: { name: 'l_elbow', type: 'revolute', parent: 'l_shoulder', min_angle: 0, max_angle: 2.5, max_torque: 60 } },
    { name: 'l_wrist', position: [-0.18, 0.75, 0], spec: { name: 'l_wrist', type: 'revolute', parent: 'l_elbow', min_angle: -1.0, max_angle: 1.0, max_torque: 20 } },

    // Right arm
    { name: 'r_shoulder', position: [0.18, 1.35, 0], spec: { name: 'r_shoulder', type: 'revolute', parent: 'spine2', min_angle: -2.0, max_angle: 2.0, max_torque: 80 } },
    { name: 'r_elbow', position: [0.18, 1.05, 0], spec: { name: 'r_elbow', type: 'revolute', parent: 'r_shoulder', min_angle: 0, max_angle: 2.5, max_torque: 60 } },
    { name: 'r_wrist', position: [0.18, 0.75, 0], spec: { name: 'r_wrist', type: 'revolute', parent: 'r_elbow', min_angle: -1.0, max_angle: 1.0, max_torque: 20 } },

    // Left leg
    { name: 'l_hip', position: [-0.1, 0.85, 0], spec: { name: 'l_hip', type: 'revolute', parent: 'pelvis', min_angle: -1.5, max_angle: 1.5, max_torque: 120 } },
    { name: 'l_knee', position: [-0.1, 0.45, 0], spec: { name: 'l_knee', type: 'revolute', parent: 'l_hip', min_angle: 0, max_angle: 2.5, max_torque: 100 } },
    { name: 'l_ankle', position: [-0.1, 0.05, 0], spec: { name: 'l_ankle', type: 'revolute', parent: 'l_knee', min_angle: -0.8, max_angle: 0.8, max_torque: 60 } },

    // Right leg
    { name: 'r_hip', position: [0.1, 0.85, 0], spec: { name: 'r_hip', type: 'revolute', parent: 'pelvis', min_angle: -1.5, max_angle: 1.5, max_torque: 120 } },
    { name: 'r_knee', position: [0.1, 0.45, 0], spec: { name: 'r_knee', type: 'revolute', parent: 'r_hip', min_angle: 0, max_angle: 2.5, max_torque: 100 } },
    { name: 'r_ankle', position: [0.1, 0.05, 0], spec: { name: 'r_ankle', type: 'revolute', parent: 'r_knee', min_angle: -0.8, max_angle: 0.8, max_torque: 60 } },
  ];

  const bones: { start: string; end: string }[] = [
    // Spine
    { start: 'pelvis', end: 'spine1' },
    { start: 'spine1', end: 'spine2' },
    { start: 'spine2', end: 'neck' },
    { start: 'neck', end: 'head' },

    // Arms
    { start: 'spine2', end: 'l_shoulder' },
    { start: 'l_shoulder', end: 'l_elbow' },
    { start: 'l_elbow', end: 'l_wrist' },
    { start: 'spine2', end: 'r_shoulder' },
    { start: 'r_shoulder', end: 'r_elbow' },
    { start: 'r_elbow', end: 'r_wrist' },

    // Legs
    { start: 'pelvis', end: 'l_hip' },
    { start: 'l_hip', end: 'l_knee' },
    { start: 'l_knee', end: 'l_ankle' },
    { start: 'pelvis', end: 'r_hip' },
    { start: 'r_hip', end: 'r_knee' },
    { start: 'r_knee', end: 'r_ankle' },
  ];

  const jointMap = new Map(joints.map((j) => [j.name, j]));

  return (
    <group>
      {/* Bones */}
      {bones.map((bone, i) => {
        const startJoint = jointMap.get(bone.start);
        const endJoint = jointMap.get(bone.end);
        if (!startJoint || !endJoint) return null;
        return (
          <Bone
            key={i}
            start={startJoint.position}
            end={endJoint.position}
          />
        );
      })}

      {/* Joints */}
      {joints.map((joint) => (
        <Joint
          key={joint.name}
          spec={joint.spec}
          position={joint.position}
          rotation={jointAngles?.[joint.name]}
          showLimits={showLimits}
        />
      ))}

      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[2, 2]} />
        <meshStandardMaterial color="#111419" />
      </mesh>
    </group>
  );
}

// Main CAD Viewer component
export function CadViewer({ modelId, simulationState, showConstraints = true }: Props) {
  const [_model, setModel] = useState<CadModel | null>(null);
  const [_loading, setLoading] = useState(false);

  useEffect(() => {
    if (modelId) {
      loadModel(modelId);
    }
  }, [modelId]);

  async function loadModel(id: string) {
    setLoading(true);
    try {
      const data = await roboticsApi.getCadModel(id);
      setModel(data);
    } catch (err) {
      console.error('Failed to load CAD model:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass-card h-full min-h-[400px]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-cyan-400">
          MOTHER EXO-1 — CAD
        </h2>
        <div className="flex items-center gap-2">
          {simulationState?.status === 'running' && (
            <span className="flex items-center gap-1 text-xs text-green-400">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              Live
            </span>
          )}
          <button
            onClick={() => loadModel(modelId || 'exo1')}
            className="text-xs text-gray-400 hover:text-cyan-400"
          >
            Reload
          </button>
        </div>
      </div>

      <div className="h-[350px] rounded-lg overflow-hidden bg-gray-900">
        <Canvas camera={{ position: [1.5, 1.5, 1.5], fov: 50 }}>
          <Suspense fallback={null}>
            <ambientLight intensity={0.5} />
            <directionalLight position={[5, 5, 5]} intensity={1} />
            <pointLight position={[-5, 5, -5]} intensity={0.5} color="#65e2ff" />

            <HumanoidSkeleton
              jointAngles={simulationState?.joints}
              showLimits={showConstraints}
            />

            <Grid
              args={[10, 10]}
              cellSize={0.5}
              cellThickness={0.5}
              cellColor="#1e293b"
              sectionSize={1}
              sectionThickness={1}
              sectionColor="#334155"
              fadeDistance={10}
              position={[0, 0, 0]}
            />

            <OrbitControls
              enablePan={true}
              enableZoom={true}
              enableRotate={true}
              minDistance={0.5}
              maxDistance={5}
            />
          </Suspense>
        </Canvas>
      </div>

      {/* Safety Warnings */}
      {simulationState?.safety_warnings && simulationState.safety_warnings.length > 0 && (
        <div className="mt-3 p-2 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
          <p className="text-xs text-yellow-400 font-medium">Safety Warnings:</p>
          <ul className="text-xs text-yellow-300 mt-1">
            {simulationState.safety_warnings.map((w, i) => (
              <li key={i}>• {w}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
